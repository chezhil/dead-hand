// OWNER: Agent C (Hamza). Placeholder from Agent A with a bare-bones button so the one
// human call works end to end; replace the body freely.
import { useStore, useMakegoodTotals } from '../../core/store';
import { fmtT, fmtUSD } from '../../core/format';
import { Panel, SlotPlaceholder } from '../../ui/Panel';

export function MakegoodSlot() {
  const visible = useStore((s) => s.makegoodButtonVisible);
  const confirmedAt = useStore((s) => s.makegoodsConfirmedAt);
  const { count, total } = useMakegoodTotals();
  const confirm = useStore((s) => s.confirmMakegoods);
  return (
    <Panel title="Makegoods">
      <SlotPlaceholder owner="Agent C (makegood confirm)">
        {!visible ? (
          'Appears at T+30:00.'
        ) : count === 0 ? (
          'No makegoods owed: all executions within band.'
        ) : confirmedAt !== null ? (
          `Confirmed at ${fmtT(confirmedAt)}`
        ) : (
          <button onClick={confirm} className="mt-1 rounded-md bg-orange px-3 py-1.5 text-sm font-semibold text-navy">
            Confirm makegoods ({count}, {fmtUSD(total)})
          </button>
        )}
      </SlotPlaceholder>
    </Panel>
  );
}
