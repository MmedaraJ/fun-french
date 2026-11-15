import { motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CardImage, hasPicture } from '../../components/CardImage';
import { burstFrom } from '../../lib/confetti';
import { shuffle } from '../../lib/engine/round';
import { sfx } from '../../lib/sound';
import { speak } from '../../lib/speech';
import type { Card } from '../../types';
import type { QProps } from './types';
import './Memory.css';

interface Tile {
  key: string;
  card: Card;
  side: 'pic' | 'fr';
}

/** Mémoire: all the cards face down; turn two over to find a drawing and its French word. */
export function Memory({ q, phase, onAnswer, onPartial }: QProps) {
  const cards = useMemo(() => q.pairs ?? [], [q.pairs]);
  const tiles = useMemo<Tile[]>(() => shuffle(cards.flatMap((c) => [{ key: c.id + ':pic', card: c, side: 'pic' as const }, { key: c.id + ':fr', card: c, side: 'fr' as const }])), [cards]);
  const [up, setUp] = useState<string[]>([]);
  const [found, setFound] = useState<Set<string>>(new Set());
  const [moves, setMoves] = useState(0);
  const lock = useRef(false);
  const start = useRef(Date.now());
  const last = useRef(Date.now());
  const els = useRef(new Map<string, HTMLElement>());
  const cols = tiles.length > 12 ? 4 : 3;

  useEffect(() => {
    if (up.length !== 2) return;
    const [a, b] = up.map((k) => tiles.find((t) => t.key === k)!);
    setMoves((m) => m + 1);
    if (a.card.id === b.card.id) {
      const next = new Set(found);
      next.add(a.card.id);
      setFound(next);
      setUp([]);
      sfx.match();
      void speak(a.card.fr);
      burstFrom(els.current.get(b.key) ?? null, { count: 14 });
      const ms = Date.now() - last.current;
      last.current = Date.now();
      onPartial?.(a.card, true, ms);
      if (next.size === cards.length) {
        const secs = (Date.now() - start.current) / 1000;
        const total = moves + 1;
        const points = Math.max(60, cards.length * 120 - Math.max(0, total - cards.length) * 15);
        setTimeout(() => onAnswer(true, { points, note: `${total} coups · ${secs.toFixed(0)} s` }), 650);
      }
      return;
    }
    lock.current = true;
    const t = setTimeout(() => {
      setUp([]);
      lock.current = false;
    }, 950);
    return () => clearTimeout(t);
    // only when a second card turns over
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [up]);

  const flip = (t: Tile) => {
    if (phase !== 'ask' || lock.current || found.has(t.card.id) || up.includes(t.key) || up.length >= 2) return;
    sfx.softPop();
    if (t.side === 'fr') void speak(t.card.fr);
    setUp((u) => [...u, t.key]);
  };

  return (
    <>
      <div className="q-prompt memory-prompt">
        <div className="q-label">Mémoire · Find the pairs</div>
        <div className="memory-count">
          {found.size}/{cards.length} · {moves} coup{moves === 1 ? '' : 's'}
        </div>
      </div>
      <div className="memory-board" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {tiles.map((t, i) => {
          const open = up.includes(t.key) || found.has(t.card.id);
          return (
            <motion.button
              key={t.key}
              ref={(el) => void (el ? els.current.set(t.key, el) : els.current.delete(t.key))}
              className={'memory-tile' + (open ? ' is-open' : '') + (found.has(t.card.id) ? ' is-found' : '')}
              onClick={() => flip(t)}
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.025, type: 'spring', stiffness: 420, damping: 24 }}
              aria-label={open ? (t.side === 'fr' ? t.card.fr : `picture: ${t.card.en}`) : 'face-down card'}
              data-testid={`mem-${t.key}`}
            >
              <span className="memory-inner">
                <span className="memory-back" aria-hidden>
                  ?
                </span>
                <span className="memory-face">
                  {t.side === 'fr' ? (
                    <span className="memory-word">{t.card.fr}</span>
                  ) : hasPicture(t.card) ? (
                    <CardImage card={t.card} size="100%" rounded={10} />
                  ) : (
                    <span className="memory-word memory-en">{t.card.en}</span>
                  )}
                </span>
              </span>
            </motion.button>
          );
        })}
      </div>
    </>
  );
}
