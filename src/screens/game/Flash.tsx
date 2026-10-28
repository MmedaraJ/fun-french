import { motion } from 'framer-motion';
import { useCallback, useEffect, useState } from 'react';
import { CardImage, hasPicture } from '../../components/CardImage';
import { Emoji } from '../../components/Emoji';
import { SpeakButton } from '../../components/SpeakButton';
import { sfx } from '../../lib/sound';
import { speak } from '../../lib/speech';
import type { QProps } from './types';
import './Flash.css';

/** Game 10: classic flashcards with an honest self-check. */
export function Flash({ q, phase, onAnswer, autoplay }: QProps) {
  const [flipped, setFlipped] = useState(false);
  const [reverse] = useState(() => q.isNew ? false : Math.random() < 0.35);
  const card = q.card;
  const pic = hasPicture(card) && card.kind !== 'sentence';

  useEffect(() => {
    if (!reverse && autoplay) {
      const t = setTimeout(() => void speak(card.fr), 350);
      return () => clearTimeout(t);
    }
  }, [q.key, card.fr, reverse, autoplay]);

  const flip = useCallback(() => {
    if (phase !== 'ask') return;
    setFlipped((f) => {
      if (!f && reverse && autoplay) setTimeout(() => void speak(card.fr), 250);
      return !f;
    });
    sfx.flip();
  }, [phase, reverse, autoplay, card.fr]);

  const grade = useCallback(
    (knew: boolean) => {
      if (phase !== 'ask' || !flipped) return;
      onAnswer(knew, { note: knew ? undefined : 'No worries — it will come back soon.' });
    },
    [phase, flipped, onAnswer],
  );

  useEffect(() => {
    if (phase !== 'ask') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        e.preventDefault();
        flip();
      } else if (flipped && (e.key === 'ArrowLeft' || e.key === '1')) grade(false);
      else if (flipped && (e.key === 'ArrowRight' || e.key === '2')) grade(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, flip, grade, flipped]);

  const french = (
    <>
      {pic && !reverse && (
        <div className="flash-pic">
          <CardImage card={card} size="100%" fallback="none" rounded={22} />
        </div>
      )}
      <div className="flash-fr">{card.fr}</div>
      <SpeakButton text={card.fr} size="md" tone="solid" />
    </>
  );
  const english = (
    <>
      {pic && reverse && (
        <div className="flash-pic">
          <CardImage card={card} size="100%" fallback="none" rounded={22} />
        </div>
      )}
      <div className="flash-en">{card.en}</div>
      {card.note && <div className="badge">{card.note}</div>}
    </>
  );

  return (
    <>
      <div className="q-prompt">
        <div className="q-label">{flipped ? 'Tu savais ? · Did you know it?' : reverse ? 'En français ? · Say it in French' : 'Ça veut dire… ? · What does it mean?'}</div>
      </div>
      <div className="flash-stage">
        <motion.button
          className="flash-card"
          onClick={flip}
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ type: 'spring', stiffness: 180, damping: 18 }}
          initial={{ scale: 0.7, opacity: 0 }}
          whileInView={{ scale: 1, opacity: 1 }}
          data-target={card.id}
          aria-label={flipped ? 'Card back' : 'Tap to flip'}
        >
          <div className="flash-face flash-front">{reverse ? english : french}</div>
          <div className="flash-face flash-back">{reverse ? french : english}</div>
        </motion.button>
      </div>
      <div className="flash-actions">
        {!flipped ? (
          <motion.button className="btn btn--white btn--block btn--lg" onClick={flip} whileTap={{ scale: 0.96 }}>
            Retourner · Flip
          </motion.button>
        ) : (
          <motion.div className="flash-grade" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
            <button className="btn btn--lg flash-no" onClick={() => grade(false)} disabled={phase !== 'ask'}>
              <Emoji e="😅" size={28} /> Pas encore
            </button>
            <button className="btn btn--lg btn--ok flash-yes" onClick={() => grade(true)} disabled={phase !== 'ask'}>
              <Emoji e="😊" size={28} /> Je savais !
            </button>
          </motion.div>
        )}
      </div>
    </>
  );
}
