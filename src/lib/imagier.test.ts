import { beforeEach, describe, expect, it } from 'vitest';
import { IMAGIER_CHAPTERS, IMAGIER_VERSION, imagierDeckId, loadImagierWords } from '../data/imagier';
import type { Progress, Session } from '../types';
import { db, getMeta, setMeta } from './db';
import { buildQuestions, makeLabelsBoard, pickDistractors, samePicture, type Pool } from './engine/round';
import { chapterStars, ensureImagierSeeded, summarize, testBests } from './imagier';
import { deckShown } from './level';
import { ensureSeeded } from './seed';

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()));
});

function progress(cardId: string, box: number): Progress {
  return { cardId, box, due: 0, seen: 3, correct: 3, wrong: 0, lapses: 0, streak: 3, firstSeen: 1, lastSeen: 1 };
}

describe('Mon imagier: seeding', () => {
  it('adds a theme per chapter, off by default and shown at every level, with every word placed in the book', async () => {
    await ensureImagierSeeded();
    const decks = await db.decks.where('id').startsWith('img-').toArray();
    expect(decks).toHaveLength(IMAGIER_CHAPTERS.length);
    for (const d of decks) {
      expect(d.book).toBe('imagier');
      expect(d.active).toBe(false);
      expect(deckShown(d, 3)).toBe(true);
      expect(deckShown(d, 2)).toBe(true);
    }
    const cards = await db.cards.where('deckId').startsWith('img-').toArray();
    expect(cards).toHaveLength((await loadImagierWords()).length);
    expect(cards.every((c) => c.spot && c.source === 'starter')).toBe(true);
    expect(await getMeta('imagierHash', '')).toBe(IMAGIER_VERSION);
  }, 30_000);

  it('keeps her drawings, stars and progress when the list is seeded again, and survives the starter seeding', async () => {
    await ensureImagierSeeded();
    const [first] = await db.cards.where('deckId').equals(imagierDeckId(IMAGIER_CHAPTERS[0].num)).sortBy('order');
    await db.cards.update(first.id, { imageId: 'icrop-x', focus: true });
    await db.progress.put(progress(first.id, 3));
    await setMeta('imagierHash', 'older');
    // the starter themes' own clean-up must leave the picture dictionary alone
    await setMeta('starterHash', 'older');
    await ensureSeeded();
    await ensureImagierSeeded();
    const after = await db.cards.get(first.id);
    expect(after?.imageId).toBe('icrop-x');
    expect(after?.focus).toBe(true);
    expect(after?.updatedAt).toBe(after?.createdAt);
    expect((await db.progress.get(first.id))?.box).toBe(3);
  }, 30_000);
});

describe('Mon imagier: progress', () => {
  it('gives a chapter its stars: all met, 80% learned, 80% mastered', () => {
    expect(chapterStars(10, { new: 1, learning: 9, learned: 0, mastered: 0 })).toBe(0);
    expect(chapterStars(10, { new: 0, learning: 10, learned: 0, mastered: 0 })).toBe(1);
    expect(chapterStars(10, { new: 0, learning: 2, learned: 5, mastered: 3 })).toBe(2);
    expect(chapterStars(10, { new: 0, learning: 0, learned: 2, mastered: 8 })).toBe(3);
    expect(chapterStars(0, { new: 0, learning: 0, learned: 0, mastered: 0 })).toBe(0);
  });

  it('crowns a chapter whose mastery test went 90% right', async () => {
    await ensureImagierSeeded();
    const num = IMAGIER_CHAPTERS[0].num;
    const s = (correct: number, total: number, lesson: string) => ({ lesson, correct, total }) as Session;
    const sessions = [s(30, 50, `imagier:${num}:test`), s(46, 50, `imagier:${num}:test`), s(10, 10, `imagier:${num}`)];
    expect(testBests(sessions).get(num)).toBeCloseTo(0.92);
    const cards = await db.cards.toArray();
    const sum = summarize(cards, new Map(), sessions).get(num)!;
    expect(sum.crown).toBe(true);
    expect(sum.total).toBe(IMAGIER_CHAPTERS[0].count);
    expect(sum.met).toBe(0);
  });
});

describe('Mon imagier: games on the page', () => {
  async function chapterPool(book: boolean): Promise<Pool> {
    await ensureImagierSeeded();
    const deck = imagierDeckId(IMAGIER_CHAPTERS[0].num);
    const cards = await db.cards.where('deckId').equals(deck).toArray();
    return { cards, all: await db.cards.toArray(), progress: new Map(), book };
  }
  const cfg = { length: 10, newPerRound: 3, difficulty: 2 as const, deckIds: [] };

  it('asks "find it on the page" only with the book on the device, with the page\'s words as the drawings to tap', async () => {
    expect(buildQuestions({ ...cfg, mode: 'seek' }, await chapterPool(false))).toHaveLength(0);
    const qs = buildQuestions({ ...cfg, mode: 'seek' }, await chapterPool(true));
    expect(qs.length).toBe(10);
    for (const q of qs) {
      expect(q.type).toBe('seek');
      expect(q.options!.some((c) => c.id === q.card.id)).toBe(true);
      expect(q.options!.every((c) => c.spot!.p === q.card.spot!.p && c.deckId === q.card.deckId)).toBe(true);
    }
  });

  it('builds label boards from neighbours on one page, each word once', async () => {
    const pool = await chapterPool(true);
    const qs = buildQuestions({ ...cfg, mode: 'labels' }, pool);
    expect(qs.length).toBeGreaterThan(0);
    for (const q of qs) {
      const words = q.pairs!;
      expect(words.length).toBeGreaterThanOrEqual(3);
      expect(words.length).toBeLessThanOrEqual(5);
      expect(new Set(words.map((w) => w.spot!.p)).size).toBe(1);
      expect(new Set(words.map((w) => w.fr.toLowerCase())).size).toBe(words.length);
    }
    // no two boards share a word
    const all = qs.flatMap((q) => q.pairs!.map((c) => c.id));
    expect(new Set(all).size).toBe(all.length);
    expect(makeLabelsBoard({ ...pool.cards[0], spot: undefined }, pool.cards, 5)).toBeNull();
  });

  it('never offers two words of one shared drawing side by side (affilé / émoussé on the same knives)', async () => {
    const pool = await chapterPool(true);
    const twins = pool.cards.flatMap((a) => pool.cards.filter((b) => b.id < a.id && samePicture(a, b)).map((b) => [a, b] as const));
    for (const [a, b] of twins) {
      for (let i = 0; i < 5; i++) expect(pickDistractors(a, pool.all, 5, 'fr').map((c) => c.id)).not.toContain(b.id);
    }
    const knives = { p: 56, b: [10, 10, 60, 60], l: [[0, 0, 5, 5]] } as const;
    const a = { ...pool.cards[0], id: 'x1', spot: { ...knives, b: [...knives.b] as [number, number, number, number], l: [[0, 0, 5, 5]] as [number, number, number, number][] } };
    const b = { ...pool.cards[1], id: 'x2', spot: { ...knives, b: [12, 8, 62, 58] as [number, number, number, number], l: [[0, 0, 5, 5]] as [number, number, number, number][] } };
    const far = { ...b, id: 'x3', spot: { ...b.spot, b: [200, 200, 260, 260] as [number, number, number, number] } };
    expect(samePicture(a, b)).toBe(true);
    expect(samePicture(a, far)).toBe(false);
    expect(samePicture(a, { ...b, spot: { ...b.spot, p: 57 } })).toBe(false);
  });

  it('builds memory boards of distinct words, with or without the book', async () => {
    const qs = buildQuestions({ ...cfg, mode: 'memory' }, await chapterPool(false));
    expect(qs.length).toBeGreaterThan(0);
    for (const q of qs) {
      expect(q.pairs!.length).toBe(6);
      expect(new Set(q.pairs!.map((c) => c.fr)).size).toBe(6);
    }
  });

  it('mixes the page into the chapter game only when the book is there', async () => {
    const without = buildQuestions({ ...cfg, mode: 'imagier', length: 30 }, await chapterPool(false));
    expect(without.some((q) => q.type === 'seek')).toBe(false);
    // the picture questions stay in, whatever her level
    const types = new Set(buildQuestions({ ...cfg, mode: 'imagier', length: 40, minLevel: 3 }, await chapterPool(true)).map((q) => q.type));
    expect(types.has('seek')).toBe(true);
    expect([...types].some((t) => t === 'pick-word' || t === 'pick-image' || t === 'listen')).toBe(true);
  });
});
