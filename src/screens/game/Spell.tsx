import { LayoutGroup, motion, useAnimate } from 'framer-motion';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { CardImage } from '../../components/CardImage';
import { SpeakButton } from '../../components/SpeakButton';
import { burstFrom } from '../../lib/confetti';
import { sfx } from '../../lib/sound';
import type { QProps } from './types';
import './Spell.css';

/** Game 3: tap scrambled letter tiles into the slots. Tiles fly between pool and slots. */
export function Spell({ q, phase, result, onAnswer }: QProps) {
  const slots = useMemo(() => q.slots ?? [], [q.slots]);
  const letters = useMemo(() => q.letters ?? [], [q.letters]);
  const openSlots = useMemo(() => slots.map((s, i) => (s.fixed ? -1 : i)).filter((i) => i >= 0), [slots]);
  // filled[k] = index into `letters` placed in the k-th open slot, or -1
  const [filled, setFilled] = useState<number[]>(() => openSlots.map(() => -1));
  const [scope, animate] = useAnimate<HTMLDivElement>();
  const used = new Set(filled.filter((x) => x >= 0));

  const check = useCallback(
    (next: number[]) => {
      const word = slots.map((s, i) => (s.fixed ? s.char : letters[next[openSlots.indexOf(i)]] ?? '')).join('');
      const target = slots.map((s) => s.char).join('');
      const correct = word === target;
      if (correct) {
        burstFrom(scope.current, { count: 30 });
      } else if (scope.current) {
        void animate(scope.current, { x: [0, -14, 14, -10, 10, -4, 0] }, { duration: 0.5 });
      }
      onAnswer(correct, { given: correct ? undefined : (q.article ? q.article + (q.article.endsWith("'") ? '' : ' ') : '') + word });
    },
    [slots, letters, openSlots, onAnswer, q.article, scope, animate],
  );

  const place = useCallback(
    (li: number) => {
      if (phase !== 'ask' || used.has(li)) return;
      const k = filled.indexOf(-1);
      if (k < 0) return;
      const next = [...filled];
      next[k] = li;
      setFilled(next);
      sfx.letter(k);
      if (!next.includes(-1)) setTimeout(() => check(next), 180);
    },
    [phase, used, filled, check],
  );

  const remove = (k: number) => {
    if (phase !== 'ask' || filled[k] < 0) return;
    const next = [...filled];
    next[k] = -1;
    setFilled(next);
    sfx.unletter();
  };

  // Physical keyboard: type letters, Backspace removes.
  useEffect(() => {
    if (phase !== 'ask') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Backspace') {
        const last = [...filled].map((v, i) => (v >= 0 ? i : -1)).filter((i) => i >= 0).pop();
        if (last !== undefined) remove(last);
        return;
      }
      if (e.key.length !== 1) return;
      const ch = e.key.toLowerCase();
      const li = letters.findIndex((l, i) => !used.has(i) && l === ch);
      const loose = li >= 0 ? li : letters.findIndex((l, i) => !used.has(i) && l.normalize('NFD').replace(/[̀-ͯ]/g, '') === ch);
      if (loose >= 0) place(loose);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const solved = phase === 'feedback' && result?.correct;
  const failed = phase === 'feedback' && result && !result.correct;

  return (
    <>
      <div className="q-prompt">
        <div className="q-label">Épelle le mot · Spell the word</div>
        {q.prompt === 'image' ? (
          <>
            <motion.div className="q-picture q-picture--sm" initial={{ scale: 0.5 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 15 }} data-target={q.card.id}>
              <CardImage card={q.card} size={q.card.imageId ? '100%' : '72%'} rounded={0} />
            </motion.div>
            <div className="q-caption">{q.card.en}</div>
          </>
        ) : (
          <div className="q-en" data-target={q.card.id}>
            “{q.card.en}”
          </div>
        )}
        {phase === 'feedback' && <SpeakButton text={q.card.fr} size="md" />}
      </div>

      <LayoutGroup id={q.key}>
        <div className={'spell-slots' + (solved ? ' is-solved' : '') + (failed ? ' is-failed' : '')} ref={scope}>
          {q.article && <span className="spell-article">{q.article}</span>}
          {slots.map((s, i) => {
            if (s.fixed) {
              return (
                <span key={i} className={'spell-fixed' + (s.char === ' ' ? ' is-space' : '')}>
                  {s.char === ' ' ? '' : s.char}
                </span>
              );
            }
            const k = openSlots.indexOf(i);
            const li = filled[k];
            return (
              <button key={i} className="spell-slot" onClick={() => remove(k)} aria-label={li >= 0 ? `Remove ${letters[li]}` : 'Empty slot'}>
                {li >= 0 && (
                  <motion.span
                    layoutId={`tile-${li}`}
                    className="tile in-slot"
                    animate={solved ? { y: [0, -12, 0] } : {}}
                    transition={solved ? { delay: k * 0.05, duration: 0.35 } : { type: 'spring', stiffness: 500, damping: 30 }}
                  >
                    {letters[li]}
                  </motion.span>
                )}
                {failed && li < 0 && <span className="tile ghost">{s.char}</span>}
              </button>
            );
          })}
        </div>
        {failed && (
          <motion.div className="spell-answer" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            {q.card.fr}
          </motion.div>
        )}

        <div className="spell-pool">
          {letters.map((l, i) => (
            <span key={i} className="pool-cell">
              {!used.has(i) && (
                <motion.button
                  layoutId={`tile-${i}`}
                  className="tile"
                  onClick={() => place(i)}
                  initial={{ scale: 0, rotate: (i % 3) * 8 - 8 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 26, delay: phase === 'ask' && filled.every((f) => f < 0) ? 0.1 + i * 0.03 : 0 }}
                  whileTap={{ scale: 0.85 }}
                  disabled={phase !== 'ask'}
                  data-letter={l}
                >
                  {l}
                </motion.button>
              )}
            </span>
          ))}
        </div>
      </LayoutGroup>
      {phase === 'ask' && (
        <div className="row" style={{ justifyContent: 'center', marginTop: 14 }}>
          <button className="btn btn--sm btn--white" onClick={() => setFilled(openSlots.map(() => -1))} disabled={filled.every((f) => f < 0)}>
            Effacer · Clear
          </button>
        </div>
      )}
    </>
  );
}
