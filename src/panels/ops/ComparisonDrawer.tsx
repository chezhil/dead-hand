// OWNER: Agent C (Hamza). Manual response vs Dead-Hand Protocol on the same 0-90 min axis.
// The protocol lane uses real times from this run's store; the manual lane is illustrative.
import { useMakegoodTotals, useStore } from '../../core/store';
import { T } from '../../core/engine';
import { fmtT, fmtUSD } from '../../core/format';
import { Pill } from '../../ui/Panel';

const AXIS_MIN = 90;

interface LaneEvent {
  /** sim seconds */
  t: number;
  label: string;
  detail: string;
  done: boolean;
  /** labelled on the axis (others are just ticks) */
  milestone?: boolean;
  tone: 'cyan' | 'orange' | 'green' | 'muted';
  /** overrides the T+MM:SS label in the list */
  timeLabel?: string;
}

const MANUAL: LaneEvent[] = [
  { t: 0, label: 'Crash begins', detail: 'Bad liquidations cascade while the SF founders are asleep (2 AM).', done: true, tone: 'muted' },
  { t: 25 * 60, label: 'Social panic', detail: 'X, Telegram and Reddit fill with liquidation screenshots.', done: true, tone: 'orange' },
  { t: 40 * 60, label: 'Founder woken', detail: 'Phone calls finally wake a founder in San Francisco.', done: true, milestone: true, tone: 'orange' },
  { t: 55 * 60, label: 'Founder call', detail: 'Groggy call on whether to freeze everything or roll back.', done: true, tone: 'muted' },
  { t: 75 * 60, label: 'Full freeze', detail: 'Everything is halted, including exits and withdrawals. Users are trapped.', done: true, tone: 'orange' },
  { t: 90 * 60, label: 'First statement', detail: '"We are investigating reports of pricing anomalies."', done: true, milestone: true, tone: 'muted' },
];

const TONE_BG = { cyan: 'bg-cyan', orange: 'bg-orange', green: 'bg-green', muted: 'bg-muted' } as const;

function Lane({ title, sub, events, accent }: { title: string; sub: string; events: LaneEvent[]; accent: string }) {
  const milestones = events.filter((e) => e.milestone);
  return (
    <div className="grid grid-cols-[120px_1fr] items-center gap-3">
      <div>
        <div className={`text-xs font-semibold ${accent}`}>{title}</div>
        <div className="text-[10px] text-muted">{sub}</div>
      </div>
      <div className="relative h-16">
        <div className="absolute top-1/2 right-0 left-0 h-px bg-line" />
        {events.map((e) => (
          <div
            key={`${e.t}-${e.label}`}
            title={`${fmtT(e.t)} ${e.label}`}
            className={`absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface ${e.done ? TONE_BG[e.tone] : 'bg-surface-2 ring-1 ring-muted/60'}`}
            style={{ left: `${(Math.min(e.t, AXIS_MIN * 60) / (AXIS_MIN * 60)) * 100}%` }}
          />
        ))}
        {milestones.map((e, i) => {
          const pct = (Math.min(e.t, AXIS_MIN * 60) / (AXIS_MIN * 60)) * 100;
          const alignRight = pct > 80;
          return (
            <div
              key={`m-${e.label}`}
              className={`absolute ${i % 2 === 0 ? 'top-0' : 'bottom-0'} text-[10px] leading-tight whitespace-nowrap ${e.done ? 'text-ink' : 'text-muted'}`}
              style={alignRight ? { right: `${100 - pct}%` } : { left: `${pct}%`, transform: pct < 3 ? undefined : 'translateX(-50%)' }}
            >
              <span className="num text-muted">{fmtT(e.t)}</span> {e.label}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EventList({ events }: { events: LaneEvent[] }) {
  return (
    <ol className="relative mt-3 space-y-3 pl-4 before:absolute before:top-2 before:bottom-2 before:left-[5px] before:w-px before:bg-line">
      {events.map((e) => (
        <li key={`${e.t}-${e.label}`} className="relative">
          <span className={`absolute top-1.5 -left-[15px] h-2.5 w-2.5 rounded-full border-2 border-surface ${e.done ? TONE_BG[e.tone] : 'bg-surface-2 ring-1 ring-muted/60'}`} />
          <div className="flex items-baseline gap-2">
            <span className={`num text-xs font-semibold ${e.done ? 'text-cyan' : 'text-muted'}`}>{e.timeLabel ?? fmtT(e.t)}</span>
            <span className={`text-xs font-semibold ${e.done ? 'text-ink' : 'text-muted'}`}>{e.label}</span>
            {!e.done && <span className="text-[10px] text-muted">scheduled</span>}
          </div>
          <p className="mt-0.5 text-[11px] leading-relaxed text-muted">{e.detail}</p>
        </li>
      ))}
    </ol>
  );
}

export function ComparisonDrawer() {
  const phase = useStore((s) => s.phase);
  const simTime = useStore((s) => s.simTime);
  const responder = useStore((s) => s.responder);
  const comms = useStore((s) => s.comms);
  const confirmedAt = useStore((s) => s.makegoodsConfirmedAt);
  const humanCallsUsed = useStore((s) => s.humanCallsUsed);
  const { count, total } = useMakegoodTotals();

  const started = phase !== 'setup';
  const happened = (t: number) => started && simTime >= t;
  const firstMsg = comms.find((c) => c.status === 'sent')?.t ?? T.statusPage;

  const protocolEvents: LaneEvent[] = [
    { t: T.detect, label: 'Divergence detected', detail: 'Watchdog flags the feeds. No human in the loop.', done: happened(T.detect), tone: 'cyan' },
    { t: responder.pagedAt ?? T.paged, label: 'Responder paged', detail: `${responder.name}, IST on-call, is paged.`, done: happened(T.paged), tone: 'cyan' },
    { t: T.halt, label: 'New leverage halted', detail: 'Asymmetric breaker: exits, top-ups and withdrawals stay open.', done: happened(T.halt), tone: 'orange' },
    { t: responder.ackAt ?? T.ack, label: 'Responder acknowledges', detail: 'Human eyes on the console; nothing to decide yet.', done: happened(T.ack), tone: 'cyan' },
    { t: firstMsg, label: 'First user message', detail: 'Status page and push to every open position, sent automatically.', done: happened(firstMsg), milestone: true, tone: 'cyan' },
    { t: T.deviationTest, label: 'Verdict', detail: 'Deviation test runs on every liquidation. Verdicts are arithmetic, not opinion.', done: happened(T.deviationTest), milestone: true, tone: 'green' },
    {
      t: T.makegoodsQueued,
      label: count > 0 ? 'Makegoods queued' : 'Nothing owed',
      detail: count > 0 ? `${count} makegoods (${fmtUSD(total)}) queued from the Integrity Reserve.` : 'All executions within band; no makegoods.',
      done: happened(T.makegoodsQueued),
      milestone: true,
      tone: 'orange',
    },
    ...(confirmedAt !== null
      ? [{ t: confirmedAt, label: 'Human call: confirmed', detail: 'The one human decision: confirm the pre-computed list.', done: true, tone: 'green' as const }]
      : []),
    { t: T.disclose, label: 'Public post', detail: 'Feed data, verdict and what we owe, published.', done: happened(T.disclose), milestone: true, tone: 'cyan' },
  ];
  const protocol = protocolEvents.sort((a, b) => a.t - b.t);

  const stats = [
    { label: 'Minutes to first user message', ours: `${Math.round(firstMsg / 60)}`, theirs: '~90' },
    { label: 'Minutes to verdict', ours: `${Math.round(T.deviationTest / 60)}`, theirs: 'days' },
    // One call if anything is owed, none if not; unknown (at most one) until the verdict is in.
    { label: 'Human decisions needed', ours: humanCallsUsed > 0 ? '1' : happened(T.deviationTest) ? String(count > 0 ? 1 : 0) : '≤1', theirs: 'dozens' },
    { label: 'Uncovered hours per day', ours: '0', theirs: '8' },
  ];

  return (
    <div className="space-y-6 pb-4">
      <div className="rounded-xl border border-cyan/30 bg-surface-2/50 p-4">
        <div className="text-[11px] font-bold tracking-wider text-cyan uppercase">Round 1 thesis</div>
        <h3 className="mt-1 text-base font-semibold text-ink">&ldquo;Three people cannot out-react a flash crash.&rdquo;</h3>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          So every decision is made in advance. In the first hour, humans make exactly one call: confirming the auto-queued makegood list.
        </p>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {stats.map((st) => (
          <div key={st.label} className="rounded-lg border border-line bg-surface-2/50 p-3">
            <div className="text-[11px] leading-tight text-muted">{st.label}</div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="num text-2xl font-semibold text-green">{st.ours}</span>
              <span className="num text-xs text-muted line-through">{st.theirs}</span>
            </div>
          </div>
        ))}
      </div>

      <section className="rounded-xl border border-line bg-navy/40 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-ink">Same incident, same clock</h4>
          <span className="text-[11px] text-muted">Minutes since crash, 0 to {AXIS_MIN}</span>
        </div>
        <div className="space-y-2">
          <Lane title="Dead-Hand Protocol" sub={started ? 'this run, from the store' : 'scheduled'} events={protocol} accent="text-cyan" />
          <Lane title="Manual response" sub="illustrative typical response" events={MANUAL} accent="text-muted" />
        </div>
        <div className="mt-1 grid grid-cols-[120px_1fr] gap-3">
          <div />
          <div className="num flex justify-between text-[10px] text-muted">
            {[0, 15, 30, 45, 60, 75, 90].map((m) => (
              <span key={m}>{fmtT(m * 60)}</span>
            ))}
          </div>
        </div>
        <p className="mt-3 text-[11px] text-muted">
          Manual response continues past the chart: refunds decided case by case over the following days.
        </p>
      </section>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-cyan/30 bg-surface p-4">
          <div className="flex items-center justify-between border-b border-line pb-2">
            <h4 className="text-xs font-bold tracking-wider text-cyan uppercase">Dead-Hand Protocol</h4>
            <Pill tone="cyan">{started ? 'Live run data' : 'Scheduled'}</Pill>
          </div>
          <EventList events={protocol} />
        </div>
        <div className="rounded-xl border border-line bg-surface/70 p-4">
          <div className="flex items-center justify-between border-b border-line pb-2">
            <h4 className="text-xs font-bold tracking-wider text-muted uppercase">Manual response</h4>
            <Pill tone="muted">Illustrative typical response</Pill>
          </div>
          <EventList
            events={[
              ...MANUAL,
              { t: AXIS_MIN * 60 + 1, timeLabel: 'Days 2-7', label: 'Refunds case by case', detail: 'Thousands of tickets, inconsistent payouts, lasting loss of trust.', done: true, tone: 'orange' },
            ]}
          />
        </div>
      </div>

      <div className="rounded-lg border border-line bg-surface-2/40 p-3 text-xs leading-relaxed text-muted">
        <strong className="text-ink">Containment is the other difference.</strong> A panicked team freezes everything and traps users in losing
        positions. The protocol's breaker is <span className="font-semibold text-cyan">asymmetric</span>: only new leveraged opens stop; top-up,
        reduce, close and withdraw never freeze.
      </div>
    </div>
  );
}
