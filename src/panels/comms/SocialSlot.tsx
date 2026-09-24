// OWNER: Agent B (Kaustubh). Placeholder from Agent A; replace the body freely.
import { useStore } from '../../core/store';
import { fmtInt } from '../../core/format';
import { Panel, SlotPlaceholder } from '../../ui/Panel';

export function SocialSlot() {
  const last = useStore((s) => s.signals[s.signals.length - 1]);
  return (
    <Panel title="Social mentions" subtitle="Per minute">
      <SlotPlaceholder owner="Agent B (social panel)">{last ? `${fmtInt(last.socialMentionsPerMin)} mentions/min` : 'No data yet.'}</SlotPlaceholder>
    </Panel>
  );
}
