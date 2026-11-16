// Bonbon's own picture pages: without her book, each of its pages becomes a page of Bonbon's
// drawings, laid out in a grid of its own (five across, a label under each drawing). The words of
// a page get spots on that grid instead of the book's, so the games played on a page (read the
// page, find it on the page, put the labels back) work the same way.
import { CHAPTER_BY_NUM, chapterOfDeck } from '../data/imagier';
import type { Box, Card, Spot } from '../types';

/** The same width as a page of the book, so everything that draws a page works for both. */
export const GRID_W = 739;
const COLS = 5;
const CELL_W = GRID_W / COLS;
const CELL_H = 178;
const TOP = 14;

/** Where the i-th word of a grid page goes: its drawing, its label under it. */
export function gridSpot(page: number, i: number, rows: number): Spot {
  const col = i % COLS;
  const row = Math.floor(i / COLS);
  const x = col * CELL_W;
  const y = TOP + row * CELL_H;
  const b: Box = [x + 18, y + 6, x + CELL_W - 18, y + 6 + (CELL_W - 36)];
  const l: Box = [x + 8, y + CELL_W - 22, x + CELL_W - 8, y + CELL_W + 8];
  return { p: page, b, l: [l], h: TOP * 2 + rows * CELL_H };
}

/**
 * The picture-dictionary words with spots on Bonbon's own pages. A chapter's words, in order, are
 * shared out evenly over as many pages as the chapter has in the book (so the left and right page
 * tabs still work), each page a grid of its own.
 */
export function drawnSpots(cards: Card[]): Card[] {
  const chapters = new Map<string, Card[]>();
  for (const c of cards) {
    if (!c.spot || !chapterOfDeck(c.deckId)) continue;
    const list = chapters.get(c.deckId) ?? [];
    list.push(c);
    chapters.set(c.deckId, list);
  }
  const spot = new Map<string, Spot>();
  for (const [deckId, list] of chapters) {
    list.sort((a, b) => a.order - b.order);
    const pages = CHAPTER_BY_NUM.get(chapterOfDeck(deckId))?.pages ?? [list[0].spot!.p];
    const per = Math.ceil(list.length / pages.length);
    for (let start = 0, pi = 0; start < list.length; start += per, pi++) {
      const part = list.slice(start, start + per);
      const rows = Math.ceil(part.length / COLS);
      part.forEach((c, i) => spot.set(c.id, gridSpot(pages[Math.min(pi, pages.length - 1)], i, rows)));
    }
  }
  return cards.map((c) => (spot.has(c.id) ? { ...c, spot: spot.get(c.id)! } : c));
}

/** Is this spot on one of Bonbon's own pages (rather than her book's)? */
export const isDrawnSpot = (s?: Spot) => !!s && s.h !== undefined;
