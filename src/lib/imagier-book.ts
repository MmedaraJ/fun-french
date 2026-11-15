// Her picture dictionary's drawings, from her own copy of the book, on her device only: the PDF
// she picks is read here (nothing is uploaded), each page is kept for the games played on the page,
// and every word's drawing is cut out (its label painted over) and becomes the picture of its card.
// Bonbon itself ships only the words and where they are on the pages.
import { IMAGIER_PAGES, IMAGIER_VERSION, loadImagierWords, type ImagierWord } from '../data/imagier';
import type { Box } from '../types';
import { db, setMeta } from './db';
import { BOOK_KEY, cropImageId, ensureImagierSeeded, pageImageId, type BookInfo } from './imagier';
import { fileToImage, forgetImageUrl } from './images';
import { openPdf, PdfError, type PdfDoc } from './pdf';

export class BookError extends Error {}

export interface BookProgress {
  /** 'check': is it the book? 'pages': reading its pages; 'drawings': cutting out the drawings. */
  phase: 'check' | 'pages' | 'drawings';
  done: number;
  total: number;
}

/** The pages of the book are 739 × 989 points; its drawings are cut at 3 pixels a point, the pages kept at 2. */
const CUT_SCALE = 3;
const PAGE_SCALE = 2;
/** Side of a drawing's square picture, in pixels. */
const CROP_SIZE = 288;

/** Is this PDF her picture dictionary, the copy the words were mapped on? */
export async function isImagierBook(doc: PdfDoc): Promise<boolean> {
  if (doc.pages !== 84) return false;
  const { width, height } = await doc.size(6);
  if (Math.abs(width - 739) > 3 || Math.abs(height - 989) > 3) return false;
  // the scan's text layer on the first chapter's page (it misses a word here and there)
  const text = (await doc.read(6)).lines.map((l) => l.text).join(' ').toLowerCase();
  return ['calendrier', 'ciseaux', 'institutrice', 'aquarium', 'calculatrice'].filter((w) => text.includes(w)).length >= 3;
}

/** WebP where the browser can write it (smaller), JPEG elsewhere. */
async function encode(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  const as = (type: string) => new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
  const webp = await as('image/webp');
  if (webp && webp.type === 'image/webp') return webp;
  const jpeg = await as('image/jpeg');
  if (!jpeg) throw new BookError('Bonbon couldn’t save a picture. Is the device out of space?');
  return jpeg;
}

/** A drawing on a white square, a little margin around it. */
function cropSquare(src: HTMLCanvasElement, b: Box, s: number): HTMLCanvasElement {
  const [x0, y0, x1, y1] = b;
  const w = (x1 - x0) * s;
  const h = (y1 - y0) * s;
  const side = Math.max(w, h) / 0.9;
  const out = document.createElement('canvas');
  out.width = CROP_SIZE;
  out.height = CROP_SIZE;
  const g = out.getContext('2d')!;
  g.fillStyle = '#fff';
  g.fillRect(0, 0, CROP_SIZE, CROP_SIZE);
  g.imageSmoothingQuality = 'high';
  const k = CROP_SIZE / side;
  g.drawImage(src, x0 * s, y0 * s, w, h, (CROP_SIZE - w * k) / 2, (CROP_SIZE - h * k) / 2, w * k, h * k);
  return out;
}

/** The paper around a box: the median colour of a thin frame just outside it. */
function paperAround(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): string {
  const W = g.canvas.width;
  const H = g.canvas.height;
  const x0 = Math.max(0, Math.floor(x - 3));
  const y0 = Math.max(0, Math.floor(y - 3));
  const x1 = Math.min(W, Math.ceil(x + w + 3));
  const y1 = Math.min(H, Math.ceil(y + h + 3));
  if (x1 - x0 < 2 || y1 - y0 < 2) return '#fff';
  const data = g.getImageData(x0, y0, x1 - x0, y1 - y0).data;
  const cw = x1 - x0;
  const r: number[] = [];
  const gr: number[] = [];
  const b: number[] = [];
  for (let j = 0; j < y1 - y0; j++) {
    for (let i = 0; i < cw; i++) {
      // the frame only, not the label inside it
      if (i > 2 && i < cw - 3 && j > 2 && j < y1 - y0 - 3) continue;
      const k = (j * cw + i) * 4;
      r.push(data[k]);
      gr.push(data[k + 1]);
      b.push(data[k + 2]);
    }
  }
  const med = (a: number[]) => a.sort((m, n) => m - n)[a.length >> 1] ?? 255;
  // ink on the frame (a drawing next to the label) mustn't darken it: never darker than light paper
  return `rgb(${Math.max(225, med(r))}, ${Math.max(225, med(gr))}, ${Math.max(220, med(b))})`;
}

/** Paints over every label on a page (all chapters'), in the colour of the paper, so no crop shows a word. */
function blankLabels(canvas: HTMLCanvasElement, words: ImagierWord[], s: number) {
  const g = canvas.getContext('2d', { willReadFrequently: true })!;
  for (const w of words) {
    for (const [x0, y0, x1, y1] of w.spot.l) {
      const box = [(x0 - 1.5) * s, (y0 - 1.5) * s, (x1 - x0 + 3) * s, (y1 - y0 + 3) * s] as const;
      g.fillStyle = paperAround(g, ...box);
      g.fillRect(...box);
    }
  }
}

function byPage(words: ImagierWord[]): Map<number, ImagierWord[]> {
  const out = new Map<number, ImagierWord[]>();
  for (const w of words) {
    const list = out.get(w.spot.p) ?? [];
    list.push(w);
    out.set(w.spot.p, list);
  }
  return out;
}

async function putImage(id: string, blob: Blob) {
  await db.images.put({ id, blob, createdAt: Date.now() });
  forgetImageUrl(id);
}

/** Cuts a page's drawings out of a canvas of it (`s` pixels a point); returns the bytes stored. */
async function cutPage(canvas: HTMLCanvasElement, words: ImagierWord[], s: number): Promise<number> {
  blankLabels(canvas, words, s);
  let bytes = 0;
  for (const w of words) {
    const crop = cropSquare(canvas, w.spot.b, s);
    const blob = await encode(crop, 0.84);
    crop.width = 0;
    crop.height = 0;
    await putImage(cropImageId(w.id), blob);
    bytes += blob.size;
  }
  return bytes;
}

/** Points every word's card at its drawing (without counting as her edit). */
async function linkCards(words: ImagierWord[]) {
  await db.transaction('rw', db.cards, async () => {
    for (const w of words) await db.cards.update(w.id, { imageId: cropImageId(w.id) });
  });
}

/**
 * Reads her copy of the book: checks it's the right one, keeps each chapter page, and cuts out
 * every drawing. Throws BookError (in plain words) when the file isn't the book.
 */
export async function importBook(file: Blob, onProgress?: (p: BookProgress) => void, signal?: AbortSignal): Promise<BookInfo> {
  onProgress?.({ phase: 'check', done: 0, total: 1 });
  let doc: PdfDoc;
  try {
    doc = await openPdf(file);
  } catch (e) {
    throw new BookError(e instanceof PdfError ? e.message : 'This file couldn’t be opened as a PDF.');
  }
  try {
    if (!(await isImagierBook(doc).catch(() => false))) {
      throw new BookError('Ce n’est pas le bon livre. This PDF isn’t the picture dictionary Mon imagier was made from: its pages don’t match.');
    }
    await ensureImagierSeeded();
    const words = byPage(await loadImagierWords());
    const pages = IMAGIER_PAGES;
    let bytes = 0;
    for (const [i, p] of pages.entries()) {
      if (signal?.aborted) throw new DOMException('Stopped', 'AbortError');
      onProgress?.({ phase: 'pages', done: i, total: pages.length });
      const big = await doc.draw(p, CUT_SCALE);
      try {
        // the page itself, for the games played on it
        const small = document.createElement('canvas');
        small.width = Math.round((big.width * PAGE_SCALE) / CUT_SCALE);
        small.height = Math.round((big.height * PAGE_SCALE) / CUT_SCALE);
        const g = small.getContext('2d')!;
        g.imageSmoothingQuality = 'high';
        g.drawImage(big, 0, 0, small.width, small.height);
        const pageBlob = await encode(small, 0.82);
        small.width = 0;
        small.height = 0;
        await putImage(pageImageId(p), pageBlob);
        bytes += pageBlob.size;
        // and its drawings, cut from the sharper drawing of the page
        bytes += await cutPage(big, words.get(p) ?? [], CUT_SCALE);
      } finally {
        big.width = 0;
        big.height = 0;
      }
      // let the progress bar paint
      await new Promise((r) => setTimeout(r, 0));
    }
    const all = [...words.values()].flat();
    await linkCards(all);
    const info: BookInfo = { importedAt: Date.now(), version: IMAGIER_VERSION, pages, words: all.length, bytes };
    await setMeta(BOOK_KEY, info);
    onProgress?.({ phase: 'drawings', done: 1, total: 1 });
    return info;
  } finally {
    await doc.close().catch(() => {});
  }
}

/**
 * The word list changed (a newer Bonbon): cut the drawings again from the pages already on the
 * device, so she doesn't need the PDF again.
 */
export async function recutDrawings(onProgress?: (p: BookProgress) => void): Promise<BookInfo | null> {
  await ensureImagierSeeded();
  const words = byPage(await loadImagierWords());
  const pages = [...words.keys()].sort((a, b) => a - b);
  let bytes = 0;
  for (const [i, p] of pages.entries()) {
    onProgress?.({ phase: 'drawings', done: i, total: pages.length });
    const row = await db.images.get(pageImageId(p));
    if (!row) return null;
    bytes += row.blob.size;
    const img = await fileToImage(row.blob);
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    canvas.getContext('2d')!.drawImage(img, 0, 0);
    try {
      bytes += await cutPage(canvas, words.get(p) ?? [], img.naturalWidth / 739);
    } finally {
      canvas.width = 0;
      canvas.height = 0;
    }
  }
  const all = [...words.values()].flat();
  await linkCards(all);
  const info: BookInfo = { importedAt: Date.now(), version: IMAGIER_VERSION, pages, words: all.length, bytes };
  await setMeta(BOOK_KEY, info);
  return info;
}

/** Takes her book's pages and drawings off the device; the words stay, with their emoji. */
export async function removeBook(): Promise<void> {
  const ids = (await db.images.toCollection().primaryKeys()).map(String).filter((id) => id.startsWith('ipage-') || id.startsWith('icrop-'));
  await db.transaction('rw', db.images, db.cards, db.meta, async () => {
    await db.images.bulkDelete(ids);
    const cards = await db.cards.where('deckId').startsWith('img-').toArray();
    for (const c of cards) if (c.imageId?.startsWith('icrop-')) await db.cards.update(c.id, { imageId: undefined });
    await db.meta.delete(BOOK_KEY);
  });
  ids.forEach(forgetImageUrl);
}
