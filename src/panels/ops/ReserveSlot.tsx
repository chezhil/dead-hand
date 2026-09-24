import { useStore } from '../../core/store';
import { payoutSummary } from '../../core/engine';
import { fmtPct, fmtUSD, round2 } from '../../core/format';
import { Panel, Pill } from '../../ui/Panel';

export function ReserveSlot() {
  const reserveStart = useStore((s) => s.reserveStart);
  const reserveBalance = useStore((s) => s.reserveBalance);
  const liquidations = useStore((s) => s.liquidations);
  // Only makegoods not yet paid are still claims on the reserve.
  const totalOwed = round2(
    liquidations.reduce((sum, l) => (l.verdict === 'makegood' && l.status !== 'paid' ? sum + l.amountOwed : sum), 0),
  );

  const paidOut = Math.max(0, round2(reserveStart - reserveBalance));
  const remainingPct = Math.max(0, Math.min(100, (reserveBalance / reserveStart) * 100));

  // Short either now (unpaid claims exceed the balance) or already (a payout was pro-rata).
  const payout = payoutSummary({ liquidations, reserveStart, reserveBalance });
  const shortNow = totalOwed > reserveBalance;
  const isShort = shortNow || payout.short;
  const proRataPct = shortNow ? Math.max(0, (reserveBalance / totalOwed) * 100) : payout.paidRatio * 100;

  return (
    <Panel
      title="Integrity Reserve"
      subtitle="Public segregated treasury"
      right={
        isShort ? (
          <Pill tone="orange">Reserve Short: Pro-Rata</Pill>
        ) : (
          <Pill tone="green">Solvent</Pill>
        )
      }
    >
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2 rounded-lg border border-line bg-surface-2/40 p-3">
          <div>
            <div className="text-[11px] font-medium text-muted">Current Balance</div>
            <div className="num mt-0.5 text-base font-bold text-ink">
              {fmtUSD(reserveBalance)}
            </div>
          </div>
          <div>
            <div className="text-[11px] font-medium text-muted">Starting Balance</div>
            <div className="num mt-0.5 text-sm text-muted">
              {fmtUSD(reserveStart)}
            </div>
          </div>
          <div>
            <div className="text-[11px] font-medium text-muted">Amount Paid Out</div>
            <div className={`num mt-0.5 text-sm font-semibold ${paidOut > 0 ? 'text-orange' : 'text-muted'}`}>
              {fmtUSD(paidOut)}
            </div>
          </div>
        </div>

        {/* Coverage Progress Bar */}
        <div>
          <div className="flex items-center justify-between text-[11px] text-muted mb-1">
            <span>Reserve Coverage</span>
            <span className="num font-medium text-ink">{fmtPct(remainingPct, 1)} remaining</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
            <div
              className={`h-full transition-all duration-500 ${
                remainingPct < 25 ? 'bg-orange' : 'bg-cyan'
              }`}
              style={{ width: `${remainingPct}%` }}
            />
          </div>
        </div>

        {/* Shortfall warning if owed > balance */}
        {isShort && (
          <div className="rounded-md border border-orange/40 bg-orange/10 px-3 py-2 text-xs text-orange">
            <div className="font-semibold">Reserve short: paying pro-rata</div>
            <div className="mt-0.5 text-[11px] text-orange/90">
              {shortNow ? (
                <>Claims exceed available balance ({fmtUSD(totalOwed)} owed vs {fmtUSD(reserveBalance)} reserve). </>
              ) : (
                <>Paid {fmtUSD(payout.paid)} of {fmtUSD(payout.owedOnPaid)} owed; shortfall {fmtUSD(payout.shortfall)}. </>
              )}
              Pro-rata payout factor: <strong className="num font-bold">{fmtPct(proRataPct, 1)}</strong>. Shortfall is publicly disclosed.
            </div>
          </div>
        )}

        <div className="rounded border border-line/60 bg-surface/40 px-2.5 py-1.5 text-[11px] text-muted italic">
          Funded by 10% of gross trading fees, segregated, never used for operating costs.
        </div>
      </div>
    </Panel>
  );
}
