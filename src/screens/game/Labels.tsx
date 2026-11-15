import { motion, useAnimate } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { boxStyle, BookPage, PAGE_H, PAGE_W } from '../../components/BookPage';
import { burstFrom } from '../../lib/confetti';
import { shuffle } from '../../lib/engine/round';
import { sfx } from '../../lib/sound';
import { speak } from '../../lib/speech';
import type { Box, Card } from '../../types';
import { Sticker, useWidth } from './Seek';
import type { QProps } from './types';
import './Labels.css';

const overlaps = (a: Box, b: Box) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];

/** The patch of the page that holds these words' drawings and labels. */
export function patchOf(cards: Card[], pad = 10): Box {
  const boxes = cards.flatMap((c) => (c.spot ? [c.spot.b, ...c.spot.l] : []));
  const x0 = Math.max(0, Math.min(...boxes.map((b) => b[0])) - pad);
  const y0 = Math.max(0, Math.min(...boxes.map((b) => b[1])) - pad);
  const x1 = Math.min(PAGE_W, Math.max(...boxes.map((b) => b[2])) + pad);
  const y1 = Math.min(PAGE_H, Math.max(...boxes.map((b) => b[3])) + pad);
  return [x0, y0, x1, y1];
}

/** Étiquettes: a patch of her book's page with its labels gone; she puts each one back. */
export function Labels({ q, phase, onAnswer, onPartial }: QProps) {
  const words = useMemo(() => q.pairs ?? [], [q.pairs]);
  const chips = useMemo(() => shuffle(words), [words]);
  const view = useMemo(() => patchOf(words), [words]);
  // the other labels in the patch stay covered: they aren't part of this board
  const others = useMemo(() => (q.options ?? []).filter((c) => !words.some((w) => w.id === c.id) && c.spot?.l.some((r) => overlaps(r, view))), [q.options, words, view]);
  const [wrapRef, wrapW] = useWidth<HTMLDivElement>();
  const [sel, setSel] = useState<string | null>(null);
  const [placed, setPlaced] = useState<Set<string>>(new Set());
  const [wrong, setWrong] = useState<{ chip: string; slot: string; n: number } | null>(null);
  const [drag, setDrag] = useState<{ id: string; x: number; y: number } | null>(null);
  const missed = useRef(new Set<string>());
  const start = useRef(Date.now());
  const last = useRef(Date.now());
  const slotEls = useRef(new Map<string, HTMLElement>());
  const done = placed.size === words.length && words.length > 0;

  // as wide as the screen, unless the patch is tall: then as tall as half the screen
  const ratio = (view[3] - view[1]) / (view[2] - view[0]);
  const maxH = typeof window === 'undefined' ? 480 : Math.max(260, window.innerHeight * 0.5);
  const width = Math.min(wrapW, maxH / ratio);

  const attempt = (chipId: string, slotId: string) => {
    if (phase !== 'ask' || placed.has(chipId)) return;
    const card = words.find((w) => w.id === chipId)!;
    setSel(null);
    if (chipId === slotId) {
      const next = new Set(placed);
      next.add(chipId);
      setPlaced(next);
      sfx.match();
      void speak(card.fr);
      burstFrom(slotEls.current.get(chipId) ?? null, { count: 14 });
      const ms = Date.now() - last.current;
      last.current = Date.now();
      onPartial?.(card, !missed.current.has(card.id), ms);
      if (next.size === words.length) {
        const secs = (Date.now() - start.current) / 1000;
        const mistakes = missed.current.size;
        const points = Math.max(50, words.length * 100 + Math.round(Math.max(0, 45 - secs)) * 10 - mistakes * 40);
        setTimeout(() => onAnswer(mistakes === 0, { points, note: `${secs.toFixed(1)} s · ${mistakes === 0 ? 'no mistakes!' : `${mistakes} slip${mistakes > 1 ? 's' : ''}`}` }), 500);
      }
    } else {
      missed.current.add(chipId);
      missed.current.add(slotId);
      setWrong({ chip: chipId, slot: slotId, n: Date.now() });
      sfx.wrong();
    }
  };

  useEffect(() => {
    if (!wrong) return;
    const t = setTimeout(() => setWrong(null), 600);
    return () => clearTimeout(t);
  }, [wrong]);

  /** A slot (a label's place, or the drawing itself) was tapped. */
  const tapSlot = (id: string) => {
    if (phase !== 'ask' || placed.has(id)) return;
    if (sel) attempt(sel, id);
    else sfx.softPop();
  };

  // dragging a label: the slot under the finger when it's let go
  const dragFrom = (e: React.PointerEvent, id: string) => {
    if (phase !== 'ask' || placed.has(id)) return;
    const x0 = e.clientX;
    const y0 = e.clientY;
    let moved = false;
    const move = (ev: PointerEvent) => {
      if (!moved && Math.hypot(ev.clientX - x0, ev.clientY - y0) < 8) return;
      moved = true;
      ev.preventDefault();
      setDrag({ id, x: ev.clientX, y: ev.clientY });
    };
    const up = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      setDrag(null);
      if (!moved) {
        // a tap: pick it up (or put it down)
        setSel((cur) => (cur === id ? null : id));
        sfx.softPop();
        void speak(words.find((w) => w.id === id)!.fr);
        return;
      }
      const el = document.elementFromPoint(ev.clientX, ev.clientY)?.closest<HTMLElement>('[data-slot]');
      if (el?.dataset.slot) attempt(id, el.dataset.slot);
    };
    window.addEventListener('pointermove', move, { passive: false });
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  };

  return (
    <>
      <div className="q-prompt labels-prompt">
        <div className="q-label">Étiquettes · Put the labels back</div>
        <div className="labels-count">
          {placed.size}/{words.length} {done ? '✓' : ''}
        </div>
      </div>
      <div className="labels-wrap" ref={wrapRef}>
        {wrapW > 0 && (
          <BookPage page={words[0].spot!.p} width={width} view={view} className="labels-page">
            {(k) => (
              <>
                {others.map((c) => (
                  <Sticker key={c.id} card={c} k={k} open={false} tone="#efe9e1" />
                ))}
                {words.map((c) => {
                  const isPlaced = placed.has(c.id);
                  const isWrong = wrong?.slot === c.id;
                  return (
                    <span key={c.id}>
                      {/* the drawing takes a label too */}
                      <span className="labels-target" style={boxStyle(c.spot!.b, k)} data-slot={c.id} onClick={() => tapSlot(c.id)} />
                      {c.spot!.l.map((r, i) => (
                        <span
                          key={i}
                          ref={i === 0 ? (el) => void (el ? slotEls.current.set(c.id, el) : slotEls.current.delete(c.id)) : undefined}
                          className={'labels-slot' + (isPlaced ? ' is-placed' : '') + (isWrong ? ' is-wrong' : '') + (sel && !isPlaced ? ' is-ready' : '')}
                          style={boxStyle(r, k, 2)}
                          data-slot={c.id}
                          data-testid={i === 0 ? `slot-${c.id}` : undefined}
                          onClick={() => tapSlot(c.id)}
                        >
                          {isPlaced && i === 0 && <span className="labels-slot-text" style={{ fontSize: Math.max(10, Math.min(16, 12 * k * 1.2)) }}>{c.fr}</span>}
                        </span>
                      ))}
                    </span>
                  );
                })}
              </>
            )}
          </BookPage>
        )}
      </div>
      <div className="labels-tray">
        {chips.map((c, i) =>
          placed.has(c.id) ? null : (
            <Chip
              key={c.id}
              card={c}
              index={i}
              selected={sel === c.id}
              wrong={wrong?.chip === c.id ? wrong.n : 0}
              dragging={drag?.id === c.id}
              onPointerDown={(e) => dragFrom(e, c.id)}
              onKeySelect={() => setSel((cur) => (cur === c.id ? null : c.id))}
            />
          ),
        )}
      </div>
      {drag && (
        <div className="labels-ghost" style={{ left: drag.x, top: drag.y }} aria-hidden>
          {words.find((w) => w.id === drag.id)?.fr}
        </div>
      )}
    </>
  );
}

function Chip({ card, index, selected, wrong, dragging, onPointerDown, onKeySelect }: { card: Card; index: number; selected: boolean; wrong: number; dragging: boolean; onPointerDown: (e: React.PointerEvent) => void; onKeySelect: () => void }) {
  const [scope, animate] = useAnimate<HTMLButtonElement>();
  useEffect(() => {
    if (wrong && scope.current) void animate(scope.current, { x: [0, -10, 10, -6, 6, 0] }, { duration: 0.4 });
  }, [wrong, animate, scope]);
  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04, type: 'spring', stiffness: 420, damping: 26 }}>
      <button
        ref={scope}
        className={'labels-chip' + (selected ? ' is-sel' : '') + (dragging ? ' is-dragging' : '') + (wrong ? ' is-wrong' : '')}
        onPointerDown={onPointerDown}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onKeySelect();
          }
        }}
        aria-pressed={selected}
        data-testid={`chip-${card.id}`}
      >
        {card.fr}
      </button>
    </motion.div>
  );
}
