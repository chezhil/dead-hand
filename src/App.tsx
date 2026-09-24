// Layout grid. Owned by Agent A. Other agents only fill their named slots.
import { useEffect, type ReactNode } from 'react';
import { useStore } from './core/store';
import { startEngine } from './core/engine';
import type { DrawerName } from './core/types';
import { CircuitBreakerPanel, Header, PricePanel, SetupBar, SignalsPanel, TimelineBar } from './panels/incident';
import { CommsFeedSlot, PublicPageDrawer, ReportDrawer, SocialSlot, UserDrawer } from './panels/comms';
import { ComparisonDrawer, LiquidationsSlot, LogSlot, MakegoodSlot, ReserveSlot, ResponderSlot } from './panels/ops';
import { Drawer } from './ui/Drawer';

const DRAWERS: Record<Exclude<DrawerName, 'none'>, { title: string; subtitle: string; Body: () => ReactNode }> = {
  comparison: { title: 'Manual response vs Dead-Hand Protocol', subtitle: 'Same incident, two ways of handling it', Body: ComparisonDrawer },
  public_page: { title: 'Public transparency page', subtitle: 'What anyone can see, live', Body: PublicPageDrawer },
  user: { title: 'What this user saw', subtitle: 'Per-user view', Body: UserDrawer },
  report: { title: 'Post-incident report', subtitle: 'Generated from the run', Body: ReportDrawer },
};

const TOOLBAR: { name: Exclude<DrawerName, 'none' | 'user'>; label: string }[] = [
  { name: 'comparison', label: 'Compare with manual response' },
  { name: 'public_page', label: 'Public transparency page' },
  { name: 'report', label: 'Post-incident report' },
];

export default function App() {
  const activeDrawer = useStore((s) => s.activeDrawer);
  const openDrawer = useStore((s) => s.openDrawer);
  const closeDrawer = useStore((s) => s.closeDrawer);

  useEffect(() => startEngine(useStore), []);

  const drawer = activeDrawer === 'none' ? null : DRAWERS[activeDrawer];

  return (
    <div className="app-shell mx-auto flex max-w-[1600px] min-w-[1240px] flex-col gap-3 px-5 py-4">
      <Header />
      <SetupBar />

      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <TimelineBar />
        </div>
        <nav className="flex shrink-0 gap-2 pb-5" aria-label="Views">
          {TOOLBAR.map((b) => (
            <button
              key={b.name}
              onClick={() => openDrawer(b.name)}
              className="rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:border-cyan/50 hover:text-ink"
            >
              {b.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Main grid: left (wide) price + signals, middle breaker/comms/social, right responder/log */}
      <main className="grid grid-cols-12 gap-3">
        <div className="col-span-6 flex min-w-0 flex-col gap-3">
          <PricePanel />
          <SignalsPanel />
        </div>
        <div className="col-span-3 flex min-w-0 flex-col gap-3">
          <CircuitBreakerPanel />
          <CommsFeedSlot />
          <SocialSlot />
        </div>
        <div className="col-span-3 flex min-w-0 flex-col gap-3">
          <ResponderSlot />
          {/* The log fills whatever height the other columns set, and scrolls inside. */}
          <div className="relative min-h-[360px] flex-1">
            <div className="absolute inset-0">
              <LogSlot />
            </div>
          </div>
        </div>

        {/* Bottom row: liquidations table (wide), reserve + makegood */}
        <div className="col-span-8 min-w-0">
          <LiquidationsSlot />
        </div>
        <div className="col-span-4 flex min-w-0 flex-col gap-3">
          <ReserveSlot />
          <MakegoodSlot />
        </div>
      </main>

      <footer className="pt-2 pb-4 text-center text-[11px] text-muted/70">
        Simulation. All data is fictional and generated deterministically in the browser. ACM MarketSphere 2026 · Track 3.
      </footer>

      {drawer && (
        <Drawer open title={drawer.title} subtitle={drawer.subtitle} onClose={closeDrawer}>
          <drawer.Body />
        </Drawer>
      )}
    </div>
  );
}
