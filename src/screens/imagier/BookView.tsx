import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { boxStyle, BookPage, hitTest, pageHeight } from '../../components/BookPage';
import { CardImage } from '../../components/CardImage';
import { Emoji } from '../../components/Emoji';
import { Loader } from '../../components/Loader';
import { SpeakButton } from '../../components/SpeakButton';
import { CHAPTER_BY_NUM } from '../../data/imagier';
import { setFocus } from '../../lib/content';
import { useChapterCards, type BookInfo } from '../../lib/imagier';
import { drawnSpots } from '../../lib/imagier-layout';
import { paletteColor } from '../../lib/palette';
import { sfx } from '../../lib/sound';
import { speak, stopSpeaking } from '../../lib/speech';
import type { Card } from '../../types';
import { fitWidth, Sticker, useSize, ZOOMS } from '../game/Seek';
import { BackButton } from './Imagier';

const TOUR_MS = 2600;

/**
 * Lire la page: her book's page with every label under a sticker. Tap a drawing to peel its
 * sticker and hear the word, show them all, or let the guided tour read the page to her.
 */
export function BookView({ book }: { book: BookInfo | null | undefined }) {
  const navigate = useNavigate();
  const { num } = useParams();
  const chapter = CHAPTER_BY_NUM.get(Number(num));
  const bookCards = useChapterCards(chapter?.num ?? 0);
  // without her book, Bonbon's own pages of drawings
  const cards = useMemo(() => (bookCards && book === null ? drawnSpots(bookCards) : bookCards), [bookCards, book]);
  const [pageIdx, setPageIdx] = useState(0);
  const [showAll, setShowAll] = useState(false);
  const [opened, setOpened] = useState<Set<string>>(new Set());
  const [selId, setSelId] = useState<string | null>(null);
  const [tour, setTour] = useState(false);
  const [zoom, setZoom] = useState(0);
  const [viewRef, viewSize, viewEl] = useSize<HTMLDivElement>();
  const ringRef = useRef<HTMLSpanElement>(null);
  const page = chapter?.pages[pageIdx] ?? 0;
  const words = useMemo(() => (cards ?? []).filter((c) => c.spot?.p === page), [cards, page]);
  const sel = words.find((c) => c.id === selId) ?? null;

  const choose = (c: Card, quiet = false) => {
    setSelId(c.id);
    setOpened((o) => new Set(o).add(c.id));
    if (!quiet) sfx.softPop();
    void speak(c.fr);
  };

  // the guided tour reads the page word after word
  useEffect(() => {
    if (!tour || !words.length) return;
    const at = selId ? words.findIndex((w) => w.id === selId) : -1;
    const t = setTimeout(
      () => {
        const next = words[at + 1];
        if (!next) {
          setTour(false);
          return;
        }
        choose(next, true);
      },
      at < 0 ? 300 : TOUR_MS,
    );
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tour, selId, words]);

  // the word being read stays in view
  useLayoutEffect(() => {
    if (selId) ringRef.current?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
  }, [selId, zoom]);

  // another page: start afresh
  useEffect(() => {
    setSelId(null);
    setTour(false);
    viewEl.current?.scrollTo({ top: 0, left: 0 });
  }, [page, viewEl]);

  useEffect(() => () => stopSpeaking(), []);

  if (!chapter) return <Navigate to="/imagier" replace />;
  if (book === undefined || !cards) return <Loader />;
  const color = paletteColor(chapter.color);

  const width = fitWidth(viewSize, ZOOMS[zoom], pageHeight(words));

  return (
    <div className="img-book" style={{ '--ch': color } as React.CSSProperties}>
      <header className="img-book-top">
        <BackButton to={`/imagier/${chapter.num}`} label="Back to the chapter" />
        <div className="img-book-title">
          <strong>
            {chapter.num}. {chapter.title}
          </strong>
          <span>{chapter.en}</span>
        </div>
        {chapter.pages.length > 1 && (
          <div className="img-book-pages" role="tablist" aria-label="Pages">
            {chapter.pages.map((p, i) => (
              <button
                key={p}
                role="tab"
                aria-selected={i === pageIdx}
                className={i === pageIdx ? 'is-on' : ''}
                onClick={() => {
                  sfx.tap();
                  setPageIdx(i);
                }}
              >
                {i === 0 ? 'Gauche' : 'Droite'}
              </button>
            ))}
          </div>
        )}
      </header>

      <div className="img-book-view" ref={viewRef}>
        {viewSize.w > 0 && (
          <BookPage
            page={page}
            words={words}
            width={width}
            className="img-book-page"
            onClick={(_e, { x, y }) => {
              const hit = hitTest(words, x, y);
              setTour(false);
              if (hit) choose(hit);
            }}
          >
            {(k) => (
              <>
                {words.map((c) => (
                  <Sticker key={c.id} card={c} k={k} open={showAll || opened.has(c.id)} />
                ))}
                {sel && <span ref={ringRef} className="book-ring is-glow" style={boxStyle(sel.spot!.b, k, 3)} />}
              </>
            )}
          </BookPage>
        )}
      </div>

      <AnimatePresence mode="wait">
        {sel ? (
          <motion.section key={sel.id} className="img-book-word" initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0, transition: { duration: 0.12 } }} data-testid="book-word">
            <span className="img-book-word-pic">
              <CardImage card={sel} size={64} rounded={12} />
            </span>
            <span className="img-book-word-text">
              <strong>{sel.fr}</strong>
              <span>
                {sel.en}
                {sel.note ? ` · ${sel.note}` : ''}
              </span>
            </span>
            <SpeakButton text={sel.fr} size="sm" />
            <SpeakButton text={sel.fr} size="sm" slow />
            <button
              className={'icon-btn img-star' + (sel.focus ? ' is-on' : '')}
              onClick={() => {
                sfx.tap();
                void setFocus(sel.id, !sel.focus);
              }}
              aria-pressed={!!sel.focus}
              aria-label={sel.focus ? 'Starred: practised more' : 'Star it to practise it more'}
            >
              <Emoji e="⭐" size={22} />
            </button>
          </motion.section>
        ) : (
          <motion.p key="hint" className="img-book-hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            Touche un dessin pour entendre son mot · Tap a drawing to hear its word
          </motion.p>
        )}
      </AnimatePresence>

      <div className="img-book-tools">
        <button className="icon-btn icon-btn--solid" onClick={() => setZoom((z) => Math.max(0, z - 1))} disabled={zoom === 0} aria-label="Zoom out">
          −
        </button>
        <button className="icon-btn icon-btn--solid" onClick={() => setZoom((z) => Math.min(ZOOMS.length - 1, z + 1))} disabled={zoom === ZOOMS.length - 1} aria-label="Zoom in">
          +
        </button>
        <button
          className={'btn btn--sm ' + (showAll ? 'btn--white' : 'btn--ghost')}
          onClick={() => {
            sfx.tap();
            setShowAll((v) => !v);
          }}
          aria-pressed={showAll}
          data-testid="book-show-all"
        >
          {showAll ? '🙈 Cacher' : '👀 Tout voir'}
        </button>
        <button
          className={'btn btn--sm ' + (tour ? 'btn--white' : 'btn--sun')}
          onClick={() => {
            sfx.tap();
            if (tour) {
              setTour(false);
              return;
            }
            // from the start, or on from the word she's at
            if (sel && words.indexOf(sel) === words.length - 1) setSelId(null);
            setTour(true);
          }}
          data-testid="book-tour"
        >
          {tour ? '⏸ Pause' : '▶ Visite'}
        </button>
        <button className="btn btn--sm btn--ok" onClick={() => navigate(`/play/seek?decks=img-${String(chapter.num).padStart(2, '0')}&chap=${chapter.num}&len=12`)}>
          🔍 Jouer
        </button>
      </div>
    </div>
  );
}
