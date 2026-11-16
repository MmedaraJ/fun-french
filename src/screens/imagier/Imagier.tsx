import { motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { BookPage } from '../../components/BookPage';
import { CardImage } from '../../components/CardImage';
import { wipeFrom } from '../../components/ColorWipe';
import { Emoji } from '../../components/Emoji';
import { Page } from '../../components/Page';
import { ProgressRing } from '../../components/ProgressRing';
import { toast } from '../../components/Toasts';
import { CHAPTER_BY_NUM, IMAGIER_CHAPTERS, IMAGIER_CUT, IMAGIER_WORD_COUNT, imagierDeckId, type ImagierChapter } from '../../data/imagier';
import { recognitionSupported } from '../../lib/engine/modes';
import { canAsk } from '../../lib/engine/round';
import { db } from '../../lib/db';
import { ensureImagierSeeded, useBookInfo, useChapterCards, useImagierProgress, type BookInfo, type ChapterProgress } from '../../lib/imagier';
import { inkOn, paletteColor } from '../../lib/palette';
import { sfx } from '../../lib/sound';
import { speak } from '../../lib/speech';
import type { Card, GameMode, PaletteKey } from '../../types';
import '../course/Courses.css';
import '../grammar/Grammar.css';
import { BookCard } from './BookCard';
import { BookView } from './BookView';
import './Imagier.css';

export default function Imagier() {
  const book = useBookInfo();
  // the chapters' words, set up on first visit (and again when the word list changes)
  useEffect(() => {
    void ensureImagierSeeded();
  }, []);
  // newer boxes, or words without their drawing (a corrected spelling): cut from the pages already on the device
  useEffect(() => {
    if (!book) return;
    let alive = true;
    void (async () => {
      await ensureImagierSeeded();
      const moved = book.version !== IMAGIER_CUT;
      // words without a drawing on pages she has (pages she doesn't have wait for the PDF again)
      const missing = moved ? 0 : await db.cards.where('deckId').startsWith('img-').filter((c) => !c.imageId && !!c.spot && book.pages.includes(c.spot.p)).count();
      if (!moved && !missing) return;
      const { recutDrawings } = await import('../../lib/imagier-book');
      const info = await recutDrawings(undefined, !moved);
      if (alive && info && moved) toast({ title: 'Dessins mis à jour', body: 'Your book’s drawings were cut again for the new word list.', emoji: '✂️' });
    })();
    return () => {
      alive = false;
    };
  }, [book]);
  return (
    <Routes>
      <Route index element={<ImagierHome book={book} />} />
      <Route path=":num" element={<ChapterHome book={book} />} />
      <Route path=":num/livre" element={<BookView book={book} />} />
      <Route path="*" element={<Navigate to="/imagier" replace />} />
    </Routes>
  );
}

export function BackButton({ to, label }: { to: string; label: string }) {
  const navigate = useNavigate();
  return (
    <button className="icon-btn icon-btn--solid" onClick={() => navigate(to)} aria-label={label}>
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
        <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

export function Stars({ n, crown }: { n: number; crown?: boolean }) {
  return (
    <span className="img-stars" aria-label={`${n} of 3 stars${crown ? ', mastery test passed' : ''}`}>
      {[0, 1, 2].map((i) => (
        <span key={i} className={i < n ? 'is-on' : ''}>
          ★
        </span>
      ))}
      {crown && <Emoji e="👑" size={16} />}
    </span>
  );
}

/** The chapter to carry on with: the first not fully met, else the least known. */
function nextChapter(progress: Map<number, ChapterProgress> | undefined): ImagierChapter | undefined {
  if (!progress) return IMAGIER_CHAPTERS[0];
  const open = IMAGIER_CHAPTERS.find((c) => (progress.get(c.num)?.stars ?? 0) < 1);
  if (open) return open;
  return [...IMAGIER_CHAPTERS].sort((a, b) => (progress.get(a.num)?.stars ?? 0) - (progress.get(b.num)?.stars ?? 0))[0];
}

function ImagierHome({ book }: { book: BookInfo | null | undefined }) {
  const navigate = useNavigate();
  const progress = useImagierProgress();
  const learned = useMemo(() => [...(progress?.values() ?? [])].reduce((n, p) => n + p.counts.learned + p.counts.mastered, 0), [progress]);
  const met = useMemo(() => [...(progress?.values() ?? [])].reduce((n, p) => n + p.met, 0), [progress]);
  const next = nextChapter(progress);
  const started = met > 0;

  const reviewAll = async (from: HTMLElement) => {
    sfx.whoosh();
    await wipeFrom(from, paletteColor('tangerine'));
    // the words she has met, from every chapter
    navigate(`/play/imagier?decks=${IMAGIER_CHAPTERS.map((c) => imagierDeckId(c.num)).join(',')}&chap=all&met=1&len=15`);
  };

  return (
    <Page className="imagier">
      <div className="lesson-top">
        <BackButton to="/" label="Back to the home screen" />
      </div>
      <header className="img-hero panel">
        <span className="img-hero-art">
          <Emoji e="🖼️" size={48} />
        </span>
        <div>
          <h1 className="screen-title">Mon imagier</h1>
          <p className="muted">
            Picture dictionary · {IMAGIER_CHAPTERS.length} chapitres · {IMAGIER_WORD_COUNT.toLocaleString('fr-FR')} mots
          </p>
          <div className="img-hero-bar" aria-label={`${learned} words learned`}>
            <span style={{ width: `${(met / Math.max(1, IMAGIER_WORD_COUNT)) * 100}%` }} className="is-met" />
            <span style={{ width: `${(learned / Math.max(1, IMAGIER_WORD_COUNT)) * 100}%` }} />
          </div>
          <small className="img-hero-small">
            {learned} appris · {met} rencontrés
          </small>
        </div>
      </header>

      {next && (
        <motion.button className="course-continue" style={{ background: paletteColor(next.color), color: inkOn(next.color) }} onClick={() => navigate(`/imagier/${next.num}`)} whileTap={{ scale: 0.97 }} data-testid="img-continue">
          <span>
            <small>{started ? 'Continuer · Carry on' : 'Commencer · Start'}</small>
            <strong>
              {next.num}. {next.title}
            </strong>
          </span>
          <span className="course-continue-go" aria-hidden>
            ›
          </span>
        </motion.button>
      )}

      {met > 0 && (
        <button className="btn btn--block btn--lg img-review" onClick={(e) => void reviewAll(e.currentTarget)}>
          <Emoji e="🎲" size={24} /> Tout l’imagier · Mixed review
        </button>
      )}

      <BookCard book={book} />

      <h2 className="section-title">
        Chapitres <small>Pick a page of the book</small>
      </h2>
      <div className="img-chapters">
        {IMAGIER_CHAPTERS.map((c, i) => {
          const p = progress?.get(c.num);
          const share = p && p.total ? (p.counts.learned + p.counts.mastered) / p.total : 0;
          const metShare = p && p.total ? p.met / p.total : 0;
          return (
            <motion.button
              key={c.num}
              className="img-chapter"
              style={{ '--ch': paletteColor(c.color) } as React.CSSProperties}
              onClick={() => {
                sfx.pop();
                navigate(`/imagier/${c.num}`);
              }}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(0.02 * i, 0.4), type: 'spring', stiffness: 320, damping: 24 }}
              whileTap={{ scale: 0.96 }}
              data-chapter={c.num}
            >
              <span className={'img-chapter-art' + (p?.cover ? ' has-cover' : '')}>
                {/* a drawing from her book once it's in, else the chapter's emoji */}
                {p?.cover ? <CardImage card={{ imageId: p.cover, en: c.en, fr: c.title }} size={52} rounded={12} /> : <Emoji e={c.emoji} size={34} />}
                <span className="img-chapter-num">{c.num}</span>
              </span>
              <span className="img-chapter-text">
                <strong>{c.title}</strong>
                <span>{c.en}</span>
                <span className="img-chapter-meta">
                  <Stars n={p?.stars ?? 0} crown={p?.crown} /> {c.count} mots
                </span>
              </span>
              <span className="img-chapter-bar" aria-hidden>
                <span className="is-met" style={{ width: `${metShare * 100}%` }} />
                <span style={{ width: `${share * 100}%` }} />
              </span>
            </motion.button>
          );
        })}
      </div>
      <p className="muted img-foot">
        ★ every word met · ★★ 80% learned · ★★★ 80% mastered · 👑 mastery test at 90%+
      </p>
    </Page>
  );
}

interface GameDef {
  id: string;
  mode: GameMode;
  name: string;
  en: string;
  emoji: string;
  color: PaletteKey;
  /** Played on the book's pages. */
  book?: boolean;
  params?: Record<string, string>;
  len?: number | ((count: number) => number);
  when?: (cards: Card[]) => boolean;
}

const GAMES: GameDef[] = [
  { id: 'seek', mode: 'seek', name: 'Cherche et trouve', en: 'Find it on the page', emoji: '🔍', color: 'sunshine', book: true, len: 12 },
  { id: 'labels', mode: 'labels', name: 'Étiquettes', en: 'Put the labels back', emoji: '🏷️', color: 'leaf', book: true },
  { id: 'nomme', mode: 'pick-word', name: 'Quel est ce mot ?', en: 'Name the picture', emoji: '🖼️', color: 'sky', len: 12 },
  { id: 'ecoute', mode: 'pick-image', name: 'Écoute et touche', en: 'Hear it, tap the picture', emoji: '🎧', color: 'grape', len: 12 },
  { id: 'memoire', mode: 'memory', name: 'Mémoire', en: 'Memory', emoji: '🧠', color: 'plum' },
  { id: 'genre', mode: 'gender', name: 'Le ou la ?', en: 'Masculine or feminine', emoji: '⚖️', color: 'lagoon', len: 12, when: (cards) => cards.filter((c) => canAsk('gender', c)).length >= 5 },
  { id: 'epelle', mode: 'spell', name: 'Épelle-le', en: 'Spell it', emoji: '✏️', color: 'tangerine', len: 10 },
  { id: 'ecris', mode: 'type', name: 'Écris-le', en: 'Write it from memory', emoji: '✍️', color: 'berry', len: 10 },
  { id: 'dis', mode: 'speak', name: 'Dis-le !', en: 'Say it out loud', emoji: '🎤', color: 'tangerine', len: 10, when: () => recognitionSupported() },
  { id: 'defi', mode: 'imagier', name: 'Défi · 3 vies', en: 'Survival: how far can you go?', emoji: '🔥', color: 'berry', params: { survival: '1' } },
  { id: 'test', mode: 'imagier', name: 'Test de maîtrise', en: 'Every word once, no help', emoji: '🏆', color: 'grape', params: { test: '1' }, len: (n) => Math.min(n, TEST_MAX) },
];

/** A mastery test asks this many words at most (the numbers chapter has over a hundred). */
const TEST_MAX = 60;

function useChapter(): ImagierChapter | undefined {
  const { num } = useParams();
  return CHAPTER_BY_NUM.get(Number(num));
}

function ChapterHome({ book }: { book: BookInfo | null | undefined }) {
  const navigate = useNavigate();
  const chapter = useChapter();
  const cards = useChapterCards(chapter?.num ?? 0);
  const progress = useImagierProgress();
  if (!chapter) return <Navigate to="/imagier" replace />;
  const p = progress?.get(chapter.num);
  const color = paletteColor(chapter.color);
  const index = IMAGIER_CHAPTERS.findIndex((c) => c.num === chapter.num);
  const prev = IMAGIER_CHAPTERS[index - 1];
  const next = IMAGIER_CHAPTERS[index + 1];
  const games = GAMES.filter((g) => !g.when || (cards && g.when(cards)));

  const play = async (g: GameDef, from: HTMLElement) => {
    if (g.book && !book) {
      sfx.wrong();
      toast({ title: 'Il faut ton livre', body: 'This game is played on the pages of your book: add its PDF above first.', emoji: '📖' });
      return;
    }
    sfx.whoosh();
    await wipeFrom(from, paletteColor(g.color));
    const count = cards?.length ?? chapter.count;
    const len = typeof g.len === 'function' ? g.len(count) : g.len;
    const q = new URLSearchParams({ decks: imagierDeckId(chapter.num), chap: String(chapter.num), ...(len ? { len: String(len) } : {}), ...g.params });
    navigate(`/play/${g.mode}?${q}`);
  };

  return (
    <Page className="imagier img-chapter-page">
      <div className="lesson-top">
        <BackButton to="/imagier" label="Back to Mon imagier" />
        <span className="badge" style={{ background: color, color: inkOn(chapter.color) }}>
          <Emoji e="🖼️" size={16} /> Mon imagier
        </span>
        {p?.crown && <span className="badge lesson-done">👑 Maîtrisé</span>}
      </div>

      <motion.header className="img-chapter-head" style={{ '--ch': color } as React.CSSProperties} initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
        <span className="img-chapter-head-art">
          <Emoji e={chapter.emoji} size={52} />
        </span>
        <div>
          <div className="course-chapter-num">Chapitre {chapter.num}</div>
          <h1>{chapter.title}</h1>
          <div className="lesson-en">{chapter.en}</div>
          <div className="img-chapter-head-meta">
            <Stars n={p?.stars ?? 0} crown={p?.crown} />
            <span>
              {p ? `${p.counts.learned + p.counts.mastered}/${p.total} appris · ${p.met} rencontrés` : `${chapter.count} mots`}
              {p?.test !== undefined ? ` · test ${Math.round(p.test * 100)} %` : ''}
            </span>
          </div>
        </div>
        {p && (
          <ProgressRing value={p.total ? (p.counts.learned + p.counts.mastered) / p.total : 0} size={60} stroke={7} color={color}>
            <strong className="img-ring-num">{p.total ? Math.round(((p.counts.learned + p.counts.mastered) / p.total) * 100) : 0}%</strong>
          </ProgressRing>
        )}
      </motion.header>

      <BookCard book={book} compact />

      <motion.button className="img-read panel" onClick={() => navigate(`/imagier/${chapter.num}/livre`)} whileTap={{ scale: 0.98 }} data-testid="img-read">
        {book ? (
          // the chapter's spread, small
          <span className="img-read-pages" aria-hidden>
            {chapter.pages.map((pg) => (
              <BookPage key={pg} page={pg} width={chapter.pages.length > 1 ? 44 : 60} />
            ))}
          </span>
        ) : (
          <span className="img-read-art" style={{ background: color }}>
            <Emoji e="📖" size={34} />
          </span>
        )}
        <span className="course-ex-text">
          <strong>Lire la page · Read the page</strong>
          <span>{book ? 'Your book’s pages, labels hidden: tap a drawing to hear its word' : 'Every word of the chapter, with its picture: tap to hear it'}</span>
        </span>
        <span className="course-ex-go" aria-hidden>
          ▶
        </span>
      </motion.button>

      <h2 className="section-title">
        Jeux <small>{games.length} games for this chapter</small>
      </h2>
      <div className="img-games">
        {games.map((g, i) => {
          const locked = g.book && !book;
          return (
            <motion.button
              key={g.id}
              className={'img-game' + (locked ? ' is-locked' : '')}
              style={{ background: paletteColor(g.color), color: inkOn(g.color) }}
              onClick={(e) => void play(g, e.currentTarget)}
              initial={{ opacity: 0, y: 18, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 320, damping: 22, delay: 0.03 * i }}
              whileTap={{ scale: 0.94 }}
              data-game={g.id}
            >
              <span className="img-game-num">{i + 1}</span>
              <Emoji e={g.emoji} size={40} />
              <span className="img-game-name">{g.name}</span>
              <span className="img-game-en">{g.id === 'test' && (cards?.length ?? chapter.count) > TEST_MAX ? `${TEST_MAX} words, no help` : g.en}</span>
              {locked && <span className="img-game-lock">📖 needs the book</span>}
            </motion.button>
          );
        })}
      </div>

      <h2 className="section-title">
        Les mots <small>{cards?.length ?? chapter.count} words · tap to hear</small>
      </h2>
      <WordGallery cards={cards} />

      <div className="lesson-nav">
        {prev ? (
          <button className="btn btn--ghost btn--sm" onClick={() => navigate(`/imagier/${prev.num}`)}>
            ← {prev.num}. {prev.title}
          </button>
        ) : (
          <span />
        )}
        {next && (
          <button className="btn btn--ghost btn--sm" onClick={() => navigate(`/imagier/${next.num}`)}>
            {next.num}. {next.title} →
          </button>
        )}
      </div>
    </Page>
  );
}

const GENDER: Record<string, string> = { m: 'masc.', f: 'fém.' };

function WordGallery({ cards }: { cards: Card[] | undefined }) {
  const [flipped, setFlipped] = useState<string | null>(null);
  if (!cards) return <div className="img-words img-words--wait" />;
  return (
    <div className="img-words">
      {cards.map((c) => (
        <motion.button
          key={c.id}
          className={'img-word' + (flipped === c.id ? ' is-flipped' : '')}
          onClick={() => {
            sfx.softPop();
            void speak(c.fr);
            setFlipped(c.id);
          }}
          whileTap={{ scale: 0.95 }}
          data-word={c.id}
        >
          <span className="img-word-pic">
            <CardImage card={c} size="100%" rounded={12} />
          </span>
          <strong>{c.fr}</strong>
          <span>
            {c.en}
            {c.gender && !c.plural && /^l['’]/i.test(c.fr) ? ` · ${GENDER[c.gender]}` : ''}
          </span>
        </motion.button>
      ))}
    </div>
  );
}
