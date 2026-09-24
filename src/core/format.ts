// Shared formatters. Owned by Agent A; everyone imports these so the UI is consistent.

/** "T+MM:SS" from sim seconds. */
export function fmtT(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `T+${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** "$1,234.56" */
export function fmtUSD(n: number): string {
  return usd.format(n);
}

/** "3.41%" */
export function fmtPct(n: number, digits = 2): string {
  return `${n.toFixed(digits)}%`;
}

export function fmtInt(n: number): string {
  return Math.round(n).toLocaleString('en-US');
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Deviations are published to 2 decimals and the band rule is applied to that published
 * figure, so what users see ("2.00%") always agrees with the verdict. Use this for every
 * deviation-vs-band comparison.
 */
export function exceedsBand(deviationPct: number, bandPct: number): boolean {
  return round2(deviationPct) > bandPct;
}
