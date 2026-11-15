// "Mon imagier": each chapter of her picture dictionary is a theme of its own ("img-08"), seeded
// from src/data/imagier when she first opens it (and again when the word list changes). The
// themes are always shown whatever her level, start switched off (their words reach the daily
// review once she has met them in a game), and keep the drawings cut from her book.
import { useLiveQuery } from 'dexie-react-hooks';
import { CHAPTER_BY_NUM, IMAGIER_CHAPTERS, IMAGIER_VERSION, chapterOfDeck, imagierDeckId, loadImagierWords, type ImagierWord } from '../data/imagier';
import type { Card, Deck, Progress, Session } from '../types';
import { db, getMeta, setMeta } from './db';
import { statusCounts, type StatusCounts } from './stats';

const HASH_KEY = 'imagierHash';
/** Set once her book's drawings are on the device. */
export const BOOK_KEY = 'imagierBook';

export interface BookInfo {
  importedAt: number;
  /** Version of the boxes the drawings were cut with (IMAGIER_CUT): newer boxes re-cut them from the stored pages. */
  version: string;
  pages: number[];
  /** Drawings cut. */
  words: number;
  /** Space used on the device, roughly. */
  bytes: number;
}

/** Her book's PDF, handed over from Ajouter → Un PDF to Mon imagier, which reads it. */
let pendingBook: File | null = null;
export function offerBook(file: File) {
  pendingBook = file;
}
export function takeBook(): File | null {
  const f = pendingBook;
  pendingBook = null;
  return f;
}

/** Image ids of a stored page and of a word's drawing. */
export const pageImageId = (page: number) => `ipage-${page}`;
export const cropImageId = (cardId: string) => `icrop-${cardId}`;

export function wordToCard(w: ImagierWord, order: number, old: Card | undefined, now: number): Card {
  return {
    id: w.id,
    deckId: imagierDeckId(w.chapter),
    kind: w.kind === 'phrase' ? 'phrase' : 'word',
    fr: w.fr,
    en: w.en,
    ...(w.g === 'm' || w.g === 'f' ? { gender: w.g } : {}),
    ...(w.plural ? { plural: true } : {}),
    ...(w.emoji ? { emoji: w.emoji } : {}),
    // her book's drawing, once cut
    ...(old?.imageId ? { imageId: old.imageId } : {}),
    ...(w.note || w.g === 'mf' ? { note: [w.note, w.g === 'mf' ? 'masculin ou féminin' : ''].filter(Boolean).join(' · ') } : {}),
    spot: w.spot,
    source: 'starter',
    order,
    focus: old?.focus,
    archived: old?.archived,
    createdAt: old ? old.createdAt : now,
    updatedAt: old ? old.createdAt : now,
  };
}

let seeding: Promise<void> | null = null;

/** Adds (or updates) the picture-dictionary themes and words. Cheap once done (one look at the version). */
export function ensureImagierSeeded(): Promise<void> {
  // one at a time; checked again on every call, so a wiped database is seeded afresh
  seeding ??= seedImagier().finally(() => {
    seeding = null;
  });
  return seeding;
}

async function seedImagier(): Promise<void> {
  if ((await getMeta(HASH_KEY, '')) === IMAGIER_VERSION) return;
  const words = await loadImagierWords();
  const now = Date.now();
  await db.transaction('rw', db.decks, db.cards, db.progress, db.meta, async () => {
    const decks = new Map((await db.decks.toArray()).map((d) => [d.id, d]));
    for (const ch of IMAGIER_CHAPTERS) {
      const id = imagierDeckId(ch.num);
      const prev = decks.get(id);
      const deck: Deck = {
        id,
        name: ch.title,
        nameEn: ch.en,
        emoji: ch.emoji,
        color: ch.color,
        builtin: true,
        book: 'imagier',
        active: prev ? prev.active : false,
        level: 2,
        order: 1000 + ch.num,
        createdAt: prev ? prev.createdAt : now,
      };
      await db.decks.put(deck);
    }
    const existing = new Map((await db.cards.where('deckId').startsWith('img-').toArray()).map((c) => [c.id, c]));
    const order = new Map<string, number>();
    const rows: Card[] = [];
    for (const w of words) {
      const n = (order.get(String(w.chapter)) ?? 0) + 1;
      order.set(String(w.chapter), n);
      const old = existing.get(w.id);
      // a word she edited keeps her text; only its place in the book follows the new list
      if (old && old.updatedAt !== old.createdAt) {
        rows.push({ ...old, spot: w.spot });
        continue;
      }
      rows.push(wordToCard(w, n, old, now));
    }
    await db.cards.bulkPut(rows);
    // words no longer in the list: their progress moves to the same word under its new spelling
    const ids = new Set(rows.map((r) => r.id));
    const stale = [...existing.values()].filter((c) => !ids.has(c.id));
    for (const old of stale) {
      const p = await db.progress.get(old.id);
      if (p) {
        const same = rows.find((r) => r.deckId === old.deckId && (r.en.toLowerCase() === old.en.toLowerCase() || r.fr.toLowerCase() === old.fr.toLowerCase()));
        if (same && !(await db.progress.get(same.id))) await db.progress.put({ ...p, cardId: same.id });
        await db.progress.delete(old.id);
      }
      await db.cards.delete(old.id);
    }
    await setMeta(HASH_KEY, IMAGIER_VERSION);
  });
}

export interface ChapterProgress {
  num: number;
  total: number;
  counts: StatusCounts;
  /** Words met at least once. */
  met: number;
  /** 0..3: every word met; 80% learned; 80% mastered. */
  stars: number;
  /** Best mastery-test score (0..1), if she took it. */
  test?: number;
  /** A mastery test passed at 90% or more. */
  crown: boolean;
  /** Her book's drawing of the chapter's first word, once cut: the chapter's picture. */
  cover?: string;
}

export function chapterStars(total: number, counts: StatusCounts): number {
  if (!total) return 0;
  const met = total - counts.new;
  const learned = counts.learned + counts.mastered;
  if (counts.mastered >= total * 0.8) return 3;
  if (learned >= total * 0.8) return 2;
  return met >= total ? 1 : 0;
}

/** Best mastery-test score per chapter, from her rounds ("imagier:8:test"). */
export function testBests(sessions: Session[]): Map<number, number> {
  const out = new Map<number, number>();
  for (const s of sessions) {
    const m = /^imagier:(\d+):test$/.exec(s.lesson ?? '');
    if (!m || !s.total) continue;
    const num = Number(m[1]);
    out.set(num, Math.max(out.get(num) ?? 0, s.correct / s.total));
  }
  return out;
}

export function summarize(cards: Card[], progress: Map<string, Progress>, sessions: Session[]): Map<number, ChapterProgress> {
  const byChapter = new Map<number, string[]>();
  const covers = new Map<number, Card>();
  for (const c of cards) {
    if (c.archived) continue;
    const num = chapterOfDeck(c.deckId);
    if (!num) continue;
    const list = byChapter.get(num) ?? [];
    list.push(c.id);
    byChapter.set(num, list);
    // the chapter's chosen word, else its first
    const cover = covers.get(num);
    const wanted = CHAPTER_BY_NUM.get(num)?.cover;
    const isWanted = (x: Card) => !!wanted && x.fr === wanted;
    if (!cover || (isWanted(c) && !isWanted(cover)) || (!isWanted(cover) && c.order < cover.order)) covers.set(num, c);
  }
  const tests = testBests(sessions);
  const out = new Map<number, ChapterProgress>();
  for (const ch of IMAGIER_CHAPTERS) {
    const ids = byChapter.get(ch.num) ?? [];
    const counts = statusCounts(ids, progress);
    const test = tests.get(ch.num);
    out.set(ch.num, {
      num: ch.num,
      total: ids.length,
      counts,
      met: ids.length - counts.new,
      stars: chapterStars(ids.length, counts),
      ...(test !== undefined ? { test } : {}),
      crown: (test ?? 0) >= 0.9,
      ...(covers.get(ch.num)?.imageId ? { cover: covers.get(ch.num)!.imageId } : {}),
    });
  }
  return out;
}

/** Her progress in every chapter, kept up to date. */
export function useImagierProgress(): Map<number, ChapterProgress> | undefined {
  return useLiveQuery(async () => {
    const [cards, progressRows, sessions] = await Promise.all([
      db.cards.where('deckId').startsWith('img-').toArray(),
      // imagier card ids start "i08-…"
      db.progress.where('cardId').startsWith('i').toArray(),
      db.sessions.filter((s) => !!s.lesson?.startsWith('imagier:')).toArray(),
    ]);
    return summarize(cards, new Map(progressRows.map((p) => [p.cardId, p])), sessions);
  }, []);
}

/** The words of one chapter as cards (with her drawings once cut), live. */
export function useChapterCards(num: number): Card[] | undefined {
  return useLiveQuery(async () => (await db.cards.where('deckId').equals(imagierDeckId(num)).toArray()).filter((c) => !c.archived).sort((a, b) => a.order - b.order), [num]);
}

/** Whether her book's drawings are on this device. */
export function useBookInfo(): BookInfo | null | undefined {
  return useLiveQuery(() => getMeta<BookInfo | null>(BOOK_KEY, null), []);
}

export function getBookInfo(): Promise<BookInfo | null> {
  return getMeta<BookInfo | null>(BOOK_KEY, null);
}
