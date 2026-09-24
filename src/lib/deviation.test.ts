import { describe, expect, it } from 'vitest';
import { runDeviationTest } from './deviation';
import type { Liquidation } from '../core/types';

function createMockLiquidation(overrides: Partial<Liquidation>): Liquidation {
  return {
    id: 'liq-test-1',
    t: 120,
    userId: 'u_test_1',
    userName: 'Aarav Patel',
    side: 'long',
    qty: 1,
    referenceMedian: 400,
    executionPrice: 400,
    deviationPct: null,
    verdict: 'pending',
    amountOwed: 0,
    status: 'untested',
    ...overrides,
  };
}

describe('runDeviationTest', () => {
  it('covers Round 1 Case A: system fault deviation > band (402.10 / 388.40 -> 3.41%, makegood, $13.70/unit)', () => {
    const liq = createMockLiquidation({
      side: 'long',
      referenceMedian: 402.1,
      executionPrice: 388.4,
      qty: 1,
    });
    const result = runDeviationTest(liq, 2.0);

    expect(result.deviationPct).toBeCloseTo(3.407, 3);
    expect(result.deviationPct!.toFixed(2)).toBe('3.41');
    expect(result.verdict).toBe('makegood');
    expect(result.amountOwed).toBe(13.7);
    expect(result.status).toBe('tested');
  });

  it('covers Round 1 Case B: market move deviation < band (351.00 / 349.60 -> 0.40%, no makegood)', () => {
    const liq = createMockLiquidation({
      side: 'long',
      referenceMedian: 351.0,
      executionPrice: 349.6,
      qty: 1,
    });
    const result = runDeviationTest(liq, 2.0);

    expect(result.deviationPct).toBeCloseTo(0.3988, 3);
    expect(result.deviationPct!.toFixed(2)).toBe('0.40');
    expect(result.verdict).toBe('no_makegood');
    expect(result.amountOwed).toBe(0);
    expect(result.status).toBe('tested');
  });

  it('handles an unfavourable short liquidation above the reference median', () => {
    const liq = createMockLiquidation({
      side: 'short',
      referenceMedian: 100.0,
      executionPrice: 105.0,
      qty: 2,
    });
    const result = runDeviationTest(liq, 2.0);

    expect(result.deviationPct).toBe(5.0);
    expect(result.verdict).toBe('makegood');
    expect(result.amountOwed).toBe(10.0); // (105 - 100) * 2 = 10.00
    expect(result.status).toBe('tested');
  });

  it('does not pay profit on a favourable short liquidation below median', () => {
    // Short liquidated at a lower price than median benefited from the execution price
    const liq = createMockLiquidation({
      side: 'short',
      referenceMedian: 100.0,
      executionPrice: 95.0,
      qty: 2,
    });
    const result = runDeviationTest(liq, 2.0);

    expect(result.deviationPct).toBe(5.0);
    expect(result.verdict).toBe('no_makegood');
    expect(result.amountOwed).toBe(0);
    expect(result.status).toBe('tested');
  });

  it('does not pay profit on a favourable long liquidation above median', () => {
    const liq = createMockLiquidation({
      side: 'long',
      referenceMedian: 100.0,
      executionPrice: 105.0,
      qty: 1,
    });
    const result = runDeviationTest(liq, 2.0);

    expect(result.deviationPct).toBe(5.0);
    expect(result.verdict).toBe('no_makegood');
    expect(result.amountOwed).toBe(0);
    expect(result.status).toBe('tested');
  });

  it('enforces the strictly greater than rule: deviation exactly at the band is NOT paid', () => {
    // Median 100, execution 98 -> exactly 2.0% deviation
    const liq = createMockLiquidation({
      side: 'long',
      referenceMedian: 100.0,
      executionPrice: 98.0,
      qty: 1,
    });
    const result = runDeviationTest(liq, 2.0);

    expect(result.deviationPct).toBe(2.0);
    expect(result.verdict).toBe('no_makegood');
    expect(result.amountOwed).toBe(0);
    expect(result.status).toBe('tested');
  });

  it('multiplies amountOwed by position quantity correctly and rounds to 2 decimals', () => {
    const liq = createMockLiquidation({
      side: 'long',
      referenceMedian: 402.1,
      executionPrice: 388.4,
      qty: 5,
    });
    const result = runDeviationTest(liq, 2.0);

    expect(result.verdict).toBe('makegood');
    expect(result.amountOwed).toBe(68.5); // 13.70 * 5 = 68.50
  });
});
