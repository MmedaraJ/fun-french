// On-device French text recognition with tesseract.js. The worker, WASM core
// and French model are self-hosted under /vendor/tesseract (see scripts/prepare-assets.mjs).
import { fileToImage } from './images';

export interface OcrProgress {
  /** Overall progress 0..1 across all pages. */
  progress: number;
  status: string;
  /** 1-based page being read, and how many pages there are. */
  page: number;
  pages: number;
}

const STAGES: Record<string, [number, number, string]> = {
  'loading tesseract core': [0, 0.25, 'Réveil du scanner…'],
  'initializing tesseract': [0.25, 0.3, 'Réveil du scanner…'],
  'loading language traineddata': [0.3, 0.45, 'Chargement du français…'],
  'loading language traineddata (from cache)': [0.3, 0.45, 'Chargement du français…'],
  'initializing api': [0.45, 0.5, 'Presque prêt…'],
  'recognizing text': [0.5, 1, 'Lecture du texte…'],
};

/** Absolute URL under the app's base (blob workers can't resolve relative paths). */
function vendorUrl(path: string): string {
  return new URL(`${import.meta.env.BASE_URL}vendor/tesseract/${path}`, window.location.href).href;
}

/**
 * Joins words hyphenated across lines and drops empty/garbage lines. Wide gaps
 * (three or more spaces) are kept: they separate printed columns.
 */
export function cleanOcrText(text: string): string {
  return text
    .replace(/\r/g, '')
    .replace(/(\p{L})-\n(\p{Ll})/gu, '$1$2')
    .split('\n')
    .map((l) =>
      l
        .replace(/[|_~^]+/g, ' ')
        .replace(/[ \t]{3,}/g, '\u0000')
        .replace(/[ \t]+/g, ' ')
        .replace(/\u0000/g, '   ')
        .trim(),
    )
    .filter((l) => l.length > 1 && /\p{L}{2,}/u.test(l))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Grey paper and light grey print are hard for the recogniser: go greyscale,
 * stretch the contrast so paper turns white and ink black, darken mid-greys,
 * and scale small photos up (Tesseract likes tall letters).
 */
export async function prepareForOcr(image: Blob): Promise<Blob> {
  const img = await fileToImage(image);
  const long = Math.max(img.naturalWidth, img.naturalHeight);
  const scale = long < 1800 ? Math.min(2.5, 2400 / long) : long > 4200 ? 4200 / long : 1;
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const g = canvas.getContext('2d', { willReadFrequently: true });
  if (!g) return image;
  g.imageSmoothingQuality = 'high';
  g.drawImage(img, 0, 0, w, h);
  const frame = g.getImageData(0, 0, w, h);
  const px = frame.data;
  const hist = new Uint32Array(256);
  for (let i = 0; i < px.length; i += 4) {
    const l = (px[i] * 299 + px[i + 1] * 587 + px[i + 2] * 114) / 1000;
    px[i] = l;
    hist[l | 0]++;
  }
  const total = w * h;
  let acc = 0;
  let lo = 0;
  for (let v = 0; v < 256; v++) {
    acc += hist[v];
    if (acc >= total * 0.005) {
      lo = v;
      break;
    }
  }
  // Paper is the bright majority: whatever the brightest ~40% of pixels are becomes white.
  acc = 0;
  let hi = 255;
  for (let v = 255; v >= 0; v--) {
    acc += hist[v];
    if (acc >= total * 0.4) {
      hi = v;
      break;
    }
  }
  if (hi - lo < 24) return image;
  const range = hi - lo;
  const lut = new Uint8ClampedArray(256);
  for (let v = 0; v < 256; v++) {
    const t = Math.min(1, Math.max(0, (v - lo) / range));
    lut[v] = Math.round(Math.pow(t, 1.8) * 255);
  }
  for (let i = 0; i < px.length; i += 4) {
    const o = lut[px[i] | 0];
    px[i] = px[i + 1] = px[i + 2] = o;
  }
  g.putImageData(frame, 0, 0);
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b ?? image), 'image/png'));
}

/** Reads French text from several photos, one after the other, with one recogniser. */
export async function recognizePages(images: Blob[], onProgress?: (p: OcrProgress) => void): Promise<string[]> {
  const pages = images.length;
  if (!pages) return [];
  const { createWorker, OEM } = await import('tesseract.js');
  let page = 0;
  let loaded = false;
  const report = (pageProgress: number, status: string) =>
    onProgress?.({ progress: Math.min(1, (page + pageProgress) / pages), status, page: page + 1, pages });
  report(0.02, 'Réveil du scanner…');
  const worker = await createWorker('fra', OEM.LSTM_ONLY, {
    workerPath: vendorUrl('worker.min.js'),
    corePath: vendorUrl('core'),
    langPath: vendorUrl('lang'),
    logger: (m) => {
      const stage = STAGES[m.status];
      if (!stage) return;
      const [from, to, label] = stage;
      // After the first page, loading is done: a page is just "recognizing text".
      if (loaded && m.status !== 'recognizing text') return;
      const p = loaded ? m.progress || 0 : from + (to - from) * (m.progress || 0);
      report(p, label);
    },
  });
  try {
    // Keep wide gaps between words: they show where one printed column ends.
    await worker.setParameters({ preserve_interword_spaces: '1' });
    const out: string[] = [];
    for (page = 0; page < pages; page++) {
      report(loaded ? 0.02 : 0.5, loaded ? 'Préparation de la page…' : 'Lecture du texte…');
      const prepared = await prepareForOcr(images[page]);
      const { data } = await worker.recognize(prepared);
      loaded = true;
      out.push(cleanOcrText(data.text ?? ''));
    }
    page = pages - 1;
    report(1, 'Terminé !');
    return out;
  } finally {
    await worker.terminate();
  }
}

/** Reads French text from one image. */
export async function recognizeFrench(image: Blob, onProgress?: (p: OcrProgress) => void): Promise<string> {
  const [text] = await recognizePages([image], onProgress);
  return text ?? '';
}
