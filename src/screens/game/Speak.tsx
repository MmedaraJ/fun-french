import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { CardImage, hasPicture } from '../../components/CardImage';
import { SpeakButton } from '../../components/SpeakButton';
import { burstFrom } from '../../lib/confetti';
import { listenOnce, matchSpoken, RecognitionError } from '../../lib/listen';
import { sfx } from '../../lib/sound';
import { speak, stopSpeaking } from '../../lib/speech';
import type { QProps } from './types';
import './Speak.css';

const ERRORS: Record<string, string> = {
  'not-allowed': 'Microphone access is blocked. Allow it in your browser settings, or skip.',
  'service-not-allowed': 'Speech recognition is turned off on this device.',
  'audio-capture': 'No microphone found.',
  network: 'Speech recognition needs an internet connection.',
  unsupported: 'This browser can’t listen. Try Chrome or Safari.',
};

/** Game 11: say the word; the browser's speech recognition checks it. */
export function Speak({ q, phase, onAnswer, autoplay }: QProps) {
  const [state, setState] = useState<'idle' | 'listening' | 'retry'>('idle');
  const [heard, setHeard] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [tries, setTries] = useState(0);
  const stopRef = useRef<() => void>(() => {});
  const micRef = useRef<HTMLButtonElement>(null);
  // Stronger cards: recall from the picture/English instead of reading the French.
  const [recall] = useState(() => !q.isNew && Math.random() < 0.4);

  useEffect(() => {
    if (!recall && autoplay) {
      const t = setTimeout(() => void speak(q.card.fr), 350);
      return () => clearTimeout(t);
    }
  }, [q.key, q.card.fr, recall, autoplay]);

  useEffect(() => () => stopRef.current(), []);

  const listen = async () => {
    if (phase !== 'ask' || state === 'listening') return;
    stopSpeaking();
    setError(null);
    setHeard('');
    setState('listening');
    sfx.mic();
    const { result, stop } = listenOnce((t) => setHeard(t));
    stopRef.current = stop;
    try {
      const candidates = await result;
      const m = matchSpoken(candidates, q.card.fr);
      setHeard(m.heard);
      if (m.ok) {
        burstFrom(micRef.current, { count: 30 });
        onAnswer(true, { given: m.heard });
        setState('idle');
      } else if (tries === 0) {
        setTries(1);
        setState('retry');
        sfx.wrong();
      } else {
        onAnswer(false, { given: m.heard || '(nothing heard)' });
        setState('idle');
      }
    } catch (e) {
      const code = e instanceof RecognitionError ? e.code : 'unknown';
      setError(ERRORS[code] ?? 'Coco couldn’t hear that. Try again?');
      setState('idle');
    }
  };

  const listening = state === 'listening';

  return (
    <>
      <div className="q-prompt">
        <div className="q-label">{recall ? 'Dis-le en français · Say it in French' : 'Répète · Say it out loud'}</div>
        {hasPicture(q.card) && q.card.kind !== 'sentence' && (
          <motion.div className="q-picture q-picture--sm" initial={{ scale: 0.5 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 15 }}>
            <CardImage card={q.card} size={q.card.imageId ? '100%' : '72%'} rounded={0} />
          </motion.div>
        )}
        {recall && phase === 'ask' ? (
          <div className="q-en" data-target={q.card.id}>
            “{q.card.en}”
          </div>
        ) : (
          <div className="q-word q-word--md" data-target={q.card.id}>
            {q.card.fr}
          </div>
        )}
        {(!recall || phase === 'feedback') && <SpeakButton text={q.card.fr} size="md" />}
      </div>

      <div className="speak-zone">
        <AnimatePresence mode="wait">
          <motion.div key={heard + state} className="speak-heard" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {listening ? (heard ? `« ${heard} »` : 'J’écoute… (listening)') : state === 'retry' ? `J’ai entendu « ${heard || '…'} ». Réessaie !` : heard ? `« ${heard} »` : 'Appuie et parle · Tap and speak'}
          </motion.div>
        </AnimatePresence>
        <div className="mic-wrap">
          {listening && (
            <>
              <span className="mic-ring" />
              <span className="mic-ring r2" />
            </>
          )}
          <motion.button
            ref={micRef}
            className={'mic-btn' + (listening ? ' is-on' : '')}
            onClick={listening ? () => stopRef.current() : listen}
            whileTap={{ scale: 0.9 }}
            disabled={phase !== 'ask'}
            aria-label={listening ? 'Stop listening' : 'Start speaking'}
          >
            <svg viewBox="0 0 24 24" width="46" height="46" aria-hidden>
              <rect x="8.5" y="3" width="7" height="12" rx="3.5" fill="currentColor" />
              <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
          </motion.button>
        </div>
        {error && <div className="speak-error">{error}</div>}
        {phase === 'ask' && (
          <button className="btn btn--sm btn--white speak-skip" onClick={() => onAnswer(false, { note: 'Skipped — try saying it next time!' })}>
            Passer · Skip
          </button>
        )}
      </div>
    </>
  );
}
