import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { boxStyle, BookPage, hitTest } from '../../components/BookPage';
import { SpeakButton } from '../../components/SpeakButton';
import { burstFrom } from '../../lib/confetti';
import { useSettings } from '../../lib/settings';
import { sfx } from '../../lib/sound';
import { speak } from '../../lib/speech';
import type { Card } from '../../types';
import type { QProps } from './types';
import './Seek.css';

export const ZOOMS = [1, 1.5, 2.2];

/**
 * Inner size of an element, kept up to date. Returns a callback ref to put on the element (it may
 * appear after a loader), its size, and a ref object to reach it.
 */
export function useSize<T extends HTMLElement>(): [(el: T | null) => void, { w: number; h: number }, React.RefObject<T | null>] {
  const ref = useRef<T | null>(null);
  const [el, setEl] = useState<T | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const setRef = useCallback((node: T | null) => {
    ref.current = node;
    setEl(node);
  }, []);
  useLayoutEffect(() => {
    if (!el) return;
    const read = () => setSize((s) => (s.w === el.clientWidth && s.h === el.clientHeight ? s : { w: el.clientWidth, h: el.clientHeight }));
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, [el]);
  return [setRef, size, ref];
}

/** Width of an element, kept up to date. */
export function useWidth<T extends HTMLElement>(): [(el: T | null) => void, number] {
  const [ref, size] = useSize<T>();
  return [ref, size.w];
}

/** A whole page fits the box at zoom 1: as wide as it is, unless that makes it taller than the box. */
export function fitWidth(box: { w: number; h: number }, zoom: number): number {
  const fit = box.h > 0 ? Math.min(box.w, (box.h * 739) / 989) : box.w;
  return Math.max(200, fit - 2) * zoom;
}

/** The sticker over a word's label: blank until it's revealed, then the French. */
export function Sticker({ card, k, open, tone }: { card: Card; k: number; open: boolean; tone?: string }) {
  const rects = card.spot?.l ?? [];
  // the French goes in the biggest piece of the label
  const main = rects.reduce((m, r, i) => ((r[2] - r[0]) * (r[3] - r[1]) > (rects[m][2] - rects[m][0]) * (rects[m][3] - rects[m][1]) ? i : m), 0);
  return (
    <>
      {rects.map((r, i) => (
        <span key={i} className={'book-sticker' + (open ? ' is-open' : '')} style={{ ...boxStyle(r, k, 1.5), ...(tone ? ({ '--sticker': tone } as React.CSSProperties) : {}) }}>
          {open && i === main && (
            // as big as the printed label, smaller for a long word so it stays on its label
            <span className="book-sticker-text" style={{ fontSize: Math.max(8, Math.min(15, 11 * k * 1.25, ((r[2] - r[0] + 10) * k) / (card.fr.length * 0.5))) }}>
              {card.fr}
            </span>
          )}
        </span>
      ))}
    </>
  );
}

const norm = (s: string) => s.toLowerCase().replace(/[’]/g, "'").trim();
const sameWord = (a: Card, b: Card) => norm(a.fr) === norm(b.fr);

/** Cherche et trouve: hear (or read) a word, find its drawing on the page of her book. */
export function Seek({ q, phase, result, onAnswer, autoplay }: QProps) {
  const target = q.card;
  const words = q.options ?? [target];
  const page = target.spot!.p;
  const difficulty = useSettings((s) => s.difficulty);
  // Difficile: ears only, the word shows once she has answered
  const earsOnly = difficulty >= 3 && phase === 'ask';
  const [viewRef, viewSize, viewEl] = useSize<HTMLDivElement>();
  const viewW = viewSize.w;
  const [zoom, setZoom] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  // Difficile: she can still peek at the word
  const [peek, setPeek] = useState(false);
  const [miss, setMiss] = useState<{ x: number; y: number; n: number } | null>(null);
  const targetRef = useRef<HTMLSpanElement>(null);
  const pending = useRef<{ cx: number; cy: number } | null>(null);
  const width = fitWidth(viewSize, ZOOMS[zoom]);

  useEffect(() => {
    if (!autoplay) return;
    const t = setTimeout(() => void speak(target.fr, { queue: true }), 300);
    return () => clearTimeout(t);
  }, [q.key, target.fr, autoplay]);

  // zooming keeps the middle of what she was looking at in the middle
  const changeZoom = (z: number) => {
    const el = viewEl.current;
    if (!el || z === zoom) return;
    pending.current = { cx: (el.scrollLeft + el.clientWidth / 2) / el.scrollWidth, cy: (el.scrollTop + el.clientHeight / 2) / el.scrollHeight };
    sfx.tap();
    setZoom(z);
  };
  useLayoutEffect(() => {
    const el = viewEl.current;
    const p = pending.current;
    if (!el || !p) return;
    pending.current = null;
    el.scrollLeft = p.cx * el.scrollWidth - el.clientWidth / 2;
    el.scrollTop = p.cy * el.scrollHeight - el.clientHeight / 2;
  }, [zoom, viewEl]);

  // after a miss, the right drawing comes into view
  useEffect(() => {
    if (phase === 'feedback' && result && !result.correct) targetRef.current?.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' });
  }, [phase, result]);

  const tap = (_e: React.MouseEvent, { x, y }: { x: number; y: number }) => {
    if (phase !== 'ask' || picked) return;
    // anywhere on the drawing she's looking for is right, even over a smaller drawing inside it
    // (the raincoat's pocket, the pencil's eraser); elsewhere, the drawing under her finger
    const hit = hitTest([target], x, y) ?? hitTest(words, x, y);
    if (!hit) {
      // not on a drawing: no harm done
      setMiss({ x, y, n: Date.now() });
      sfx.softPop();
      return;
    }
    answer(hit);
  };

  const answer = (hit: Card) => {
    if (phase !== 'ask' || picked) return;
    setPicked(hit.id);
    // the same word drawn twice on the page (l'élève, a boy and a girl): either drawing is right
    const correct = hit.id === target.id || sameWord(hit, target);
    if (correct) setTimeout(() => burstFrom(targetRef.current, { count: 22 }), 30);
    onAnswer(correct, { picked: hit.id, given: correct ? undefined : hit.fr });
  };

  const chosen = result?.picked ?? picked;
  const answered = phase === 'feedback' || !!picked;
  const chosenCard = chosen ? words.find((c) => c.id === chosen) : undefined;
  // the drawing ringed green: hers if it's right, else the one she was looking for
  const right = chosenCard && (chosenCard.id === target.id || sameWord(chosenCard, target)) ? chosenCard : target;

  return (
    <>
      <div className="q-prompt seek-prompt">
        <div className="q-label">Cherche et trouve · Find it on the page</div>
        <div className="q-row">
          {earsOnly && !peek ? (
            <button className="q-word q-word--md seek-peek" onClick={() => setPeek(true)} aria-label="Listen (tap to see the word)" data-target={target.id}>
              🎧 Écoute…
            </button>
          ) : (
            <div className="q-word q-word--md" data-target={target.id}>
              {target.fr}
            </div>
          )}
          <SpeakButton text={target.fr} size="md" />
          <SpeakButton text={target.fr} size="md" slow />
        </div>
      </div>
      <div className="seek-view" ref={viewRef} data-zoom={ZOOMS[zoom]}>
        {viewW > 0 && (
          <BookPage page={page} width={width} onClick={tap} className="seek-page">
            {(k) => (
              <>
                {words.map((c) => (
                  <Sticker key={c.id} card={c} k={k} open={answered && (c.id === right.id || c.id === chosen)} />
                ))}
                {answered && <span ref={targetRef} className="book-ring" style={boxStyle(right.spot!.b, k, 2)} data-testid="seek-answer" />}
                {answered && chosenCard && chosenCard.id !== right.id && <span className="book-ring is-wrong" style={boxStyle(chosenCard.spot!.b, k, 2)} />}
                <AnimatePresence>
                  {miss && (
                    <motion.span
                      key={miss.n}
                      className="seek-miss"
                      style={{ left: miss.x * k, top: miss.y * k }}
                      initial={{ scale: 0.2, opacity: 0.9 }}
                      animate={{ scale: 1.6, opacity: 0 }}
                      transition={{ duration: 0.5 }}
                      onAnimationComplete={() => setMiss(null)}
                    />
                  )}
                </AnimatePresence>
              </>
            )}
          </BookPage>
        )}
        {/* the drawings' tap areas, for screen readers and keyboards */}
        <div className="sr-only">
          {words.map((c) => (
            <button key={c.id} disabled={answered} onClick={() => answer(c)} data-testid={`seek-${c.id}`} data-fr={c.fr}>
              {c.en}
            </button>
          ))}
        </div>
      </div>
      <div className="seek-zoom" aria-label="Zoom">
        <button className="icon-btn icon-btn--solid" onClick={() => changeZoom(Math.max(0, zoom - 1))} disabled={zoom === 0} aria-label="Zoom out">
          −
        </button>
        <span>×{ZOOMS[zoom]}</span>
        <button className="icon-btn icon-btn--solid" onClick={() => changeZoom(Math.min(ZOOMS.length - 1, zoom + 1))} disabled={zoom === ZOOMS.length - 1} aria-label="Zoom in">
          +
        </button>
      </div>
    </>
  );
}
