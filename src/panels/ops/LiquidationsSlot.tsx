import { useMemo } from 'react';
import { useStore } from '../../core/store';
import { exceedsBand, fmtPct, fmtT, fmtUSD } from '../../core/format';
import { Panel, Pill } from '../../ui/Panel';

export function LiquidationsSlot() {
  const liquidations = useStore((s) => s.liquidations);
  const bandPct = useStore((s) => s.bandPct);
  const selectUser = useStore((s) => s.selectUser);
  const openDrawer = useStore((s) => s.openDrawer);

  const { makegoodsCount, noMakegoodsCount, totalOwed } = useMemo(() => {
    let makegoods = 0;
    let noMakegoods = 0;
    let owed = 0;
    for (const l of liquidations) {
      if (l.verdict === 'makegood') {
        makegoods++;
        owed += l.amountOwed;
      } else if (l.verdict === 'no_makegood') {
        noMakegoods++;
      }
    }
    return {
      makegoodsCount: makegoods,
      noMakegoodsCount: noMakegoods,
      totalOwed: Math.round(owed * 100) / 100,
    };
  }, [liquidations]);

  const handleRowClick = (userId: string) => {
    selectUser(userId);
    openDrawer('user');
  };

  return (
    <Panel
      title="Liquidations & Deviation Audit"
      subtitle={`${liquidations.length} positions liquidated · Click any row for user view`}
      right={
        <div className="flex flex-wrap items-center gap-2">
          <Pill tone="muted">Total: {liquidations.length}</Pill>
          <Pill tone={makegoodsCount > 0 ? 'orange' : 'green'}>
            Makegoods: {makegoodsCount}
          </Pill>
          <Pill tone="muted">No makegood: {noMakegoodsCount}</Pill>
          <Pill tone={totalOwed > 0 ? 'cyan' : 'muted'}>
            Owed: {fmtUSD(totalOwed)}
          </Pill>
        </div>
      }
    >
      <div className="flex max-h-[380px] flex-col overflow-hidden rounded-lg border border-line bg-surface-2/40">
        <div className="overflow-x-auto overflow-y-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="sticky top-0 z-10 border-b border-line bg-surface-2 text-[11px] font-semibold text-muted uppercase">
              <tr>
                <th className="px-3 py-2.5">Time</th>
                <th className="px-3 py-2.5">User</th>
                <th className="px-3 py-2.5">Side</th>
                <th className="px-3 py-2.5 text-right">Qty</th>
                <th className="px-3 py-2.5 text-right">Ref Median</th>
                <th className="px-3 py-2.5 text-right">Our Price</th>
                <th className="px-3 py-2.5 text-right">Deviation %</th>
                <th className="px-3 py-2.5 text-center">Verdict</th>
                <th className="px-3 py-2.5 text-right">Amount Owed</th>
                <th className="px-3 py-2.5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/40">
              {liquidations.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-3 py-8 text-center text-muted">
                    No liquidations recorded yet.
                  </td>
                </tr>
              ) : (
                liquidations
                  .slice()
                  .reverse()
                  .map((l) => {
                    const isExceedingBand =
                      l.deviationPct !== null && exceedsBand(l.deviationPct, bandPct);
                    const isAwaiting = l.status === 'untested' || l.deviationPct === null;

                    return (
                      <tr
                        key={l.id}
                        onClick={() => handleRowClick(l.userId)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleRowClick(l.userId);
                          }
                        }}
                        tabIndex={0}
                        aria-label={`${l.userName}, ${l.side} liquidated at ${fmtT(l.t)}. Open user view`}
                        className="cursor-pointer transition-colors outline-none hover:bg-surface/80 hover:text-cyan focus-visible:bg-surface/80 focus-visible:ring-1 focus-visible:ring-cyan/60"
                        title="Click to view user detail"
                      >
                        <td className="num px-3 py-2 text-muted">{fmtT(l.t)}</td>
                        <td className="px-3 py-2 font-medium text-ink">{l.userName}</td>
                        <td className="px-3 py-2">
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                              l.side === 'long'
                                ? 'bg-green/10 text-green'
                                : 'bg-orange/10 text-orange'
                            }`}
                          >
                            {l.side}
                          </span>
                        </td>
                        <td className="num px-3 py-2 text-right text-ink/90">
                          {l.qty}
                        </td>
                        <td className="num px-3 py-2 text-right text-muted">
                          {fmtUSD(l.referenceMedian)}
                        </td>
                        <td className="num px-3 py-2 text-right text-ink">
                          {fmtUSD(l.executionPrice)}
                        </td>
                        <td
                          className={`num px-3 py-2 text-right font-medium ${
                            isAwaiting
                              ? 'text-muted italic'
                              : isExceedingBand
                              ? 'text-orange font-semibold'
                              : 'text-green'
                          }`}
                        >
                          {isAwaiting ? (
                            <span className="text-[11px] text-muted">Awaiting deviation test</span>
                          ) : (
                            fmtPct(l.deviationPct!)
                          )}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {isAwaiting ? (
                            <span className="text-muted">—</span>
                          ) : l.verdict === 'makegood' ? (
                            <span className="rounded-full border border-orange/40 bg-orange/10 px-2 py-0.5 text-[10px] font-semibold text-orange">
                              Makegood
                            </span>
                          ) : (
                            <span className="rounded-full border border-line bg-surface px-2 py-0.5 text-[10px] text-muted">
                              No makegood
                            </span>
                          )}
                        </td>
                        <td className="num px-3 py-2 text-right font-medium">
                          {l.amountOwed > 0 ? (
                            <span className="text-orange">{fmtUSD(l.amountOwed)}</span>
                          ) : (
                            <span className="text-muted">$0.00</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <span
                            className={`rounded px-2 py-0.5 text-[10px] font-medium capitalize ${
                              l.status === 'paid'
                                ? 'bg-green/15 text-green'
                                : l.status === 'confirmed'
                                ? 'bg-cyan/15 text-cyan'
                                : l.status === 'queued'
                                ? 'bg-orange/15 text-orange'
                                : l.status === 'tested'
                                ? 'bg-surface text-ink'
                                : 'text-muted'
                            }`}
                          >
                            {l.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Panel>
  );
}
