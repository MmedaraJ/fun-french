// Keeps the installed app up to date. The service worker downloads a new version in the
// background and takes over as soon as it's ready; the page then reloads into it the next
// time she's on the home screen, never in the middle of a round or while adding words.
import { toast } from '../components/Toasts';

const UPDATED_FLAG = 'bonbon-updated';
const RELOADED_AT = 'bonbon-reloaded-at';

const onHome = () => ['', '#', '#/'].includes(location.hash);

/** Reloads unless it already did so a moment ago (so it can never loop). */
function reload(): boolean {
  try {
    const last = Number(sessionStorage.getItem(RELOADED_AT) || 0);
    if (Date.now() - last < 10_000) return false;
    sessionStorage.setItem(RELOADED_AT, String(Date.now()));
    sessionStorage.setItem(UPDATED_FLAG, '1');
  } catch {
    /* private mode: reload anyway */
  }
  location.reload();
  return true;
}

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  // the first install also "changes" the controller; only a replacement is an update
  let controlled = !!navigator.serviceWorker.controller;
  let pending = false;
  const reloadIfSafe = () => {
    if (pending && onHome() && reload()) pending = false;
  };
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    const wasControlled = controlled;
    controlled = true;
    if (!wasControlled) return;
    pending = true;
    reloadIfSafe();
  });
  window.addEventListener('hashchange', reloadIfSafe);

  window.addEventListener('load', () => {
    const base = import.meta.env.BASE_URL;
    navigator.serviceWorker
      .register(`${base}sw.js`, { scope: base })
      .then((reg) => {
        // look for a new version whenever the app comes back to the front, and every hour
        const check = () => void reg.update().catch(() => {});
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') check();
        });
        setInterval(check, 60 * 60 * 1000);
      })
      .catch(() => {});
  });

  // A page from the previous version asking for a file the new version no longer has.
  window.addEventListener('vite:preloadError', (e) => {
    e.preventDefault();
    reload();
  });
}

try {
  if (sessionStorage.getItem(UPDATED_FLAG)) {
    sessionStorage.removeItem(UPDATED_FLAG);
    setTimeout(() => toast({ title: 'Bonbon est à jour !', body: 'Updated to the newest version.', emoji: '✨', tone: 'success' }, 3500), 1200);
  }
} catch {
  /* no sessionStorage: nothing to announce */
}
