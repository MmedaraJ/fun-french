import { LayoutGroup, motion, useAnimate } from 'framer-motion';
import { useCallback, useEffect, useState } from 'react';
import { SpeakButton } from '../../components/SpeakButton';
import { burstFrom } from '../../lib/confetti';
import { finalPunctuation, frenchSpaces, sentenceTiles } from '../../lib/french';
import { sfx } from '../../lib/sound';
import type { QProps } from './types';
import './Build.css';
import './GrammarQuestion.css';

const norm = (s: string) => s.toLowerCase().replace(/[’]/g, "'");

/** Game 7: rebuild the French sentence from shuffled word tiles. */
export function Build({ q, phase, result, onAnswer }: QProps) {
  const tiles = q.tiles ?? [];
  const answer = q.answer ?? [];
  const [placed, setPlaced] = useState<number[]>([]);
  const [scope, animate] = useAnimate<HTMLDivElement>();
  const used = new Set(placed);

  const check = useCallback(() => {
    if (phase !== 'ask' || !placed.length) return;
    const built = placed.map((i) => tiles[i]);
    // any sentence the question accepts counts, in whatever order its words come
    const orders = [answer, ...(q.g?.accept ?? []).filter((a) => a !== q.g?.answer).map(sentenceTiles)];
    const correct = orders.some((ans) => built.length === ans.length && built.every((t, i) => norm(t) === norm(ans[i])));
    if (correct) burstFrom(scope.current, { count: 34 });
    else if (scope.current) void animate(scope.current, { x: [0, -12, 12, -8, 8, 0] }, { duration: 0.45 });
    onAnswer(correct, { given: correct ? undefined : built.join(' ') });
  }, [phase, placed, tiles, answer, q.g, onAnswer, scope, animate]);

  const add = (i: number) => {
    if (phase !== 'ask' || used.has(i)) return;
    setPlaced((p) => [...p, i]);
    sfx.letter(placed.length);
  };
  const removeAt = (k: number) => {
    if (phase !== 'ask') return;
    setPlaced((p) => p.filter((_, j) => j !== k));
    sfx.unletter();
  };

  useEffect(() => {
    if (phase !== 'ask') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') check();
      if (e.key === 'Backspace') setPlaced((p) => p.slice(0, -1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, check]);

  const solved = phase === 'feedback' && result?.correct;
  const failed = phase === 'feedback' && result && !result.correct;
  const punct = finalPunctuation(q.card.fr);

  return (
    <>
      <div className="q-prompt">
        <div className="q-label" {...(import.meta.env.DEV && q.g ? { 'data-g-tiles': JSON.stringify(answer) } : {})}>
          {q.g ? q.g.title : 'Traduis · Build it in French'}
        </div>
        {q.g?.chips?.length ? (
          <div className="g-chips">
            {q.g.chips.map((c, i) => (
              <span key={i} className="g-chip">
                {c}
              </span>
            ))}
          </div>
        ) : null}
        {q.g && q.g.kind !== 'gtranslate' && q.g.promptStyle !== 'en' ? (
          <div className="g-sentence" data-target={q.card.id}>
            {frenchSpaces(q.g.prompt ?? '')}
          </div>
        ) : (
          <div className="q-en build-en" data-target={q.card.id}>
            “{q.g?.prompt ?? q.card.en}”
          </div>
        )}
        {phase === 'feedback' && <SpeakButton text={q.card.fr} size="md" />}
      </div>

      <LayoutGroup id={q.key}>
        <div className={'build-line' + (solved ? ' is-solved' : '') + (failed ? ' is-failed' : '')} ref={scope}>
          {placed.length === 0 && phase === 'ask' && <span className="build-hint">Tap the words in order…</span>}
          {placed.map((ti, k) => (
            <motion.button
              key={ti}
              layoutId={`w-${ti}`}
              className="word-tile in-line"
              onClick={() => removeAt(k)}
              transition={{ type: 'spring', stiffness: 520, damping: 32 }}
              animate={solved ? { y: [0, -10, 0] } : {}}
            >
              {tiles[ti]}
            </motion.button>
          ))}
          {placed.length > 0 && punct && <span className="build-punct">{punct}</span>}
        </div>
        {failed && (
          <motion.div className="build-answer" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            {q.card.fr}
          </motion.div>
        )}

        <div className="build-pool">
          {tiles.map((t, i) => (
            <span key={i} className="word-cell">
              <span className="word-ghost">{t}</span>
              {!used.has(i) && (
                <motion.button
                  layoutId={`w-${i}`}
                  className="word-tile"
                  onClick={() => add(i)}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 520, damping: 30, delay: placed.length ? 0 : 0.05 + i * 0.03 }}
                  whileTap={{ scale: 0.9 }}
                  disabled={phase !== 'ask'}
                  data-tile={t}
                >
                  {t}
                </motion.button>
              )}
            </span>
          ))}
        </div>
      </LayoutGroup>

      {phase === 'ask' && (
        <div className="check-row">
          <button className="btn btn--white" onClick={() => setPlaced([])} disabled={!placed.length} aria-label="Clear">
            ↺
          </button>
          <button className="btn btn--white grow" onClick={check} disabled={!placed.length}>
            Vérifier · Check
          </button>
        </div>
      )}
    </>
  );
}
