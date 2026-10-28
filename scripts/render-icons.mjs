#!/usr/bin/env node
/**
 * Builds Bonbon's app icons from the Coco mascot.
 *
 * 1. Loads src/components/Mascot.tsx through Vite (runnerImport) and takes the
 *    static mascotSvgMarkup({ mood: 'happy', color: 'pink' }), so the icons
 *    always match the in-app character.
 * 2. Writes public/icons/icon.svg: Coco on a rounded #FF5E7E square with a
 *    subtle lighter circle behind.
 * 3. Renders the PNGs with Playwright (Chromium):
 *      icon-192.png, icon-512.png   rounded design, transparent corners
 *      apple-touch-icon.png (180)   full-bleed square, opaque
 *      icon-maskable-512.png        full-bleed, Coco inside the central 80% safe zone
 *
 * Usage: node scripts/render-icons.mjs
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { runnerImport } from 'vite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'public', 'icons');

const BG = '#FF5E7E';
const GLOW = '#FF7A95'; // the subtle lighter circle
const SIZE = 512;

// Coco's artwork lives in a 200×200 viewBox; this is the centre of the happy pose (arms up, shadow included).
const ART_CENTER = { x: 100, y: 107 };

const { module: mascot } = await runnerImport(path.join(root, 'src/components/Mascot.tsx'), {
  root,
  configFile: false,
  logLevel: 'error',
});
const markup = mascot.mascotSvgMarkup({ mood: 'happy', color: 'pink' });
const art = markup.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
// The markup is <g class="coco-shadow">…</g><g class="coco-body">…</g>: outline the character, not its shadow.
const split = art.match(/^(<g class="coco-shadow">.*?<\/g>)(<g class="coco-body">.*)$/s);
if (!split) throw new Error('Unexpected mascotSvgMarkup structure');
const [, shadow, body] = split;

/**
 * White die-cut "sticker" outline, so the pink character stands out on the pink icon.
 * Blur the silhouette and threshold it back to a crisp, rounded border (~5 art units).
 */
const STICKER_FILTER =
  '<filter id="sticker" x="-15%" y="-15%" width="130%" height="130%" color-interpolation-filters="sRGB">' +
  '<feGaussianBlur in="SourceAlpha" stdDeviation="3.8"/>' +
  '<feComponentTransfer result="outline"><feFuncA type="linear" slope="24" intercept="-1.4"/></feComponentTransfer>' +
  '<feFlood flood-color="#FFFFFF"/>' +
  '<feComposite in2="outline" operator="in"/>' +
  '<feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>' +
  '</filter>';

/**
 * @param {{ rounded: boolean, scale: number, glow: number }} o
 *   rounded: rounded-square background (else full-bleed square)
 *   scale:   artwork scale (200-unit art → px in the 512 canvas)
 *   glow:    radius of the lighter circle
 */
function iconSvg({ rounded, scale, glow }) {
  const c = SIZE / 2;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}" width="${SIZE}" height="${SIZE}">`,
    `<defs>${STICKER_FILTER}</defs>`,
    `<rect width="${SIZE}" height="${SIZE}"${rounded ? ' rx="112"' : ''} fill="${BG}"/>`,
    `<circle cx="${c}" cy="${c}" r="${glow}" fill="${GLOW}"/>`,
    `<g transform="translate(${c} ${c + 4}) scale(${scale}) translate(${-ART_CENTER.x} ${-ART_CENTER.y})">`,
    shadow,
    `<g filter="url(#sticker)">${body}</g>`,
    `</g>`,
    `</svg>`,
  ].join('');
}

const rounded = iconSvg({ rounded: true, scale: 2.05, glow: 200 });
const fullBleed = iconSvg({ rounded: false, scale: 2.05, glow: 200 });
// Maskable: everything that matters must sit inside a circle of radius 0.4 × 512 ≈ 205 px.
const maskable = iconSvg({ rounded: false, scale: 1.78, glow: 182 });

await mkdir(outDir, { recursive: true });
await writeFile(path.join(outDir, 'icon.svg'), `${rounded}\n`);

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  const render = async (svg, size, file, { transparent }) => {
    await page.setViewportSize({ width: size, height: size });
    const sized = svg.replace(`width="${SIZE}" height="${SIZE}"`, `width="${size}" height="${size}"`);
    await page.setContent(
      `<!doctype html><html><head><style>html,body{margin:0;background:${transparent ? 'transparent' : BG}}svg{display:block}</style></head><body>${sized}</body></html>`,
    );
    await page.screenshot({
      path: path.join(outDir, file),
      omitBackground: transparent,
      clip: { x: 0, y: 0, width: size, height: size },
    });
    console.log(`  ✓ public/icons/${file} (${size}×${size})`);
  };

  console.log('  ✓ public/icons/icon.svg');
  await render(rounded, 192, 'icon-192.png', { transparent: true });
  await render(rounded, 512, 'icon-512.png', { transparent: true });
  await render(fullBleed, 180, 'apple-touch-icon.png', { transparent: false });
  await render(maskable, 512, 'icon-maskable-512.png', { transparent: false });
} finally {
  await browser.close();
}
