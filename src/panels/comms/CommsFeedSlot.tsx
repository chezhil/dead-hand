// OWNER: Agent B (Kaustubh). Placeholder from Agent A; replace the body freely.
import { useStore } from '../../core/store';
import { Panel, SlotPlaceholder } from '../../ui/Panel';

export function CommsFeedSlot() {
  const comms = useStore((s) => s.comms);
  const sent = comms.filter((c) => c.status === 'sent').length;
  return (
    <Panel title="Comms feed" subtitle="Every message goes out automatically">
      <SlotPlaceholder owner="Agent B (comms feed)">
        {sent} of {comms.length} messages sent.
      </SlotPlaceholder>
    </Panel>
  );
}
