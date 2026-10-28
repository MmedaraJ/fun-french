// Reading PDFs in the browser with PDF.js (Apache-2.0), loaded only when a PDF is opened. Its worker
// and data files (character maps, standard fonts, image decoders) are self-hosted under
// /vendor/pdfjs (see scripts/prepare-assets.mjs), so it works offline once cached. The legacy build
// is used because the modern one needs JavaScript features only the newest browsers have.
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { recognizePages, type OcrProgress } from './ocr';
import { ocrLines, pageLines, textQuality, type PdfItem, type PdfLine } from './pdf-layout';
import type { PdfPage } from './pdf-topics';

type PdfJs = typeof import('pdfjs-dist');

/** Pages read in one go, at most: a whole textbook, while keeping memory in check. */
export const MAX_PAGES = 400;

export class PdfError extends Error {}

export interface OutlineEntry {
  title: string;
  /** 1-based first page. */
  page: number;
  /** 0 for top-level bookmarks, 1 for the ones under them. */
  depth: number;
}

export interface PdfDoc {
  name: string;
  pages: number;
  /** Chapters from the PDF's bookmarks, when it has any. */
  outline: OutlineEntry[];
  /** Reading-order text lines of a page (1-based). */
  read(page: number): Promise<{ lines: PdfLine[]; height: number }>;
  /** A page as an image, for OCR or for Claude. */
  render(page: number, opts?: { longEdge?: number; type?: 'image/png' | 'image/jpeg'; quality?: number }): Promise<Blob>;
  close(): Promise<void>;
}

/** Absolute URL under the app's base (the worker can't resolve relative paths). */
function vendorUrl(path = ''): string {
  return new URL(`${import.meta.env.BASE_URL}vendor/pdfjs/${path}`, window.location.href).href;
}

let loading: Promise<PdfJs> | null = null;

function pdfjs(): Promise<PdfJs> {
  loading ??= import('pdfjs-dist/legacy/build/pdf.mjs')
    .then((lib) => {
      lib.GlobalWorkerOptions.workerSrc = vendorUrl('pdf.worker.min.mjs');
      return lib;
    })
    .catch((e) => {
      loading = null;
      throw e;
    });
  return loading;
}

async function readOutline(doc: PDFDocumentProxy): Promise<OutlineEntry[]> {
  const out: OutlineEntry[] = [];
  const visit = async (nodes: Awaited<ReturnType<PDFDocumentProxy['getOutline']>> | null, depth: number) => {
    for (const node of nodes ?? []) {
      if (out.length >= 200) return;
      const dest = typeof node.dest === 'string' ? await doc.getDestination(node.dest) : node.dest;
      const ref: unknown = Array.isArray(dest) ? dest[0] : null;
      let index: number | null = null;
      if (ref && typeof ref === 'object') index = await doc.getPageIndex(ref as { num: number; gen: number }).catch(() => null);
      else if (typeof ref === 'number' && Number.isInteger(ref)) index = ref;
      const title = node.title?.replace(/\s+/g, ' ').trim();
      if (index !== null && title) out.push({ title, page: index + 1, depth });
      if (depth < 1 && node.items?.length) await visit(node.items, depth + 1);
    }
  };
  await visit(await doc.getOutline(), 0);
  return out.sort((a, b) => a.page - b.page);
}

export async function openPdf(file: Blob, name = (file as File).name || 'document.pdf'): Promise<PdfDoc> {
  let lib: PdfJs;
  try {
    lib = await pdfjs();
  } catch {
    throw new PdfError('Couldn’t load the PDF reader. Are you online? It downloads once, then works offline.');
  }
  const task = lib.getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
    cMapUrl: vendorUrl('cmaps/'),
    cMapPacked: true,
    standardFontDataUrl: vendorUrl('standard_fonts/'),
    wasmUrl: vendorUrl('wasm/'),
    iccUrl: vendorUrl('iccs/'),
  });
  let doc: PDFDocumentProxy;
  try {
    doc = await task.promise;
  } catch (e) {
    void task.destroy().catch(() => {});
    if ((e as Error)?.name === 'PasswordException') throw new PdfError('This PDF is locked with a password. Save a copy without it and try again.');
    throw new PdfError('This file couldn’t be opened as a PDF. It may be damaged.');
  }
  const outline = await readOutline(doc).catch(() => []);
  return {
    name,
    pages: doc.numPages,
    outline,
    async read(n) {
      const page = await doc.getPage(n);
      try {
        const viewport = page.getViewport({ scale: 1 });
        const content = await page.getTextContent();
        const items: PdfItem[] = [];
        for (const it of content.items) {
          if (!('str' in it) || !it.str.trim()) continue;
          // page coordinates, top-left origin; skip text set sideways (margin notes, credits)
          const m = lib.Util.transform(viewport.transform, it.transform) as number[];
          if (m[0] <= 0 || Math.abs(m[1]) > 0.2 * Math.abs(m[0])) continue;
          items.push({ str: it.str, x: m[4], y: m[5], w: it.width, size: Math.hypot(m[2], m[3]) || it.height, font: it.fontName });
        }
        return { lines: pageLines(items, n), height: viewport.height };
      } finally {
        page.cleanup();
      }
    },
    async render(n, { longEdge = 2200, type = 'image/png', quality = 0.88 } = {}) {
      const page = await doc.getPage(n);
      const base = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: Math.min(4, longEdge / Math.max(base.width, base.height)) });
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(viewport.width));
      canvas.height = Math.max(1, Math.round(viewport.height));
      try {
        await page.render({ canvas, viewport }).promise;
        return await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new PdfError('Couldn’t draw this page.'))), type, quality));
      } finally {
        // free the bitmap now: phones run out of canvas memory on long books
        canvas.width = 0;
        canvas.height = 0;
        page.cleanup();
      }
    },
    // destroying the loading task also ends its worker
    close: () => task.destroy(),
  };
}

export interface ReadProgress {
  /** 'text': reading the text of each page; 'ocr': scanning the pages that have none. */
  phase: 'text' | 'ocr';
  /** 1-based page being read. */
  page: number;
  /** Pages finished in this phase, out of `total`. */
  done: number;
  total: number;
  /** Pages without text found so far. */
  scanned: number;
  /** Scanner detail during OCR. */
  ocr?: OcrProgress;
}

export interface ReadResult {
  pages: PdfPage[];
  /** Pages that had no usable text. */
  scanned: number[];
  /** Stopped before the end; `pages` holds what was read. */
  cancelled: boolean;
  /** The scanner failed; the pages with text are still there. */
  ocrError?: string;
}

/**
 * Reads pages `from`..`to`: the text layer where there is one, then OCR for the pages without
 * (each drawn only when its turn comes). With `ocr: false`, scanned pages are only listed.
 */
export async function readPdfPages(doc: PdfDoc, from: number, to: number, opts: { signal?: AbortSignal; onProgress?: (p: ReadProgress) => void; ocr?: boolean } = {}): Promise<ReadResult> {
  const { signal, onProgress } = opts;
  const pages: PdfPage[] = [];
  const scanned: number[] = [];
  const total = to - from + 1;
  let cancelled = false;
  for (let n = from; n <= to; n++) {
    if (signal?.aborted) {
      cancelled = true;
      break;
    }
    onProgress?.({ phase: 'text', page: n, done: n - from, total, scanned: scanned.length });
    try {
      const { lines, height } = await doc.read(n);
      if (textQuality(lines) === 'good') pages.push({ page: n, height, lines });
      else scanned.push(n);
    } catch {
      // a page PDF.js can't take apart may still be drawn and scanned
      scanned.push(n);
    }
    // let the progress bar paint now and then
    if ((n - from) % 6 === 5) await new Promise((r) => setTimeout(r, 0));
  }
  let ocrError: string | undefined;
  if (!cancelled && scanned.length && opts.ocr !== false) {
    try {
      await recognizePages(
        { count: scanned.length, page: (i) => doc.render(scanned[i]) },
        (p) => onProgress?.({ phase: 'ocr', page: scanned[p.page - 1] ?? scanned[0], done: p.page - 1, total: scanned.length, scanned: scanned.length, ocr: p }),
        { signal, onPage: (i, text) => pages.push({ page: scanned[i], height: 0, lines: ocrLines(text, scanned[i]), ocr: true }) },
      );
    } catch (e) {
      if ((e as Error).name === 'AbortError') cancelled = true;
      else ocrError = (e as Error).message || 'The scanner failed to start.';
    }
  }
  pages.sort((a, b) => a.page - b.page);
  return { pages, scanned, cancelled, ocrError };
}
