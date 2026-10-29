import { describe, expect, it } from 'vitest';
import { normalizeAnswer } from '../../lib/french';
import { DRILL_SETS } from './drills';

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const GAP = '____';
const items = DRILL_SETS.flatMap((d) => d.items.map((it) => ({ set: d, it, where: `${d.id}/${it.id}` })));
const full = (fr: string, answer: string) => fr.replace(GAP, answer);

describe('drill sets', () => {
  it('have unique slug ids, a title in both languages and enough items', () => {
    const ids = DRILL_SETS.map((d) => d.id);
    expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([]);
    for (const d of DRILL_SETS) {
      expect(d.id, d.id).toMatch(SLUG);
      expect(d.title.trim() && d.en.trim(), d.id).toBeTruthy();
      expect([3, 4], `${d.id} level`).toContain(d.level);
      expect(d.items.length, `${d.id} items`).toBeGreaterThanOrEqual(16);
      const itemIds = d.items.map((it) => it.id);
      expect(itemIds.filter((id, i) => itemIds.indexOf(id) !== i), `${d.id} duplicate item ids`).toEqual([]);
      for (const id of itemIds) expect(id, `${d.id}/${id}`).toMatch(SLUG);
    }
  });

  it('have exactly one gap and a filler that is not also offered as wrong', () => {
    for (const { it, where } of items) {
      expect(it.fr.split(GAP).length - 1, `${where}: one "${GAP}"`).toBe(1);
      expect(it.fr, `${where}: five underscores`).not.toMatch(/_{5,}/);
      expect(it.answer.trim(), where).toBe(it.answer);
      expect(it.answer, where).not.toBe('');
      expect(it.wrong.length, `${where}: wrong options`).toBeGreaterThanOrEqual(2);
      const right = [it.answer, ...(it.accept ?? [])].map(normalizeAnswer);
      const wrong = it.wrong.map(normalizeAnswer);
      expect(new Set(wrong).size, `${where}: duplicate wrong options`).toBe(wrong.length);
      for (const w of wrong) expect(right, `${where}: "${w}" is both right and wrong`).not.toContain(w);
      for (const w of it.wrong) expect(w.trim() && w, where).toBe(w.trim());
      expect(it.en.trim(), `${where} en`).toMatch(/[.?!]$/);
      expect(it.why.trim(), `${where} why`).not.toBe('');
    }
  });

  it('read as complete French sentences once filled', () => {
    for (const { it, where } of items) {
      const s = full(it.fr, it.answer);
      expect(s, `${where}: sentence end`).toMatch(/[.?!»]$/);
      expect(s, `${where}: double space`).not.toMatch(/ {2}/);
      // no "que il", "de elle", "je ai"... next to the gap: the elision belongs in the filler
      for (const w of [it.answer, ...(it.accept ?? []), ...it.wrong]) {
        const filled = full(it.fr, w);
        expect(filled, `${where}: missing elision in "${filled}"`).not.toMatch(/(^|[\s'’])(que|de|je|le|la|ne|se|me|te|ce) (il|ils|on|elle|elles|a|ai|as|avez|avons|ont|est|es|un|une|eu|été)\b/i);
        expect(filled, `${where}: missing elision in "${filled}"`).not.toMatch(/(^|[\s'’])(que|de|je|ne|se|me|te) (en|y)\b|(^|[\s'’])si (il|ils)\b/i);
      }
    }
  });

  it('give the whole spread of choices from Facile (three wrong options) to Difficile (five) when they can', () => {
    const short = items.filter(({ it }) => it.wrong.length < 3);
    // binary choices (indicatif / subjonctif, before / after the noun) are fine, but not as the rule
    expect(short.length, short.map((s) => s.where).join(', ')).toBeLessThanOrEqual(Math.ceil(items.length * 0.25));
  });
});
