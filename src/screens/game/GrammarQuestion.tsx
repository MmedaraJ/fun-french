import { motion, useAnimate } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import { SpeakButton } from '../../components/SpeakButton';
import { burstFrom } from '../../lib/confetti';
import { ACCENT_KEYS, frenchSpaces, normalizeAnswer } from '../../lib/french';
import { checkTyped } from '../../lib/grammar/check';
import { sfx } from '../../lib/sound';
import { speak } from '../../lib/speech';
import type { QProps } from './types';
import './Build.css';
import './GrammarQuestion.css';

/** Grammar questions answered by multiple choice or by typing (tile questions use Build). */
export function GrammarQuestion({ q, phase, result, onAnswer }: QProps) {
  const g = q.g!;
  const listening = g.kind === 'glisten';

  // The listening exercise is the only one whose question is audio.
  useEffect(() => {
    if (!listening || !g.audio) return;
    const t = setTimeout(() => void speak(g.audio!, { queue: true }), 350);
    return () => clearTimeout(t);
  }, [q.key, listening, g.audio]);

  return (
    <>
      <div className="q-prompt g-prompt" {...(import.meta.env.DEV ? { 'data-g-answer': g.answer } : {})}>
        <div className="q-label">{g.title}</div>
        {g.chips?.length ? (
          <div className="g-chips">
            {g.chips.map((c, i) => (
              <motion.span key={i} className="g-chip" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.05 * i, type: 'spring', stiffness: 400, damping: 18 }}>
                {c}
              </motion.span>
            ))}
          </div>
        ) : null}
        {listening ? (
          <div className="q-row" data-target={q.card.id}>
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 13 }}>
              <SpeakButton text={g.audio ?? ''} size="xl" label="Play the sentence again" />
            </motion.div>
            <SpeakButton text={g.audio ?? ''} size="md" slow />
          </div>
        ) : g.prompt && g.promptStyle === 'en' ? (
          // an English sentence to translate
          <div className="q-en build-en" data-target={q.card.id}>
            “{g.prompt}”
          </div>
        ) : g.prompt ? (
          <motion.div className="g-sentence" data-target={q.card.id} initial={{ y: 14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 24 }}>
            <Gapped text={g.prompt} fill={phase === 'feedback' ? g.answer : undefined} ok={result?.correct} />
            {g.promptSub && <div className="g-sub">{frenchSpaces(g.promptSub)}</div>}
          </motion.div>
        ) : (
          <div data-target={q.card.id} />
        )}
        {phase === 'feedback' && !listening && <SpeakButton text={q.card.fr} size="md" />}
      </div>
      {g.mode === 'type' ? <TypedAnswer q={q} phase={phase} result={result} onAnswer={onAnswer} /> : <ChoiceAnswer q={q} phase={phase} result={result} onAnswer={onAnswer} />}
    </>
  );
}

/** Prompt text with "____" drawn as a gap that fills in after answering. */
function Gapped({ text, fill, ok }: { text: string; fill?: string; ok?: boolean }) {
  const parts = frenchSpaces(text).split('____');
  if (parts.length === 1) return <span>{parts[0]}</span>;
  return (
    <span>
      {parts.map((p, i) => (
        <span key={i}>
          {p}
          {i < parts.length - 1 && (
            <motion.span className={'g-gap' + (fill ? (ok ? ' is-ok' : ' is-bad') : '')} layout>
              {fill ?? '      '}
            </motion.span>
          )}
        </span>
      ))}
    </span>
  );
}

function ChoiceAnswer({ q, phase, result, onAnswer }: Pick<QProps, 'q' | 'phase' | 'result' | 'onAnswer'>) {
  const g = q.g!;
  const options = g.options ?? [];
  const [picked, setPicked] = useState<number | null>(null);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const answerIdx = options.findIndex((o) => normalizeAnswer(o) === normalizeAnswer(g.answer));

  const pick = useCallback(
    (i: number) => {
      if (phase !== 'ask' || picked !== null) return;
      setPicked(i);
      const correct = i === answerIdx;
      if (correct) burstFrom(refs.current[i], { count: 22 });
      onAnswer(correct, { picked: String(i), given: correct ? undefined : options[i], note: correct ? undefined : g.note });
    },
    [phase, picked, answerIdx, onAnswer, options, g.note],
  );

  useEffect(() => {
    if (phase !== 'ask') return;
    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key);
      if (n >= 1 && n <= options.length) pick(n - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, options.length, pick]);

  const chosen = result?.picked !== undefined ? Number(result.picked) : picked;
  const long = options.some((o) => o.length > 18);

  return (
    <div className={long ? 'option-list g-options' : 'option-grid g-options'}>
      {options.map((o, i) => {
        const state = phase !== 'feedback' && picked === null ? 'idle' : i === answerIdx ? 'correct' : i === chosen ? 'wrong' : 'dim';
        return (
          <ChoiceButton key={i} index={i} state={state} label={o} sub={g.optionSubs?.[i]} onPick={() => pick(i)} innerRef={(el) => (refs.current[i] = el)} />
        );
      })}
    </div>
  );
}

function ChoiceButton({ index, state, label, sub, onPick, innerRef }: { index: number; state: 'idle' | 'correct' | 'wrong' | 'dim'; label: string; sub?: string; onPick: () => void; innerRef: (el: HTMLButtonElement | null) => void }) {
  const [scope, animate] = useAnimate<HTMLButtonElement>();
  useEffect(() => {
    if (!scope.current) return;
    if (state === 'correct') void animate(scope.current, { scale: [1, 1.08, 0.98, 1] }, { duration: 0.45 });
    if (state === 'wrong') void animate(scope.current, { x: [0, -10, 10, -7, 7, 0] }, { duration: 0.45 });
  }, [state, animate, scope]);
  return (
    <motion.div initial={{ opacity: 0, y: 14, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 380, damping: 22, delay: 0.06 + index * 0.05 }} style={{ display: 'grid' }}>
      <button
        ref={(el) => {
          (scope as { current: HTMLButtonElement | null }).current = el;
          innerRef(el);
        }}
        className={'opt opt--text g-opt' + (state !== 'idle' ? ' is-' + state : '')}
        onClick={onPick}
        disabled={state !== 'idle'}
        data-option={index}
        data-answer-option={label}
      >
        <span className="opt-key">{index + 1}</span>
        <span>
          {frenchSpaces(label)}
          {sub && <span className="opt-sub">{sub}</span>}
        </span>
      </button>
    </motion.div>
  );
}

function TypedAnswer({ q, phase, result, onAnswer }: Pick<QProps, 'q' | 'phase' | 'result' | 'onAnswer'>) {
  const g = q.g!;
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const [scope, animate] = useAnimate<HTMLFormElement>();

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 350);
    return () => clearTimeout(t);
  }, [q.key]);

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (phase !== 'ask' || !text.trim()) return;
    const res = checkTyped(text, g);
    if (res.correct) burstFrom(scope.current, { count: 26 });
    else if (scope.current) void animate(scope.current, { x: [0, -12, 12, -8, 8, 0] }, { duration: 0.45 });
    onAnswer(res.correct, { given: res.correct ? undefined : text.trim(), note: res.note ?? (res.correct ? undefined : g.note) });
  };

  const insert = (ch: string) => {
    const el = inputRef.current;
    if (!el || phase !== 'ask') return;
    const start = el.selectionStart ?? text.length;
    const end = el.selectionEnd ?? text.length;
    setText(text.slice(0, start) + ch + text.slice(end));
    sfx.tap();
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + ch.length, start + ch.length);
    });
  };

  const state = phase === 'feedback' ? (result?.correct ? 'is-ok' : 'is-bad') : '';
  return (
    <form className={'type-form ' + state} onSubmit={submit} ref={scope}>
      <input
        ref={inputRef}
        className="type-input g-input"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Écris ta réponse…"
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
  );
}
