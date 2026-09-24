// OWNER: Agent C (Hamza). Pure function; the engine imports it. Keep the signature.
import type { Liquidation } from '../core/types';
import { exceedsBand } from '../core/format';

/**
 * Deviation Doctrine: "We pay when our price was wrong. We never pay because the market was."
 * deviation% = |execution - reference median| / reference median x 100.
 * Makegood only if deviation > band AND the difference was unfavourable to the user.
 */
export function runDeviationTest(liq: Liquidation, bandPct: number): Liquidation {
  const { referenceMedian: median, executionPrice: price, qty, side } = liq;
  const deviationPct = (Math.abs(price - median) / median) * 100;
  // Long liquidated below the median, or short above it, is unfavourable.
  const unfavourable = side === 'long' ? Math.max(0, median - price) : Math.max(0, price - median);
  // Compared at published precision: "2.00%" against a 2.00% band is never paid.
  const makegood = exceedsBand(deviationPct, bandPct) && unfavourable > 0;
  return {
    ...liq,
    deviationPct,
    verdict: makegood ? 'makegood' : 'no_makegood',
    amountOwed: makegood ? Math.round(unfavourable * qty * 100) / 100 : 0,
    status: 'tested',
  };
}
