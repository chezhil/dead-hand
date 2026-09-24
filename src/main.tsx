import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { useStore } from './core/store';
import { buildFixture, fixtureRequested } from './core/fixture';

// Dev toggle: ?fixture=1 loads the store frozen at T+35:00 of system_fault.
if (fixtureRequested()) useStore.setState(buildFixture());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
