// OWNER: Agent C (Hamza). Placeholder from Agent A; replace the body freely.
import { useStore } from '../../core/store';
import { Panel, SlotPlaceholder } from '../../ui/Panel';

export function ResponderSlot() {
  const responder = useStore((s) => s.responder);
  return (
    <Panel title="IST responder">
      <SlotPlaceholder owner="Agent C (responder)">
        {responder.name}: {responder.status}
      </SlotPlaceholder>
    </Panel>
  );
}
