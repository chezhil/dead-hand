// OWNER: Agent B (Kaustubh). Placeholder from Agent A. Rendered inside the drawer shell
// when activeDrawer === 'user'; read selectedUserId from the store.
import { useStore } from '../../core/store';
import { SlotPlaceholder } from '../../ui/Panel';

export function UserDrawer() {
  const userId = useStore((s) => s.selectedUserId);
  const liq = useStore((s) => s.liquidations.find((l) => l.userId === s.selectedUserId));
  return <SlotPlaceholder owner="Agent B (per-user view)">{liq ? `${liq.userName} (${userId})` : 'No user selected.'}</SlotPlaceholder>;
}
