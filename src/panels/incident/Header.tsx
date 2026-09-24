import { useStore } from '../../core/store';
import { STAGES } from '../../core/engine';
import { fmtT } from '../../core/format';
import { fixtureRequested, FIXTURE_TIME } from '../../core/fixture';
import type { Stage } from '../../core/types';
import { ArrowIcon, CheckIcon } from '../../ui/icons';
import { Pill } from '../../ui/Panel';

/** Fixed crash start: 14:30 IST = 09:00 UTC, which is 02:00 in San Francisco (PDT). */
const CRASH_START_UTC = Date.UTC(2026, 8, 24, 9, 0, 0);

const clockFmt = (timeZone: string) =>
  new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
const IST = clockFmt('Asia/Kolkata');
const SF = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });

const STAGE_LABEL: Record<Stage, string> = { detect: 'Detect', contain: 'Contain', decide: 'Decide', disclose: 'Disclose' };

function Clock({ label, sub, value }: { label: string; sub: string; value: string }) {
  return (
    <div className="text-right">
      <div className="num text-lg leading-tight font-semibold text-ink">{value}</div>
      <div className="text-[11px] text-muted">
        {label} <span className="text-muted/70">· {sub}</span>
      </div>
    </div>
  );
}

export function Header() {
  const simTime = useStore((s) => s.simTime);
  const stage = useStore((s) => s.stage);
  const phase = useStore((s) => s.phase);
  const humanCallsUsed = useStore((s) => s.humanCallsUsed);
  const buttonVisible = useStore((s) => s.makegoodButtonVisible);
  const anyQueued = useStore((s) => s.liquidations.some((l) => l.status === 'queued'));

  const now = new Date(CRASH_START_UTC + Math.floor(simTime) * 1000);
  const started = phase !== 'setup';
  const currentIdx = started ? STAGES.indexOf(stage) : -1;
  const ended = phase === 'ended';
  const awaitingCall = buttonVisible && humanCallsUsed === 0 && anyQueued;

  return (
    <header className="flex flex-wrap items-center justify-between gap-x-5 gap-y-3">
      <div className="flex items-center gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-lg border border-cyan/40 bg-cyan/10 text-cyan">
          <svg width="18" height="18" viewBox="0 0 32 32" fill="none" aria-hidden>
            <path d="M3 11h6l3 10 4-14 3 8h10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div>
          <h1 className="text-lg leading-tight font-semibold">
            Dead-Hand Console
            {fixtureRequested() && (
              <span className="ml-2 align-middle">
                <Pill tone="muted">Fixture · {fmtT(FIXTURE_TIME)}</Pill>
              </span>
            )}
          </h1>
          <div className="text-xs text-muted">MochaTrade · flash-crash autopilot</div>
        </div>
      </div>

      <ol className="flex items-center gap-1.5" aria-label="Protocol stage">
        {STAGES.map((st, i) => {
          const done = started && (i < currentIdx || (ended && i === currentIdx));
          const active = started && !ended && i === currentIdx;
          const cls = active
            ? 'border-cyan bg-cyan/15 text-cyan'
            : done
              ? 'border-green/40 bg-green/10 text-green'
              : 'border-line bg-surface text-muted';
          return (
            <li key={st} className="flex items-center gap-1.5">
              <span
                aria-current={active ? 'step' : undefined}
                className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold tracking-wider uppercase ${cls}`}
              >
                {done && <CheckIcon />}
                {STAGE_LABEL[st]}
              </span>
              {i < STAGES.length - 1 && (
                <span className="text-muted/60">
                  <ArrowIcon />
                </span>
              )}
            </li>
          );
        })}
      </ol>

      <div className="flex items-center gap-4">
        <div className="text-right">
          <div className="num text-2xl leading-tight font-semibold text-cyan">{fmtT(simTime)}</div>
          <div className="text-[11px] text-muted">since crash</div>
        </div>
        <Clock label="India (IST)" sub="peak hours" value={IST.format(now)} />
        <Clock label="San Francisco" sub="asleep" value={SF.format(now)} />
        <div
          className={`rounded-lg border px-3 py-1.5 text-center ${
            humanCallsUsed ? 'border-green/40 bg-green/10' : awaitingCall ? 'border-orange/50 bg-orange/10' : 'border-line bg-surface'
          }`}
        >
          <div className={`num text-lg leading-tight font-semibold ${humanCallsUsed ? 'text-green' : awaitingCall ? 'text-orange' : 'text-ink'}`}>
            {humanCallsUsed} / 1
          </div>
          <div className="text-[11px] text-muted">Human calls</div>
        </div>
      </div>
    </header>
  );
}
