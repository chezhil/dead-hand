import { describe, expect, it } from 'vitest';
import { advance, createInitialState, makegoodTotals, SIM_END, T } from './engine';
import { buildFixture, FIXTURE_TIME } from './fixture';
import type { ScenarioId, SimState } from './types';

function runTo(scenario: ScenarioId, to: number, step = 15): SimState {
  let s: SimState = advance({ ...createInitialState(scenario), phase: 'running', bandLocked: true }, 0);
  while (s.simTime < to) s = advance(s, Math.min(to, s.simTime + step));
  return s;
}

const ALL: ScenarioId[] = ['system_fault', 'market_move', 'historical_replay'];

describe.each(ALL)('%s', (scenario) => {
  const end = runTo(scenario, SIM_END);

  it('runs the full 60 minutes and ends', () => {
    expect(end.simTime).toBe(SIM_END);
    expect(end.phase).toBe('ended');
    expect(end.stage).toBe('disclose');
    expect(end.prices.length).toBe(SIM_END / 5 + 1);
  });

  it('flags divergence at T+00:00', () => {
    const s0 = runTo(scenario, 0);
    expect(s0.feedStatus).not.toBe('agree');
    expect(s0.log[0].text).toMatch(/^DETECT/);
  });

  it('fires the timeline at the right times', () => {
    expect(runTo(scenario, T.paged - 1).responder.status).toBe('idle');
    expect(runTo(scenario, T.paged).responder).toMatchObject({ status: 'paged', pagedAt: 60 });
    expect(runTo(scenario, T.halt - 1).orderTypes.newLeverage).toBe(true);
    const halted = runTo(scenario, T.halt);
    expect(halted.orderTypes).toEqual({ newLeverage: false, topUp: true, reduce: true, close: true, withdraw: true });
    expect(runTo(scenario, T.ack).responder).toMatchObject({ status: 'acknowledged', ackAt: 240 });
    const five = runTo(scenario, T.statusPage);
    expect(five.comms.filter((c) => c.status === 'sent').map((c) => c.channel).sort()).toEqual(['push', 'status_page']);
    const beforeTest = runTo(scenario, T.deviationTest - 1);
    expect(beforeTest.liquidations.every((l) => l.status === 'untested')).toBe(true);
    const tested = runTo(scenario, T.deviationTest);
    expect(tested.liquidations.every((l) => l.status === 'tested')).toBe(true);
    expect(runTo(scenario, T.makegoodsQueued - 1).makegoodButtonVisible).toBe(false);
    expect(runTo(scenario, T.makegoodsQueued).makegoodButtonVisible).toBe(true);
    expect(end.comms.every((c) => c.status === 'sent')).toBe(true);
  });

  it('is deterministic regardless of step size', () => {
    const a = runTo(scenario, 1200, 0.25 * 60);
    const b = runTo(scenario, 1200, 7);
    expect(b.liquidations).toEqual(a.liquidations);
    expect(b.signals).toEqual(a.signals);
    expect(b.log).toEqual(a.log);
  });
});

describe('scenario outcomes', () => {
  it('system_fault owes makegoods and includes Round 1 Case A', () => {
    const s = runTo('system_fault', SIM_END);
    const caseA = s.liquidations.find((l) => l.referenceMedian === 402.1 && l.executionPrice === 388.4)!;
    expect(caseA.deviationPct!.toFixed(2)).toBe('3.41');
    expect(caseA.amountOwed / caseA.qty).toBeCloseTo(13.7, 2);
    expect(makegoodTotals(s.liquidations).count).toBeGreaterThan(15);
    expect(s.log.some((l) => l.text.includes('Liquidations paused'))).toBe(true);
  });

  it('market_move owes nothing and includes Round 1 Case B', () => {
    const s = runTo('market_move', SIM_END);
    const caseB = s.liquidations.find((l) => l.referenceMedian === 351 && l.executionPrice === 349.6)!;
    expect(caseB.deviationPct!.toFixed(2)).toBe('0.40');
    expect(makegoodTotals(s.liquidations).count).toBe(0);
    expect(s.liquidations.every((l) => (l.deviationPct ?? 0) < 2)).toBe(true);
  });

  it('historical_replay is a mixed outcome', () => {
    const s = runTo('historical_replay', SIM_END);
    const { count } = makegoodTotals(s.liquidations);
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThan(s.liquidations.length / 2);
  });
});

describe('fixture', () => {
  it('is frozen at T+35:00 with makegoods queued and the button visible', () => {
    const f = buildFixture();
    expect(f.simTime).toBe(FIXTURE_TIME);
    expect(f.phase).toBe('paused');
    expect(f.makegoodButtonVisible).toBe(true);
    expect(f.responder.status).toBe('on_it');
    expect(f.liquidations.length).toBeGreaterThanOrEqual(30);
    expect(f.liquidations.some((l) => l.status === 'queued')).toBe(true);
  });
});
