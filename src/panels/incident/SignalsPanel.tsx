import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useStore } from '../../core/store';
import { fmtInt, fmtT } from '../../core/format';
import type { SignalPoint } from '../../core/types';
import { Panel } from '../../ui/Panel';
import { axisProps, C } from '../../ui/theme';

function MiniChart({ label, dataKey, data, xMax, note }: { label: string; dataKey: keyof SignalPoint; data: SignalPoint[]; xMax: number; note: string }) {
  const last = data[data.length - 1];
  const peak = data.reduce((m, d) => Math.max(m, d[dataKey]), 0);
  const gid = `sig-${dataKey}`;
  return (
    <div className="min-w-0 flex-1 rounded-lg border border-line bg-navy/40 px-3 pt-2 pb-1">
      <div className="flex items-baseline justify-between gap-2">
        <div className="text-xs text-muted">{label}</div>
        <div className="num text-[11px] text-muted">peak {fmtInt(peak)}</div>
      </div>
      <div className="num text-2xl leading-tight font-semibold text-ink">{last ? fmtInt(last[dataKey]) : '—'}</div>
      <div className="h-[72px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={C.cyan} stopOpacity={0.35} />
                <stop offset="100%" stopColor={C.cyan} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="t" type="number" domain={[0, xMax]} hide />
            <YAxis hide domain={[0, (max: number) => Math.max(4, Math.ceil(max * 1.15))]} {...axisProps} />
            <Tooltip
              isAnimationActive={false}
              cursor={{ stroke: C.muted, strokeDasharray: '3 3' }}
              content={({ active, payload }) =>
                active && payload?.length ? (
                  <div className="num rounded-md border border-line bg-surface-2 px-2 py-1 text-[11px] text-ink">
                    {fmtT((payload[0].payload as SignalPoint).t)} · {fmtInt(payload[0].value as number)}/min
                  </div>
                ) : null
              }
            />
            <Area type="monotone" dataKey={dataKey} stroke={C.cyan} strokeWidth={2} fill={`url(#${gid})`} isAnimationActive={false} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="pb-1 text-[11px] text-muted">{note}</div>
    </div>
  );
}

export function SignalsPanel() {
  const signals = useStore((s) => s.signals);
  const simTime = useStore((s) => s.simTime);
  const xMax = Math.max(600, Math.ceil(simTime / 300) * 300);
  return (
    <Panel title="Signals" subtitle="Per minute, live">
      <div className="flex gap-3">
        <MiniChart label="Liquidations / min" dataKey="liquidationsPerMin" data={signals} xMax={xMax} note="Trailing 60s. Zero while feeds disagree." />
        <MiniChart label="Support tickets / min" dataKey="ticketsPerMin" data={signals} xMax={xMax} note="Falls once the push reaches users." />
      </div>
    </Panel>
  );
}
