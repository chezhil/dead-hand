// OWNER: Agent B (Kaustubh). Social mentions per minute, with the moment the status page
// went live marked. Handles and posts are invented.
import { useMemo } from 'react';
import { User } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useStore } from '../../core/store';
import { fmtInt, fmtT } from '../../core/format';
import { Panel } from '../../ui/Panel';
import { axisProps, C } from '../../ui/theme';

function SocialPost({ handle, time, text, tone }: { handle: string; time: string; text: string; tone: 'worried' | 'calm' }) {
  return (
    <div className="flex gap-2 rounded-lg border border-line bg-surface-2/50 px-2.5 py-2">
      <div
        className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ${tone === 'worried' ? 'bg-orange/15 text-orange' : 'bg-green/15 text-green'}`}
      >
        <User size={12} />
      </div>
      <div className="min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-xs font-semibold text-ink">{handle}</span>
          <span className="num text-[11px] text-muted">{time}</span>
          <span className={`ml-auto text-[10px] font-medium whitespace-nowrap ${tone === 'worried' ? 'text-orange' : 'text-green'}`}>
            {tone === 'worried' ? 'Before' : 'After'}
          </span>
        </div>
        <p className="mt-0.5 truncate text-[11px] leading-snug text-ink/80" title={text}>{text}</p>
      </div>
    </div>
  );
}

const WORRIED_AT = 200;

export function SocialSlot() {
  const signals = useStore((s) => s.signals);
  const simTime = useStore((s) => s.simTime);
  const statusAt = useStore((s) => s.comms.find((c) => c.channel === 'status_page' && c.status === 'sent')?.t ?? null);

  const xMax = Math.max(600, Math.ceil(simTime / 300) * 300);
  const last = signals[signals.length - 1];
  const peak = useMemo(() => signals.reduce((m, p) => Math.max(m, p.socialMentionsPerMin), 0), [signals]);
  const calmAt = statusAt !== null ? statusAt + 90 : null;

  return (
    <Panel
      title="Social mentions"
      subtitle="Per minute. Flattens once the status page is live."
      right={
        last ? (
          <div className="text-right">
            <div className="num text-lg leading-tight font-semibold text-ink">{fmtInt(last.socialMentionsPerMin)}</div>
            <div className="num text-[10px] text-muted">peak {fmtInt(peak)}</div>
          </div>
        ) : undefined
      }
    >
      <div className="h-[90px]">
        {signals.length === 0 ? (
          <div className="grid h-full place-items-center rounded-lg border border-dashed border-line text-xs text-muted">No data yet.</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={signals} margin={{ top: 16, right: 6, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="social-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={C.cyan} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={C.cyan} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={C.line} vertical={false} strokeOpacity={0.6} />
              <XAxis dataKey="t" type="number" domain={[0, xMax]} tickFormatter={fmtT} ticks={[0, xMax / 2, xMax]} {...axisProps} />
              <YAxis width={36} tickFormatter={(v: number) => fmtInt(v)} {...axisProps} axisLine={false} />
              <Tooltip
                isAnimationActive={false}
                cursor={{ stroke: C.muted, strokeDasharray: '3 3' }}
                content={({ active, payload }) =>
                  active && payload?.length ? (
                    <div className="num rounded-md border border-line bg-surface-2 px-2 py-1 text-[11px] text-ink">
                      {fmtT((payload[0].payload as { t: number }).t)} · {fmtInt(payload[0].value as number)} mentions/min
                    </div>
                  ) : null
                }
              />
              {statusAt !== null && (
                <ReferenceLine
                  x={statusAt}
                  stroke={C.green}
                  strokeDasharray="4 3"
                  label={{ value: 'Status page live', position: 'insideTopLeft', fill: C.green, fontSize: 10, dy: -14 }}
                />
              )}
              <Area type="monotone" dataKey="socialMentionsPerMin" stroke={C.cyan} strokeWidth={2} fill="url(#social-fill)" dot={false} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {simTime >= WORRIED_AT && (
        <div className="mt-2 space-y-1.5">
          <SocialPost
            handle="@chai_and_charts"
            time={fmtT(WORRIED_AT)}
            text="MochaTrade price just dropped hard and my long got liquidated. Is this a real move or a glitch?? Anyone else?"
            tone="worried"
          />
          {calmAt !== null && simTime >= calmAt && (
            <SocialPost
              handle="@nifty_nights"
              time={fmtT(calmAt)}
              text="Status page is up. New leverage paused, exits open, closed my position fine. They say they'll check every liquidation against the median."
              tone="calm"
            />
          )}
        </div>
      )}
    </Panel>
  );
}
