// The Dead-Hand engine. Owned by Agent A.
//
// `advance(state, to)` is a pure function: it replays every integer sim second in
// (state.simTime, to] in order, so the result is identical whether you step at 1x,
// 60x, or jump straight to T+35:00 (which is how the fixture is built).
import type { Liquidation, LogEntry, ScenarioId, SimState, Stage, TemplateContext } from './types';
import { SCENARIOS, liquidationScript, pricePointAt, scenarioSeed, ticketScale, vnoise } from './scenarios';
import { feedDeviations, feedLabel, feedStatusOf, outlierFeeds } from './watchdog';
import { fmtInt, fmtPct, fmtT, fmtUSD, round2 } from './format';
import { runDeviationTest } from '../lib/deviation';
import { TEMPLATES } from '../content/templates';

export const TICK_MS = 250;
export const SIM_END = 3600;
/** A price point is recorded every PRICE_STEP sim seconds. */
export const PRICE_STEP = 5;
/** A signal point is recorded every SIGNAL_STEP sim seconds. */
export const SIGNAL_STEP = 10;
export const RESPONDER_NAME = 'Ananya Rao';
/**
 * Reopening rule (published in advance, like the band): once halted, new leveraged opens
 * reopen automatically after all three feeds have agreed for this many sim seconds straight.
 * No human decides it. If the feeds split again after reopening, new leverage halts again.
 */
export const REOPEN_AFTER_AGREE = 15 * 60;

export const T = {
  detect: 0,
  paged: 60,
  halt: 120,
  ack: 240,
  statusPage: 300,
  deviationTest: 900,
  makegoodsQueued: 1800,
  disclose: 3600,
} as const;

/** The protocol timeline, in the order it fires. */
export const TIMELINE: { t: number; stage: Stage; label: string }[] = [
  { t: T.detect, stage: 'detect', label: 'Watchdog flags feed divergence' },
  { t: T.paged, stage: 'detect', label: 'IST responder paged' },
  { t: T.halt, stage: 'contain', label: 'New leveraged opens halted; exits stay live' },
  { t: T.ack, stage: 'contain', label: 'Responder acknowledges' },
  { t: T.statusPage, stage: 'contain', label: 'Status page live + push to every open position' },
  { t: T.deviationTest, stage: 'decide', label: 'Deviation test runs on every liquidation' },
  { t: T.makegoodsQueued, stage: 'decide', label: 'Makegoods queued; one human confirmation' },
  { t: T.disclose, stage: 'disclose', label: 'Public post: feed data, verdict, what we owe' },
];

export const STAGES: Stage[] = ['detect', 'contain', 'decide', 'disclose'];

export function stageAt(t: number): Stage {
  if (t >= T.disclose) return 'disclose';
  if (t >= T.deviationTest) return 'decide';
  if (t >= T.halt) return 'contain';
  return 'detect';
}

export function createInitialState(scenario: ScenarioId = 'system_fault'): SimState {
  return {
    phase: 'setup',
    scenario,
    speed: 20,
    simTime: 0,
    stage: 'detect',
    bandPct: 2.0,
    bandLocked: false,
    feedStatus: 'agree',
    prices: [],
    signals: [],
    orderTypes: { newLeverage: true, topUp: true, reduce: true, close: true, withdraw: true },
    liquidations: [],
    comms: [],
    log: [],
    responder: { status: 'idle', name: RESPONDER_NAME },
    reserveStart: 250000,
    reserveBalance: 250000,
    humanCallsUsed: 0,
    makegoodButtonVisible: false,
    selectedUserId: null,
    activeDrawer: 'none',
    makegoodsConfirmedAt: null,
    leverageHaltedAt: null,
    leverageReopenedAt: null,
    feedsAgreeSince: null,
  };
}

/** When new leverage will reopen if the feeds keep agreeing (null = not halted, or feeds disagree now). */
export function projectedReopenAt(s: Pick<SimState, 'orderTypes' | 'leverageHaltedAt' | 'feedsAgreeSince'>): number | null {
  if (s.orderTypes.newLeverage || s.leverageHaltedAt === null || s.feedsAgreeSince === null) return null;
  return Math.max(s.leverageHaltedAt, s.feedsAgreeSince + REOPEN_AFTER_AGREE);
}

export function makegoodTotals(liqs: Liquidation[]): { count: number; total: number } {
  let count = 0;
  let total = 0;
  for (const l of liqs) {
    if (l.verdict === 'makegood') {
      count++;
      total += l.amountOwed;
    }
  }
  return { count, total: round2(total) };
}

/**
 * What has actually been paid. If the Integrity Reserve was short, makegoods were paid
 * pro-rata: paidRatio < 1 and shortfall > 0.
 */
export function payoutSummary(s: Pick<SimState, 'liquidations' | 'reserveStart' | 'reserveBalance'>) {
  const owedOnPaid = round2(s.liquidations.reduce((sum, l) => (l.status === 'paid' ? sum + l.amountOwed : sum), 0));
  const paid = round2(Math.min(owedOnPaid, s.reserveStart - s.reserveBalance));
  const paidRatio = owedOnPaid > 0 ? paid / owedOnPaid : 1;
  return { owedOnPaid, paid, paidRatio, shortfall: round2(owedOnPaid - paid), short: owedOnPaid - paid > 0.005 };
}

export function templateContext(s: SimState): TemplateContext {
  const last = s.prices[s.prices.length - 1];
  const { count, total } = makegoodTotals(s.liquidations);
  const payout = payoutSummary(s);
  return {
    scenario: s.scenario,
    simTime: s.simTime,
    median: last?.median ?? 0,
    ours: last?.ours ?? 0,
    bandPct: s.bandPct,
    makegoodCount: count,
    totalOwed: total,
    reserveBalance: s.reserveBalance,
    totalPaid: payout.paid,
    paidRatio: payout.paidRatio,
    leverageReopenedAt: s.leverageReopenedAt,
  };
}

function templatesFor(scenario: ScenarioId) {
  return TEMPLATES.filter((tp) => tp.scenarios === 'all' || tp.scenarios.includes(scenario));
}

const CHANNEL_LABEL = { status_page: 'Status page', push: 'Push', x_post: 'Public post on X', email: 'Email' } as const;

// ---------------------------------------------------------------------------
// Signals

function ticketsAt(s: SimState, t: number): number {
  const scale = ticketScale(s.scenario);
  const pushAt = s.comms.find((c) => c.channel === 'push' && c.status === 'sent')?.t;
  const rise = (x: number) => 2 + 48 * (1 - Math.exp(-x / 110));
  const v = pushAt === undefined || t < pushAt ? rise(t) : 3 + (rise(pushAt) - 3) * Math.exp(-(t - pushAt) / 420);
  return Math.max(0, Math.round(v * scale * (1 + 0.08 * vnoise(t, 30, scenarioSeed(s.scenario) + 100))));
}

/**
 * Social mentions rise steeply once people notice. Once a status_page message is
 * sent, a damping factor flattens the curve and it slowly decays.
 */
function socialAt(s: SimState, t: number): number {
  const undamped = (x: number) => 4 + 1400 * (1 - Math.exp(-Math.max(0, x - 60) / 420));
  const statusAt = s.comms.find((c) => c.channel === 'status_page' && c.status === 'sent')?.t;
  let v: number;
  if (statusAt === undefined || t < statusAt) {
    v = undamped(t);
  } else {
    const dt = t - statusAt;
    v = undamped(statusAt) * (1 + 0.12 * (1 - Math.exp(-dt / 90))) * (0.3 + 0.7 * Math.exp(-dt / 1500));
  }
  return Math.max(0, Math.round(v * (1 + 0.06 * vnoise(t, 25, scenarioSeed(s.scenario) + 200))));
}

// ---------------------------------------------------------------------------
// The step function

type Work = SimState;

function addLog(w: Work, t: number, actor: LogEntry['actor'], stage: Stage, text: string) {
  w.log.push({ id: `log-${String(w.log.length + 1).padStart(4, '0')}`, t, actor, stage, text });
}

function statusSentence(status: SimState['feedStatus']): string {
  if (status === 'agree') return 'All three feeds agree again.';
  if (status === 'diverging') return 'One feed disagrees; the median still has two agreeing feeds behind it.';
  return 'Liquidations paused: 2 of 3 feeds disagree.';
}

function testLiquidation(w: Work, i: number) {
  w.liquidations[i] = runDeviationTest(w.liquidations[i], w.bandPct);
}

function processSecond(w: Work, sec: number) {
  const meta = SCENARIOS[w.scenario];
  const stage = stageAt(sec);

  // Schedule every message for this scenario up front so the comms feed can show
  // what is coming and when.
  // The real text is built only when a message sends, because it depends on numbers
  // (verdicts, totals, reserve) that don't exist yet.
  if (sec === 0 && w.comms.length === 0) {
    w.comms = templatesFor(w.scenario)
      .slice()
      .sort((a, b) => a.fireAt - b.fireAt)
      .map((tp) => ({
        id: `msg-${tp.id}`,
        templateId: tp.id,
        t: tp.fireAt,
        channel: tp.channel,
        status: 'scheduled' as const,
        title: tp.label ?? `Scheduled ${CHANNEL_LABEL[tp.channel].toLowerCase()} update`,
        body: 'Written in advance. Live numbers are filled in when it sends.',
      }));
  }

  // Prices + watchdog
  if (sec % PRICE_STEP === 0) {
    const p = pricePointAt(w.scenario, sec);
    w.prices.push(p);
    const status = feedStatusOf(p);
    if (sec > 0 && status !== w.feedStatus) addLog(w, sec, 'system', stage, `Watchdog: ${statusSentence(status)}`);
    w.feedStatus = status;
    w.feedsAgreeSince = status === 'agree' ? (w.feedsAgreeSince ?? sec) : null;
  }

  // New liquidations from the script. After T+15:00 each is tested as it happens.
  for (const scripted of liquidationScript(w.scenario)) {
    if (scripted.t !== sec) continue;
    w.liquidations.push({ ...scripted });
    if (sec >= T.deviationTest) {
      const i = w.liquidations.length - 1;
      testLiquidation(w, i);
      const l = w.liquidations[i];
      if (l.verdict === 'makegood' && sec >= T.makegoodsQueued) w.liquidations[i] = { ...l, status: 'queued' };
      addLog(
        w,
        sec,
        'system',
        stage,
        `${l.id} (${l.userName}) tested on execution: ${fmtPct(l.deviationPct ?? 0)} vs ${fmtPct(w.bandPct)} band, ${
          l.verdict === 'makegood' ? `makegood ${fmtUSD(l.amountOwed)}` : 'no makegood'
        }.`,
      );
    }
  }

  // Fixed timeline events
  switch (sec) {
    case T.detect: {
      const p = w.prices[w.prices.length - 1];
      const dev = feedDeviations(p);
      const out = outlierFeeds(p);
      const detail = out.map((k) => `${feedLabel(k)} ${fmtPct(dev[k])} from median`).join(', ');
      addLog(w, sec, 'system', 'detect', `DETECT: watchdog flagged feed divergence (${detail || 'no outlier'}). Median ${fmtUSD(p.median)}.`);
      if (w.feedStatus === 'liquidations_paused') addLog(w, sec, 'system', 'detect', `Watchdog: ${statusSentence('liquidations_paused')}`);
      break;
    }
    case T.paged:
      w.responder = { ...w.responder, status: 'paged', pagedAt: sec };
      addLog(w, sec, 'system', stage, `Paged IST on-call responder (${w.responder.name}).`);
      break;
    case T.halt:
      w.orderTypes = { ...w.orderTypes, newLeverage: false };
      w.leverageHaltedAt = sec;
      w.leverageReopenedAt = null;
      addLog(
        w,
        sec,
        'system',
        'contain',
        `CONTAIN: new leveraged opens halted. Top-up, reduce, close and withdraw stay open. Reopens automatically once all three feeds agree for ${REOPEN_AFTER_AGREE / 60} minutes.`,
      );
      break;
    case T.ack:
      w.responder = { ...w.responder, status: 'acknowledged', ackAt: sec };
      addLog(w, sec, 'responder', stage, `${w.responder.name} acknowledged the page. Protocol running; no intervention needed.`);
      break;
    case T.statusPage:
      w.responder = { ...w.responder, status: 'on_it', onItAt: sec };
      addLog(w, sec, 'responder', stage, `${w.responder.name} watching status page and push delivery.`);
      break;
    case T.deviationTest: {
      w.liquidations.forEach((l, i) => l.status === 'untested' && testLiquidation(w, i));
      const { count, total } = makegoodTotals(w.liquidations);
      addLog(
        w,
        sec,
        'system',
        'decide',
        `DECIDE: deviation test run on ${w.liquidations.length} liquidations. ${count} exceed the ${fmtPct(w.bandPct)} band (${fmtUSD(total)}), ${
          w.liquidations.length - count
        } within band.`,
      );
      break;
    }
    case T.makegoodsQueued: {
      w.liquidations = w.liquidations.map((l) => (l.verdict === 'makegood' && l.status === 'tested' ? { ...l, status: 'queued' } : l));
      w.makegoodButtonVisible = true;
      const { count, total } = makegoodTotals(w.liquidations);
      addLog(
        w,
        sec,
        'system',
        'decide',
        count > 0
          ? `${count} makegoods queued (${fmtUSD(total)}) from the Integrity Reserve. Waiting for the one human call: confirm.`
          : `No makegoods owed: all ${w.liquidations.length} executions within the ${fmtPct(w.bandPct)} band.`,
      );
      break;
    }
    case T.disclose: {
      const { count, total } = makegoodTotals(w.liquidations);
      addLog(
        w,
        sec,
        'system',
        'disclose',
        `DISCLOSE: public post with feed data and verdict. ${count > 0 ? `${count} makegoods, ${fmtUSD(total)} owed` : 'No makegoods owed'}. Reserve ${fmtUSD(w.reserveBalance)}.`,
      );
      break;
    }
  }

  // Reopening rule: automatic, no human call. Checked after the halt so T+02:00 always halts first.
  if (w.leverageHaltedAt !== null) {
    const reopenAt = projectedReopenAt(w);
    if (!w.orderTypes.newLeverage && reopenAt !== null && sec >= reopenAt) {
      w.orderTypes = { ...w.orderTypes, newLeverage: true };
      w.leverageReopenedAt = sec;
      addLog(
        w,
        sec,
        'system',
        'contain',
        `CONTAIN: new leveraged opens reopened automatically. All three feeds have agreed for ${REOPEN_AFTER_AGREE / 60} minutes (since ${fmtT(w.feedsAgreeSince!)}).`,
      );
    } else if (w.orderTypes.newLeverage && w.feedStatus !== 'agree') {
      w.orderTypes = { ...w.orderTypes, newLeverage: false };
      w.leverageHaltedAt = sec;
      w.leverageReopenedAt = null;
      addLog(w, sec, 'system', 'contain', `CONTAIN: feeds disagree again; new leveraged opens halted until they agree for ${REOPEN_AFTER_AGREE / 60} minutes.`);
    }
  }

  // Comms that fire this second, built with the numbers as they are right now.
  if (w.comms.some((c) => c.status === 'scheduled' && c.t === sec)) {
    const ctx = templateContext({ ...w, simTime: sec });
    w.comms = w.comms.map((c) => {
      if (c.status !== 'scheduled' || c.t !== sec) return c;
      const tp = TEMPLATES.find((x) => x.id === c.templateId);
      if (!tp) return c;
      const msg = { ...c, ...tp.build(ctx), status: 'sent' as const };
      const audience = c.channel === 'push' ? ` to ${fmtInt(meta.openPositions)} open positions` : '';
      addLog(w, sec, 'system', stage, `Sent automatically: ${CHANNEL_LABEL[c.channel]}${audience}: "${msg.title}"`);
      return msg;
    });
  }

  // Signals
  if (sec % SIGNAL_STEP === 0) {
    const liqPerMin = w.liquidations.filter((l) => l.t > sec - 60 && l.t <= sec).length;
    w.signals.push({ t: sec, liquidationsPerMin: liqPerMin, ticketsPerMin: ticketsAt(w, sec), socialMentionsPerMin: socialAt(w, sec) });
  }
}

/**
 * Advance the simulation to sim time `to` (clamped to SIM_END). Pure: returns a new
 * state and never mutates `prev`. Works on any object that extends SimState, so it
 * can be handed the Zustand store state directly.
 */
export function advance<S extends SimState>(prev: S, to: number): S {
  const target = Math.min(SIM_END, Math.max(prev.simTime, to));
  const w: S = {
    ...prev,
    prices: prev.prices.slice(),
    signals: prev.signals.slice(),
    liquidations: prev.liquidations.slice(),
    comms: prev.comms.slice(),
    log: prev.log.slice(),
  };
  const first = prev.prices.length === 0 ? 0 : Math.floor(prev.simTime) + 1;
  for (let sec = first; sec <= Math.floor(target); sec++) processSecond(w, sec);
  w.simTime = target;
  w.stage = stageAt(target);
  if (target >= SIM_END) w.phase = 'ended';
  return w;
}

interface StoreLike<S extends SimState> {
  getState: () => S;
  setState: (partial: Partial<S>) => void;
}

/**
 * Start the 250ms real-time loop. Returns a stop function.
 *
 * Each tick advances by the real time actually elapsed (nominally 0.25s x speed), so the
 * clock keeps pace when the browser throttles timers in a background tab. Capped at 1s
 * per tick so waking a sleeping laptop doesn't jump the incident forward.
 */
export function startEngine<S extends SimState>(store: StoreLike<S>): () => void {
  let last = performance.now();
  const id = setInterval(() => {
    const now = performance.now();
    const elapsed = Math.min(1, (now - last) / 1000);
    last = now;
    const s = store.getState();
    if (s.phase !== 'running') return;
    store.setState(advance(s, s.simTime + elapsed * s.speed));
  }, TICK_MS);
  return () => clearInterval(id);
}
