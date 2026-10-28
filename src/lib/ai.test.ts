import { describe, expect, it } from 'vitest';
import { planPdfParts } from './ai';

const file = (bytes: number) => new Blob([new Uint8Array(bytes)], { type: 'application/pdf' });
const texts = (from: number, to: number, chars = 500) => new Map(Array.from({ length: to - from + 1 }, (_, i) => [from + i, 'x'.repeat(chars)]));

describe('planPdfParts', () => {
  it('sends a short, small PDF whole', () => {
    expect(planPdfParts({ file: file(2_000_000), pageCount: 12, from: 1, to: 12, texts: new Map() })).toEqual([{ kind: 'pdf', from: 1, to: 12 }]);
  });

  it('sends a page range as text where there is some and as page images for scans', () => {
    const parts = planPdfParts({ file: file(2_000_000), pageCount: 40, from: 3, to: 12, texts: texts(3, 8) });
    expect(parts.map((p) => [p.kind, p.from, p.to])).toEqual([
      ['text', 3, 8],
      ['scan', 9, 12],
    ]);
    expect(parts[0].kind === 'text' && parts[0].text).toContain('<page number="3">');
    expect(parts[1].kind === 'scan' && parts[1].pages).toEqual([9, 10, 11, 12]);
  });

  it('never sends a file too big for one request whole', () => {
    expect(planPdfParts({ file: file(25_000_000), pageCount: 10, from: 1, to: 10, texts: texts(1, 10) }).map((p) => p.kind)).toEqual(['text']);
  });

  it('splits a long book into parts of at most 30 text pages, 40k characters or 8 scans', () => {
    const t = texts(1, 70, 1000);
    for (let p = 71; p <= 90; p++) t.delete(p);
    const parts = planPdfParts({ file: file(80_000_000), pageCount: 300, from: 1, to: 90, texts: t });
    expect(parts.map((p) => [p.kind, p.from, p.to])).toEqual([
      ['text', 1, 30],
      ['text', 31, 60],
      ['text', 61, 70],
      ['scan', 71, 78],
      ['scan', 79, 86],
      ['scan', 87, 90],
    ]);
    const long = planPdfParts({ file: file(80_000_000), pageCount: 300, from: 1, to: 20, texts: texts(1, 20, 6000) });
    expect(long.every((p) => p.kind === 'text' && p.text.length <= 40_000)).toBe(true);
    expect(long).toHaveLength(4);
  });
});
