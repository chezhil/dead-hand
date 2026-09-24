import { useStore } from '../../core/store';
import { SIM_END, TIMELINE } from '../../core/engine';
import { fmtT } from '../../core/format';

/** Thin progress rail across the hour, with a tick for every protocol event. */
export function TimelineBar() {
  const simTime = useStore((s) => s.simTime);
  const phase = useStore((s) => s.phase);
  const pct = (t: number) => `${(t / SIM_END) * 100}%`;

  return (
    <div className="relative px-1 pt-1 pb-6" aria-label="Protocol timeline">
      <div className="relative h-1.5 rounded-full bg-line">
        <div className="absolute inset-y-0 left-0 rounded-full bg-cyan/70" style={{ width: pct(simTime) }} />
        {TIMELINE.map((ev) => {
          const fired = phase !== 'setup' && simTime >= ev.t;
          const frac = ev.t / SIM_END;
          // Anchor tooltips inward near the ends so they never run off-screen.
          const tipPos = frac < 0.15 ? 'left-0' : frac > 0.85 ? 'right-0' : 'left-1/2 -translate-x-1/2';
          return (
            <div key={ev.t} className="group absolute top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ left: pct(ev.t) }}>
              <div className={`h-3 w-3 rounded-full border-2 ${fired ? 'border-cyan bg-cyan' : 'border-muted/60 bg-navy'}`} />
              <div className={`pointer-events-none absolute top-4 z-20 hidden rounded-md ${tipPos} border border-line bg-surface-2 px-2 py-1 text-[11px] whitespace-nowrap text-ink shadow-lg group-hover:block`}>
                <span className="num text-cyan">{fmtT(ev.t)}</span> {ev.label}
              </div>
            </div>
          );
        })}
      </div>
      <div className="num pointer-events-none absolute right-1 bottom-0 left-1 flex justify-between text-[10px] text-muted">
        {[0, 900, 1800, 2700, 3600].map((t) => (
          <span key={t}>{fmtT(t)}</span>
        ))}
      </div>
    </div>
  );
}
