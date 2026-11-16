import { describe, expect, it } from 'vitest';
import { CHAPTER_BY_NUM, imagierDeckId, loadImagierWords } from '../data/imagier';
import type { Card } from '../types';
import { drawnSpots, GRID_W, isDrawnSpot } from './imagier-layout';
import { wordToCard } from './imagier';

async function chapterCards(num: number): Promise<Card[]> {
  const words = (await loadImagierWords()).filter((w) => w.chapter === num);
  return words.map((w, i) => wordToCard(w, i + 1, undefined, 0));
}

const overlap = (a: number[], b: number[]) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];

describe("Bonbon's own picture pages", () => {
  it('lays every word of a chapter on its pages, in order, with no two drawings or labels overlapping', async () => {
    for (const num of [1, 26, 31]) {
      const cards = drawnSpots(await chapterCards(num));
      const pages = CHAPTER_BY_NUM.get(num)!.pages;
      expect(cards.every((c) => isDrawnSpot(c.spot) && pages.includes(c.spot!.p) && c.deckId === imagierDeckId(num))).toBe(true);
      for (const p of pages) {
        const on = cards.filter((c) => c.spot!.p === p);
        expect(on.length).toBeGreaterThan(0);
        for (const a of on) {
          const [x0, y0, x1, y1] = a.spot!.b;
          expect(x0).toBeGreaterThanOrEqual(0);
          expect(x1).toBeLessThanOrEqual(GRID_W);
          expect(y1).toBeLessThanOrEqual(a.spot!.h!);
          expect(y0).toBeLessThan(a.spot!.l[0][1]);
          for (const b of on) {
            if (a === b) continue;
            expect(overlap(a.spot!.b, b.spot!.b)).toBe(false);
            expect(overlap(a.spot!.l[0], b.spot!.l[0])).toBe(false);
          }
        }
      }
      // reading order runs on from the first page to the second
      const order = cards.map((c) => c.order);
      const byPage = pages.flatMap((p) => cards.filter((c) => c.spot!.p === p).map((c) => c.order));
      expect(byPage).toEqual([...order].sort((a, b) => a - b));
    }
  });

  it('leaves other cards alone', () => {
    const other = { id: 'x', deckId: 'animals', kind: 'word', fr: 'le chat', en: 'cat', source: 'starter', order: 1, createdAt: 0, updatedAt: 0 } as Card;
    expect(drawnSpots([other])[0]).toBe(other);
  });
});
