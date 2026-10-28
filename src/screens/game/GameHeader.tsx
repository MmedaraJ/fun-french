import { AnimatePresence, motion } from 'framer-motion';
import { AnimatedNumber } from '../../components/AnimatedNumber';
import { Emoji } from '../../components/Emoji';
import type { QResult } from '../Game';
import './GameHeader.css';

interface Props {
  onQuit: () => void;
  progress: number;
  results: QResult[];
  total: number | null;
  survival: boolean;
  hearts: number;
  maxHearts: number;
  score: number;
  combo: number;
  multiplier: number;
  gain: { id: number; points: number } | null;
  ink: string;
}

export function GameHeader({ onQuit, progress, results, total, survival, hearts, maxHearts, score, combo, multiplier, gain, ink }: Props) {
  return (
    <header className="game-header">
      <button className="icon-btn" onClick={onQuit} aria-label="Quit round">
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
          <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
      </button>

      <div className="gh-middle">
        {survival ? (
          <div className="hearts" aria-label={`${hearts} lives left`}>
            {Array.from({ length: maxHearts }, (_, i) => (
              <motion.span
                key={i}
                animate={i < hearts ? { scale: 1, rotate: 0, opacity: 1 } : { scale: [1.4, 0.8], rotate: [0, -25, 15], opacity: 0.45 }}
                transition={{ duration: 0.45 }}
                style={{ display: 'grid' }}
              >
                <Emoji e={i < hearts ? '❤️' : '🤍'} size={26} />
              </motion.span>
            ))}
            <span className="survival-count">{results.filter((r) => r.correct).length}</span>
          </div>
        ) : total && total <= 30 ? (
          <div className="segments" style={{ gridTemplateColumns: `repeat(${total}, 1fr)` }}>
            {Array.from({ length: total }, (_, i) => {
              const r = results[i];
              return (
                <span key={i} className="seg">
                  <motion.span
                    className={'seg-fill ' + (r ? (r.correct ? 'ok' : 'bad') : '')}
                    initial={false}
                    animate={{ scaleX: r ? 1 : 0 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                  />
                </span>
              );
            })}
          </div>
        ) : (
          <div className="bar">
            <motion.span className="bar-fill" animate={{ width: `${progress * 100}%` }} transition={{ type: 'spring', stiffness: 120, damping: 20 }} />
          </div>
        )}
      </div>

      <div className="gh-score" style={{ color: ink }}>
        <AnimatedNumber value={score} duration={0.5} className="score-num" />
        <AnimatePresence>
          {gain && (
            <motion.span
              key={gain.id}
              className="score-gain"
              initial={{ opacity: 0, x: 0, scale: 0.4 }}
              animate={{ opacity: [0, 1, 1, 0], x: [0, -6, -10, -14], scale: [0.4, 1.25, 1, 0.95] }}
              transition={{ duration: 1.2, times: [0, 0.18, 0.75, 1] }}
            >
              +{gain.points}
            </motion.span>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {multiplier > 1 && (
            <motion.span
              key={multiplier}
              className={'combo combo--x' + multiplier}
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: [0, 1.35, 1], rotate: [-30, 10, 0] }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ duration: 0.45 }}
              title={`${combo} in a row`}
            >
              <Emoji e="🔥" size={16} />×{multiplier}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
