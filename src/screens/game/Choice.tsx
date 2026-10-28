import { motion, useAnimate } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import { CardImage } from '../../components/CardImage';
import { burstFrom } from '../../lib/confetti';
import type { Card } from '../../types';
import type { QProps } from './types';

export type OptionState = 'idle' | 'correct' | 'wrong' | 'dim';

/** Shared multiple-choice behaviour: picking, keyboard 1-4, per-option state. */
export function useChoice({ q, phase, result, onAnswer }: Pick<QProps, 'q' | 'phase' | 'result' | 'onAnswer'>) {
  const [picked, setPicked] = useState<string | null>(null);
  const options = q.options ?? [];
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const pick = useCallback(
    (c: Card, i: number) => {
      if (phase !== 'ask' || picked) return;
      setPicked(c.id);
      const correct = c.id === q.card.id;
      if (correct) burstFrom(refs.current[i], { count: 22 });
      onAnswer(correct, { picked: c.id, given: correct ? undefined : c.fr });
    },
    [phase, picked, q.card.id, onAnswer],
  );

  useEffect(() => {
    if (phase !== 'ask') return;
    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key);
      if (n >= 1 && n <= options.length) pick(options[n - 1], n - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, options, pick]);

  const stateFor = (c: Card): OptionState => {
    if (phase !== 'feedback' && !picked) return 'idle';
    const chosen = result?.picked ?? picked;
    if (c.id === q.card.id) return 'correct';
    if (c.id === chosen) return 'wrong';
    return 'dim';
  };

  return { options, pick, stateFor, refs, answered: phase === 'feedback' || !!picked };
}

interface TileProps {
  card: Card;
  index: number;
  look: 'image' | 'fr' | 'en';
  state: OptionState;
  showSub?: boolean;
  onPick: () => void;
  innerRef: (el: HTMLButtonElement | null) => void;
}

/** One answer tile with entrance, success bounce and failure shake. */
export function OptionTile({ card, index, look, state, showSub, onPick, innerRef }: TileProps) {
  const [scope, animate] = useAnimate<HTMLButtonElement>();
  useEffect(() => {
    if (!scope.current) return;
    if (state === 'correct') void animate(scope.current, { scale: [1, 1.12, 0.97, 1] }, { duration: 0.5 });
    if (state === 'wrong') void animate(scope.current, { x: [0, -12, 12, -9, 9, -4, 0] }, { duration: 0.5 });
  }, [state, animate, scope]);

  const cls = ['opt', look === 'image' ? 'opt--image' : 'opt--text', card.imageId && look === 'image' ? 'has-photo' : '', state !== 'idle' ? 'is-' + state : ''].join(' ');

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5, rotate: index % 2 ? 6 : -6 }}
      animate={{ opacity: 1, scale: 1, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 380, damping: 18, delay: 0.08 + index * 0.06 }}
      style={{ display: 'grid' }}
    >
      <button
        ref={(el) => {
          (scope as { current: HTMLButtonElement | null }).current = el;
          innerRef(el);
        }}
        className={cls}
        onClick={onPick}
        disabled={state !== 'idle'}
        aria-label={look === 'image' ? `Option ${index + 1}` : undefined}
        data-option={card.id}
      >
        <span className="opt-key">{index + 1}</span>
        {look === 'image' ? (
          <CardImage card={card} size="100%" rounded={card.imageId ? 0 : 18} />
        ) : (
          <span>
            {look === 'fr' ? card.fr : card.en}
            {showSub && <span className="opt-sub">{look === 'fr' ? card.en : card.fr}</span>}
          </span>
        )}
        {state === 'correct' && (
          <motion.span className="opt-badge ok" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 14 }}>
            ✓
          </motion.span>
        )}
        {state === 'wrong' && (
          <motion.span className="opt-badge bad" initial={{ scale: 0 }} animate={{ scale: 1 }}>
            ✕
          </motion.span>
        )}
      </button>
    </motion.div>
  );
}
