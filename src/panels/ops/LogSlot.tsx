import { useState, useMemo } from 'react';
import { useStore } from '../../core/store';
import { fmtT } from '../../core/format';
import type { Stage } from '../../core/types';
import { Panel } from '../../ui/Panel';

type StageFilter = 'all' | Stage;

const STAGES: { key: StageFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'detect', label: 'Detect' },
  { key: 'contain', label: 'Contain' },
  { key: 'decide', label: 'Decide' },
  { key: 'disclose', label: 'Disclose' },
];

export function LogSlot() {
  const log = useStore((s) => s.log);
  const [stageFilter, setStageFilter] = useState<StageFilter>('all');

  const filteredEntries = useMemo(() => {
    const list = stageFilter === 'all' ? log : log.filter((e) => e.stage === stageFilter);
    return list.slice().reverse(); // Newest at top
  }, [log, stageFilter]);

  const humanEntryCount = useMemo(() => {
    return log.filter((e) => e.actor === 'human').length;
  }, [log]);

  return (
    <Panel
      title="Incident Log"
      subtitle={`${log.length - humanEntryCount} automatic ${log.length - humanEntryCount === 1 ? 'entry' : 'entries'} · ${humanEntryCount} human`}
      className="h-full"
      bodyClassName="flex flex-col min-h-0"
    >
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          {STAGES.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setStageFilter(s.key)}
              className={`rounded px-2 py-0.5 text-[11px] font-medium transition-colors ${
                stageFilter === s.key
                  ? 'bg-cyan text-navy font-semibold shadow-xs'
                  : 'bg-surface-2 text-muted hover:text-ink'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      <div className="flex-1 min-h-0 overflow-y-auto pr-1">
        {filteredEntries.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-xs text-muted">
            No log entries for stage: {stageFilter}
          </div>
        ) : (
          <ol className="divide-y divide-line/40 text-xs">
            {filteredEntries.map((e) => {
              const isHuman = e.actor === 'human';
              const isResponder = e.actor === 'responder';

              return (
                <li
                  key={e.id}
                  className={`flex flex-col gap-1 py-2.5 transition-colors ${
                    isHuman
                      ? 'rounded-md border border-orange/40 bg-orange/10 px-2.5 my-1 text-ink shadow-sm'
                      : 'hover:bg-surface-2/30 px-1'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="num font-semibold text-cyan">{fmtT(e.t)}</span>
                      {isHuman ? (
                        <span className="rounded bg-orange px-1.5 py-0.5 text-[10px] font-bold text-navy uppercase tracking-wider">
                          ★ HUMAN CALL
                        </span>
                      ) : isResponder ? (
                        <span className="rounded border border-cyan/40 bg-cyan/15 px-1.5 py-0.5 text-[10px] font-semibold text-cyan uppercase">
                          RESPONDER
                        </span>
                      ) : (
                        <span className="rounded border border-line bg-surface-2 px-1.5 py-0.5 text-[10px] font-medium text-muted uppercase">
                          SYSTEM
                        </span>
                      )}
                    </div>

                    <span
                      className={`text-[10px] font-medium uppercase tracking-wider ${
                        e.stage === 'detect'
                          ? 'text-cyan'
                          : e.stage === 'contain'
                          ? 'text-orange'
                          : e.stage === 'decide'
                          ? 'text-green'
                          : 'text-muted'
                      }`}
                    >
                      [{e.stage}]
                    </span>
                  </div>

                  <p className={`text-[12px] leading-relaxed ${isHuman ? 'font-medium text-ink' : 'text-ink/90'}`}>
                    {e.text}
                  </p>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </Panel>
  );
}
