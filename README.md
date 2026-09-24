# Dead-Hand Console

ACM MarketSphere 2026 · Round 2 · Track 3 (Flash-Crash Simulation).

A single-page autopilot console for MochaTrade's **Dead-Hand Protocol**: every decision is
made in advance and the system runs the incident by itself. The only human action in the
first hour is **Confirm makegoods**. No backend, no login; all data is simulated
deterministically in the browser, so every demo run is identical.

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # engine, comms and deviation tests
npm run build      # typecheck + production build
```

For the demo, run the production build: `npm run build && npm run preview`.

In dev builds, `window.__store` (the Zustand store) and `window.__jump(simSeconds)` are
available in the browser console for debugging, e.g. `__jump(1800)` to skip to T+30:00.

Open `http://localhost:5173/?fixture=1` to load the store frozen at **T+35:00 of the
system_fault scenario** (makegoods queued, button visible, not yet confirmed). Press
Resume to continue from there.

## Who owns what

| Path | Owner |
| --- | --- |
| `src/core/` (types, store, engine, scenarios, watchdog, fixture, format) | Agent A (Chezhil) |
| `src/panels/incident/`, `src/App.tsx`, `src/ui/` | Agent A |
| `src/panels/comms/`, `src/content/templates.ts` | Agent B (Kaustubh) |
| `src/panels/ops/`, `src/lib/deviation.ts` | Agent C (Hamza) |

**Golden rule:** stay inside your own folders. Need a contract change? Ask Agent A.

Keep the export names and signatures in `src/content/templates.ts` (`TEMPLATES`) and
`src/lib/deviation.ts` (`runDeviationTest`); the engine imports them.

## Slots

`App.tsx` imports these names from each folder's `index.ts`; keep the exports.

- `src/panels/comms`: `CommsFeedSlot`, `SocialSlot`, `PublicPageDrawer`, `UserDrawer`, `ReportDrawer`
- `src/panels/ops`: `LiquidationsSlot`, `ReserveSlot`, `MakegoodSlot`, `ResponderSlot`, `LogSlot`, `ComparisonDrawer`

Drawer components render only their body; the shell (title, close, Esc) is in
`src/ui/Drawer.tsx`. Wrap slot content in `<Panel>` from `src/ui/Panel.tsx` so the grid
stays consistent, and use `fmtT` / `fmtUSD` / `fmtPct` from `src/core/format.ts`.

## Reading the store

```ts
import { useStore, useMakegoodTotals } from '../../core/store';
const liquidations = useStore((s) => s.liquidations);
const confirm = useStore((s) => s.confirmMakegoods);
```

Two fields were added on top of the shared contract: `makegoodsConfirmedAt`
(sim time of the human confirmation, or null) and `responder.onItAt`.

## Engine

`advance(state, to)` in `src/core/engine.ts` is pure: it replays every integer sim second
up to `to`, so results are identical at 1x, 20x, 60x or when jumping straight to T+35:00.
`startEngine(store)` ticks every 250 ms and advances `simTime` by `0.25 × speed`.

| Sim time | Event |
| --- | --- |
| T+00:00 | Watchdog flags feed divergence (DETECT) |
| T+01:00 | IST responder paged |
| T+02:00 | New leveraged opens halted; exits stay live (CONTAIN) |
| T+04:00 | Responder acknowledges |
| T+05:00 | Status page + push (from `TEMPLATES`), responder on it |
| T+15:00 | Deviation test on every liquidation so far, then on each new one (DECIDE) |
| T+30:00 | Makegoods queued; `makegoodButtonVisible = true` |
| T+60:00 | Public post (DISCLOSE); run ends |

Watchdog: a feed more than 0.5% from the 3-feed median is an outlier. One outlier =
`diverging`; two = `liquidations_paused` (no liquidations are generated while paused).
Social mentions are damped once a `status_page` message is sent.

Scenarios (`src/core/scenarios.ts`) include the Round 1 anchor cases: system_fault has a
liquidation at median $402.10 / ours $388.40 (3.41%, $13.70 per unit owed); market_move has
$351.00 / $349.60 (0.40%, no makegood).
