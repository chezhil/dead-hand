// OWNER: Agent C (Hamza). Placeholder from Agent A; replace the body freely.
// The slot is given a tall, fixed-height column; scroll inside it.
import { useStore } from '../../core/store';
import { fmtT } from '../../core/format';
import { Panel } from '../../ui/Panel';

export function LogSlot() {
  const log = useStore((s) => s.log);
  return (
    <Panel title="Incident log" subtitle="Placeholder: Agent C" className="h-full" bodyClassName="overflow-auto">
      <ol className="space-y-1.5 text-xs">
        {log
          .slice()
          .reverse()
          .map((e) => (
            <li key={e.id}>
              <span className="num text-cyan">{fmtT(e.t)}</span> <span className="text-muted">[{e.actor}]</span> {e.text}
            </li>
          ))}
      </ol>
    </Panel>
  );
}
