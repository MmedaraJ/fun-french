import { motion } from 'framer-motion';
import { useEffect, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Emoji } from '../../components/Emoji';
import { Mascot } from '../../components/Mascot';
import { celebrate } from '../../lib/confetti';
import { useSettings } from '../../lib/settings';
import { sfx } from '../../lib/sound';

interface HeaderProps {
  title: string;
  sub?: string;
  emoji?: string;
  back?: string;
  right?: ReactNode;
}

/** Back arrow + title used by every add flow. */
export function AddHeader({ title, sub, emoji, back = '/add', right }: HeaderProps) {
  const navigate = useNavigate();
  return (
    <header className="add-header">
      <button
        className="icon-btn icon-btn--solid"
        onClick={() => {
          sfx.tap();
          navigate(back);
        }}
        aria-label="Back"
      >
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
          <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <div className="add-header-text">
        <h1>
          {emoji && <Emoji e={emoji} size={30} />} {title}
        </h1>
        {sub && <p className="muted">{sub}</p>}
      </div>
      {right}
    </header>
  );
}

interface DoneProps {
  count: number;
  cardIds: string[];
  deckId?: string;
  onMore: () => void;
  moreLabel?: string;
  /** Where "Jouer maintenant" goes; by default a round with the new cards. */
  playUrl?: string;
  /** Replaces the default "N cartes ajoutées !" line. */
  title?: ReactNode;
  /** Extra content under the message (themes made, a lesson to try…). */
  children?: ReactNode;
}

/** Celebration after saving cards, with a shortcut straight into practice. */
export function AddDone({ count, cardIds, deckId, onMore, moreLabel = 'Ajouter encore', playUrl, title, children }: DoneProps) {
  const navigate = useNavigate();
  const mascotColor = useSettings((s) => s.mascotColor);
  useEffect(() => {
    sfx.fanfare();
    const t = setTimeout(() => celebrate(count >= 5 ? 1.1 : 0.7), 150);
    return () => clearTimeout(t);
  }, [count]);
  return (
    <motion.div className="add-done panel" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 18 }}>
      <Mascot mood="excited" size={120} color={mascotColor} reactKey={count} />
      <h2>
        {title ?? (
          <>
            {count} carte{count > 1 ? 's' : ''} ajoutée{count > 1 ? 's' : ''} !
          </>
        )}
      </h2>
      <p className="muted">
        {count > 1 ? 'They’re' : 'It’s'} in your practice now. New words you add come first in “Révision du jour”.
      </p>
      {children}
      <div className="add-done-actions">
        <button className="btn btn--lg btn--block" onClick={() => navigate(playUrl ?? `/play/mix?cards=${cardIds.slice(0, 20).join(',')}`)} disabled={!cardIds.length} data-testid="done-play">
          <Emoji e="🎮" size={24} /> Jouer maintenant
        </button>
        <div className="row" style={{ gap: 10 }}>
          <button className="btn btn--ghost grow" onClick={onMore}>
            {moreLabel}
          </button>
          {deckId && (
            <button className="btn btn--ghost grow" onClick={() => navigate(`/words?deck=${encodeURIComponent(deckId)}`)}>
              Voir mes mots
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
