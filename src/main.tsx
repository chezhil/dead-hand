import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { useStore } from './core/store';
import { buildFixture, fixtureRequested } from './core/fixture';
import { advance } from './core/engine';

// Dev toggle: ?fixture=1 loads the store frozen at T+35:00 of system_fault.
if (fixtureRequested()) {
  useStore.setState(buildFixture());
  // Once the fixture run is reset, drop ?fixture=1 so the header stops labelling live runs as the fixture.
  const unsub = useStore.subscribe((s, prev) => {
    if (prev.phase !== 'setup' && s.phase === 'setup') {
      history.replaceState(null, '', location.pathname);
      unsub();
    }
  });
}

// Dev only: poke the store from the browser console while debugging.
if (import.meta.env.DEV) {
  const w = window as unknown as { __store: typeof useStore; __jump: (t: number) => void };
  w.__store = useStore;
  w.__jump = (t) => useStore.setState(advance(useStore.getState(), t));
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
