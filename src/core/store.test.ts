import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useStore } from './store';
import { advance, createInitialState, makegoodTotals, SIM_END, T } from './engine';
import { buildFixture } from './fixture';
import { feedStatusOf } from './watchdog';
import type { ScenarioId } from './types';

const get = () => useStore.getState();

/** Drive the store the way the 250ms loop does, without real time. */
function runStoreTo(to: number) {
  while (get().simTime < to && get().phase === 'running') {
    useStore.setState(advance(get(), Math.min(to, get().simTime + 15)));
  }
}

beforeEach(() => {
  vi.useFakeTimers();
  useStore.setState({ ...createInitialState('system_fault') });
});
afterEach(() => vi.useRealTimers());

describe('setup controls', () => {
  it('band snaps to 0.25 steps within 0.5-5.0 and locks on Start', () => {
    get().setBand(3.1);
    expect(get().bandPct).toBe(3);
    get().setBand(9);
    expect(get().bandPct).toBe(5);
    get().setBand(0.1);
    expect(get().bandPct).toBe(0.5);
    get().setBand(2);
    get().start();
    expect(get().bandLocked).toBe(true);
    get().setBand(4);
    expect(get().bandPct).toBe(2);
  });

  it('scenario cannot change mid-run, but can after the run ends', () => {
    get().start();
    get().setScenario('market_move');
    expect(get().scenario).toBe('system_fault');
    get().pause();
    get().setScenario('market_move');
    expect(get().scenario).toBe('system_fault');
    useStore.setState({ phase: 'ended' });
    get().setScenario('market_move');
    expect(get()).toMatchObject({ scenario: 'market_move', phase: 'setup', simTime: 0, bandLocked: false, liquidations: [] });
  });

  it('start processes T+00:00 immediately; pause stops the clock; resume continues', () => {
    get().start();
    expect(get().phase).toBe('running');
    expect(get().prices).toHaveLength(1);
    expect(get().log[0].text).toMatch(/^DETECT/);
    runStoreTo(100);
    get().pause();
    expect(get().phase).toBe('paused');
    get().resume();
    expect(get().phase).toBe('running');
    get().start(); // no-op while running
    expect(get().simTime).toBe(100);
  });

  it('reset keeps scenario, band and speed but clears the run', () => {
    get().setScenario('historical_replay');
    get().setBand(3);
    get().setSpeed(60);
    get().start();
    runStoreTo(600);
    get().reset();
    expect(get()).toMatchObject({ scenario: 'historical_replay', bandPct: 3, speed: 60, phase: 'setup', bandLocked: false, simTime: 0, log: [], comms: [] });
  });
});

describe('the one human call', () => {
  it('confirms once, pays after a short delay, and logs a human entry', () => {
    get().start();
    runStoreTo(T.makegoodsQueued + 60);
    const { count, total } = makegoodTotals(get().liquidations);
    expect(count).toBeGreaterThan(0);

    get().confirmMakegoods();
    expect(get().humanCallsUsed).toBe(1);
    expect(get().makegoodsConfirmedAt).toBe(T.makegoodsQueued + 60);
    expect(get().liquidations.filter((l) => l.status === 'confirmed')).toHaveLength(count);
    expect(get().log.at(-1)).toMatchObject({ actor: 'human', stage: 'decide' });
    expect(get().reserveBalance).toBe(250000);

    vi.runAllTimers();
    expect(get().liquidations.filter((l) => l.status === 'paid')).toHaveLength(count);
    expect(get().reserveBalance).toBeCloseTo(250000 - total, 2);

    const logLen = get().log.length;
    get().confirmMakegoods();
    vi.runAllTimers();
    expect(get().humanCallsUsed).toBe(1);
    expect(get().log.length).toBe(logLen);
  });

  it('does nothing before T+30:00 or when nothing is owed', () => {
    get().start();
    runStoreTo(T.makegoodsQueued - 1);
    get().confirmMakegoods();
    expect(get().humanCallsUsed).toBe(0);

    useStore.setState({ ...createInitialState('market_move') });
    get().start();
    runStoreTo(T.makegoodsQueued);
    expect(get().makegoodButtonVisible).toBe(true);
    get().confirmMakegoods();
    expect(get().humanCallsUsed).toBe(0);
  });

  it('pays pro-rata and discloses when the reserve is short', () => {
    useStore.setState({ ...createInitialState('system_fault'), reserveStart: 1000, reserveBalance: 1000 });
    get().start();
    runStoreTo(T.makegoodsQueued);
    const { total } = makegoodTotals(get().liquidations);
    expect(total).toBeGreaterThan(1000);
    get().confirmMakegoods();
    vi.runAllTimers();
    expect(get().reserveBalance).toBe(0);
    expect(get().log.at(-1)!.text).toMatch(/pro-rata/);
    expect(get().comms.find((c) => c.t === T.makegoodsQueued)!.body).toMatch(/pro-rata/);
    runStoreTo(SIM_END);
    const post = get().comms.find((c) => c.channel === 'x_post')!.body;
    expect(post).toMatch(/pro-rata/);
    expect(post).toContain('$1,000.00');
  });

  it('final post says "being paid" if nobody confirmed, and "in full" if they did', () => {
    get().start();
    runStoreTo(SIM_END);
    expect(get().comms.find((c) => c.channel === 'x_post')!.body).toMatch(/being paid/);
    useStore.setState({ ...createInitialState('system_fault') });
    get().start();
    runStoreTo(T.makegoodsQueued);
    get().confirmMakegoods();
    vi.runAllTimers();
    runStoreTo(SIM_END);
    expect(get().comms.find((c) => c.channel === 'x_post')!.body).toMatch(/paid in full/);
  });

  it('a reset before payout cancels it', () => {
    get().start();
    runStoreTo(T.makegoodsQueued);
    get().confirmMakegoods();
    get().reset();
    vi.runAllTimers();
    expect(get()).toMatchObject({ reserveBalance: 250000, humanCallsUsed: 0, log: [] });
  });

  it('works from the fixture (confirm, then resume to the end)', () => {
    useStore.setState(buildFixture());
    expect(get().phase).toBe('paused');
    get().confirmMakegoods();
    vi.runAllTimers();
    get().resume();
    runStoreTo(SIM_END);
    expect(get().phase).toBe('ended');
    expect(get().comms.find((c) => c.channel === 'x_post')!.body).toContain(`$${get().reserveBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
  });
});

describe('protocol rules', () => {
  it.each(['system_fault', 'market_move', 'historical_replay'] as ScenarioId[])('%s: no liquidation happens while feeds disagree', (sc) => {
    let s = advance({ ...createInitialState(sc), phase: 'running', bandLocked: true }, 0);
    s = advance(s, SIM_END);
    for (const l of s.liquidations) {
      const sample = s.prices.find((p) => p.t === l.t - (l.t % 5))!;
      expect(feedStatusOf(sample)).not.toBe('liquidations_paused');
    }
  });

  it.each(['system_fault', 'market_move', 'historical_replay'] as ScenarioId[])('%s: makegoods never pay profit', (sc) => {
    let s = advance({ ...createInitialState(sc), phase: 'running', bandLocked: true }, 0);
    s = advance(s, SIM_END);
    for (const l of s.liquidations) {
      const favourable = l.side === 'long' ? l.executionPrice >= l.referenceMedian : l.executionPrice <= l.referenceMedian;
      if (favourable) expect(l.amountOwed).toBe(0);
      if (l.verdict === 'makegood') expect(l.deviationPct!).toBeGreaterThan(s.bandPct);
    }
  });

  it('exits stay open for the whole hour in every scenario', () => {
    for (const sc of ['system_fault', 'market_move', 'historical_replay'] as ScenarioId[]) {
      let s = advance({ ...createInitialState(sc), phase: 'running', bandLocked: true }, 0);
      for (let t = 0; t <= SIM_END; t += 300) {
        s = advance(s, t);
        expect(s.orderTypes).toMatchObject({ topUp: true, reduce: true, close: true, withdraw: true });
      }
    }
  });
});
