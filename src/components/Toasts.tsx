import { AnimatePresence, motion } from 'framer-motion';
import { create } from 'zustand';
import { Emoji } from './Emoji';
import './Toasts.css';

export interface Toast {
  id: number;
  title: string;
  body?: string;
  emoji?: string;
  tone?: 'default' | 'success' | 'gold' | 'error';
}

interface ToastStore {
  toasts: Toast[];
  push: (t: Omit<Toast, 'id'>, ms?: number) => void;
  dismiss: (id: number) => void;
}

let next = 1;

export const useToasts = create<ToastStore>((set, get) => ({
  toasts: [],
  push: (t, ms = 2600) => {
    const id = next++;
    set({ toasts: [...get().toasts, { ...t, id }].slice(-3) });
    setTimeout(() => get().dismiss(id), ms);
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));

export const toast = (t: Omit<Toast, 'id'>, ms?: number) => useToasts.getState().push(t, ms);

export function Toasts() {
  const { toasts, dismiss } = useToasts();
  return (
    <div className="toasts" aria-live="polite">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.button
            key={t.id}
            layout
            className={`toast toast--${t.tone ?? 'default'}`}
            initial={{ opacity: 0, y: -40, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -30, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 420, damping: 28 }}
            onClick={() => dismiss(t.id)}
          >
            {t.emoji && (
              <motion.span
                className="toast-emoji"
                initial={{ rotate: -30, scale: 0 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 12, delay: 0.1 }}
              >
                <Emoji e={t.emoji} size={34} />
              </motion.span>
            )}
            <span className="toast-text">
              <strong>{t.title}</strong>
              {t.body && <span>{t.body}</span>}
            </span>
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  );
}
