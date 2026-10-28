import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/fredoka';
import '@fontsource-variable/nunito';
import './styles/global.css';
import { App } from './App';
import { db } from './lib/db';
import './lib/updates';

// Handy for debugging and for the end-to-end tests (dev server only).
if (import.meta.env.DEV) (window as unknown as { __bonbon: unknown }).__bonbon = { db };

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
