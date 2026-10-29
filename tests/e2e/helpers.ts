import { expect, type Page } from '@playwright/test';

/** A set-up profile. The level floor defaults to everything, so every game has words to use. */
export async function onboarded(page: Page, extra: Record<string, unknown> = {}) {
  await page.goto('/');
  await page.evaluate((extra) => {
    localStorage.setItem('bonbon-settings', JSON.stringify({ state: { onboarded: true, name: 'Test', sound: false, minLevel: 1, ...extra }, version: 5 }));
  }, extra);
  await page.goto('/');
  await expect(page.getByText('Révision du jour')).toBeVisible({ timeout: 20_000 });
  // Onboarding picks themes; skipping it leaves only the default-on textbook verbs, so turn every theme on.
  await page.evaluate(async () => {
    const w = window as unknown as { __bonbon: { db: { decks: { toCollection: () => { modify: (c: object) => Promise<number> } } } } };
    await w.__bonbon.db.decks.toCollection().modify({ active: true });
  });
}

export interface CardRow {
  id: string;
  fr: string;
  en: string;
  gender?: 'm' | 'f';
  kind: string;
}

export async function getCard(page: Page, id: string): Promise<CardRow> {
  return page.evaluate(async (id) => {
    const w = window as unknown as { __bonbon: { db: { cards: { get: (id: string) => Promise<unknown> } } } };
    return (await w.__bonbon.db.cards.get(id)) as CardRow;
  }, id);
}

/** Same tokenisation as src/lib/french.ts sentenceTokens. */
export function sentenceTokens(s: string): string[] {
  return s
    .replace(/[«»"“”]/g, ' ')
    .replace(/[’]/g, "'")
    .split(/\s+/)
    .map((t) => t.replace(/^[¡¿(]+/, '').replace(/[.,!?;:…)]+$/, ''))
    .filter((t) => t.length > 0 && !/^[-–—]$/.test(t));
}

function splitArticle(fr: string) {
  const t = fr.trim();
  const m = t.match(/^(le|la|les|un|une|des)\s+(.+)$/i) || t.match(/^(l['’])\s*(.+)$/i);
  return m ? { article: m[1], noun: m[2] } : { article: '', noun: t };
}

/** Answers whatever question is on screen, correctly unless `wrong` is set. Returns the question type. */
export async function answerCurrent(page: Page, opts: { wrong?: boolean } = {}): Promise<string> {
  const tip = page.getByRole('button', { name: 'D’accord !' });
  const intro = page.getByRole('button', { name: 'Compris !' });
  // Only the live question: one animating out keeps its old phase.
  const wrap = page.locator('[data-qtype][data-phase="ask"]').first();
  for (let k = 0; ; k++) {
    if (k > 80) throw new Error('No question appeared');
    // These slide in with a spring; a click mid-flight can land on the backdrop (which dismisses the tip),
    // so fire the click on the button itself.
    if (await tip.isVisible().catch(() => false)) {
      await tip.dispatchEvent('click');
      await page.waitForTimeout(350);
      continue;
    }
    if (await intro.isVisible().catch(() => false)) {
      await intro.dispatchEvent('click');
      await page.waitForTimeout(350);
      continue;
    }
    if (await wrap.isVisible().catch(() => false)) break;
    await page.waitForTimeout(150);
  }
  const type = (await wrap.getAttribute('data-qtype'))!;
  // grammar questions (dev builds expose the expected answer)
  // (count first: getAttribute on a missing element would wait for it until the test times out)
  const attr = async (name: string) => {
    const el = wrap.locator(`[${name}]`);
    return (await el.count()) ? el.first().getAttribute(name) : null;
  };
  const gAnswer = await attr('data-g-answer');
  const gTiles = await attr('data-g-tiles');
  if (gTiles) {
    const tiles: string[] = JSON.parse(gTiles);
    if (opts.wrong) tiles.reverse();
    for (const t of tiles) await wrap.locator(`.build-pool button[data-tile="${t.replace(/"/g, '\\"')}"]`).first().click();
    await wrap.getByRole('button', { name: /Vérifier/ }).click();
    return type;
  }
  if (gAnswer !== null) {
    const options = wrap.locator('[data-answer-option]');
    if ((await options.count()) > 0) {
      const all = await options.evaluateAll((els) => els.map((e) => e.getAttribute('data-answer-option')));
      const norm = (s: string) => s.toLowerCase().replace(/[’]/g, "'").replace(/\s+/g, ' ').trim();
      let idx = all.findIndex((o) => norm(o ?? '') === norm(gAnswer));
      if (opts.wrong) idx = all.findIndex((_, i) => i !== idx);
      await options.nth(idx).click();
    } else {
      await wrap.getByLabel('Your answer').fill(opts.wrong ? 'zzz' : gAnswer);
      await page.keyboard.press('Enter');
    }
    return type;
  }
  if (type === 'pairs') {
    const ids = await wrap.locator('[data-testid^="pair-fr-"]').evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')!.replace('pair-fr-', '')));
    for (const id of ids) {
      await wrap.getByTestId(`pair-fr-${id}`).click();
      await wrap.getByTestId(`pair-pic-${id}`).click();
    }
    return type;
  }
  const id = (await wrap.locator('[data-target]').first().getAttribute('data-target'))!;
  const card = await getCard(page, id);
  switch (type) {
    case 'pick-image':
    case 'pick-word':
    case 'listen': {
      if (opts.wrong) await wrap.locator(`[data-option]:not([data-option="${id}"])`).first().click();
      else await wrap.locator(`[data-option="${id}"]`).click();
      break;
    }
    case 'gender': {
      const g = opts.wrong ? (card.gender === 'm' ? 'f' : 'm') : card.gender;
      await wrap.locator(`.gender-btn--${g}`).click();
      break;
    }
    case 'spell': {
      const letters = [...splitArticle(card.fr).noun.toLowerCase()].filter((c) => /\p{L}/u.test(c));
      if (opts.wrong) letters.reverse();
      for (const ch of letters) {
        await wrap.locator(`.spell-pool button[data-letter="${ch}"]`).first().click();
      }
      break;
    }
    case 'build': {
      const tokens = sentenceTokens(card.fr);
      if (tokens.length && !/^(Marie|Paul|Paris|Lyon|France)$/.test(tokens[0])) tokens[0] = tokens[0][0].toLowerCase() + tokens[0].slice(1);
      if (opts.wrong) tokens.reverse();
      for (const t of tokens) await wrap.locator(`.build-pool button[data-tile="${t.replace(/"/g, '\\"')}"]`).first().click();
      await wrap.getByRole('button', { name: /Vérifier/ }).click();
      break;
    }
    case 'dictation':
    case 'type': {
      await wrap.getByLabel('Your answer').fill(opts.wrong ? 'zzz' : card.fr);
      await page.keyboard.press('Enter');
      break;
    }
    case 'flash': {
      await wrap.getByRole('button', { name: /Retourner/ }).click();
      await wrap.getByRole('button', { name: opts.wrong ? /Pas encore/ : /Je savais/ }).click();
      break;
    }
    case 'speak': {
      await wrap.getByRole('button', { name: /Passer/ }).click();
      break;
    }
  }
  return type;
}

/** Plays a whole round until the results screen; returns the question types it answered. */
export async function playRound(page: Page, opts: { wrongEvery?: number } = {}): Promise<string[]> {
  const types: string[] = [];
  for (let i = 0; i < 60; i++) {
    if (await page.locator('.results').isVisible().catch(() => false)) return types;
    const onQuestion = await page.locator('[data-qtype], button:has-text("Compris !"), button:has-text("D’accord !")').first().isVisible().catch(() => false);
    if (!onQuestion) {
      await page.waitForTimeout(200);
      continue;
    }
    types.push(await answerCurrent(page, { wrong: !!opts.wrongEvery && i % opts.wrongEvery === opts.wrongEvery - 1 }));
    await page.locator('.feedback').waitFor({ state: 'visible', timeout: 8_000 });
    const cont = page.getByRole('button', { name: /Continuer|Voir mon score/ });
    if (await cont.isVisible().catch(() => false)) await cont.click();
    await page.locator('.feedback').waitFor({ state: 'hidden', timeout: 8_000 });
  }
  await expect(page.locator('.results')).toBeVisible();
  return types;
}
