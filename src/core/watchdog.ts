import type { FeedStatus } from './types';

/** A feed further than this from the 3-feed median counts as disagreeing. */
export const WATCHDOG_PCT = 0.5;

export type FeedKey = 'feedA' | 'feedB' | 'feedC';
export const FEED_KEYS: FeedKey[] = ['feedA', 'feedB', 'feedC'];

export function median3(a: number, b: number, c: number): number {
  return Math.max(Math.min(a, b), Math.min(Math.max(a, b), c));
}

/** Percent distance of each feed from the median of all three. */
export function feedDeviations(p: Record<FeedKey, number>): Record<FeedKey, number> {
  const m = median3(p.feedA, p.feedB, p.feedC);
  return {
    feedA: (Math.abs(p.feedA - m) / m) * 100,
    feedB: (Math.abs(p.feedB - m) / m) * 100,
    feedC: (Math.abs(p.feedC - m) / m) * 100,
  };
}

/** Feeds more than WATCHDOG_PCT away from the median. */
export function outlierFeeds(p: Record<FeedKey, number>): FeedKey[] {
  const d = feedDeviations(p);
  return FEED_KEYS.filter((k) => d[k] > WATCHDOG_PCT);
}

/**
 * One outlier: 'diverging' (the median still has two agreeing feeds behind it).
 * Two outliers: 'liquidations_paused' (2 of 3 disagree, so no trustworthy price).
 *
 * We measure against the median of all three rather than the median of the other
 * two, because with three feeds the "other two" median is their mean, which a single
 * bad feed drags off and would flag every feed at once.
 */
export function feedStatusOf(p: Record<FeedKey, number>): FeedStatus {
  const n = outlierFeeds(p).length;
  if (n === 0) return 'agree';
  if (n === 1) return 'diverging';
  return 'liquidations_paused';
}

export function feedLabel(k: FeedKey): string {
  return k === 'feedA' ? 'Feed A' : k === 'feedB' ? 'Feed B' : 'Feed C';
}
