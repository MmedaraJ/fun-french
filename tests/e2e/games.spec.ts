import { expect, test } from '@playwright/test';
import { answerCurrent, onboarded, playRound } from './helpers';

const MODES = ['pick-image', 'pick-word', 'listen', 'spell', 'gender', 'build', 'type', 'flash', 'pairs', 'mix'];

test.describe('every game can be played to the end', () => {
  for (const mode of MODES) {
    test(mode, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(String(e)));
      await onboarded(page, { introduceNew: true });
      await page.goto(`/#/play/${mode}?len=4`);
      await playRound(page, { wrongEvery: 3 });
      await expect(page.locator('.results-title')).toBeVisible();
      await expect(page.locator('.score-big')).toBeVisible();
      expect(errors).toEqual([]);
    });
  }
});

test('survival ends after three mistakes', async ({ page }) => {
  await onboarded(page, { introduceNew: false });
  await page.goto('/#/play/pick-word?survival=1');
  await playRound(page, { wrongEvery: 1 });
  await expect(page.getByText(/You survived/)).toBeVisible();
});

test('a "new word" card is never followed straight away by its own question', async ({ page }) => {
  await onboarded(page, { introduceNew: true });
  await page.goto('/#/play/build?len=8');
  let intros = 0;
  for (let i = 0; i < 40; i++) {
    const intro = page.locator('[data-intro]');
    const live = page.locator('[data-qtype][data-phase="ask"]');
    await expect(intro.or(live).or(page.locator('.results')).first()).toBeVisible({ timeout: 15_000 });
    if (await page.locator('.results').isVisible().catch(() => false)) break;
    if (await intro.isVisible().catch(() => false)) {
      intros++;
      const shown = await intro.getAttribute('data-intro');
      await page.getByRole('button', { name: 'Compris !' }).dispatchEvent('click');
      // wait for that card to leave before looking at what comes next
      await expect(page.locator(`[data-intro="${shown}"]`)).toHaveCount(0);
      await expect(intro.or(live).first()).toBeVisible();
      // whatever comes next (another new word, or a question) is not this word's question
      if (await live.isVisible().catch(() => false)) {
        expect(await live.locator('[data-target]').first().getAttribute('data-target')).not.toBe(shown);
      }
      continue;
    }
    await answerCurrent(page);
    const cont = page.getByRole('button', { name: /Continuer|Voir mon score/ });
    await page.locator('.feedback').waitFor({ state: 'visible', timeout: 8000 });
    if (await cont.isVisible().catch(() => false)) await cont.click();
    await page.locator('.feedback').waitFor({ state: 'hidden', timeout: 8000 });
  }
  expect(intros).toBeGreaterThan(0);
});

test.describe('grammar games', () => {
  for (const mode of ['conjugaison', 'temps', 'questions', 'structures', 'grammaire']) {
    test(mode, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(String(e)));
      await onboarded(page);
      await page.goto(`/#/play/${mode}?len=6`);
      await playRound(page, { wrongEvery: 3 });
      await expect(page.locator('.results-title')).toBeVisible();
      expect(errors).toEqual([]);
    });
  }

  test('a lesson practice round', async ({ page }) => {
    await onboarded(page);
    await page.goto('/#/grammaire');
    await page.locator('.gr-lesson').first().click();
    await page.getByRole('button', { name: /S’entraîner/ }).click();
    await playRound(page);
    await expect(page.locator('.results-title')).toBeVisible();
    // the lesson remembers it was done
    await page.goto('/#/grammaire');
    await expect(page.getByText(/1\/\d+ lessons done/)).toBeVisible();
    await expect(page.locator('.gr-lesson.is-done')).toHaveCount(1);
  });

  test('the grammar her book teaches has its own practice', async ({ page }) => {
    await onboarded(page);
    await page.evaluate(async () => {
      const w = window as unknown as { __bonbon: { db: { meta: { put: (row: object) => Promise<unknown> } } } };
      await w.__bonbon.db.meta.put({ key: 'bookGrammar', value: { lessonIds: ['pc-etre', 'negation-jamais-plus'], sources: ['Unité 5.pdf'] } });
    });
    await page.goto('/#/grammaire');
    await expect(page.locator('.gr-in-book')).toHaveCount(2);
    await page.getByRole('button', { name: /La grammaire de mon livre/ }).click();
    await expect(page).toHaveURL(/book=1/);
    await playRound(page);
    await expect(page.locator('.results-title')).toBeVisible();
  });

  test('daily practice mixes in grammar', async ({ page }) => {
    await onboarded(page, { introduceNew: false });
    await page.goto('/#/play/mix?daily=1&len=10');
    const kinds = new Set<string>();
    for (let i = 0; i < 40; i++) {
      // the results page takes a moment to work out the score: wait for it or the next question
      await expect(
        page.locator('[data-qtype][data-phase="ask"], .results, button:has-text("D’accord !"), button:has-text("Compris !")').first(),
      ).toBeVisible({ timeout: 15_000 });
      if (await page.locator('.results').isVisible().catch(() => false)) break;
      const live = page.locator('[data-qtype][data-phase="ask"]').first();
      if (await live.isVisible().catch(() => false)) kinds.add((await live.getAttribute('data-qtype'))!);
      await answerCurrent(page);
      await page.locator('.feedback').waitFor({ state: 'visible', timeout: 8000 });
      const cont = page.getByRole('button', { name: /Continuer|Voir mon score/ });
      if (await cont.isVisible().catch(() => false)) await cont.click();
      await page.locator('.feedback').waitFor({ state: 'hidden', timeout: 8000 });
    }
    const grammar = ['conj', 'cloze', 'tense-id', 'transform', 'negate', 'qform', 'qword', 'qmatch', 'gtranslate', 'glisten'];
    expect([...kinds].some((k) => grammar.includes(k))).toBe(true);
  });
});

test('Avancé: nothing for beginners, advanced structures in the daily practice', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await onboarded(page, { minLevel: 3 });

  // no picture-tapping or flip-card games; the Structures game is there
  const games = await page.locator('.mode-grid .mode-name').allTextContents();
  for (const basic of ['Images', 'Mots', 'Paires', 'Cartes']) expect(games).not.toContain(basic);
  expect(games).toContain('Structures');

  // the word list has the advanced themes only: no A1/A2 theme, not the textbook's -er verbs
  const decks = await page.evaluate(async () => {
    const w = window as unknown as { __bonbon: { db: { decks: { toArray: () => Promise<{ name: string; level: number; builtin: boolean }[]> } } } };
    const all = await w.__bonbon.db.decks.toArray();
    return { basic: all.filter((d) => d.builtin && d.level < 3).map((d) => d.name), advanced: all.filter((d) => d.builtin && d.level >= 3).map((d) => d.name) };
  });
  expect(decks.advanced.length).toBeGreaterThanOrEqual(10);
  await page.goto('/#/words');
  const chips = page.locator('.words-decks .chip');
  await expect(chips.filter({ hasText: decks.advanced[0] }).first()).toBeVisible();
  const shown = (await chips.allTextContents()).map((t) => t.trim());
  for (const name of decks.basic) expect(shown).not.toContain(name);

  // the lesson path: the hardest tenses and the advanced units, none of the basics
  await page.goto('/#/grammaire');
  await expect(page.locator('.gr-unit h2', { hasText: 'Les pronoms' })).toBeVisible();
  await expect(page.locator('.gr-unit h2', { hasText: 'Les bases' })).toHaveCount(0);
  await expect(page.locator('.gr-level.l1, .gr-level.l2')).toHaveCount(0);

  // the daily practice: no picture tapping, advanced structures mixed in
  await page.goto('/#/play/mix?daily=1');
  const types = await playRound(page);
  expect(types.filter((t) => t === 'pick-image' || t === 'pick-word')).toEqual([]);
  expect(types).toContain('drill');
  expect(errors).toEqual([]);
});
