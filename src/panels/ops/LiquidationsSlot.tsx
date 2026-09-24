// OWNER: Agent C (Hamza). Placeholder from Agent A; replace the body freely.
// Row click should call selectUser(id) then openDrawer('user').
import { useStore } from '../../core/store';
import { fmtPct, fmtT, fmtUSD } from '../../core/format';
import { Panel, SlotPlaceholder } from '../../ui/Panel';

export function LiquidationsSlot() {
  const liquidations = useStore((s) => s.liquidations);
  const { selectUser, openDrawer } = useStore.getState();
  return (
    <Panel title="Liquidations" subtitle={`${liquidations.length} so far`}>
      <SlotPlaceholder owner="Agent C (liquidations table)">
        <div className="max-h-40 space-y-0.5 overflow-auto">
          {liquidations
            .slice(-6)
            .reverse()
            .map((l) => (
              <button
                key={l.id}
                className="num block w-full text-left hover:text-cyan"
                onClick={() => {
                  selectUser(l.userId);
                  openDrawer('user');
                }}
              >
                {fmtT(l.t)} {l.userName} {l.side} {fmtUSD(l.referenceMedian)} / {fmtUSD(l.executionPrice)}{' '}
                {l.deviationPct === null ? 'awaiting test' : `${fmtPct(l.deviationPct)} ${l.verdict}`}
              </button>
            ))}
        </div>
      </SlotPlaceholder>
    </Panel>
  );
}
