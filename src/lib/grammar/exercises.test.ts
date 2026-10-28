import { describe, expect, it } from 'vitest';
import type { GrammarType } from '../../types';
import { normalizeAnswer } from '../french';
import { LESSONS } from '../../data/grammar/lessons';
import { buildGrammarQuestions } from './exercises';

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const spaced = (s: string) => ` ${normalizeAnswer(s).replace(/[']/g, "' ").replace(/\s+/g, ' ').trim()} `;

/** Whole-word containment, so "est" isn't found inside "c'est". */
function containsPhrase(text: string, phrase: string): boolean {
  return spaced(text).includes(spaced(phrase));
}

/** Whole-word occurrences. */
function countPhrase(text: string, phrase: string): number {
  const t = spaced(text);
  const p = spaced(phrase);
  let n = 0;
  for (let i = t.indexOf(p); i >= 0; i = t.indexOf(p, i + 1)) n++;
  return n;
}

const KINDS: GrammarType[] = ['conj', 'cloze', 'tense-id', 'transform', 'negate', 'qform', 'qword', 'qmatch', 'gtranslate', 'glisten'];

describe('grammar exercises', () => {
  for (const kind of KINDS) {
    it(`${kind}: valid questions that never show the answer first`, () => {
      let made = 0;
      for (let seed = 1; seed <= 60; seed++) {
        const qs = buildGrammarQuestions({ kinds: [kind], length: 3, skills: new Map(), level: 2 }, seeded(seed));
        for (const q of qs) {
          made++;
          const g = q.g!;
          expect(g.kind).toBe(kind);
          expect(g.answer.trim()).not.toBe('');
          expect(g.reveal.fr.trim()).not.toBe('');
          expect(g.reveal.en.trim()).not.toBe('');
          if (g.mode === 'choice') {
            const opts = g.options!.map(normalizeAnswer);
            expect(opts.length).toBeGreaterThanOrEqual(2);
            expect(opts).toContain(normalizeAnswer(g.answer));
            expect(new Set(opts).size).toBe(opts.length);
          }
          if (g.mode === 'tiles') {
            expect(q.answer?.length).toBeGreaterThan(0);
            for (const t of q.answer!) expect(q.tiles).toContain(t);
          }
          // Only the listening exercise speaks before the answer.
          if (kind === 'glisten') expect(g.audio).toBeTruthy();
          else expect(g.audio).toBeUndefined();
          // The prompt and the chips never contain the answer.
          for (const chip of g.chips ?? []) expect(normalizeAnswer(chip)).not.toBe(normalizeAnswer(g.answer));
          if (kind === 'qword') {
            // the gap hides the question word; another copy may stay ("Qui est-ce qui…")
            const full = g.prompt!.replace('____', g.answer);
            expect(countPhrase(g.prompt!, g.answer)).toBe(countPhrase(full, g.answer) - 1);
          } else if (g.prompt && kind !== 'tense-id' && kind !== 'qmatch' && kind !== 'gtranslate') {
            expect(containsPhrase(g.prompt, g.answer)).toBe(false);
          }
          if (kind === 'cloze' || kind === 'qword') expect(g.prompt).toContain('____');
        }
      }
      expect(made).toBeGreaterThan(60);
    });
  }

  it('respects a lesson’s tenses and verbs', () => {
    const qs = buildGrammarQuestions(
      { kinds: ['conj'], length: 20, tenses: ['futur_simple'], verbs: ['parler', 'finir'], skills: new Map(), level: 2 },
      seeded(9),
    );
    expect(qs.length).toBe(20);
    for (const q of qs) {
      expect(q.g!.chips).toContain('futur simple');
      expect(['parler', 'finir']).toContain(q.g!.chips![1]);
    }
  });

  it('every lesson’s practice makes a full round in its own tenses', () => {
    for (const lesson of LESSONS) {
      for (const seed of [1, 2, 3]) {
        const qs = buildGrammarQuestions({ ...lesson.practice, length: 10, skills: new Map(), level: 2 }, seeded(seed));
        expect(qs.length, `${lesson.id} (seed ${seed})`).toBe(10);
        for (const q of qs) expect(lesson.practice.kinds, lesson.id).toContain(q.g!.kind);
      }
    }
  });

  it('builds a full mixed round', () => {
    const qs = buildGrammarQuestions({ kinds: KINDS, length: 20, skills: new Map(), level: 2 }, seeded(4));
    expect(qs.length).toBe(20);
    expect(new Set(qs.map((q) => q.type)).size).toBeGreaterThan(4);
  });
});
