import { expect, test } from '@playwright/test';
import { onboarded, playRound } from './helpers';

// Her own copy of the picture dictionary, when it's on this machine: put it (or a link to it) at
// tests/e2e/local/imagier.pdf. That folder is never committed; without the file the test is skipped.
const BOOK = 'tests/e2e/local/imagier.pdf';

test.describe('Mon imagier', () => {
  test('from the home screen to a chapter, its games and back, without the book', async ({ page }) => {
    test.setTimeout(120_000);
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await onboarded(page, { minLevel: 3, introduceNew: false });
    await page.locator('[data-course="imagier"]').click();
    await expect(page.getByRole('heading', { name: 'Mon imagier' })).toBeVisible();
    await expect(page.getByTestId('book-card')).toBeVisible();
    await page.locator('[data-chapter="1"]').click();
    await expect(page.getByRole('heading', { name: 'En classe' })).toBeVisible();
    // a chapter not drawn yet: its page games wait for the book; its words are there
    await expect(page.locator('[data-game="seek"]')).toContainText('needs the book');
    await expect(page.locator('[data-word]').first()).toBeVisible();
    await page.locator('[data-game="nomme"]').click();
    await playRound(page, { wrongEvery: 4 });
    await expect(page.locator('.results-title')).toBeVisible();
    await page.getByRole('button', { name: 'Chapitre' }).click();
    await expect(page.getByRole('heading', { name: 'En classe' })).toBeVisible();
    // what she met counts in the chapter
    await expect(page.locator('.img-chapter-head-meta')).toContainText(/[1-9]\d* rencontrés/);
    expect(errors).toEqual([]);
  });

  for (const [mode, chap] of [['memory', 1], ['imagier', 1], ['gender', 1], ['spell', 1], ['seek', 30], ['labels', 30]] as const) {
    test(`plays ${mode} on a chapter to the end`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(String(e)));
      await onboarded(page, { minLevel: 3, introduceNew: true });
      // chapter 30 (shapes) is drawn by Bonbon: its page games play on Bonbon's own page
      await page.goto(`/#/play/${mode}?decks=img-${String(chap).padStart(2, '0')}&chap=${chap}&len=6`);
      await playRound(page, { wrongEvery: 3 });
      await expect(page.locator('.results-title')).toBeVisible();
      expect(errors).toEqual([]);
    });
  }

  test('reads her book on the device, then plays on its pages', async ({ page }) => {
    test.setTimeout(600_000);
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await onboarded(page, { minLevel: 3, introduceNew: false, autoplay: false });
    await page.goto('/#/imagier');
    const there = await page
      .getByTestId('book-file')
      .setInputFiles(BOOK)
      .then(() => true)
      .catch(() => false);
    test.skip(!there, 'her copy of the book is not on this machine');
    await expect(page.getByTestId('book-in')).toBeVisible({ timeout: 480_000 });
    // every word of a chapter has its drawing now
    const linked = await page.evaluate(async () => {
      const w = window as unknown as { __bonbon: { db: { cards: { where: (k: string) => { equals: (v: string) => { toArray: () => Promise<{ imageId?: string }[]> } } } } } };
      const cards = await w.__bonbon.db.cards.where('deckId').equals('img-01').toArray();
      return cards.length > 0 && cards.every((c) => c.imageId?.startsWith('icrop-'));
    });
    expect(linked).toBe(true);

    // read the page: tap the first drawing's sticker area
    await page.goto('/#/imagier/1/livre');
    await page.getByTestId('book-show-all').click();
    await expect(page.locator('.book-sticker.is-open').first()).toBeVisible();
    await page.getByTestId('book-tour').click();
    await expect(page.getByTestId('book-word')).toBeVisible({ timeout: 5_000 });

    for (const mode of ['seek', 'labels']) {
      await page.goto(`/#/play/${mode}?decks=img-01&chap=1&len=4`);
      await playRound(page, { wrongEvery: 2 });
      await expect(page.locator('.results-title')).toBeVisible();
    }
    expect(errors).toEqual([]);
  });
});
