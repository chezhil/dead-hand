import { describe, expect, it } from 'vitest';
import { advance, createInitialState, makegoodTotals, SIM_END } from './engine';
import type { ScenarioId, SimState } from './types';

const SCENARIOS: ScenarioId[] = ['system_fault', 'market_move', 'historical_replay'];
const BANDS = Array.from({ length: 19 }, (_, i) => 0.5 + i * 0.25);

function run(sc: ScenarioId, band: number): SimState {
  const s = advance({ ...createInitialState(sc), bandPct: band, phase: 'running', bandLocked: true }, 0);
  return advance(s, SIM_END);
}

describe.each(SCENARIOS)('%s at every band', (sc) => {
  it.each(BANDS)('band %s%%', (band) => {
    const s = run(sc, band);
    const { count, total } = makegoodTotals(s.liquidations);
    for (const l of s.liquidations) {
      expect(l.status === 'tested' || l.status === 'queued').toBe(true);
      const unfav = l.side === 'long' ? l.referenceMedian - l.executionPrice : l.executionPrice - l.referenceMedian;
      const shouldPay = Number(l.deviationPct!.toFixed(2)) > band && unfav > 0;
      expect(l.verdict).toBe(shouldPay ? 'makegood' : 'no_makegood');
      expect(l.status).toBe(shouldPay ? 'queued' : 'tested');
      if (shouldPay) expect(l.amountOwed).toBeCloseTo(unfav * l.qty, 1);
    }
    const text = [...s.log.map((e) => e.text), ...s.comms.flatMap((c) => [c.title, c.body])].join('\n');
    expect(text).not.toMatch(/NaN|undefined|Infinity|\$-/);
    const post = s.comms.find((c) => c.channel === 'x_post')!;
    expect(post.title).toMatch(count > 0 ? /price was wrong/ : /market moved/i);
    if (count > 0) expect(post.body).toContain(total.toLocaleString('en-US', { minimumFractionDigits: 2 }));
    expect(s.makegoodButtonVisible).toBe(true);
  });
});
