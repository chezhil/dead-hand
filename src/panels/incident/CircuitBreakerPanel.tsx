import { useStore } from '../../core/store';
import { projectedReopenAt, REOPEN_AFTER_AGREE, T } from '../../core/engine';
import { fmtT } from '../../core/format';
import type { OrderTypes } from '../../core/types';
import { Panel, Pill } from '../../ui/Panel';

const ROWS: { key: keyof OrderTypes; label: string; hint?: string }[] = [
  { key: 'newLeverage', label: 'New leveraged opens', hint: 'Adds risk at a price we may not trust' },
  { key: 'topUp', label: 'Top-up margin', hint: 'Lets users defend a position' },
  { key: 'reduce', label: 'Reduce position' },
  { key: 'close', label: 'Close position' },
  { key: 'withdraw', label: 'Withdraw' },
];

const REOPEN_MIN = REOPEN_AFTER_AGREE / 60;

/** Where the reopening rule stands: waiting for agreement, counting down, or done. */
function ReopenStatus() {
  const simTime = useStore((s) => s.simTime);
  const haltedAt = useStore((s) => s.leverageHaltedAt);
  const reopenedAt = useStore((s) => s.leverageReopenedAt);
  const agreeSince = useStore((s) => s.feedsAgreeSince);
  const orderTypes = useStore((s) => s.orderTypes);
  const reopenAt = projectedReopenAt({ orderTypes, leverageHaltedAt: haltedAt, feedsAgreeSince: agreeSince });

  if (haltedAt === null) {
    return <p className="text-[11px] text-muted">Rule: halts new leverage at {fmtT(T.halt)}; reopens once all three feeds agree for {REOPEN_MIN} minutes.</p>;
  }
  if (reopenedAt !== null) {
    return (
      <p className="text-[11px] text-green">
        Reopened automatically at <span className="num">{fmtT(reopenedAt)}</span>: feeds agreed for {REOPEN_MIN} minutes. No human call.
      </p>
    );
  }
  if (reopenAt === null) {
    return <p className="text-[11px] text-orange">Feeds disagree. New leverage reopens {REOPEN_MIN} minutes after all three agree.</p>;
  }
  const progress = Math.min(1, Math.max(0, (simTime - agreeSince!) / REOPEN_AFTER_AGREE));
  return (
    <div>
      <div className="flex items-baseline justify-between text-[11px]">
        <span className="text-muted">Feeds agreeing; reopens automatically at</span>
        <span className="num font-semibold text-cyan">{fmtT(reopenAt)}</span>
      </div>
      <div className="mt-1 h-1 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
        <div className="h-full rounded-full bg-cyan/70" style={{ width: `${progress * 100}%` }} />
      </div>
    </div>
  );
}

export function CircuitBreakerPanel() {
  const orderTypes = useStore((s) => s.orderTypes);
  const haltedAt = useStore((s) => s.leverageHaltedAt);
  const reopenedAt = useStore((s) => s.leverageReopenedAt);
  const halted = !orderTypes.newLeverage;

  const subtitle = halted
    ? `Halted at ${fmtT(haltedAt ?? T.halt)}: new risk only`
    : reopenedAt !== null
      ? `Reopened at ${fmtT(reopenedAt)}`
      : `Arms at ${fmtT(T.halt)}`;

  return (
    <Panel
      title="Asymmetric circuit breaker"
      subtitle={subtitle}
      right={halted ? <Pill tone="orange">1 halted</Pill> : <Pill tone="green">All open</Pill>}
    >
      <ul className="divide-y divide-line/70">
        {ROWS.map((r) => {
          const open = orderTypes[r.key];
          return (
            <li key={r.key} className="flex items-center justify-between gap-3 py-1.5">
              <div className="min-w-0">
                <div className="text-sm text-ink">{r.label}</div>
                {r.hint && <div className="truncate text-[11px] text-muted">{r.hint}</div>}
              </div>
              {open ? <Pill tone="green">● Open</Pill> : <Pill tone="orange">❚❚ Halted</Pill>}
            </li>
          );
        })}
      </ul>
      <div className="mt-1.5 rounded-md border border-line bg-navy/40 px-2.5 py-1.5">
        <ReopenStatus />
      </div>
      <div className="mt-1.5 rounded-md border border-green/25 bg-green/5 px-2.5 py-1 text-xs text-green">Exits never freeze.</div>
    </Panel>
  );
}
