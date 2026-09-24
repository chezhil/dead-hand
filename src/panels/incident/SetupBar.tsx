import { useStore } from '../../core/store';
import { SCENARIOS, SCENARIO_ORDER } from '../../core/scenarios';
import { fmtPct } from '../../core/format';
import type { Speed } from '../../core/types';
import { LockIcon, PauseIcon, PlayIcon, ResetIcon } from '../../ui/icons';

const SPEEDS: Speed[] = [1, 20, 60];

const btn = 'inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40';

export function SetupBar() {
  const phase = useStore((s) => s.phase);
  const scenario = useStore((s) => s.scenario);
  const bandPct = useStore((s) => s.bandPct);
  const bandLocked = useStore((s) => s.bandLocked);
  const speed = useStore((s) => s.speed);
  const { setScenario, setBand, setSpeed, start, pause, resume, reset } = useStore.getState();

  const canPickScenario = phase === 'setup' || phase === 'ended';
  const meta = SCENARIOS[scenario];

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-xl border border-line bg-surface px-4 py-3">
      <div className="min-w-0">
        <div className="mb-1.5 text-[11px] font-semibold tracking-wider text-muted uppercase">Scenario</div>
        <div className="flex rounded-lg border border-line bg-navy p-0.5" role="radiogroup" aria-label="Scenario">
          {SCENARIO_ORDER.map((id) => {
            const active = id === scenario;
            return (
              <button
                key={id}
                role="radio"
                aria-checked={active}
                disabled={!canPickScenario}
                onClick={() => setScenario(id)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed ${
                  active ? 'bg-surface-2 text-cyan shadow-sm' : 'text-muted hover:text-ink disabled:hover:text-muted'
                }`}
              >
                {SCENARIOS[id].label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="min-w-0 max-w-[360px] flex-1 basis-[260px] text-xs leading-snug text-muted">
        <span className="font-medium text-ink">{meta.tagline}.</span> {meta.description}
        {meta.reconstructionNote && (
          <div className="mt-1 inline-flex rounded border border-orange/30 bg-orange/10 px-1.5 py-0.5 text-[11px] font-medium text-orange">
            Approximate reconstruction
          </div>
        )}
      </div>

      <div className="w-[220px]">
        <div className="mb-1.5 flex items-center justify-between text-[11px] font-semibold tracking-wider text-muted uppercase">
          <span>Deviation band</span>
          <span className="num text-sm tracking-normal text-ink normal-case">±{fmtPct(bandPct)}</span>
        </div>
        <input
          type="range"
          min={0.5}
          max={5}
          step={0.25}
          value={bandPct}
          disabled={bandLocked}
          onChange={(e) => setBand(Number(e.target.value))}
          className="w-full disabled:cursor-not-allowed disabled:opacity-35 disabled:grayscale"
          aria-label="Deviation band percent"
        />
        <div className={`mt-0.5 flex items-center gap-1 text-[11px] ${bandLocked ? 'text-orange' : 'text-muted'}`}>
          {bandLocked ? (
            <>
              <LockIcon /> Band locked: published pre-launch
            </>
          ) : (
            'Set before launch. Locks when the incident starts.'
          )}
        </div>
      </div>

      <div>
        <div className="mb-1.5 text-[11px] font-semibold tracking-wider text-muted uppercase">Speed</div>
        <div className="flex rounded-lg border border-line bg-navy p-0.5" role="radiogroup" aria-label="Speed">
          {SPEEDS.map((sp) => (
            <button
              key={sp}
              role="radio"
              aria-checked={sp === speed}
              onClick={() => setSpeed(sp)}
              className={`num rounded-md px-3 py-1.5 text-sm font-medium ${sp === speed ? 'bg-surface-2 text-cyan' : 'text-muted hover:text-ink'}`}
            >
              {sp}x
            </button>
          ))}
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2">
        {phase === 'setup' && (
          <button onClick={start} className={`${btn} bg-cyan text-navy hover:bg-cyan/90`}>
            <PlayIcon /> Start
          </button>
        )}
        {phase === 'running' && (
          <button onClick={pause} className={`${btn} border border-line bg-surface-2 text-ink hover:border-cyan/50`}>
            <PauseIcon /> Pause
          </button>
        )}
        {phase === 'paused' && (
          <button onClick={resume} className={`${btn} bg-cyan text-navy hover:bg-cyan/90`}>
            <PlayIcon /> Resume
          </button>
        )}
        {phase === 'ended' && <span className="text-sm font-medium text-green">Run complete · T+60:00</span>}
        <button onClick={reset} disabled={phase === 'setup'} className={`${btn} border border-line text-muted hover:text-ink`}>
          <ResetIcon /> Reset
        </button>
      </div>
    </div>
  );
}
