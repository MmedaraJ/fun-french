import { expect, type Page } from '@playwright/test';

export async function onboarded(page: Page, extra: Record<string, unknown> = {}) {
  await page.goto('/');
  await page.evaluate((extra) => {
    localStorage.setItem('bonbon-settings', JSON.stringify({ state: { onboarded: true, name: 'Test', sound: false, ...extra }, version: 1 }));
  }, extra);
  await page.goto('/');
  await expect(page.getByText('Révision du jour')).toBeVisible({ timeout: 20_000 });
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
      if (opts.wrong) tokens.reverse();
      for (const t of tokens) await wrap.locator(`.build-pool button[data-tile="${t.replace(/"/g, '\\"')}"]`).first().click();
      await wrap.getByRole('button', { name: /Vérifier/ }).click();
      break;
    }
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

/** Plays a whole round until the results screen. */
export async function playRound(page: Page, opts: { wrongEvery?: number } = {}) {
  for (let i = 0; i < 60; i++) {
    if (await page.locator('.results').isVisible().catch(() => false)) return;
    const onQuestion = await page.locator('[data-qtype], button:has-text("Compris !"), button:has-text("D’accord !")').first().isVisible().catch(() => false);
    if (!onQuestion) {
      await page.waitForTimeout(200);
      continue;
    }
    await answerCurrent(page, { wrong: !!opts.wrongEvery && i % opts.wrongEvery === opts.wrongEvery - 1 });
    await page.locator('.feedback').waitFor({ state: 'visible', timeout: 8_000 });
    const cont = page.getByRole('button', { name: /Continuer|Voir mon score/ });
    if (await cont.isVisible().catch(() => false)) await cont.click();
    await page.locator('.feedback').waitFor({ state: 'hidden', timeout: 8_000 });
  }
  await expect(page.locator('.results')).toBeVisible();
}
