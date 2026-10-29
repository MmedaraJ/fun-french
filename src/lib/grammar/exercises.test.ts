import { describe, expect, it } from 'vitest';
import type { GrammarType } from '../../types';
import type { DrillItem } from './types';
import { normalizeAnswer } from '../french';
import { COURSE_BY_ID, EXERCISES } from '../../data/course';
import { ENDLESS } from '../../data/course/endless';
import { DRILL_SETS } from '../../data/grammar/drills';
import { LESSONS } from '../../data/grammar/lessons';
import { QUESTIONS } from '../../data/grammar/questions';
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
        // every lesson works at the A2 floor (a lesson her PDFs teach can be below it)
        const minLevel = lesson.level >= 3 ? 3 : 2;
        const qs = buildGrammarQuestions({ ...lesson.practice, length: 10, skills: new Map(), level: 2, minLevel }, seeded(seed));
        expect(qs.length, `${lesson.id} (seed ${seed})`).toBe(10);
        for (const q of qs) expect(lesson.practice.kinds, lesson.id).toContain(q.g!.kind);
      }
    }
  });

  it('at the A2 floor: no A1 tenses, no plain intonation questions, no A1 question-bank items', () => {
    const basic = ['present', 'futur_proche', 'passe_recent', 'imperatif'];
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const qs = buildGrammarQuestions({ kinds: KINDS, length: 30, skills: new Map(), level: 3, minLevel: 2 }, seeded(seed));
      expect(qs.length).toBe(30);
      for (const q of qs) {
        const g = q.g!;
        const tense = /^g:(conj|tense|id|listen):(.+)$/.exec(g.skill)?.[2];
        if (tense) expect(basic, g.skill).not.toContain(tense);
        if (g.kind === 'qform') expect(g.skill).not.toBe('g:qf:intonation');
        if (g.kind === 'qword' || g.kind === 'qmatch') {
          const asked = g.reveal.fr.split(' — ')[0];
          const item = QUESTIONS.find((it) => Object.values(it.forms).includes(asked));
          expect(item, asked).toBeDefined();
          expect(item!.level, asked).toBeGreaterThanOrEqual(2);
        }
      }
    }
  });

  it('at the B1 floor every grammar game still fills its round, in B1 tenses', () => {
    const b1 = ['plus_que_parfait', 'futur_anterieur', 'conditionnel_passe', 'subjonctif_present', 'subjonctif_passe', 'passe_simple'];
    const games: GrammarType[][] = [['conj', 'cloze'], ['cloze', 'tense-id', 'transform', 'negate', 'gtranslate', 'glisten'], ['qword', 'qform', 'qmatch'], KINDS];
    for (const kinds of games) {
      for (const seed of [1, 2, 3]) {
        const qs = buildGrammarQuestions({ kinds, length: 15, skills: new Map(), level: 3, minLevel: 3 }, seeded(seed));
        expect(qs.length, kinds.join()).toBe(15);
        for (const q of qs) {
          const tense = /^g:(conj|tense|id|listen):(.+)$/.exec(q.g!.skill)?.[2];
          if (tense) expect(b1, q.g!.skill).toContain(tense);
        }
      }
    }
  });

  it('Intermédiaire practises the B1 structures, Avancé all of them', () => {
    const level = new Map(DRILL_SETS.map((d) => [`g:dr:${d.id}`, d.level]));
    const b1 = buildGrammarQuestions({ kinds: ['drill'], length: 20, skills: new Map(), level: 3, minLevel: 2 }, seeded(3));
    expect(b1).toHaveLength(20);
    for (const q of b1) expect(level.get(q.g!.skill), q.g!.skill).toBe(3);
    const all = buildGrammarQuestions({ kinds: ['drill'], length: 40, skills: new Map(), level: 3, minLevel: 3 }, seeded(3));
    expect(new Set(all.map((q) => level.get(q.g!.skill)))).toEqual(new Set([3, 4]));
  });

  it('a course exercise plays its own items: gaps to fill, sentences to pick, nothing twice', () => {
    expect(EXERCISES.length).toBeGreaterThan(100);
    for (const ex of EXERCISES) {
      const n = Math.min(ex.items.length, 20);
      const qs = buildGrammarQuestions({ kinds: ['compose'], exercises: [ex.id], length: n, skills: new Map(), level: 3, minLevel: 3 }, seeded(5));
      expect(qs.length, ex.id).toBe(n);
      expect(new Set(qs.map((q) => q.g!.prompt)).size, `${ex.id} repeats`).toBe(n);
      for (const q of qs) {
        const g = q.g!;
        expect(g.kind).toBe('compose');
        expect(g.skill).toBe(`g:ex:${ex.id}`);
        // new: multiple choice, the answer offered exactly once
        expect(g.mode, ex.id).toBe('choice');
        expect(g.options!.filter((o) => normalizeAnswer(o) === normalizeAnswer(g.answer)), `${ex.id}: ${g.answer}`).toHaveLength(1);
        expect(g.options!.length, ex.id).toBeGreaterThanOrEqual(3);
        if (ex.kind === 'gap') expect(g.prompt).toContain('____');
        else expect(g.reveal.fr).toBe(g.answer);
        expect(g.promptStyle === 'en', `${ex.id} English prompt`).toBe(/^tradui/i.test(ex.title));
      }
    }
  });

  it('once known, a sentence to build comes as word tiles with the classic mistakes as decoys', () => {
    const ex = EXERCISES.find((e) => e.kind === 'build')!;
    const known = new Map([[`g:ex:${ex.id}`, { cardId: `g:ex:${ex.id}`, box: 2, due: Date.now() + 1e9, seen: 6, correct: 6, wrong: 0, lapses: 0, streak: 6, firstSeen: 1, lastSeen: 1 }]]);
    const qs = buildGrammarQuestions({ kinds: ['compose'], exercises: [ex.id], length: 10, skills: known, level: 3 }, seeded(8));
    const tiled = qs.filter((q) => q.g!.mode === 'tiles');
    expect(tiled.length).toBeGreaterThanOrEqual(6);
    for (const q of tiled) {
      const answer = q.answer as string[];
      expect(answer.join(' ').length).toBeGreaterThan(0);
      // every word of the answer is there, plus at least one that doesn't belong
      for (const w of answer) expect(q.tiles).toContain(w);
      expect(q.tiles!.length).toBeGreaterThan(answer.length);
    }
  });

  it('a Structures round fills up with gap sentences, never the same one twice', () => {
    expect(DRILL_SETS.length).toBeGreaterThan(10);
    for (const seed of [1, 2, 3]) {
      const qs = buildGrammarQuestions({ kinds: ['drill'], length: 20, skills: new Map(), level: 3, minLevel: 3 }, seeded(seed));
      expect(qs).toHaveLength(20);
      expect(new Set(qs.map((q) => q.g!.prompt)).size).toBe(20);
      for (const q of qs) {
        const g = q.g!;
        expect(g.kind).toBe('drill');
        expect(g.skill).toMatch(/^g:dr:/);
        expect(g.prompt).toContain('____');
        expect(g.reveal.fr).not.toContain('____');
        expect(g.mode).toBe('choice');
        // the answer is offered exactly once, with wrong options around it
        expect(g.options!.filter((o) => normalizeAnswer(o) === normalizeAnswer(g.answer))).toHaveLength(1);
        expect(g.options!.length).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it('a lesson drills its own structure; a chosen set that is gone falls back to all of them', () => {
    for (const lesson of LESSONS.filter((l) => l.practice.drills?.length)) {
      const qs = buildGrammarQuestions({ kinds: ['drill'], drills: lesson.practice.drills, length: 8, skills: new Map(), level: 3, minLevel: 3 }, seeded(2));
      expect(qs.length, lesson.id).toBe(8);
      for (const q of qs) expect(lesson.practice.drills!.map((d) => `g:dr:${d}`), lesson.id).toContain(q.g!.skill);
    }
    expect(buildGrammarQuestions({ kinds: ['drill'], drills: ['gone'], length: 5, skills: new Map(), level: 3 }, seeded(1))).toHaveLength(5);
  });

  it('once a structure is known, Difficile mostly asks her to type it', () => {
    const set = DRILL_SETS[0];
    const known = new Map([[`g:dr:${set.id}`, { cardId: `g:dr:${set.id}`, box: 2, due: Date.now() + 1e9, seen: 6, correct: 6, wrong: 0, lapses: 0, streak: 6, firstSeen: 1, lastSeen: 1 }]]);
    const qs = buildGrammarQuestions({ kinds: ['drill'], drills: [set.id], length: 12, skills: known, level: 3 }, seeded(4));
    expect(qs.filter((q) => q.g!.mode === 'type').length).toBeGreaterThanOrEqual(6);
    for (const q of qs.filter((q) => q.g!.mode === 'type')) expect(q.g!.accept).toContain(q.g!.answer);
  });

  it('typing a gap: a word-order filler shows its words scrambled; one she could only guess stays a choice', () => {
    const words = (s: string) => normalizeAnswer(s).split(/\s+/).sort().join(' ');
    const reorders = (it: DrillItem) => /\s/.test(it.answer.trim()) && it.wrong.some((w) => words(w) === words(it.answer));
    const guesswork = (it: DrillItem) => !it.cue && /\s/.test(it.answer.trim()) && !reorders(it);
    const known = (skill: string) => new Map([[skill, { cardId: skill, box: 3, due: Date.now() + 1e9, seen: 9, correct: 9, wrong: 0, lapses: 0, streak: 9, firstSeen: 1, lastSeen: 1 }]]);
    let scrambledSeen = 0;
    let typedSeen = 0;
    for (const ex of EXERCISES.filter((e) => e.kind === 'gap')) {
      const items = ex.items as DrillItem[];
      for (const seed of [1, 2]) {
        for (const q of buildGrammarQuestions({ kinds: ['compose'], exercises: [ex.id], length: 10, skills: known(`g:ex:${ex.id}`), level: 3 }, seeded(seed))) {
          const g = q.g!;
          const item = items.find((it) => it.fr === g.prompt)!;
          if (guesswork(item)) expect(g.mode, g.prompt).toBe('choice');
          if (g.mode !== 'type') continue;
          typedSeen++;
          const chip = g.chips?.find((c) => c.includes(' / '));
          if (!reorders(item)) {
            expect(chip, g.prompt).toBeUndefined();
            continue;
          }
          // the words to put in order, all of them, never already in the right order
          expect(chip, g.prompt).toBeDefined();
          const shown = chip!.split(' / ');
          expect([...shown].sort()).toEqual(g.answer.trim().split(/\s+/).sort());
          expect(shown.join(' ')).not.toBe(g.answer.trim());
          scrambledSeen++;
        }
      }
    }
    expect(typedSeen).toBeGreaterThan(100);
    expect(scrambledSeen).toBeGreaterThan(10);
  });

  it('a course round starts with the sentences she has not met, then the ones she got wrong', () => {
    const ex = EXERCISES.find((e) => e.kind === 'gap')!;
    const ids = ex.items.map((it) => it.id);
    const unmet = ids.slice(0, 3);
    const seen = new Map(ids.slice(3).map((id, i) => [`${ex.id}:${id}`, { t: 1000 + i, ok: true }]));
    const qs = buildGrammarQuestions({ kinds: ['compose'], exercises: [ex.id], length: 3, skills: new Map(), level: 3, seen }, seeded(2));
    // every question says which item it is, and the three she hasn't met come first
    for (const q of qs) expect(q.g!.item!.startsWith(`${ex.id}:`)).toBe(true);
    expect(qs.map((q) => q.g!.item!.split(':')[1]).sort()).toEqual([...unmet].sort());
    // all met: the ones she got wrong last time come back first
    const wrong = ids.slice(5, 7);
    const allSeen = new Map(ids.map((id, i) => [`${ex.id}:${id}`, { t: 1000 + i, ok: !wrong.includes(id) }]));
    const again = buildGrammarQuestions({ kinds: ['compose'], exercises: [ex.id], length: 2, skills: new Map(), level: 3, seen: allSeen }, seeded(3));
    expect(again.map((q) => q.g!.item!.split(':')[1]).sort()).toEqual([...wrong].sort());
    // then the ones seen longest ago
    const oldest = buildGrammarQuestions({ kinds: ['compose'], exercises: [ex.id], length: 1, skills: new Map(), level: 3, seen: new Map(ids.map((id, i) => [`${ex.id}:${id}`, { t: 1000 + i, ok: true }])) }, seeded(4));
    expect(ids.slice(0, Math.max(3, Math.ceil(ids.length / 4)))).toContain(oldest[0].g!.item!.split(':')[1]);
  });

  it('every verb chapter with endless practice fills its rounds, in its own tenses', () => {
    const chapters = new Set(COURSE_BY_ID.temps.chapters.map((c) => c.id));
    expect(Object.keys(ENDLESS).length).toBeGreaterThanOrEqual(12);
    for (const [id, e] of Object.entries(ENDLESS)) {
      expect(chapters, id).toContain(id);
      for (const [seed, level, band] of [[1, 3, 3], [2, 2, 2]] as const) {
        const qs = buildGrammarQuestions({ kinds: e.kinds, tenses: e.tenses, length: 20, skills: new Map(), level, minLevel: band }, seeded(seed));
        expect(qs.length, `${id} at level ${level}`).toBe(20);
        for (const q of qs) {
          expect(e.kinds, id).toContain(q.g!.kind);
          const tense = q.g!.skill.match(/^g:(?:conj|tense|id):(.+)$/)?.[1];
          if (tense) expect(e.tenses, `${id}: ${q.g!.skill}`).toContain(tense);
        }
      }
    }
  });

  it('a lesson that names an A1 tense still gets it above the floor', () => {
    const qs = buildGrammarQuestions({ kinds: ['conj'], length: 10, tenses: ['imperatif'], skills: new Map(), level: 2, minLevel: 2 }, seeded(3));
    expect(qs).toHaveLength(10);
    for (const q of qs) expect(q.g!.skill).toBe('g:conj:imperatif');
  });

  it('builds a full mixed round', () => {
    const qs = buildGrammarQuestions({ kinds: KINDS, length: 20, skills: new Map(), level: 2 }, seeded(4));
    expect(qs.length).toBe(20);
    expect(new Set(qs.map((q) => q.type)).size).toBeGreaterThan(4);
  });
});
