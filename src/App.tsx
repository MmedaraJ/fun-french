import { AnimatePresence, MotionConfig } from 'framer-motion';
import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { BottomNav } from './components/BottomNav';
import { ColorWipe } from './components/ColorWipe';
import { Loader } from './components/Loader';
import { Toasts } from './components/Toasts';
import { requestPersistence } from './lib/db';
import './lib/install';
import { ensureSeeded } from './lib/seed';
import { useSettings } from './lib/settings';
import { unlockAudio } from './lib/sound';
import { unlockSpeech } from './lib/speech';
import Home from './screens/Home';

const Game = lazy(() => import('./screens/Game'));
const Results = lazy(() => import('./screens/Results'));
const Words = lazy(() => import('./screens/Words'));
const Add = lazy(() => import('./screens/add/Add'));
const Stats = lazy(() => import('./screens/Stats'));
const Settings = lazy(() => import('./screens/Settings'));
const Welcome = lazy(() => import('./screens/Welcome'));

function useThemeAttr() {
  const theme = useSettings((s) => s.theme);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'auto' && mq.matches);
      document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [theme]);
}

function Boot({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useThemeAttr();
  useEffect(() => {
    ensureSeeded()
      .then(() => setReady(true))
      .catch((e) => setError(String(e?.message ?? e)));
    void requestPersistence();
    const unlock = () => {
      unlockAudio();
      unlockSpeech();
      window.removeEventListener('pointerdown', unlock);
    };
    window.addEventListener('pointerdown', unlock);
    return () => window.removeEventListener('pointerdown', unlock);
  }, []);
  if (error) {
    return (
      <div className="screen screen--narrow center" style={{ paddingTop: 80 }}>
        <h2>Oh non !</h2>
        <p className="muted" style={{ marginTop: 10 }}>
          Bonbon couldn't open its storage. If you're in a private window, try a normal one.
        </p>
        <p className="muted" style={{ marginTop: 10, fontSize: 13 }}>{error}</p>
      </div>
    );
  }
  return ready ? <>{children}</> : <Loader label="Préparation des bonbons…" />;
}

function Shell() {
  const location = useLocation();
  const onboarded = useSettings((s) => s.onboarded);
  const path = location.pathname;
  const fullscreen = /^\/(play|results|welcome)/.test(path);
  if (!onboarded && path !== '/welcome') return <Navigate to="/welcome" replace />;
  const routeKey = path.startsWith('/add') ? '/add' : path.startsWith('/words') ? '/words' : path;
  return (
    <div className="app">
      <Suspense fallback={<Loader />}>
        <AnimatePresence mode="wait" initial={false}>
          <Routes location={location} key={routeKey}>
            <Route path="/" element={<Home />} />
            <Route path="/play/:mode" element={<Game />} />
            <Route path="/results/:sessionId" element={<Results />} />
            <Route path="/words/*" element={<Words />} />
            <Route path="/add/*" element={<Add />} />
            <Route path="/stats" element={<Stats />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/welcome" element={<Welcome />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AnimatePresence>
      </Suspense>
      {!fullscreen && <BottomNav />}
    </div>
  );
}

export function App() {
  return (
    <MotionConfig reducedMotion="user">
      <HashRouter>
        <Boot>
          <Shell />
        </Boot>
        <Toasts />
        <ColorWipe />
      </HashRouter>
    </MotionConfig>
  );
}
