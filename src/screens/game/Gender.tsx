import { animate, motion, useMotionValue, useTransform, type PanInfo } from 'framer-motion';
import { useCallback, useEffect, useState } from 'react';
import { CardImage, hasPicture } from '../../components/CardImage';
import { SpeakButton } from '../../components/SpeakButton';
import { burstFrom } from '../../lib/confetti';
import { splitArticle } from '../../lib/french';
import type { Gender as G } from '../../types';
import type { QProps } from './types';
import './Gender.css';

/** Game 6: swipe or tap the noun to "le" (masculine) or "la" (feminine). */
export function Gender({ q, phase, result, onAnswer }: QProps) {
  const { noun, article } = splitArticle(q.card.fr);
  const [choice, setChoice] = useState<G | null>(null);
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-220, 220], [-16, 16]);
  const leOpacity = useTransform(x, [-120, -20], [1, 0]);
  const laOpacity = useTransform(x, [20, 120], [0, 1]);

  const answer = useCallback(
    (g: G) => {
      if (phase !== 'ask' || choice) return;
      setChoice(g);
      const correct = g === q.card.gender;
      if (correct) {
        void animate(x, g === 'm' ? -window.innerWidth : window.innerWidth, { duration: 0.35, ease: 'easeIn' }).then(() => x.set(0));
        burstFrom(document.querySelector(`.gender-btn--${g}`), { count: 22 });
      } else {
        void animate(x, [0, g === 'm' ? -60 : 60, 0], { duration: 0.4 });
      }
      onAnswer(correct, { given: correct ? undefined : `${g === 'm' ? 'le' : 'la'} ${noun}` });
    },
    [phase, choice, q.card.gender, noun, x, onAnswer],
  );

  useEffect(() => {
    if (phase !== 'ask') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === '1') answer('m');
      if (e.key === 'ArrowRight' || e.key === '2') answer('f');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, answer]);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -90 || info.velocity.x < -700) answer('m');
    else if (info.offset.x > 90 || info.velocity.x > 700) answer('f');
  };

  const revealed = phase === 'feedback';
  const correctG = q.card.gender;

  return (
    <>
      <div className="q-prompt">
        <div className="q-label">Le ou la ? · Swipe or tap</div>
      </div>
      <div className="gender-stage">
        <motion.div
          className={'gender-card' + (revealed ? (result?.correct ? ' is-ok' : ' is-bad') : '')}
          style={{ x, rotate }}
          drag={phase === 'ask' && !choice ? 'x' : false}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.9}
          onDragEnd={onDragEnd}
          initial={{ scale: 0.6, opacity: 0, y: 30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 18 }}
          data-target={q.card.id}
        >
          <motion.span className="stamp stamp--le" style={{ opacity: leOpacity }}>
            le
          </motion.span>
          <motion.span className="stamp stamp--la" style={{ opacity: laOpacity }}>
            la
          </motion.span>
          {hasPicture(q.card) && (
            <div className="gender-pic">
              <CardImage card={q.card} size="100%" fallback="none" rounded={22} />
            </div>
          )}
          <div className="gender-word">
            <span className={'gender-blank' + (revealed ? ' is-filled g-' + correctG : '')}>{revealed ? article : '___'}</span>
            {revealed && article === "l'" ? '' : ' '}
            {noun}
          </div>
          {revealed && (
            <div className={'gender-elision g-' + correctG}>
              {correctG === 'm' ? 'masculin' : 'féminin'}
              {article === "l'" && ` · ${correctG === 'm' ? 'un' : 'une'} ${noun}`}
            </div>
          )}
          <div className="gender-en">{q.card.en}</div>
          {revealed && <SpeakButton text={q.card.fr} size="sm" tone="solid" />}
        </motion.div>
      </div>
      <div className="gender-buttons">
        {(['m', 'f'] as G[]).map((g) => (
          <motion.button
            key={g}
            className={`gender-btn gender-btn--${g}` + (revealed && correctG === g ? ' is-answer' : '') + (revealed && choice === g && correctG !== g ? ' is-wrong' : '')}
            onClick={() => answer(g)}
            whileTap={{ scale: 0.93, y: 4 }}
            disabled={phase !== 'ask'}
          >
            <span className="gender-art">{g === 'm' ? 'le' : 'la'}</span>
            <span className="gender-sub">{g === 'm' ? '← masculin' : 'féminin →'}</span>
          </motion.button>
        ))}
      </div>
    </>
  );
}
