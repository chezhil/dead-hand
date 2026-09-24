import { useMemo } from 'react';
import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useStore } from '../../core/store';
import { SCENARIOS } from '../../core/scenarios';
import { fmtPct, fmtT, fmtUSD } from '../../core/format';
import { FEED_KEYS, feedLabel, type FeedKey } from '../../core/watchdog';
import type { FeedStatus, PricePoint } from '../../core/types';
import { Panel, Pill } from '../../ui/Panel';
import { axisProps, C } from '../../ui/theme';

const FEED_STYLE: Record<FeedKey, { color: string; dash?: string }> = {
  feedA: { color: C.feedA },
  feedB: { color: C.feedB, dash: '6 3' },
  feedC: { color: C.feedC, dash: '2 3' },
};

/** A feed this far from the median is drawn off-scale rather than squashing the chart. */
const OFF_SCALE_PCT = 12;

function StatusChip({ status }: { status: FeedStatus }) {
  if (status === 'agree') return <Pill tone="green">● Feeds agree</Pill>;
  if (status === 'diverging') return <Pill tone="orange">▲ Feed divergence detected</Pill>;
  return <Pill tone="orange">❚❚ Liquidations paused: feeds disagree</Pill>;
}

function niceTicks(max: number): number[] {
  const step = max <= 600 ? 60 : max <= 1200 ? 120 : max <= 1800 ? 300 : 600;
  const ticks: number[] = [];
  for (let t = 0; t <= max; t += step) ticks.push(t);
  return ticks;
}

interface Row extends PricePoint {
  band: [number, number];
}

function PriceTooltip({ active, payload, bandPct }: { active?: boolean; payload?: { payload: Row }[]; bandPct: number }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  const dev = (Math.abs(p.ours - p.median) / p.median) * 100;
  const rows: [string, string, number][] = [
    ['Median', C.cyan, p.median],
    ['Our price', C.orange, p.ours],
    ['Feed A', C.feedA, p.feedA],
    ['Feed B', C.feedB, p.feedB],
    ['Feed C', C.feedC, p.feedC],
  ];
  return (
    <div className="rounded-lg border border-line bg-surface-2/95 px-3 py-2 text-xs shadow-xl backdrop-blur">
      <div className="num mb-1 font-semibold text-ink">{fmtT(p.t)}</div>
      {rows.map(([label, color, v]) => (
        <div key={label} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-muted">
            <span className="inline-block h-0.5 w-3 rounded" style={{ background: color }} />
            {label}
          </span>
          <span className="num text-ink">{fmtUSD(v)}</span>
        </div>
      ))}
      <div className="mt-1 flex justify-between gap-4 border-t border-line pt-1">
        <span className="text-muted">Our deviation</span>
        <span className={`num font-medium ${dev > bandPct ? 'text-orange' : 'text-ink'}`}>{fmtPct(dev)}</span>
      </div>
    </div>
  );
}

/**
 * The 3-feed / median / our-price chart with the shaded band. Exported so the public
 * transparency page shows exactly the same picture.
 */
export function PriceChart({ height = 300, showOffScale = true }: { height?: number | string; showOffScale?: boolean }) {
  const prices = useStore((s) => s.prices);
  const bandPct = useStore((s) => s.bandPct);
  const simTime = useStore((s) => s.simTime);

  const data: Row[] = useMemo(
    () => prices.map((p) => ({ ...p, band: [p.median * (1 - bandPct / 100), p.median * (1 + bandPct / 100)] })),
    [prices, bandPct],
  );

  // Y domain follows the median, band and our price; a feed that collapses (e.g. to
  // $0.10 in the replay) is allowed to run off the chart instead of flattening it.
  const [yMin, yMax] = useMemo(() => {
    if (data.length === 0) return [0, 1];
    let lo = Infinity;
    let hi = -Infinity;
    for (const p of data) {
      const vals = [p.band[0], p.band[1], p.ours, ...FEED_KEYS.map((k) => p[k]).filter((v) => Math.abs(v - p.median) / p.median < OFF_SCALE_PCT / 100)];
      for (const v of vals) {
        lo = Math.min(lo, v);
        hi = Math.max(hi, v);
      }
    }
    const pad = (hi - lo) * 0.06;
    return [Math.floor(lo - pad), Math.ceil(hi + pad)];
  }, [data]);

  const xMax = Math.max(600, Math.ceil(simTime / 300) * 300);
  const last = prices[prices.length - 1];
  const offScale = last ? FEED_KEYS.filter((k) => last[k] < yMin || last[k] > yMax) : [];

  return (
    <div className="relative w-full min-w-0 overflow-hidden" style={{ height }}>
      {showOffScale && offScale.length > 0 && (
        <div className="absolute bottom-8 left-16 z-10 rounded border border-line bg-surface-2/90 px-2 py-0.5 text-[11px] text-muted">
          {offScale.map((k) => `${feedLabel(k)} off-scale at ${fmtUSD(last![k])}`).join(' · ')}
        </div>
      )}
      {data.length === 0 ? (
        <div className="grid h-full place-items-center rounded-lg border border-dashed border-line text-sm text-muted">
          Pick a scenario and press Start. The protocol runs itself.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 4 }}>
            <CartesianGrid stroke={C.line} strokeDasharray="0" vertical={false} strokeOpacity={0.6} />
            <XAxis dataKey="t" type="number" domain={[0, xMax]} ticks={niceTicks(xMax)} tickFormatter={fmtT} {...axisProps} />
            <YAxis
              domain={[yMin, yMax]}
              allowDataOverflow
              tickFormatter={(v: number) => `$${v.toFixed(0)}`}
              width={52}
              {...axisProps}
              axisLine={false}
            />
            <Tooltip content={<PriceTooltip bandPct={bandPct} />} cursor={{ stroke: C.muted, strokeDasharray: '3 3' }} isAnimationActive={false} />
            <Area dataKey="band" stroke="none" fill={C.cyan} fillOpacity={0.09} isAnimationActive={false} activeDot={false} />
            {FEED_KEYS.map((k) => (
              <Line
                key={k}
                dataKey={k}
                stroke={FEED_STYLE[k].color}
                strokeWidth={1.25}
                strokeDasharray={FEED_STYLE[k].dash}
                strokeOpacity={0.85}
                dot={false}
                activeDot={false}
                isAnimationActive={false}
              />
            ))}
            <Line dataKey="median" stroke={C.cyan} strokeWidth={3} dot={false} activeDot={{ r: 4, fill: C.cyan, stroke: C.surface, strokeWidth: 2 }} isAnimationActive={false} />
            <Line dataKey="ours" stroke={C.orange} strokeWidth={2} dot={false} activeDot={{ r: 4, fill: C.orange, stroke: C.surface, strokeWidth: 2 }} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export function PricePanel() {
  const prices = useStore((s) => s.prices);
  const bandPct = useStore((s) => s.bandPct);
  const feedStatus = useStore((s) => s.feedStatus);
  const scenario = useStore((s) => s.scenario);
  const phase = useStore((s) => s.phase);

  const last = prices[prices.length - 1];
  const dev = last ? (Math.abs(last.ours - last.median) / last.median) * 100 : 0;
  const note = SCENARIOS[scenario].reconstructionNote;

  return (
    <Panel
      title="Price: 3 reference feeds vs our execution price"
      subtitle={`Reference = median of 3 independent feeds. Shaded band = ±${fmtPct(bandPct)} published deviation band.`}
      right={phase === 'setup' ? <Pill tone="muted">Waiting for start</Pill> : <StatusChip status={feedStatus} />}
    >
      <div className="mb-2 flex flex-wrap items-end gap-x-6 gap-y-1">
        <Stat label="Reference median" value={last ? fmtUSD(last.median) : '—'} accent="text-cyan" />
        <Stat label="Our price" value={last ? fmtUSD(last.ours) : '—'} accent="text-orange" />
        <Stat
          label="Our deviation"
          value={last ? fmtPct(dev) : '—'}
          accent={dev > bandPct ? 'text-orange' : 'text-ink'}
          hint={last ? (dev > bandPct ? `outside ±${fmtPct(bandPct)} band` : `inside ±${fmtPct(bandPct)} band`) : undefined}
        />
        <PriceLegend />
      </div>

      {note && (
        <div className="mb-2 rounded-md border border-orange/30 bg-orange/5 px-2.5 py-1.5 text-[11px] leading-snug text-orange">
          {note}
        </div>
      )}

      <PriceChart height={380} />
    </Panel>
  );
}

function Stat({ label, value, accent, hint }: { label: string; value: string; accent: string; hint?: string }) {
  return (
    <div>
      <div className="text-[11px] text-muted">{label}</div>
      <div className={`num text-xl leading-tight font-semibold ${accent}`}>
        {value}
        {hint && <span className="ml-1.5 text-[11px] font-normal text-muted">{hint}</span>}
      </div>
    </div>
  );
}

export function PriceLegend() {
  const items: { label: string; color: string; width: number; dash?: string }[] = [
    { label: 'Median', color: C.cyan, width: 3 },
    { label: 'Our price', color: C.orange, width: 2 },
    { label: 'Feed A', color: C.feedA, width: 1.25 },
    { label: 'Feed B', color: C.feedB, width: 1.25, dash: '6 3' },
    { label: 'Feed C', color: C.feedC, width: 1.25, dash: '2 3' },
  ];
  return (
    <div className="ml-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">
      {items.map((it) => (
        <span key={it.label} className="inline-flex items-center gap-1.5">
          <svg width="18" height="6" aria-hidden>
            <line x1="0" y1="3" x2="18" y2="3" stroke={it.color} strokeWidth={it.width} strokeDasharray={it.dash} />
          </svg>
          {it.label}
        </span>
      ))}
      <span className="inline-flex items-center gap-1.5">
        <span className="inline-block h-2.5 w-4 rounded-sm" style={{ background: C.cyan, opacity: 0.2 }} />
        Band
      </span>
    </div>
  );
}
