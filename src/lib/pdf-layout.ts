// Rebuilds reading-order lines from the positioned text of a PDF page. Runs on one baseline make a
// row; wide gaps inside a row are kept as three spaces (table cells and side-by-side entries, the
// same convention as the OCR text), and pages set in columns of running text are read one column
// at a time. Pure, so it can be tested with made-up pages.
import { languageScore } from './parse';

export interface PdfItem {
  str: string;
  /** Left edge and baseline, in page units from the top-left corner. */
  x: number;
  y: number;
  /** Advance width. */
  w: number;
  /** Font size. */
  size: number;
  /** PDF.js font id: the same id means the same font (bold, italic…). */
  font?: string;
}

export interface PdfLine {
  text: string;
  /** 1-based page number. */
  page: number;
  x0: number;
  x1: number;
  /** Baseline from the top of the page; for scanned pages, the line's index. */
  y: number;
  /** Font size, 0 when unknown (scanned pages). */
  size: number;
  font?: string;
  /** Baseline distance from the line above in line heights (about 1 inside a paragraph); NEW_BLOCK at the top of a page or column. */
  gap: number;
  /** Pieces of the line separated by wide gaps (table cells, entries side by side). */
  cells: string[];
}

export const NEW_BLOCK = 99;

/** Gap (in ems) that counts as a space between two runs of text. */
const SPACE_GAP = 0.12;
/** Wider than this (in ems), the runs are separate cells or columns. */
const CELL_GAP = 1.3;
/** Baselines this close (in ems) are on the same row; covers superscripts like "1er". */
const ROW_TOL = 0.45;

interface Run {
  str: string;
  x0: number;
  x1: number;
  y: number;
  size: number;
  font?: string;
}

interface Cell {
  text: string;
  x0: number;
  x1: number;
  y: number;
  size: number;
  row: number;
  words: number;
  runs: Run[];
}

type Row = Cell[];

function median(xs: number[]): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function toRuns(items: PdfItem[]): Run[] {
  const out: Run[] = [];
  for (const it of items) {
    const str = it.str.replace(/\s+/g, ' ');
    if (!str.trim() || !(it.size > 1) || !Number.isFinite(it.x) || !Number.isFinite(it.y)) continue;
    const w = it.w > 0 ? it.w : str.length * it.size * 0.5;
    out.push({ str, x0: it.x, x1: it.x + w, y: it.y, size: it.size, font: it.font });
  }
  return out;
}

/** Groups runs into rows by baseline, top to bottom. */
function rowsOf(runs: Run[]): Run[][] {
  const sorted = [...runs].sort((a, b) => a.y - b.y || a.x0 - b.x0);
  const rows: { y: number; size: number; runs: Run[] }[] = [];
  for (const r of sorted) {
    const last = rows[rows.length - 1];
    if (last && r.y - last.y <= ROW_TOL * Math.max(last.size, r.size)) {
      last.runs.push(r);
      // the row's baseline follows its biggest text, not a superscript
      if (r.size > last.size) {
        last.size = r.size;
        last.y = r.y;
      }
    } else rows.push({ y: r.y, size: r.size, runs: [r] });
  }
  return rows.map((r) => r.runs);
}

/** Size and font carrying the most characters. */
function dominant(runs: Run[]): { size: number; font?: string; y: number } {
  const bySize = new Map<number, number>();
  const byFont = new Map<string, number>();
  for (const r of runs) {
    const n = r.str.replace(/\s/g, '').length;
    const s = Math.round(r.size * 10) / 10;
    bySize.set(s, (bySize.get(s) ?? 0) + n);
    if (r.font) byFont.set(r.font, (byFont.get(r.font) ?? 0) + n);
  }
  const top = <K,>(m: Map<K, number>) => [...m].sort((a, b) => b[1] - a[1])[0]?.[0];
  const size = top(bySize) ?? runs[0].size;
  const main = runs.find((r) => Math.round(r.size * 10) / 10 === size) ?? runs[0];
  return { size, font: top(byFont), y: main.y };
}

/** "U N I T É 3" (letter-spaced titles) -> "UNITÉ 3". */
function unspace(text: string): string {
  return text.replace(/(^| )(\p{L}(?: \p{L}){3,})(?= |$)/gu, (_, pre: string, letters: string) => pre + letters.replace(/ /g, ''));
}

/** Splits a row into cells at wide gaps, joining the runs of each cell into words. */
function cellsOf(runs: Run[], row: number): Cell[] {
  const sorted = [...runs].sort((a, b) => a.x0 - b.x0);
  const groups: Run[][] = [];
  let prev: Run | null = null;
  for (const r of sorted) {
    // fake bold: the same text drawn twice, a hair apart
    if (prev && r.str === prev.str && Math.abs(r.x0 - prev.x0) < 0.3 * r.size) continue;
    const size = Math.max(r.size, prev?.size ?? 0);
    if (!prev || r.x0 - prev.x1 > CELL_GAP * size) groups.push([r]);
    else groups[groups.length - 1].push(r);
    prev = r;
  }
  return groups
    .map((g) => {
      let text = '';
      g.forEach((r, i) => {
        const p = g[i - 1];
        const space = !!p && (r.x0 - p.x1 > SPACE_GAP * Math.max(r.size, p.size) || /\s$/.test(text) || /^\s/.test(r.str));
        text += (space ? ' ' : '') + r.str;
      });
      text = unspace(text.replace(/\s+/g, ' ').trim());
      const d = dominant(g);
      return { text, x0: g[0].x0, x1: Math.max(...g.map((r) => r.x1)), y: d.y, size: d.size, row, words: text.split(' ').filter(Boolean).length, runs: g };
    })
    .filter((c) => c.text);
}

function byRow(cells: Cell[]): Row[] {
  const map = new Map<number, Cell[]>();
  for (const c of cells) {
    const l = map.get(c.row);
    if (l) l.push(c);
    else map.set(c.row, [c]);
  }
  return [...map.entries()].sort((a, b) => a[0] - b[0]).map(([, l]) => l.sort((a, b) => a.x0 - b.x0));
}

const rowY = (r: Row) => r.reduce((best, c) => (c.size > best.size ? c : best), r[0]).y;
const rowSize = (r: Row) => Math.max(...r.map((c) => c.size));

type Span = [number, number];

/** White space of a row between x0 and x1 (the gaps between its cells and around them). */
function whitespace(row: Row, x0: number, x1: number): Span[] {
  const out: Span[] = [];
  let at = x0;
  for (const c of row) {
    if (c.x0 > at) out.push([at, c.x0]);
    at = Math.max(at, c.x1);
  }
  if (x1 > at) out.push([at, x1]);
  return out;
}

function intersect(a: Span[], b: Span[], min: number): Span[] {
  const out: Span[] = [];
  for (const [a0, a1] of a) {
    for (const [b0, b1] of b) {
      const lo = Math.max(a0, b0);
      const hi = Math.min(a1, b1);
      if (hi - lo >= min) out.push([lo, hi]);
    }
  }
  return out;
}

/** Gaps in a row with a real line of text (4+ words) on at least one side, near the middle. */
function splitGaps(row: Row, lo: number, hi: number, min: number): Span[] {
  const out: Span[] = [];
  for (let k = 1; k < row.length; k++) {
    const a = row[k - 1].x1;
    const b = row[k].x0;
    if (b - a < min || Math.min(b, hi) - Math.max(a, lo) < min / 2) continue;
    const left = row.slice(0, k).reduce((n, c) => n + c.words, 0);
    const right = row.slice(k).reduce((n, c) => n + c.words, 0);
    if (left >= 4 || right >= 4) out.push([a, b]);
  }
  return out;
}

/**
 * Rows set as two columns of text: at least three consecutive rows split by the same strip of
 * white space, with lines on one side only (a column's last line) allowed in between and after.
 * Looked for locally, so full-width text above or below doesn't hide the columns.
 */
function findColumnBand(rows: Row[]): { start: number; end: number; from: number; to: number } | null {
  const cells = rows.flat();
  if (cells.length < 6) return null;
  const x0 = Math.min(...cells.map((c) => c.x0));
  const x1 = Math.max(...cells.map((c) => c.x1));
  const em = median(cells.map((c) => c.size));
  if (x1 - x0 < 12 * em) return null;
  const lo = x0 + 0.15 * (x1 - x0);
  const hi = x1 - 0.15 * (x1 - x0);
  const min = 0.8 * em;
  for (let i = 0; i < rows.length; i++) {
    let gutter = splitGaps(rows[i], lo, hi, min);
    if (!gutter.length) continue;
    let split = 1;
    let last = i;
    let j = i + 1;
    for (; j < rows.length; j++) {
      const next = intersect(gutter, whitespace(rows[j], x0, x1), min);
      if (!next.length) break;
      gutter = next;
      if (intersect(gutter, splitGaps(rows[j], lo, hi, min), min).length) {
        split++;
        last = j;
      }
    }
    if (split < 3) continue;
    const [from, to] = gutter.reduce((a, b) => (b[1] - b[0] > a[1] - a[0] ? b : a));
    const oneSided = (r: Row) => r.every((c) => c.x1 <= from + 1) || r.every((c) => c.x0 >= to - 1);
    let end = last + 1;
    while (end < j && oneSided(rows[end]) && rowY(rows[end]) - rowY(rows[end - 1]) <= 2.6 * rowSize(rows[end])) end++;
    if (isColumns(rows.slice(i, end), { from, to })) return { start: i, end, from, to };
  }
  return null;
}

const frenchish = (t: string) => {
  const s = languageScore(t);
  return s.fr > s.en;
};

/**
 * Two columns of running text, or a table to keep row by row? Words next to their meanings
 * ("le pain   bread"), and French next to English, stay together on their row.
 */
function isColumns(rows: Row[], g: { from: number; to: number }): boolean {
  const mid = (g.from + g.to) / 2;
  const left: number[] = [];
  const right: number[] = [];
  let both = 0;
  let mixed = 0;
  for (const row of rows) {
    const l = row.filter((c) => c.x1 <= mid);
    const r = row.filter((c) => c.x0 >= mid);
    left.push(...l.map((c) => c.words));
    right.push(...r.map((c) => c.words));
    if (l.length && r.length) {
      both++;
      if (frenchish(l.map((c) => c.text).join(' ')) !== frenchish(r.map((c) => c.text).join(' '))) mixed++;
    }
  }
  if (median(left) < 4 && median(right) < 4) return false;
  if (both >= 3 && mixed >= 0.5 * both) return false;
  return true;
}

/** Recursive XY-cut: full-width white bands first, then bands of rows set in columns. */
function layout(cells: Cell[], depth: number): Row[] {
  const rows = byRow(cells);
  if (rows.length < 2) return rows;
  let cut = -1;
  let widest = 0;
  for (let i = 1; i < rows.length; i++) {
    const gap = rowY(rows[i]) - rowY(rows[i - 1]);
    const lh = 1.2 * Math.max(rowSize(rows[i]), rowSize(rows[i - 1]));
    if (gap > 2.5 * lh && gap > widest) {
      widest = gap;
      cut = i;
    }
  }
  if (cut > 0) return [...layout(rows.slice(0, cut).flat(), depth), ...layout(rows.slice(cut).flat(), depth)];
  const band = depth < 3 ? findColumnBand(rows) : null;
  if (!band) return rows;
  const mid = (band.from + band.to) / 2;
  const left: Cell[] = [];
  const right: Cell[] = [];
  for (const row of rows.slice(band.start, band.end)) for (const c of row) ((c.x0 + c.x1) / 2 < mid ? left : right).push(c);
  return [
    ...layout(rows.slice(0, band.start).flat(), depth),
    // each column may itself hold columns
    ...layout(left, depth + 1),
    ...layout(right, depth + 1),
    ...layout(rows.slice(band.end).flat(), depth),
  ];
}

/** Reading-order lines of one page from its positioned text. */
export function pageLines(items: PdfItem[], page: number): PdfLine[] {
  const runs = toRuns(items);
  if (!runs.length) return [];
  const cells = rowsOf(runs).flatMap((r, i) => cellsOf(r, i));
  const lines: PdfLine[] = layout(cells, 0).map((row) => {
    const d = dominant(row.flatMap((c) => c.runs));
    return {
      text: row.map((c) => c.text).join('   '),
      page,
      x0: Math.min(...row.map((c) => c.x0)),
      x1: Math.max(...row.map((c) => c.x1)),
      y: d.y,
      size: d.size,
      font: d.font,
      gap: NEW_BLOCK,
      cells: row.map((c) => c.text),
    };
  });
  lines.forEach((l, i) => {
    const p = lines[i - 1];
    // same column: below the previous line and overlapping it horizontally
    if (p && l.y > p.y && l.x0 < p.x1 && l.x1 > p.x0) l.gap = (l.y - p.y) / (1.2 * Math.max(p.size, l.size));
  });
  return lines;
}

/** Lines of a page read by OCR (no positions: wide gaps still mark cells). */
export function ocrLines(text: string, page: number): PdfLine[] {
  return text
    .split('\n')
    .map((t) => t.trimEnd())
    .filter((t) => t.trim())
    .map((t, i) => ({
      text: t.trim(),
      page,
      x0: 0,
      x1: 0,
      y: i,
      size: 0,
      gap: i === 0 ? NEW_BLOCK : 1,
      cells: t
        .trim()
        .split(/\s{3,}|\t+/)
        .map((s) => s.trim())
        .filter(Boolean),
    }));
}

/**
 * Is there real text on the page? Scans have none (or a few stray characters), and some PDFs
 * carry a broken text layer (private-use glyphs, no vowels) that's better read by OCR.
 */
export function textQuality(lines: PdfLine[]): 'good' | 'empty' | 'garbage' {
  const all = lines.map((l) => l.text).join(' ');
  const letters = (all.match(/\p{L}/gu) ?? []).length;
  if (letters < 40) return 'empty';
  const visible = all.replace(/\s/g, '').length;
  const odd = (all.match(/[-�]/g) ?? []).length;
  if (odd > 0.05 * visible || letters < 0.5 * visible) return 'garbage';
  const tokens = all.split(/\s+/).filter((t) => /\p{L}{2,}/u.test(t));
  const wordy = tokens.filter((t) => /[aeiouyàâäéèêëîïôöùûüœ]/i.test(t)).length;
  if (tokens.length >= 10 && wordy < 0.6 * tokens.length) return 'garbage';
  return 'good';
}
