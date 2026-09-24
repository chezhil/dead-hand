import { useStore } from '../../core/store';
import { fmtT } from '../../core/format';
import type { Responder } from '../../core/types';
import { Panel, Pill } from '../../ui/Panel';

const STEPS: {
  key: Responder['status'];
  label: string;
  timeKey: 'pagedAt' | 'ackAt' | 'onItAt' | null;
  description: string;
}[] = [
  { key: 'idle', label: 'Idle', timeKey: null, description: 'Standing by (on-call rotation)' },
  { key: 'paged', label: 'Paged', timeKey: 'pagedAt', description: 'Urgent incident alert sent' },
  { key: 'acknowledged', label: 'Acknowledged', timeKey: 'ackAt', description: 'Responder confirmed awake' },
  { key: 'on_it', label: 'On it', timeKey: 'onItAt', description: 'Active monitoring & verification' },
];

const STEP_ORDER: Record<Responder['status'], number> = {
  idle: 0,
  paged: 1,
  acknowledged: 2,
  on_it: 3,
};

export function ResponderSlot() {
  const responder = useStore((s) => s.responder);
  const currentStepIndex = STEP_ORDER[responder.status];

  const tone =
    responder.status === 'on_it'
      ? 'green'
      : responder.status === 'acknowledged'
      ? 'cyan'
      : responder.status === 'paged'
      ? 'orange'
      : 'muted';

  return (
    <Panel
      title="IST Responder"
      subtitle="Sleep-gap coverage (IST timezone)"
      right={<Pill tone={tone}>{responder.status.replace('_', ' ').toUpperCase()}</Pill>}
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between rounded-lg border border-line bg-surface-2/40 px-3 py-2">
          <div>
            <div className="text-[11px] text-muted">Active Duty Responder</div>
            <div className="text-sm font-semibold text-ink">{responder.name}</div>
          </div>
          <div className="text-right">
            <div className="text-[11px] text-muted">Location</div>
            <div className="text-xs font-medium text-cyan">Bengaluru (UTC+5:30)</div>
          </div>
        </div>

        {/* Stepper */}
        <div className="space-y-2">
          {STEPS.map((step, idx) => {
            const isCompleted = currentStepIndex > idx;
            const isCurrent = currentStepIndex === idx;
            const isPending = currentStepIndex < idx;

            const timeValue = step.timeKey ? responder[step.timeKey] : null;

            return (
              <div
                key={step.key}
                className={`flex items-center justify-between rounded-md border px-3 py-2 transition-all ${
                  isCurrent
                    ? 'border-cyan/50 bg-cyan/10 text-ink shadow-sm'
                    : isCompleted
                    ? 'border-line/80 bg-surface-2/30 text-ink'
                    : 'border-line/40 bg-surface/20 text-muted/60'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                      isCompleted
                        ? 'bg-green/20 text-green'
                        : isCurrent
                        ? 'bg-cyan text-navy'
                        : 'bg-surface-2 text-muted/60'
                    }`}
                  >
                    {isCompleted ? '✓' : idx + 1}
                  </div>
                  <div>
                    <div className="text-xs font-medium">{step.label}</div>
                    <div className="text-[10px] text-muted">{step.description}</div>
                  </div>
                </div>

                <div className="text-right">
                  {timeValue !== undefined && timeValue !== null ? (
                    <span className="num rounded bg-surface px-1.5 py-0.5 text-[11px] font-semibold text-cyan">
                      {fmtT(timeValue)}
                    </span>
                  ) : isCompleted && idx === 0 ? (
                    <span className="text-[10px] text-muted">Ready</span>
                  ) : isPending ? (
                    <span className="text-[10px] text-muted/60">Waiting</span>
                  ) : (
                    <span className="text-[10px] text-muted">Active</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="rounded border border-line/60 bg-surface/40 px-2.5 py-1.5 text-[11px] text-muted">
          <strong className="text-ink/80">Protocol Doctrine:</strong> Fractional on-call, IST.
          Guarantees human oversight during India peak volume while SF founders sleep.
        </div>
      </div>
    </Panel>
  );
}
