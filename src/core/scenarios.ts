// Scenario definitions: deterministic price paths and liquidation scripts.
// Everything here is a pure function of (scenario, t), so every demo run is identical
// at any speed.
import type { Liquidation, PricePoint, ScenarioId } from './types';
import { feedStatusOf, median3 } from './watchdog';
import { round2 } from './format';

export interface ScenarioMeta {
  id: ScenarioId;
  label: string;
  tagline: string;
  description: string;
  /** Open positions that receive the T+05:00 push. */
  openPositions: number;
  /** Shown prominently when set (historical replay). */
  reconstructionNote?: string;
}

export const SCENARIOS: Record<ScenarioId, ScenarioMeta> = {
  system_fault: {
    id: 'system_fault',
    label: 'System fault',
    tagline: 'Our price was wrong',
    description:
      'Feed A glitches and our execution price follows the bad feed. Liquidations deviate more than the band, so makegoods are owed.',
    openPositions: 12480,
  },
  market_move: {
    id: 'market_move',
    label: 'Real market move',
    tagline: "The market moved, our price didn't",
    description:
      'All three feeds fall together and our price tracks them. Every deviation stays inside the band: no makegoods, data still published.',
    openPositions: 12480,
  },
  historical_replay: {
    id: 'historical_replay',
    label: 'Historical replay',
    tagline: 'One venue collapses',
    description:
      'One venue prints near zero while the others hold. The median protects most users; a short lag in our execution price during recovery triggers a few makegoods.',
    openPositions: 9860,
    reconstructionNote:
      'Approximate reconstruction of the ETH-USD single-venue flash crash of 21 June 2017 (one exchange briefly traded near $0.10 while others held). Shape only, time-stretched; not exact data.',
  },
};

export const SCENARIO_ORDER: ScenarioId[] = ['system_fault', 'market_move', 'historical_replay'];

// ---------------------------------------------------------------------------
// Deterministic noise helpers

function hash01(i: number, seed: number): number {
  let h = Math.imul((i | 0) ^ Math.imul(seed, 0x9e3779b1), 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Smooth value noise in [-1, 1]. */
export function vnoise(t: number, period: number, seed: number): number {
  const x = t / period;
  const i = Math.floor(x);
  const f = x - i;
  const a = hash01(i, seed) * 2 - 1;
  const b = hash01(i + 1, seed) * 2 - 1;
  const u = f * f * (3 - 2 * f);
  return a + (b - a) * u;
}

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

function smoothstep(a: number, b: number, x: number): number {
  const u = clamp01((x - a) / (b - a));
  return u * u * (3 - 2 * u);
}

/** 0 before a, ramps to 1 by b, holds, ramps back to 0 between c and d. */
function plateau(a: number, b: number, c: number, d: number, x: number): number {
  return smoothstep(a, b, x) * (1 - smoothstep(c, d, x));
}

function keyframes(frames: [number, number][], x: number): number {
  if (x <= frames[0][0]) return frames[0][1];
  for (let i = 1; i < frames.length; i++) {
    const [x1, y1] = frames[i];
    if (x <= x1) {
      const [x0, y0] = frames[i - 1];
      return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
    }
  }
  return frames[frames.length - 1][1];
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// Price paths

interface ScenarioDef {
  seed: number;
  feeds: (t: number) => [number, number, number];
  ours: (t: number, median: number, feeds: [number, number, number]) => number;
  /** Liquidations per minute, by side. */
  intensity: (t: number) => { long: number; short: number };
  /** Liquidations pinned to exact Round 1 numbers. */
  anchors: Array<{ t: number; side: 'long' | 'short'; qty: number; median: number; exec: number; userName: string }>;
  /** Scales the support-ticket curve. */
  ticketScale: number;
}

function marketMovePath(t: number): number {
  return (
    402.1 -
    30 * smoothstep(-30, 150, t) -
    21.1 * smoothstep(100, 420, t) +
    4.5 * Math.exp(-(((t - 620) / 140) ** 2)) -
    1.5 * smoothstep(1000, 2400, t)
  );
}

const DEFS: Record<ScenarioId, ScenarioDef> = {
  // Feed A glitches low for ~11 minutes, snaps back with an overshoot. Feed B
  // wobbles high for two minutes in the middle, so 2 of 3 disagree and liquidations
  // pause. Our execution price is (wrongly) pinned to Feed A throughout.
  system_fault: {
    seed: 11,
    feeds: (t) => {
      const m = 402.1 * (1 + 0.0012 * vnoise(t, 90, 1) + 0.0005 * vnoise(t, 17, 2));
      const glitchLow = (0.012 + 0.022 * smoothstep(0, 60, t) + 0.003 * vnoise(t, 20, 5)) * (1 - smoothstep(650, 700, t));
      const overshoot = 0.026 * plateau(695, 712, 760, 785, t);
      const a = m * (1 - glitchLow + overshoot);
      const b = m * (1 + 0.0004 * vnoise(t, 11, 3) + 0.009 * plateau(330, 345, 435, 450, t));
      const c = m * (1 + 0.0004 * vnoise(t, 13, 4));
      return [a, b, c];
    },
    ours: (t, _median, [a]) => a * (1 + 0.0006 * vnoise(t, 7, 6)),
    intensity: (t) => ({
      long: t >= 10 && t <= 650 ? 4.2 : t >= 800 && t <= 1650 ? 0.35 : 0,
      short: t >= 705 && t <= 775 ? 3.2 : 0,
    }),
    anchors: [{ t: 95, side: 'long', qty: 10, median: 402.1, exec: 388.4, userName: 'Priya S.' }],
    ticketScale: 1,
  },

  // Everything falls ~13% together. Feed C lags by up to 30s at the start, which is
  // what the watchdog flags at T+00:00; it clears within a minute.
  market_move: {
    seed: 23,
    feeds: (t) => {
      const base = marketMovePath(t);
      const lag = 40 * (1 - smoothstep(15, 70, t));
      const n = (s: number) => 1 + 0.0009 * vnoise(t, 60, s) + 0.0004 * vnoise(t, 9, s + 1);
      const a = base * n(31) * (1 + 0.0003 * vnoise(t, 5, 40));
      const b = base * n(31) * (1 + 0.0003 * vnoise(t, 6, 41));
      const c = marketMovePath(t - lag) * n(31) * (1 + 0.0003 * vnoise(t, 7, 42));
      return [a, b, c];
    },
    ours: (t, median) => median * (1 - 0.001 + 0.0022 * vnoise(t, 9, 7)),
    intensity: (t) => ({
      long: t >= 5 && t <= 560 ? 3.6 : t > 560 && t <= 1500 ? 0.55 : 0,
      short: t >= 560 && t <= 700 ? 1.8 : 0,
    }),
    anchors: [{ t: 410, side: 'long', qty: 8, median: 351.0, exec: 349.6, userName: 'Arjun K.' }],
    ticketScale: 1.15,
  },

  // Feed A (one venue) collapses to ~$0.10 and recovers over ~3 minutes. Feed B
  // dips 1.5% in sympathy for the first ~50s, so liquidations pause. Our execution
  // price lags the median by ~3% during Feed A's recovery.
  historical_replay: {
    seed: 37,
    feeds: (t) => {
      const m =
        317.81 *
        (1 - 0.04 * smoothstep(0, 120, t) + 0.03 * smoothstep(150, 900, t) + 0.008 * smoothstep(900, 2400, t)) *
        (1 + 0.0012 * vnoise(t, 45, 8));
      const aFactor = keyframes(
        [
          [-5, 1],
          [-1, 0.6],
          [2, 0.0003],
          [25, 0.0003],
          [40, 0.8],
          [60, 0.9],
          [90, 0.965],
          [150, 0.99],
          [200, 1],
        ],
        t,
      );
      const a = t > 2 && t < 25 ? 0.1 + 0.02 * hash01(Math.floor(t), 9) : m * aFactor * (1 + 0.0004 * vnoise(t, 9, 10));
      const b = m * (1 - 0.015 * plateau(-5, 0, 40, 55, t) + 0.0004 * vnoise(t, 11, 12));
      const c = m * (1 + 0.0004 * vnoise(t, 13, 13));
      return [a, b, c];
    },
    ours: (t, median) => median * (1 - 0.032 * plateau(50, 60, 120, 150, t) + 0.0008 * vnoise(t, 7, 14)),
    intensity: (t) => ({
      long: t >= 50 && t <= 300 ? 5 : t > 300 && t <= 1500 ? 0.6 : 0,
      short: 0,
    }),
    anchors: [],
    ticketScale: 0.85,
  },
};

/** The full-precision price point for a scenario at sim second t. */
export function pricePointAt(id: ScenarioId, t: number): PricePoint {
  const def = DEFS[id];
  const feeds = def.feeds(t);
  const [feedA, feedB, feedC] = feeds;
  const median = median3(feedA, feedB, feedC);
  const ours = def.ours(t, median, feeds);
  return {
    t,
    feedA: round2(feedA),
    feedB: round2(feedB),
    feedC: round2(feedC),
    median: round2(median),
    ours: round2(ours),
  };
}

export function ticketScale(id: ScenarioId): number {
  return DEFS[id].ticketScale;
}

export function scenarioSeed(id: ScenarioId): number {
  return DEFS[id].seed;
}

// ---------------------------------------------------------------------------
// Liquidation script

const FIRST_NAMES = [
  'Aarav', 'Vivaan', 'Aditya', 'Ishaan', 'Kabir', 'Rohan', 'Arnav', 'Dev', 'Kiran', 'Rahul',
  'Sneha', 'Ananya', 'Diya', 'Meera', 'Kavya', 'Riya', 'Tara', 'Nisha', 'Pooja', 'Aisha',
  'Siddharth', 'Varun', 'Neha', 'Farhan', 'Zoya', 'Harsh', 'Ira', 'Manav', 'Sana', 'Yash',
];
const LAST_INITIALS = 'ABDGIJKMNPRSTV';

/** Liquidations happen only while the watchdog is not pausing them, sampled every 5s. */
const PRICE_STEP = 5;
const LAST_LIQUIDATION_T = 1700;

const scriptCache = new Map<ScenarioId, Liquidation[]>();

/** Every liquidation this scenario will produce, untested, sorted by t. */
export function liquidationScript(id: ScenarioId): Liquidation[] {
  const cached = scriptCache.get(id);
  if (cached) return cached;

  const def = DEFS[id];
  const rng = mulberry32(def.seed * 7919);
  const usedIds = new Set<string>();
  const out: Liquidation[] = [];

  const make = (t: number, side: 'long' | 'short', qty: number, median: number, exec: number, userName?: string) => {
    let userId: string;
    do {
      userId = `U-${10000 + Math.floor(rng() * 89999)}`;
    } while (usedIds.has(userId));
    usedIds.add(userId);
    out.push({
      id: '',
      t,
      userId,
      userName:
        userName ??
        `${FIRST_NAMES[Math.floor(rng() * FIRST_NAMES.length)]} ${LAST_INITIALS[Math.floor(rng() * LAST_INITIALS.length)]}.`,
      side,
      qty,
      referenceMedian: median,
      executionPrice: exec,
      deviationPct: null,
      verdict: 'pending',
      amountOwed: 0,
      status: 'untested',
    });
  };

  const anchorTimes = new Set(def.anchors.map((a) => a.t));
  for (let t = 1; t <= LAST_LIQUIDATION_T; t++) {
    const sample = pricePointAt(id, t - (t % PRICE_STEP));
    if (feedStatusOf(sample) === 'liquidations_paused') continue;
    const rates = def.intensity(t);
    for (const side of ['long', 'short'] as const) {
      const hit = rng() < rates[side] / 60;
      const qtyRoll = rng();
      if (!hit || anchorTimes.has(t)) continue;
      const qty = Math.round((1 + qtyRoll * qtyRoll * 39) * 2) / 2;
      const p = pricePointAt(id, t);
      make(t, side, qty, p.median, p.ours);
    }
  }
  for (const a of def.anchors) make(a.t, a.side, a.qty, a.median, a.exec, a.userName);

  out.sort((x, y) => x.t - y.t);
  out.forEach((l, i) => (l.id = `L-${String(i + 1).padStart(4, '0')}`));
  scriptCache.set(id, out);
  return out;
}
