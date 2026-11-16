// Her picture dictionary's drawings, from her own copy of the book, on her device only: the PDF
// she picks is read here (nothing is uploaded), each page is kept for the games played on the page,
// and every word's drawing is cut out (its label painted over) and becomes the picture of its card.
// Bonbon itself ships only the words and where they are on the pages.
import { IMAGIER_CUT, IMAGIER_PAGES, loadImagierWords, type ImagierWord } from '../data/imagier';
import type { Box } from '../types';
import { db, setMeta } from './db';
import { BOOK_KEY, cropImageId, ensureImagierSeeded, pageImageId, type BookInfo } from './imagier';
import { fileToImage, forgetImageUrl } from './images';
import { openPdf, PdfError, type PdfDoc } from './pdf';

export class BookError extends Error {
  /** It looked like a book with the right number of pages, but didn't match: she can try it anyway. */
  canForce = false;
  /** What was found, in plain words, for the message. */
  details = '';
}

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

/** The copy Bonbon's word list was mapped on: 84 pages, its chapter pages 739 × 989 points. */
const BOOK_PAGES = 84;
const BOOK_W = 739;
const BOOK_H = 989;

/**
 * How her PDF lines up with the book Bonbon knows: her page = book page + offset, and her page is
 * sx × sy times the size of the book's (a copy re-saved by another app can change both).
 */
export interface BookFit {
  offset: number;
  sx: number;
  sy: number;
}

export interface BookCheck {
  ok: boolean;
  /** How to line her pages up with the book's: the found fit, or the best guess. */
  fit: BookFit;
  /** The exact file the words were mapped on. */
  exact: boolean;
  pages: number;
  /** Size of the page where the first chapter is (or would be), in points. */
  width: number;
  height: number;
  /** Chapter titles found in the text where they belong. */
  anchors: number;
  /** Plain-words summary of what was found, for messages. */
  details: string;
}

/** Chapter titles on their pages: where they turn up in her PDF says how her pages line up. */
const ANCHORS: [number, string[]][] = [
  [6, ['our classroom', 'en classe']],
  [20, ['in the city', 'en ville']],
  [44, ['at the zoo', 'au zoo']],
  [62, ['numbers', 'les nombres']],
];

const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[’`]/g, "'")
    .replace(/\s+/g, ' ');

/**
 * Is this PDF her picture dictionary, and how do its pages line up with the book's? The page
 * count and size say it for the copy Bonbon was mapped on; for another copy (re-saved, a page
 * added in front), the chapter titles in its text find the pages and their size gives the scale.
 * A page whose text can't be read is just less evidence, never "the wrong book".
 */
export async function checkBook(doc: PdfDoc): Promise<BookCheck> {
  const pages = doc.pages;
  const shifts: number[] = [];
  for (const [page, keys] of ANCHORS) {
    for (const d of [0, 1, -1, 2, -2, 3, -3, 4, -4, 5, -5, 6, -6, 8, -8, 10, -10]) {
      const q = page + d;
      if (q < 1 || q > pages) continue;
      let text: string;
      try {
        text = fold((await doc.read(q)).lines.map((l) => l.text).join(' '));
      } catch {
        continue;
      }
      if (keys.every((k) => text.includes(k))) {
        shifts.push(d);
        break;
      }
    }
  }
  // the shift most of the titles agree on
  const counts = new Map<number, number>();
  for (const d of shifts) counts.set(d, (counts.get(d) ?? 0) + 1);
  const best = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  const offset = best ? best[0] : pages === BOOK_PAGES ? 0 : NaN;
  const first = 6 + (Number.isNaN(offset) ? 0 : offset);
  let width = 0;
  let height = 0;
  try {
    if (first >= 1 && first <= pages) ({ width, height } = await doc.size(first));
  } catch {
    /* no size: no fit */
  }
  const sx = width / BOOK_W;
  const sy = height / BOOK_H;
  const exact = pages === BOOK_PAGES && offset === 0 && Math.abs(width - BOOK_W) <= 3 && Math.abs(height - BOOK_H) <= 3;
  // the same pages, perhaps scaled: the shape of the page must match, and every chapter page must be there
  const sameShape = width > 0 && height > 0 && Math.abs(sx / sy - 1) < 0.04;
  const allThere = !Number.isNaN(offset) && IMAGIER_PAGES.every((p) => p + offset >= 1 && p + offset <= pages);
  const evidence = exact || (best !== undefined && (best[1] >= 2 || pages === BOOK_PAGES));
  const ok = exact || (sameShape && allThere && evidence);
  const details =
    `Ce PDF : ${pages} pages` +
    (width ? `, ${Math.round(width)} × ${Math.round(height)} pt` : '') +
    ` · titres de chapitre trouvés : ${shifts.length}/${ANCHORS.length}. ` +
    `Le livre de Bonbon : ${BOOK_PAGES} pages, ${BOOK_W} × ${BOOK_H} pt.`;
  return {
    ok,
    exact,
    fit: { offset: Number.isNaN(offset) ? 0 : offset, sx: sx || 1, sy: sy || 1 },
    pages,
    width,
    height,
    anchors: shifts.length,
    details,
  };
}

/** Is this PDF her picture dictionary? */
export async function isImagierBook(doc: PdfDoc): Promise<boolean> {
  return (await checkBook(doc)).ok;
}

/**
 * Draws a book page from her PDF on a canvas at `scale` pixels a book point, whatever her copy's
 * page size: her page is drawn to the book's page size (both ways) so every box falls in place.
 */
async function drawBookPage(doc: PdfDoc, page: number, fit: BookFit, scale: number): Promise<HTMLCanvasElement> {
  const canvas = await doc.draw(page + fit.offset, scale / fit.sx);
  const W = Math.round(BOOK_W * scale);
  const H = Math.round(BOOK_H * scale);
  if (Math.abs(canvas.width - W) <= 1 && Math.abs(canvas.height - H) <= 1) return canvas;
  const out = document.createElement('canvas');
  out.width = W;
  out.height = H;
  const g = out.getContext('2d')!;
  g.fillStyle = '#fff';
  g.fillRect(0, 0, W, H);
  g.imageSmoothingQuality = 'high';
  g.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, W, H);
  canvas.width = 0;
  canvas.height = 0;
  return out;
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

/** Drawings cut in this import, and how many of them have a drawing in them (a copy that lines up badly cuts blank paper). */
const inkStats = { cut: 0, inked: 0 };

function hasInk(crop: HTMLCanvasElement): boolean {
  const data = crop.getContext('2d')!.getImageData(0, 0, crop.width, crop.height).data;
  let dark = 0;
  for (let i = 0; i < data.length; i += 16) if (Math.min(data[i], data[i + 1], data[i + 2]) < 170) dark++;
  return dark / (data.length / 16) > 0.01;
}

/** Cuts a page's drawings out of a canvas of it (`s` pixels a point); returns the bytes stored. */
async function cutPage(canvas: HTMLCanvasElement, words: ImagierWord[], s: number): Promise<number> {
  blankLabels(canvas, words, s);
  let bytes = 0;
  for (const w of words) {
    const crop = cropSquare(canvas, w.spot.b, s);
    inkStats.cut++;
    if (hasInk(crop)) inkStats.inked++;
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
export async function importBook(file: Blob, onProgress?: (p: BookProgress) => void, signal?: AbortSignal, opts: { force?: boolean } = {}): Promise<BookInfo> {
  onProgress?.({ phase: 'check', done: 0, total: 1 });
  let doc: PdfDoc;
  try {
    doc = await openPdf(file);
  } catch (e) {
    throw new BookError(e instanceof PdfError ? e.message : 'This file couldn’t be opened as a PDF.');
  }
  try {
    const check = await checkBook(doc);
    if (!check.ok && !opts.force) {
      const err = new BookError(
        check.pages < 40
          ? 'Ce PDF ne ressemble pas à ton imagier. It has far fewer pages than the picture dictionary.'
          : 'Ce PDF ne correspond pas tout à fait à l’imagier que Bonbon connaît. If it is your picture dictionary, you can still try: Bonbon will line its pages up as best it can.',
      );
      err.details = check.details;
      err.canForce = check.pages >= 40;
      throw err;
    }
    const fit = check.fit;
    await ensureImagierSeeded();
    const words = byPage(await loadImagierWords());
    const pages = IMAGIER_PAGES;
    let bytes = 0;
    inkStats.cut = 0;
    inkStats.inked = 0;
    for (const [i, p] of pages.entries()) {
      if (signal?.aborted) throw new DOMException('Stopped', 'AbortError');
      onProgress?.({ phase: 'pages', done: i, total: pages.length });
      const big = await drawBookPage(doc, p, fit, CUT_SCALE);
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
    const info: BookInfo = {
      importedAt: Date.now(),
      version: IMAGIER_CUT,
      pages,
      words: all.length,
      bytes,
      ...(check.exact ? {} : { fit, inked: inkStats.inked / Math.max(1, inkStats.cut) }),
    };
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
export async function recutDrawings(onProgress?: (p: BookProgress) => void, onlyMissing = false): Promise<BookInfo | null> {
  await ensureImagierSeeded();
  const all = await loadImagierWords();
  // only the words without a drawing (a word whose spelling was corrected is a new card)
  const missing = onlyMissing ? new Set((await db.cards.where('deckId').startsWith('img-').filter((c) => !c.imageId).toArray()).map((c) => c.id)) : null;
  const todo = byPage(missing ? all.filter((w) => missing.has(w.id)) : all);
  const pages = [...todo.keys()].sort((a, b) => a - b);
  const everyPage = byPage(all);
  const stored: number[] = [];
  for (const [i, p] of pages.entries()) {
    onProgress?.({ phase: 'drawings', done: i, total: pages.length });
    const row = await db.images.get(pageImageId(p));
    // a page this device never kept (a newer list covers more of the book): the PDF is needed again for it
    if (!row) continue;
    stored.push(p);
    const img = await fileToImage(row.blob);
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    canvas.getContext('2d')!.drawImage(img, 0, 0);
    try {
      // every label on the page is painted over, whichever drawings are cut
      const s = img.naturalWidth / 739;
      blankLabels(canvas, everyPage.get(p) ?? [], s);
      for (const w of todo.get(p) ?? []) {
        const crop = cropSquare(canvas, w.spot.b, s);
        const blob = await encode(crop, 0.84);
        crop.width = 0;
        crop.height = 0;
        await putImage(cropImageId(w.id), blob);
      }
    } finally {
      canvas.width = 0;
      canvas.height = 0;
    }
  }
  await linkCards(stored.flatMap((p) => todo.get(p) ?? []));
  // what's on the device now
  const ids = (await db.images.toCollection().primaryKeys()).map(String);
  const rows = await db.images.bulkGet(ids.filter((id) => id.startsWith('ipage-') || id.startsWith('icrop-')));
  const bytes = rows.reduce((n, r) => n + (r?.blob.size ?? 0), 0);
  const kept = ids.filter((id) => id.startsWith('ipage-')).map((id) => Number(id.slice(6))).sort((a, b) => a - b);
  const linked = await db.cards.where('deckId').startsWith('img-').filter((c) => !!c.imageId?.startsWith('icrop-')).count();
  const info: BookInfo = { importedAt: Date.now(), version: IMAGIER_CUT, pages: kept, words: linked, bytes };
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
