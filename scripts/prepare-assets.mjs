// Copies third-party runtime assets out of node_modules into public/vendor and
// builds the compact emoji search index used by the emoji picker.
// Runs before `vite` and `vite build`, so nothing generated here is committed.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const nm = (...p) => path.join(root, 'node_modules', ...p);
const out = (...p) => path.join(root, ...p);

function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const s = fs.statSync(src);
  if (fs.existsSync(dest) && fs.statSync(dest).size === s.size) return false;
  fs.copyFileSync(src, dest);
  return true;
}

// 1. Twemoji SVGs (CC-BY 4.0) -> public/vendor/twemoji
const twemojiSrc = nm('@twemoji', 'svg');
const twemojiDest = out('public', 'vendor', 'twemoji');
fs.mkdirSync(twemojiDest, { recursive: true });
const svgs = fs.readdirSync(twemojiSrc).filter((f) => f.endsWith('.svg'));
let copied = 0;
for (const f of svgs) if (copyFile(path.join(twemojiSrc, f), path.join(twemojiDest, f))) copied++;
console.log(`[assets] twemoji: ${svgs.length} svgs (${copied} copied)`);

// 2. Tesseract OCR (Apache-2.0): worker, LSTM-only cores, French language data
const tessDest = out('public', 'vendor', 'tesseract');
copyFile(nm('tesseract.js', 'dist', 'worker.min.js'), path.join(tessDest, 'worker.min.js'));
for (const f of [
  'tesseract-core-lstm.wasm.js',
  'tesseract-core-simd-lstm.wasm.js',
  'tesseract-core-relaxedsimd-lstm.wasm.js',
]) {
  copyFile(nm('tesseract.js-core', f), path.join(tessDest, 'core', f));
}
copyFile(
  nm('@tesseract.js-data', 'fra', '4.0.0_best_int', 'fra.traineddata.gz'),
  path.join(tessDest, 'lang', 'fra.traineddata.gz'),
);
console.log('[assets] tesseract: worker, cores, fra data');

// 3. Emoji search index: [emoji, name, groupIndex, keywords] for every emoji Twemoji can draw
const available = new Set(svgs.map((f) => f.replace(/\.svg$/, '')));
const byEmoji = JSON.parse(fs.readFileSync(nm('unicode-emoji-json', 'data-by-emoji.json'), 'utf8'));
const keywords = JSON.parse(fs.readFileSync(nm('emojilib', 'dist', 'emoji-en-US.json'), 'utf8'));

function codepoints(str) {
  return [...str].map((c) => c.codePointAt(0).toString(16));
}
export function twemojiFile(emoji) {
  const s = emoji.includes('‍') ? emoji : emoji.replace(/️/g, '');
  return codepoints(s).join('-');
}

const groups = [];
const rows = [];
for (const [emoji, meta] of Object.entries(byEmoji)) {
  let file = twemojiFile(emoji);
  if (!available.has(file)) {
    const alt = codepoints(emoji.replace(/️/g, '')).join('-');
    if (!available.has(alt)) continue;
    file = alt;
  }
  if (meta.group === 'Component') continue;
  let gi = groups.indexOf(meta.group);
  if (gi < 0) gi = groups.push(meta.group) - 1;
  const kw = (keywords[emoji] || []).filter((k) => /^[a-z0-9_ ]+$/i.test(k));
  rows.push([emoji, meta.name, gi, [...new Set(kw.map((k) => k.replace(/_/g, ' ')))].join('|')]);
}
fs.mkdirSync(out('src', 'generated'), { recursive: true });
fs.writeFileSync(out('src', 'generated', 'emoji-data.json'), JSON.stringify({ groups, rows }));
console.log(`[assets] emoji index: ${rows.length} emoji in ${groups.length} groups`);
