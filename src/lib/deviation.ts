// OWNER: Agent C (Hamza). STUB shipped by Agent A so the engine compiles and the
// fixture has real numbers. Replace freely, but keep the signature.
import type { Liquidation } from '../core/types';

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
  const makegood = deviationPct > bandPct && unfavourable > 0;
  return {
    ...liq,
    deviationPct,
    verdict: makegood ? 'makegood' : 'no_makegood',
    amountOwed: makegood ? Math.round(unfavourable * qty * 100) / 100 : 0,
    status: 'tested',
  };
}
