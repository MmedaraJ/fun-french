import { AnimatePresence, motion } from 'framer-motion';
import { create } from 'zustand';

interface WipeState {
  wipe: { color: string; x: number; y: number; key: number } | null;
  start: (color: string, x: number, y: number) => Promise<void>;
  clear: () => void;
}

const COVER_MS = 420;

/** Full-screen circle that grows from a tap point; used to "dive into" a game. */
export const useWipe = create<WipeState>((set) => ({
  wipe: null,
  start: (color, x, y) =>
    new Promise((resolve) => {
      set({ wipe: { color, x, y, key: Date.now() } });
      setTimeout(resolve, COVER_MS);
    }),
  clear: () => set({ wipe: null }),
}));

export function wipeFrom(el: Element | null | undefined, color: string): Promise<void> {
  const r = el?.getBoundingClientRect();
  const x = r ? r.left + r.width / 2 : window.innerWidth / 2;
  const y = r ? r.top + r.height / 2 : window.innerHeight / 2;
  return useWipe.getState().start(color, x, y);
}

export function ColorWipe() {
  const { wipe, clear } = useWipe();
  const radius = Math.hypot(window.innerWidth, window.innerHeight) * 1.05;
  return (
    <AnimatePresence>
      {wipe && (
        <motion.div
          key={wipe.key}
          aria-hidden
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 900,
            pointerEvents: 'none',
            background: wipe.color,
          }}
          initial={{ clipPath: `circle(0px at ${wipe.x}px ${wipe.y}px)` }}
          animate={{ clipPath: `circle(${radius}px at ${wipe.x}px ${wipe.y}px)` }}
          exit={{ opacity: 0 }}
          transition={{ duration: COVER_MS / 1000, ease: [0.7, 0, 0.3, 1] }}
          onAnimationComplete={() => setTimeout(clear, 120)}
        />
      )}
    </AnimatePresence>
  );
}
