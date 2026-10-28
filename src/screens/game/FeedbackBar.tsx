import { motion } from 'framer-motion';
import { useMemo } from 'react';
import { CardImage, hasPicture } from '../../components/CardImage';
import { Mascot } from '../../components/Mascot';
import { SpeakButton } from '../../components/SpeakButton';
import { frenchSpaces, splitArticle } from '../../lib/french';
import type { Question } from '../../lib/engine/round';
import { g, useSettings } from '../../lib/settings';
import type { QResult } from '../Game';
import type { AnswerInfo } from './types';
import './FeedbackBar.css';

const PRAISE = ['Bravo !', 'Super !', 'Génial !', 'Parfait !', 'Excellent !', 'Magnifique !', 'Bien joué !', 'Chapeau !', 'Formidable !'];
const OOPS = ['Oups !', 'Presque !', 'Pas tout à fait…', 'Aïe !', 'Mince !'];

function comboLine(combo: number): string | null {
  if (combo >= 15) return `${combo} d’affilée ! ${g('Inarrêtable', 'Inarrêtable')} !`;
  if (combo >= 10) return `${combo} d’affilée ! Incroyable !`;
  if (combo >= 5) return `${combo} d’affilée ! En feu !`;
  if (combo >= 3) return `${combo} d’affilée !`;
  return null;
}

interface Props {
  q: Question;
  result: QResult & AnswerInfo;
  combo: number;
  mascotKey: number;
  onNext: () => void;
  lastHeart: boolean;
}

export function FeedbackBar({ q, result, combo, mascotKey, onNext, lastHeart }: Props) {
  const mascotColor = useSettings((s) => s.mascotColor);
  const ok = result.correct;
  const title = useMemo(() => {
    if (ok && combo >= 3 && q.type !== 'pairs') return PRAISE[Math.floor(Math.random() * PRAISE.length)];
    if (ok) return PRAISE[Math.floor(Math.random() * PRAISE.length)];
    return OOPS[Math.floor(Math.random() * OOPS.length)];
  }, [ok, combo, q.type]);
  const extra = ok ? comboLine(combo) : null;
  const card = q.card;
  const isPairs = q.type === 'pairs';
  const genderHint =
    q.type === 'gender' && card.gender
      ? splitArticle(card.fr).article === "l'"
        ? `${card.gender === 'm' ? 'masculin' : 'féminin'} · ${card.gender === 'm' ? 'un' : 'une'} ${splitArticle(card.fr).noun}`
        : card.gender === 'm'
          ? 'masculin'
          : 'féminin'
      : null;

  return (
    <motion.div
      className={'feedback ' + (ok ? 'feedback--ok' : 'feedback--bad')}
      initial={{ y: '110%' }}
      animate={{ y: 0 }}
      exit={{ y: '110%', transition: { duration: 0.2 } }}
      transition={{ type: 'spring', stiffness: 420, damping: 34, delay: 0.28 }}
      onClick={ok ? onNext : undefined}
      role="status"
    >
      <div className="feedback-inner">
        <div className="feedback-mascot">
          <Mascot mood={ok ? (combo >= 5 ? 'excited' : 'happy') : 'sad'} size={78} color={mascotColor} reactKey={mascotKey} />
        </div>
        <div className="feedback-body">
          <motion.div
            className="feedback-title"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 15, delay: 0.05 }}
          >
            {lastHeart ? 'Plus de vies !' : title}
            {extra && <span className="feedback-combo">{extra}</span>}
          </motion.div>
          {result.note && <div className="feedback-note">{result.note}</div>}
          {!isPairs && (
            <div className="feedback-card">
              {hasPicture(card) && card.kind !== 'sentence' && (
                <span className="feedback-pic">
                  <CardImage card={card} size={44} fallback="none" rounded={10} />
                </span>
              )}
              <span className="feedback-words">
                {!ok && <span className="feedback-label">La bonne réponse :</span>}
                <strong>{frenchSpaces(card.fr)}</strong>
                <span>
                  {card.en}
                  {genderHint && <em> · {genderHint}</em>}
                </span>
                {!ok && result.given && (
                  <span className="feedback-given">
                    You: <s>{result.given}</s>
                  </span>
                )}
              </span>
              <SpeakButton text={card.fr} size="md" tone="solid" />
            </div>
          )}
        </div>
      </div>
      {ok ? (
        <motion.div className="feedback-timer" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: result.note || ['build', 'type', 'spell', 'speak'].includes(result.type) ? 1.9 : 1.25, ease: 'linear' }} />
      ) : (
        <button className="btn btn--block btn--bad feedback-next" onClick={onNext} autoFocus>
          {lastHeart ? 'Voir mon score' : 'Continuer'}
        </button>
      )}
    </motion.div>
  );
}
