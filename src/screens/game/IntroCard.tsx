import { motion } from 'framer-motion';
import { useEffect } from 'react';
import { CardImage, hasPicture } from '../../components/CardImage';
import { Emoji } from '../../components/Emoji';
import { SpeakButton } from '../../components/SpeakButton';
import { speak } from '../../lib/speech';
import type { Card } from '../../types';
import './IntroCard.css';

interface Props {
  card: Card;
  autoplay: boolean;
  onDone: () => void;
}

/** "Nouveau mot !" card shown the first time a word appears. */
export function IntroCard({ card, autoplay, onDone }: Props) {
  useEffect(() => {
    if (!autoplay) return;
    const t = setTimeout(() => void speak(card.fr, { queue: true }), 450);
    return () => clearTimeout(t);
  }, [card.fr, autoplay]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onDone();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onDone]);

  const gender = card.gender ? (card.gender === 'm' ? 'masculin' : 'féminin') : null;

  return (
    <motion.div
      data-intro={card.id}
      className="intro"
      initial={{ rotateY: 80, opacity: 0, scale: 0.8 }}
      animate={{ rotateY: 0, opacity: 1, scale: 1 }}
      exit={{ rotateY: -80, opacity: 0, scale: 0.85, transition: { duration: 0.2 } }}
      transition={{ type: 'spring', stiffness: 220, damping: 20 }}
    >
      <motion.div
        className="intro-ribbon"
        initial={{ y: -20, opacity: 0, rotate: -6 }}
        animate={{ y: 0, opacity: 1, rotate: -3 }}
        transition={{ delay: 0.25, type: 'spring', stiffness: 400, damping: 12 }}
      >
        <Emoji e="✨" size={20} /> Nouveau mot !
      </motion.div>
      <div className="intro-card">
        {hasPicture(card) && card.kind !== 'sentence' && (
          <motion.div
            className="intro-pic"
            initial={{ scale: 0, rotate: -15 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.15, type: 'spring', stiffness: 300, damping: 14 }}
          >
            <CardImage card={card} size="100%" fallback="none" rounded={26} />
          </motion.div>
        )}
        <div className="intro-fr">{card.fr}</div>
        <div className="intro-en">{card.en}</div>
        <div className="intro-tags">
          {gender && <span className={'badge g-' + card.gender}>{gender}</span>}
          {card.plural && <span className="badge">pluriel</span>}
          {card.note && <span className="badge">{card.note}</span>}
        </div>
        <div className="row" style={{ justifyContent: 'center', gap: 12, marginTop: 6 }}>
          <SpeakButton text={card.fr} size="lg" tone="solid" />
          <SpeakButton text={card.fr} size="md" tone="solid" slow />
        </div>
      </div>
      <motion.button
        className="btn btn--lg btn--block btn--white intro-go"
        onClick={onDone}
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.35 }}
        autoFocus
      >
        Compris !
      </motion.button>
    </motion.div>
  );
}
