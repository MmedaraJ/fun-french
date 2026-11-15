import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { boxStyle, BookPage, hitTest } from '../../components/BookPage';
import { SpeakButton } from '../../components/SpeakButton';
import { burstFrom } from '../../lib/confetti';
import { useSettings } from '../../lib/settings';
import { sfx } from '../../lib/sound';
import { speak } from '../../lib/speech';
import type { Card } from '../../types';
import type { QProps } from './types';
import './Seek.css';

const ZOOMS = [1, 1.5, 2.2];

/** Width of an element, kept up to date. */
export function useWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setW(el.clientWidth);
    const ro = new ResizeObserver(() => setW(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
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
            <span className="book-sticker-text" style={{ fontSize: Math.max(9, Math.min(15, 11 * k * 1.25)) }}>
              {card.fr}
            </span>
          )}
        </span>
      ))}
    </>
  );
}

/** Cherche et trouve: hear (or read) a word, find its drawing on the page of her book. */
export function Seek({ q, phase, result, onAnswer, autoplay }: QProps) {
  const target = q.card;
  const words = q.options ?? [target];
  const page = target.spot!.p;
  const difficulty = useSettings((s) => s.difficulty);
  // Difficile: ears only, the word shows once she has answered
  const earsOnly = difficulty >= 3 && phase === 'ask';
  const [viewRef, viewW] = useWidth<HTMLDivElement>();
  const [zoom, setZoom] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [miss, setMiss] = useState<{ x: number; y: number; n: number } | null>(null);
  const targetRef = useRef<HTMLSpanElement>(null);
  const pending = useRef<{ cx: number; cy: number } | null>(null);
  const width = Math.max(200, viewW - 2) * ZOOMS[zoom];

  useEffect(() => {
    if (!autoplay) return;
    const t = setTimeout(() => void speak(target.fr, { queue: true }), 300);
    return () => clearTimeout(t);
  }, [q.key, target.fr, autoplay]);

  // zooming keeps the middle of what she was looking at in the middle
  const changeZoom = (z: number) => {
    const el = viewRef.current;
    if (!el || z === zoom) return;
    pending.current = { cx: (el.scrollLeft + el.clientWidth / 2) / el.scrollWidth, cy: (el.scrollTop + el.clientHeight / 2) / el.scrollHeight };
    sfx.tap();
    setZoom(z);
  };
  useLayoutEffect(() => {
    const el = viewRef.current;
    const p = pending.current;
    if (!el || !p) return;
    pending.current = null;
    el.scrollLeft = p.cx * el.scrollWidth - el.clientWidth / 2;
    el.scrollTop = p.cy * el.scrollHeight - el.clientHeight / 2;
  }, [zoom, viewRef]);

  // after a miss, the right drawing comes into view
  useEffect(() => {
    if (phase === 'feedback' && result && !result.correct) targetRef.current?.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' });
  }, [phase, result]);

  const tap = (_e: React.MouseEvent, { x, y }: { x: number; y: number }) => {
    if (phase !== 'ask' || picked) return;
    const hit = hitTest(words, x, y);
    if (!hit) {
      // not on a drawing: no harm done
      setMiss({ x, y, n: Date.now() });
      sfx.softPop();
      return;
    }
    setPicked(hit.id);
    const correct = hit.id === target.id;
    if (correct) setTimeout(() => burstFrom(targetRef.current, { count: 22 }), 30);
    onAnswer(correct, { picked: hit.id, given: correct ? undefined : hit.fr });
  };

  const chosen = result?.picked ?? picked;
  const answered = phase === 'feedback' || !!picked;

  return (
    <>
      <div className="q-prompt seek-prompt">
        <div className="q-label">Cherche et trouve · Find it on the page</div>
        <div className="q-row">
          {earsOnly ? (
            <div className="q-word q-word--md" aria-label="Listen">
              🎧 Écoute…
            </div>
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
                  <Sticker key={c.id} card={c} k={k} open={answered && (c.id === target.id || c.id === chosen)} />
                ))}
                {answered && (
                  <span ref={targetRef} className="book-ring" style={boxStyle(target.spot!.b, k, 2)} data-testid="seek-answer" />
                )}
                {answered && chosen && chosen !== target.id && (
                  <span className="book-ring is-wrong" style={boxStyle(words.find((c) => c.id === chosen)!.spot!.b, k, 2)} />
                )}
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
            <button key={c.id} disabled={answered} onClick={() => tap({} as React.MouseEvent, { x: (c.spot!.b[0] + c.spot!.b[2]) / 2, y: (c.spot!.b[1] + c.spot!.b[3]) / 2 })} data-testid={`seek-${c.id}`}>
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
