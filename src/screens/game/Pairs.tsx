import { motion, useAnimate } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CardImage, hasPicture } from '../../components/CardImage';
import { burstFrom } from '../../lib/confetti';
import { shuffle } from '../../lib/engine/round';
import { sfx } from '../../lib/sound';
import { speak } from '../../lib/speech';
import type { Card } from '../../types';
import type { QProps } from './types';
import './Pairs.css';

type Side = 'fr' | 'pic';

/** Game 9: race to match each French word with its picture (or meaning). */
export function Pairs({ q, phase, onAnswer, onPartial }: QProps) {
  const cards = useMemo(() => q.pairs ?? [], [q.pairs]);
  const left = useMemo(() => shuffle(cards), [cards]);
  const right = useMemo(() => shuffle(cards), [cards]);
  const [sel, setSel] = useState<{ side: Side; id: string } | null>(null);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [wrongPair, setWrongPair] = useState<string[]>([]);
  const missed = useRef(new Set<string>());
  const start = useRef(Date.now());
  const lastMatch = useRef(Date.now());
  const [now, setNow] = useState(Date.now());
  const done = matched.size === cards.length && cards.length > 0;

  useEffect(() => {
    if (done || phase !== 'ask') return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [done, phase]);

  const tap = (side: Side, card: Card, el: HTMLElement | null) => {
    if (phase !== 'ask' || matched.has(card.id)) return;
    if (side === 'fr') void speak(card.fr);
    if (!sel || sel.side === side) {
      setSel({ side, id: card.id });
      sfx.softPop();
      return;
    }
    const other = sel.id;
    setSel(null);
    if (other === card.id) {
      const next = new Set(matched);
      next.add(card.id);
      setMatched(next);
      sfx.match();
      burstFrom(el, { count: 14 });
      const ms = Date.now() - lastMatch.current;
      lastMatch.current = Date.now();
      onPartial?.(card, !missed.current.has(card.id), ms);
      if (next.size === cards.length) {
        const secs = (Date.now() - start.current) / 1000;
        const mistakes = missed.current.size;
        const points = Math.max(50, cards.length * 100 + Math.round(Math.max(0, 40 - secs)) * 10 - mistakes * 40);
        setTimeout(
          () =>
            onAnswer(mistakes === 0, {
              points,
              note: `${secs.toFixed(1)} s · ${mistakes === 0 ? 'no mistakes!' : `${mistakes} slip${mistakes > 1 ? 's' : ''}`}`,
            }),
          450,
        );
      }
    } else {
      missed.current.add(card.id);
      missed.current.add(other);
      setWrongPair([card.id + side, other + (side === 'fr' ? 'pic' : 'fr')]);
      sfx.wrong();
      setTimeout(() => setWrongPair([]), 500);
    }
  };

  const elapsed = Math.max(0, ((done ? lastMatch.current : now) - start.current) / 1000);

  return (
    <>
      <div className="q-prompt">
        <div className="q-label">Relie les paires · Match the pairs</div>
        <div className="pairs-timer">
          ⏱ {elapsed.toFixed(1)} s · {matched.size}/{cards.length}
        </div>
      </div>
      <div className="pairs-board">
        <div className="pairs-col">
          {left.map((c, i) => (
            <PairTile key={c.id} delay={i * 0.05} state={matched.has(c.id) ? 'done' : wrongPair.includes(c.id + 'fr') ? 'wrong' : sel?.side === 'fr' && sel.id === c.id ? 'sel' : 'idle'} onTap={(el) => tap('fr', c, el)} testId={`pair-fr-${c.id}`}>
              <span className="pair-text">{c.fr}</span>
            </PairTile>
          ))}
        </div>
        <div className="pairs-col">
          {right.map((c, i) => (
            <PairTile key={c.id} delay={0.1 + i * 0.05} state={matched.has(c.id) ? 'done' : wrongPair.includes(c.id + 'pic') ? 'wrong' : sel?.side === 'pic' && sel.id === c.id ? 'sel' : 'idle'} onTap={(el) => tap('pic', c, el)} testId={`pair-pic-${c.id}`}>
              {hasPicture(c) ? <CardImage card={c} size={46} rounded={10} /> : <span className="pair-text pair-en">{c.en}</span>}
            </PairTile>
          ))}
        </div>
      </div>
    </>
  );
}

function PairTile({ children, state, onTap, delay, testId }: { children: React.ReactNode; state: 'idle' | 'sel' | 'done' | 'wrong'; onTap: (el: HTMLElement | null) => void; delay: number; testId: string }) {
  const [scope, animate] = useAnimate<HTMLButtonElement>();
  useEffect(() => {
    if (state === 'wrong' && scope.current) void animate(scope.current, { x: [0, -10, 10, -6, 6, 0] }, { duration: 0.4 });
    if (state === 'done' && scope.current) void animate(scope.current, { scale: [1, 1.12, 0.94] }, { duration: 0.35 });
  }, [state, animate, scope]);
  return (
    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay, type: 'spring', stiffness: 400, damping: 26 }}>
      <button ref={scope} className={'pair-tile is-' + state} onClick={() => onTap(scope.current)} disabled={state === 'done'} data-testid={testId}>
        {children}
      </button>
    </motion.div>
  );
}
