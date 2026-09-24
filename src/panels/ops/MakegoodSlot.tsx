import { useStore, useMakegoodTotals } from '../../core/store';
import { fmtT, fmtUSD } from '../../core/format';
import { Panel, Pill } from '../../ui/Panel';

export function MakegoodSlot() {
  const visible = useStore((s) => s.makegoodButtonVisible);
  const confirmedAt = useStore((s) => s.makegoodsConfirmedAt);
  const humanCallsUsed = useStore((s) => s.humanCallsUsed);
  const confirm = useStore((s) => s.confirmMakegoods);
  const { count, total } = useMakegoodTotals();

  const isConfirmed = confirmedAt !== null || humanCallsUsed >= 1;

  return (
    <Panel
      title="Makegood Authorization"
      subtitle="The one human call in the first hour"
      right={
        isConfirmed ? (
          <Pill tone="green">Human Call: 1 of 1 Used</Pill>
        ) : visible && count > 0 ? (
          <Pill tone="orange">Action Required</Pill>
        ) : (
          <Pill tone="muted">Autopilot</Pill>
        )
      }
    >
      <div className="flex min-h-[110px] flex-col justify-center rounded-lg border border-line bg-surface-2/40 p-4">
        {!visible ? (
          <div className="text-center">
            <div className="text-xs font-medium text-muted">
              Auto-queue unlocks at <span className="num font-semibold text-cyan">T+30:00</span>
            </div>
            <div className="mt-1 text-[11px] text-muted/70">
              Protocol runs autonomously until the 30-minute mark.
            </div>
          </div>
        ) : count === 0 ? (
          <div className="text-center">
            <div className="text-xs font-semibold text-green">
              No makegoods owed: all executions within band.
            </div>
            <div className="mt-1 text-[11px] text-muted">
              Market-driven move confirmed. Transparency disclosures scheduled.
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted">
                <strong className="text-ink">{count}</strong> makegoods queued,{' '}
                <strong className="text-ink">{fmtUSD(total)}</strong> total, paid from Integrity Reserve
              </span>
            </div>

            {isConfirmed ? (
              <div className="flex items-center justify-between rounded-lg border border-green/30 bg-green/10 px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-green">
                    ✓ Confirmed at {confirmedAt !== null ? fmtT(confirmedAt) : 'T+30:00'}
                  </span>
                  <span className="text-[11px] text-muted">
                    Payout dispatched to affected accounts
                  </span>
                </div>
                <Pill tone="green">Dispatched</Pill>
              </div>
            ) : (
              <button
                type="button"
                onClick={confirm}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-orange px-4 py-2.5 text-sm font-bold tracking-wide text-navy shadow-lg transition-transform active:scale-[0.99] hover:bg-orange/90"
              >
                <span>Confirm makegoods</span>
                <span className="num rounded bg-navy/20 px-2 py-0.5 text-xs text-navy font-semibold">
                  {fmtUSD(total)}
                </span>
              </button>
            )}
          </div>
        )}
      </div>
    </Panel>
  );
}
