import { describe, expect, it } from 'vitest';
import type { Box } from '../../types';
import { CHAPTER_BY_NUM, IMAGIER_CHAPTERS, IMAGIER_PAGES, IMAGIER_WORD_COUNT, chapterOfDeck, expandWords, imagierDeckId, loadImagierWords } from '.';
import raw from './words.json';
import meta from './meta.json';

const KINDS = ['noun', 'verb', 'adjective', 'number', 'color', 'preposition', 'phrase', 'other'];
const area = (b: Box) => (b[2] - b[0]) * (b[3] - b[1]);
const inter = (a: Box, b: Box) => Math.max(0, Math.min(a[2], b[2]) - Math.max(a[0], b[0])) * Math.max(0, Math.min(a[3], b[3]) - Math.max(a[1], b[1]));

describe('Mon imagier: the word list', () => {
  it('has the same chapters and counts in meta.json and words.json, in order, numbered once', () => {
    expect(raw.version).toBe(meta.version);
    expect(raw.chapters.map((c) => c.num)).toEqual(meta.chapters.map((c) => c.num));
    expect(new Set(meta.chapters.map((c) => c.num)).size).toBe(meta.chapters.length);
    for (const c of meta.chapters) expect(raw.chapters.find((r) => r.num === c.num)!.words.length, `chapter ${c.num}`).toBe(c.count);
    expect(IMAGIER_WORD_COUNT).toBe(raw.chapters.reduce((n, c) => n + c.words.length, 0));
  });

  it('gives every chapter a title, pages and a look', () => {
    for (const c of IMAGIER_CHAPTERS) {
      expect(c.title && c.en, `chapter ${c.num}`).toBeTruthy();
      expect(c.pages.length).toBeGreaterThan(0);
      expect(c.emoji).not.toBe('📖');
      expect(c.count).toBeGreaterThanOrEqual(8);
    }
    expect(IMAGIER_PAGES.every((p) => p >= 4 && p <= 81)).toBe(true);
  });

  it('has a stable, unique id for every word, also when a word is in a chapter twice', async () => {
    const words = await loadImagierWords();
    expect(words).toHaveLength(IMAGIER_WORD_COUNT);
    expect(new Set(words.map((w) => w.id)).size).toBe(words.length);
    // the same list gives the same ids
    const again = expandWords(raw.chapters as never);
    expect(again.map((w) => w.id)).toEqual(words.map((w) => w.id));
    for (const w of words) expect(w.id).toMatch(/^i\d\d-[a-z0-9-]+$/);
  });

  it('has French with its article (or a name), English, and a kind for every word', async () => {
    for (const w of await loadImagierWords()) {
      const at = `${w.chapter}: ${w.fr}`;
      expect(w.fr.trim(), at).toBe(w.fr);
      expect(w.fr, at).not.toMatch(/’/);
      expect(w.en.length, at).toBeGreaterThan(0);
      expect(KINDS, at).toContain(w.kind);
      if (w.kind === 'noun') {
        expect(w.fr, at).toMatch(/^(le |la |les |l')|^\p{Lu}/u);
        expect(['m', 'f', 'mf'], at).toContain(w.g);
        if (w.plural) expect(w.fr, at).toMatch(/^les /);
        if (/^le /.test(w.fr)) expect(w.g, at).not.toBe('f');
        if (/^la /.test(w.fr)) expect(w.g, at).not.toBe('m');
      } else {
        expect(w.g, at).toBeUndefined();
      }
    }
  });

  it('never has the same French and English twice in a chapter (a game could not tell them apart)', async () => {
    const seen = new Set<string>();
    for (const w of await loadImagierWords()) {
      const key = `${w.chapter}|${w.fr.toLowerCase()}|${w.en.toLowerCase()}`;
      expect(seen.has(key), key).toBe(false);
      seen.add(key);
    }
  });

  it('puts every drawing and label on a page of its chapter, inside the page', async () => {
    for (const w of await loadImagierWords()) {
      const at = `${w.chapter}: ${w.fr}`;
      expect(CHAPTER_BY_NUM.get(w.chapter)!.pages, at).toContain(w.spot.p);
      for (const b of [w.spot.b, ...w.spot.l]) {
        expect(b[0], at).toBeGreaterThanOrEqual(0);
        expect(b[1], at).toBeGreaterThanOrEqual(0);
        expect(b[2], at).toBeLessThanOrEqual(739);
        expect(b[3], at).toBeLessThanOrEqual(989);
        // (a label can take a few small boxes to wrap around a drawing)
        expect(b[2] - b[0], at).toBeGreaterThan(0);
        expect(b[3] - b[1], at).toBeGreaterThan(0);
      }
      expect(w.spot.l.length, at).toBeGreaterThan(0);
    }
  });

  it('keeps labels off the drawings (they are painted over when the drawings are cut)', async () => {
    const words = await loadImagierWords();
    const byPage = new Map<number, Box[]>();
    for (const w of words) byPage.set(w.spot.p, [...(byPage.get(w.spot.p) ?? []), ...w.spot.l]);
    for (const w of words) {
      const covered = (byPage.get(w.spot.p) ?? []).reduce((n, r) => n + inter(w.spot.b, r), 0);
      expect(covered / area(w.spot.b), `${w.chapter}: ${w.fr}`).toBeLessThan(0.4);
    }
  });

  it('stands each chapter for a word that is in it', async () => {
    const words = await loadImagierWords();
    for (const c of IMAGIER_CHAPTERS) if (c.cover) expect(words.some((w) => w.chapter === c.num && w.fr === c.cover), `chapter ${c.num}: ${c.cover}`).toBe(true);
  });

  it('names the themes "img-NN" and reads them back', () => {
    expect(imagierDeckId(8)).toBe('img-08');
    expect(chapterOfDeck('img-08')).toBe(8);
    expect(chapterOfDeck('animals')).toBe(0);
  });
});
