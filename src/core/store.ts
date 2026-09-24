// The single Zustand store. Owned by Agent A. Read it anywhere with
// `useStore((s) => s.whatever)`; change it only through the actions.
import { create } from 'zustand';
import type { LogEntry, SimState, Store } from './types';
import { advance, createInitialState, makegoodTotals } from './engine';
import { fmtPct, fmtUSD, round2 } from './format';

/** Real-time delay between "confirmed" and "paid", so the UI shows both states. */
const PAYOUT_DELAY_MS = 900;

function logEntry(s: SimState, actor: LogEntry['actor'], text: string): LogEntry {
  return { id: `log-${String(s.log.length + 1).padStart(4, '0')}`, t: s.simTime, actor, stage: s.stage, text };
}

export const useStore = create<Store>()((set, get) => ({
  ...createInitialState(),

  setScenario: (id) => {
    const s = get();
    if (s.phase === 'running' || s.phase === 'paused') return;
    set({ ...createInitialState(id), bandPct: s.bandPct, speed: s.speed });
  },

  setBand: (pct) => {
    if (get().bandLocked) return;
    set({ bandPct: Math.min(5, Math.max(0.5, Math.round(pct * 4) / 4)) });
  },

  setSpeed: (speed) => set({ speed }),

  start: () => {
    const s = get();
    if (s.phase !== 'setup') return;
    set(advance({ ...s, phase: 'running', bandLocked: true }, 0));
  },

  pause: () => get().phase === 'running' && set({ phase: 'paused' }),

  resume: () => get().phase === 'paused' && set({ phase: 'running' }),

  reset: () => {
    const s = get();
    set({ ...createInitialState(s.scenario), bandPct: s.bandPct, speed: s.speed });
  },

  confirmMakegoods: () => {
    const s = get();
    if (s.humanCallsUsed >= 1 || !s.makegoodButtonVisible) return;
    const queued = s.liquidations.filter((l) => l.status === 'queued');
    if (queued.length === 0) return;
    const total = round2(queued.reduce((sum, l) => sum + l.amountOwed, 0));
    set({
      humanCallsUsed: 1,
      makegoodsConfirmedAt: s.simTime,
      liquidations: s.liquidations.map((l) => (l.status === 'queued' ? { ...l, status: 'confirmed' } : l)),
      log: [...s.log, logEntry(s, 'human', `Human call 1 of 1: confirmed ${queued.length} makegoods (${fmtUSD(total)}).`)],
    });

    setTimeout(() => {
      const now = get();
      const confirmed = now.liquidations.filter((l) => l.status === 'confirmed');
      if (confirmed.length === 0) return; // reset in the meantime
      const owed = round2(confirmed.reduce((sum, l) => sum + l.amountOwed, 0));
      const paid = Math.min(owed, now.reserveBalance);
      const short = paid < owed;
      set({
        reserveBalance: round2(now.reserveBalance - paid),
        liquidations: now.liquidations.map((l) => (l.status === 'confirmed' ? { ...l, status: 'paid' } : l)),
        log: [
          ...now.log,
          logEntry(
            now,
            'system',
            short
              ? `Integrity Reserve short: paid ${fmtUSD(paid)} of ${fmtUSD(owed)} pro-rata (${fmtPct((paid / owed) * 100, 1)}). Shortfall disclosed.`
              : `Paid ${confirmed.length} makegoods (${fmtUSD(paid)}) from the Integrity Reserve. Balance ${fmtUSD(round2(now.reserveBalance - paid))}.`,
          ),
        ],
      });
    }, PAYOUT_DELAY_MS);
  },

  selectUser: (id) => set({ selectedUserId: id }),

  openDrawer: (name) => set({ activeDrawer: name }),

  closeDrawer: () => set({ activeDrawer: 'none' }),
}));

/** Convenience selector for panels that show makegood totals. */
export function useMakegoodTotals() {
  const liquidations = useStore((s) => s.liquidations);
  return makegoodTotals(liquidations);
}
