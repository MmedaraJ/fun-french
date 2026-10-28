import { expect, test } from '@playwright/test';
import { onboarded, playRound } from './helpers';

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
