import { useStore } from '../../core/store';
import { T } from '../../core/engine';
import { fmtT } from '../../core/format';
import type { OrderTypes } from '../../core/types';
import { Panel, Pill } from '../../ui/Panel';

const ROWS: { key: keyof OrderTypes; label: string; hint: string }[] = [
  { key: 'newLeverage', label: 'New leveraged opens', hint: 'Adds risk at a price we may not trust' },
  { key: 'topUp', label: 'Top-up margin', hint: 'Lets users defend a position' },
  { key: 'reduce', label: 'Reduce position', hint: 'Exit' },
  { key: 'close', label: 'Close position', hint: 'Exit' },
  { key: 'withdraw', label: 'Withdraw', hint: 'Exit' },
];

export function CircuitBreakerPanel() {
  const orderTypes = useStore((s) => s.orderTypes);
  const halted = !orderTypes.newLeverage;
  return (
    <Panel
      title="Asymmetric circuit breaker"
      subtitle={halted ? `Halted at ${fmtT(T.halt)}: new risk only` : `Arms at ${fmtT(T.halt)}`}
      right={halted ? <Pill tone="orange">1 halted</Pill> : <Pill tone="green">All open</Pill>}
    >
      <ul className="divide-y divide-line/70">
        {ROWS.map((r) => {
          const open = orderTypes[r.key];
          return (
            <li key={r.key} className="flex items-center justify-between gap-3 py-2">
              <div className="min-w-0">
                <div className="text-sm text-ink">{r.label}</div>
                <div className="truncate text-[11px] text-muted">{r.hint}</div>
              </div>
              {open ? <Pill tone="green">● Open</Pill> : <Pill tone="orange">❚❚ Halted</Pill>}
            </li>
          );
        })}
      </ul>
      <div className="mt-2 rounded-md border border-green/25 bg-green/5 px-2.5 py-1.5 text-xs text-green">Exits never freeze.</div>
    </Panel>
  );
}
