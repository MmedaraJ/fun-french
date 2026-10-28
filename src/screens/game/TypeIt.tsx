import { motion, useAnimate } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { CardImage, hasPicture } from '../../components/CardImage';
import { SpeakButton } from '../../components/SpeakButton';
import { burstFrom } from '../../lib/confetti';
import { ACCENT_KEYS, compareAnswer, typedAnswerCounts } from '../../lib/french';
import { useSettings } from '../../lib/settings';
import { sfx } from '../../lib/sound';
import { speak } from '../../lib/speech';
import type { QProps } from './types';
import './TypeIt.css';

/** What to say about a near miss: [counted as right, counted as wrong]. */
const NOTES = {
  accents: ['Attention aux accents ! (watch the accents)', 'Presque ! Les accents comptent (accents count).'],
  typo: ['Petite faute de frappe (small typo) — counted as right.', 'Presque ! Une lettre de travers (one letter off).'],
  article: ['N’oublie pas l’article ! (don’t forget le/la)', 'Presque ! Il manque l’article (le/la is part of the word).'],
};

/**
 * Games 8 and 9. "Écris": see the meaning, type the French from memory (the
 * audio only comes after). "Dictée": the audio is the question, with no hints.
 */
export function TypeIt({ q, phase, result, onAnswer }: QProps) {
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const [scope, animate] = useAnimate<HTMLFormElement>();
  const dictation = q.type === 'dictation';
  const difficulty = useSettings((st) => st.difficulty);

  useEffect(() => {
    const t = setTimeout(() => {
      if (dictation) void speak(q.card.fr, { queue: true });
      inputRef.current?.focus({ preventScroll: true });
    }, 350);
    return () => clearTimeout(t);
  }, [q.key, q.card.fr, dictation]);

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (phase !== 'ask' || !text.trim()) return;
    const match = compareAnswer(text, q.card.fr);
    const correct = typedAnswerCounts(match, difficulty);
    if (correct) burstFrom(scope.current, { count: 26 });
    else if (scope.current) void animate(scope.current, { x: [0, -12, 12, -8, 8, 0] }, { duration: 0.45 });
    onAnswer(correct, {
      given: match === 'exact' ? undefined : text.trim(),
      note: match === 'accents' || match === 'typo' || match === 'article' ? NOTES[match][correct ? 0 : 1] : undefined,
    });
  };

  const insert = (ch: string) => {
    const el = inputRef.current;
    if (!el || phase !== 'ask') return;
    const start = el.selectionStart ?? text.length;
    const end = el.selectionEnd ?? text.length;
    const next = text.slice(0, start) + ch + text.slice(end);
    setText(next);
    sfx.tap();
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + ch.length, start + ch.length);
    });
  };

  const state = phase === 'feedback' ? (result?.correct ? 'is-ok' : 'is-bad') : '';

  return (
    <>
      {dictation ? (
        <div className="q-prompt">
          <div className="q-label">Dictée · Type what you hear</div>
          <div className="q-row">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 14 }} data-target={q.card.id}>
              <SpeakButton text={q.card.fr} size="lg" />
            </motion.div>
            <SpeakButton text={q.card.fr} size="md" slow />
          </div>
        </div>
      ) : (
        <div className="q-prompt">
          <div className="q-label">Écris en français · Write it in French</div>
          {hasPicture(q.card) && q.card.kind !== 'sentence' && (
            <motion.div className="q-picture q-picture--sm" initial={{ scale: 0.5 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 15 }}>
              <CardImage card={q.card} size={q.card.imageId ? '100%' : '72%'} rounded={0} />
            </motion.div>
          )}
          <div className="q-en" data-target={q.card.id}>
            “{q.card.en}”
          </div>
          {phase === 'feedback' && <SpeakButton text={q.card.fr} size="md" />}
        </div>
      )}

      <form className={'type-form ' + state} onSubmit={submit} ref={scope}>
        <input
          ref={inputRef}
          className="type-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Écris ici…"
          autoCapitalize="off"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          lang="fr"
          enterKeyHint="done"
          readOnly={phase !== 'ask'}
          aria-label="Your answer"
        />
        <div className="accent-row">
          {ACCENT_KEYS.map((k) => (
            <button key={k} type="button" className="accent-key" onMouseDown={(e) => e.preventDefault()} onClick={() => insert(k)} disabled={phase !== 'ask'}>
              {k}
            </button>
          ))}
        </div>
        {phase === 'ask' && (
          <div className="check-row">
            <button type="submit" className="btn btn--white btn--block" disabled={!text.trim()}>
              Vérifier · Check
            </button>
          </div>
        )}
      </form>
    </>
  );
}
