import { useMemo } from 'react';
import { useStore, useMakegoodTotals } from '../../core/store';
import { fmtT, fmtUSD } from '../../core/format';
import { Pill } from '../../ui/Panel';

interface TimelineItem {
  tMinutes: number;
  timeLabel: string;
  title: string;
  description: string;
  tone: 'cyan' | 'orange' | 'green' | 'muted';
}

export function ComparisonDrawer() {
  const responder = useStore((s) => s.responder);
  const comms = useStore((s) => s.comms);
  const confirmedAt = useStore((s) => s.makegoodsConfirmedAt);
  const humanCallsUsed = useStore((s) => s.humanCallsUsed);
  const { count, total } = useMakegoodTotals();

  // Protocol timeline dynamically populated from store events
  const protocolEvents: TimelineItem[] = useMemo(() => {
    const events: TimelineItem[] = [
      {
        tMinutes: 0,
        timeLabel: 'T+00:00',
        title: 'Watchdog Feed Divergence (DETECT)',
        description: '3-feed median detects outlier. Zero human latency.',
        tone: 'cyan',
      },
      {
        tMinutes: 1,
        timeLabel: responder.pagedAt ? fmtT(responder.pagedAt) : 'T+01:00',
        title: 'IST On-Call Responder Paged',
        description: `${responder.name} alerted via high-priority pager in IST timezone.`,
        tone: 'cyan',
      },
      {
        tMinutes: 2,
        timeLabel: 'T+02:00',
        title: 'Asymmetric Circuit Breaker (CONTAIN)',
        description: 'New leveraged opens halted immediately. Exits, top-ups, and withdrawals remain open.',
        tone: 'orange',
      },
      {
        tMinutes: 4,
        timeLabel: responder.ackAt ? fmtT(responder.ackAt) : 'T+04:00',
        title: 'IST Responder Acknowledged',
        description: 'Human eyes on terminal to verify system execution.',
        tone: 'cyan',
      },
      {
        tMinutes: 5,
        timeLabel: 'T+05:00',
        title: 'Public Status Page & User Push',
        description: 'Automated broadcast to all open positions; social anxiety immediately damped.',
        tone: 'cyan',
      },
      {
        tMinutes: 15,
        timeLabel: 'T+15:00',
        title: 'Deviation Doctrine Test (DECIDE)',
        description: 'Pure function tests every liquidation against median. Verdicts determined mathematically.',
        tone: 'green',
      },
      {
        tMinutes: 30,
        timeLabel: 'T+30:00',
        title: 'Makegood Queue Ready',
        description: `${count} makegoods queued (${fmtUSD(total)}) from Segregated Integrity Reserve.`,
        tone: 'orange',
      },
    ];

    if (confirmedAt !== null) {
      events.push({
        tMinutes: Math.round(confirmedAt / 60),
        timeLabel: fmtT(confirmedAt),
        title: 'Human Call: Makegoods Confirmed',
        description: `Single authorized click dispatched funds (${fmtUSD(total)}) to affected accounts.`,
        tone: 'green',
      });
    }

    events.push({
      tMinutes: 60,
      timeLabel: 'T+60:00',
      title: 'Full Public Disclosure (DISCLOSE)',
      description: 'Comprehensive feed data, verdicts, and reserve ledger published openly.',
      tone: 'cyan',
    });

    return events.sort((a, b) => a.tMinutes - b.tMinutes);
  }, [responder, comms, confirmedAt, count, total]);

  const manualEvents: TimelineItem[] = [
    {
      tMinutes: 0,
      timeLabel: 'T+00:00',
      title: 'Crash begins silently',
      description: 'Exchange triggers cascading bad liquidations while SF founders are asleep (2 AM PST).',
      tone: 'muted',
    },
    {
      tMinutes: 25,
      timeLabel: 'T+25:00',
      title: 'Social panic escalates',
      description: 'Telegram, Reddit, and X flood with liquidation screenshots. Scammers capitalize.',
      tone: 'orange',
    },
    {
      tMinutes: 40,
      timeLabel: '~T+40:00',
      title: 'Founder woken up',
      description: 'Automated phone calls finally wake lead founder in San Francisco after dozens of missed alerts.',
      tone: 'orange',
    },
    {
      tMinutes: 55,
      timeLabel: '~T+55:00',
      title: 'Emergency founder sync',
      description: 'Founders jump on Zoom, groggy and arguing over whether to freeze the DB or roll back.',
      tone: 'muted',
    },
    {
      tMinutes: 75,
      timeLabel: '~T+75:00',
      title: 'Total platform freeze',
      description: 'Engineers manually pull the plug. Exits and withdrawals are trapped; users panic.',
      tone: 'orange',
    },
    {
      tMinutes: 90,
      timeLabel: '~T+90:00',
      title: 'First public statement',
      description: 'Vague tweet: "We are investigating reports of pricing anomalies." Trust eroded.',
      tone: 'muted',
    },
    {
      tMinutes: 99,
      timeLabel: 'Days 2–7',
      title: 'Chaotic case-by-case review',
      description: 'Support inbox flooded with 4,000+ dispute tickets. Inconsistent payouts and PR crisis.',
      tone: 'orange',
    },
  ];

  // Store metrics
  const firstCommsTime = comms.find((c) => c.status === 'sent')?.t;
  const protocolFirstMsgMin = firstCommsTime !== undefined ? Math.max(1, Math.round(firstCommsTime / 60)) : 5;

  return (
    <div className="space-y-6 pb-6">
      {/* Thesis Header */}
      <div className="rounded-xl border border-cyan/30 bg-gradient-to-r from-surface to-surface-2 p-4">
        <div className="text-xs font-bold tracking-wider text-cyan uppercase">Round 1 Thesis Proven</div>
        <h3 className="mt-1 text-base font-semibold text-ink">
          &ldquo;Three people cannot out-react a flash crash.&rdquo;
        </h3>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          Every decision is committed in advance: pricing rules, asymmetric circuit breakers, and compensation doctrines.
          Humans execute exactly <strong className="text-ink font-semibold">ONE call</strong>: verifying and confirming
          the auto-calculated makegood list.
        </p>
      </div>

      {/* Side-by-Side Headline Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-line bg-surface-2/60 p-3">
          <div className="text-[11px] font-medium text-muted">Time to First Message</div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="num text-base font-bold text-green">{protocolFirstMsgMin} min</span>
            <span className="num text-xs text-muted line-through">~90 min</span>
          </div>
          <div className="mt-1 text-[10px] text-muted">Auto status page + push</div>
        </div>

        <div className="rounded-lg border border-line bg-surface-2/60 p-3">
          <div className="text-[11px] font-medium text-muted">Time to Verdict</div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="num text-base font-bold text-green">15 min</span>
            <span className="num text-xs text-muted line-through">Days–Weeks</span>
          </div>
          <div className="mt-1 text-[10px] text-muted">Algorithmic deviation test</div>
        </div>

        <div className="rounded-lg border border-line bg-surface-2/60 p-3">
          <div className="text-[11px] font-medium text-muted">Human Calls Needed</div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="num text-base font-bold text-cyan">
              {humanCallsUsed} of 1 used
            </span>
            <span className="text-xs text-muted line-through">Chaotic</span>
          </div>
          <div className="mt-1 text-[10px] text-muted">Makegood authorization only</div>
        </div>

        <div className="rounded-lg border border-line bg-surface-2/60 p-3">
          <div className="text-[11px] font-medium text-muted">Uncovered Hours / Day</div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="num text-base font-bold text-green">0 hrs</span>
            <span className="num text-xs text-muted line-through">8 hrs</span>
          </div>
          <div className="mt-1 text-[10px] text-muted">IST on-call gap coverage</div>
        </div>
      </div>

      {/* Two Side-by-Side Timelines */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Protocol Timeline (Right in thesis, left or prominent) */}
        <div className="rounded-xl border border-cyan/30 bg-surface p-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <div>
              <h4 className="text-xs font-bold text-cyan uppercase tracking-wider">Dead-Hand Protocol</h4>
              <p className="text-[11px] text-muted">MochaTrade automated execution</p>
            </div>
            <Pill tone="cyan">Live Store Run Data</Pill>
          </div>

          <div className="relative mt-4 space-y-4 pl-4 before:absolute before:bottom-2 before:left-1.5 before:top-2 before:w-0.5 before:bg-line">
            {protocolEvents.map((evt, idx) => (
              <div key={idx} className="relative">
                <div
                  className={`absolute -left-[19px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-surface ${
                    evt.tone === 'green'
                      ? 'bg-green'
                      : evt.tone === 'orange'
                      ? 'bg-orange'
                      : 'bg-cyan'
                  }`}
                />
                <div className="flex items-center gap-2">
                  <span className="num text-xs font-bold text-cyan">{evt.timeLabel}</span>
                  <span className="text-xs font-semibold text-ink">{evt.title}</span>
                </div>
                <p className="mt-0.5 text-[11px] leading-relaxed text-muted">{evt.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Manual Response Timeline */}
        <div className="rounded-xl border border-line bg-surface/70 p-4">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <div>
              <h4 className="text-xs font-bold text-muted uppercase tracking-wider">Manual Response</h4>
              <p className="text-[11px] text-muted">
                <span className="italic">illustrative typical response</span>
              </p>
            </div>
            <Pill tone="muted">Industry Baseline</Pill>
          </div>

          <div className="relative mt-4 space-y-4 pl-4 before:absolute before:bottom-2 before:left-1.5 before:top-2 before:w-0.5 before:bg-line/40">
            {manualEvents.map((evt, idx) => (
              <div key={idx} className="relative">
                <div
                  className={`absolute -left-[19px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-surface ${
                    evt.tone === 'orange' ? 'bg-orange/80' : 'bg-muted/60'
                  }`}
                />
                <div className="flex items-center gap-2">
                  <span className="num text-xs font-semibold text-muted">{evt.timeLabel}</span>
                  <span className="text-xs font-semibold text-ink/80">{evt.title}</span>
                </div>
                <p className="mt-0.5 text-[11px] leading-relaxed text-muted/80">{evt.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Asymmetric Breaker Advantage Note */}
      <div className="rounded-lg border border-line bg-surface-2/40 p-3 text-xs leading-relaxed text-muted">
        <strong className="text-ink">Key Difference in Containment:</strong> In manual responses, panicked teams freeze the entire database, trapping traders inside losing positions and blocking collateral top-ups.
        Under the Dead-Hand Protocol, the breaker is strictly <span className="text-cyan font-semibold">asymmetric</span>: only new leveraged opens are halted, while margin top-ups, position reductions, closes, and withdrawals remain continuously functional.
      </div>
    </div>
  );
}
