// Visual QA helper: screenshots of the main screens at phone and desktop sizes.
// Usage: node scripts/shots.mjs <baseUrl> <outDir> [route ...]
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const [base = 'http://localhost:5199', out = 'shots', ...routes] = process.argv.slice(2);
const list = routes.length ? routes : ['/', '/words', '/add', '/stats', '/settings'];
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
for (const [label, viewport] of [
  ['phone', { width: 390, height: 844 }],
  ['desktop', { width: 1280, height: 800 }],
]) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: label === 'phone' ? 2 : 1 });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));
  await page.goto(base + '/');
  await page.evaluate(() =>
    localStorage.setItem('bonbon-settings', JSON.stringify({ state: { onboarded: true, name: 'Claire', sound: false }, version: 1 })),
  );
  for (const r of list) {
    await page.goto(base + '/#' + r);
    await page.waitForTimeout(1600);
    const file = path.join(out, `${label}-${r.replace(/[^a-z0-9]+/gi, '_') || 'home'}.png`);
    await page.screenshot({ path: file, fullPage: false });
    console.log(file);
  }
  await ctx.close();
}
await browser.close();
