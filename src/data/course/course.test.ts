import { describe, expect, it } from 'vitest';
import { normalizeAnswer, sentenceTokens } from '../../lib/french';
import type { BuildItem, DrillItem } from '../../lib/grammar/types';
import { DRILL_SETS } from '../grammar/drills';
import { CHAPTERS as ALL_CHAPTERS, COURSES, EXERCISES as ALL_EXERCISES } from './index';

// COURSE_CHAPTERS=id1,id2 checks only those chapters (while others are still being written)
const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env;
const only = env?.COURSE_CHAPTERS?.split(',').filter(Boolean);
const CHAPTERS = only?.length ? ALL_CHAPTERS.filter((c) => only.includes(c.id)) : ALL_CHAPTERS;
const EXERCISES = only?.length ? ALL_EXERCISES.filter((e) => only.includes(e.chapter.id)) : ALL_EXERCISES;

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const GAP = '____';
const dupes = (xs: string[]) => xs.filter((x, i) => xs.indexOf(x) !== i);
const gapItems = EXERCISES.flatMap((e) => (e.kind === 'gap' ? e.items.map((it) => ({ e, it: it as DrillItem, where: `${e.id}/${it.id}` })) : []));
const buildItems = EXERCISES.flatMap((e) => (e.kind === 'build' ? e.items.map((it) => ({ e, it: it as BuildItem, where: `${e.id}/${it.id}` })) : []));

/** French typography: straight apostrophes, single spaces, a space before ? ! : ; (and none before . ,). */
function frenchTypo(s: string, where: string) {
  expect(s, `${where}: curly apostrophe`).not.toMatch(/[’‘]/);
  expect(s, `${where}: double space`).not.toMatch(/ {2}/);
  expect(s, `${where}: leading/trailing space`).toBe(s.trim());
  expect(s, `${where}: space before ? ! : ;`).not.toMatch(/[^\s«][?!:;]/);
  expect(s, `${where}: space before . or ,`).not.toMatch(/ [.,]/);
}

describe('Construire des phrases: chapters', () => {
  it('runs from chapter 1 with unique ids', () => {
    if (!only?.length) {
      expect(COURSES.find((c) => c.id === 'phrases')!.chapters.length).toBeGreaterThanOrEqual(16);
      expect(COURSES.find((c) => c.id === 'temps')!.chapters.length).toBeGreaterThanOrEqual(18);
      for (const course of COURSES) course.chapters.forEach((c, i) => expect(c.num, c.id).toBe(i + 1));
    }
    expect(dupes(CHAPTERS.map((c) => c.id))).toEqual([]);
    for (const c of CHAPTERS) expect(c.id, c.id).toMatch(SLUG);
    expect(dupes(EXERCISES.map((e) => e.id))).toEqual([]);
  });

  it('are detailed lessons', () => {
    for (const c of CHAPTERS) {
      expect([2, 3, 4], `${c.id} level`).toContain(c.level);
      expect(c.title.trim() && c.en.trim() && c.intro.trim(), `${c.id} text`).toBeTruthy();
      expect(c.sections.length, `${c.id} sections`).toBeGreaterThanOrEqual(3);
      expect(c.sections.length, `${c.id} sections`).toBeLessThanOrEqual(6);
      expect(c.tips.length, `${c.id} tips`).toBeGreaterThanOrEqual(2);
      expect(c.tips.length, `${c.id} tips`).toBeLessThanOrEqual(4);
      for (const s of c.sections) {
        expect(s.heading.trim() && s.body.trim(), `${c.id} section`).toBeTruthy();
        expect((s.examples ?? []).length, `${c.id} examples`).toBeLessThanOrEqual(6);
        for (const row of s.table?.rows ?? []) expect(row.length, `${c.id} table row`).toBe(s.table!.head.length);
        for (const e of s.examples ?? []) frenchTypo(e.fr, `${c.id} example`);
      }
      for (const text of [c.intro, ...c.tips, ...c.sections.map((s) => s.body)]) {
        expect((text.match(/\*\*/g) ?? []).length % 2, `${c.id} unbalanced **`).toBe(0);
      }
    }
  });

  it('each have gap and build exercises: at least 50 items each, 200 in all', () => {
    for (const c of CHAPTERS) {
      expect(c.exercises.length, `${c.id} exercises`).toBeGreaterThanOrEqual(3);
      expect(c.exercises.some((e) => e.kind === 'gap'), `${c.id} gap exercise`).toBe(true);
      expect(c.exercises.filter((e) => e.kind === 'build').length, `${c.id} build exercises`).toBeGreaterThanOrEqual(2);
      expect(c.exercises.reduce((n, e) => n + e.items.length, 0), `${c.id} items`).toBeGreaterThanOrEqual(200);
      for (const e of c.exercises) {
        expect(e.id.startsWith(`${c.id}-`), `${e.id} prefix`).toBe(true);
        expect(e.id, e.id).toMatch(SLUG);
        expect(e.title.trim() && e.en.trim(), `${e.id} title`).toBeTruthy();
        expect(e.items.length, `${e.id} items`).toBeGreaterThanOrEqual(50);
        const ids = e.items.map((it) => it.id);
        expect(dupes(ids), `${e.id} item ids`).toEqual([]);
        for (const id of ids) expect(id, `${e.id}/${id}`).toMatch(SLUG);
      }
    }
  });
});

describe('Construire des phrases: gap items', () => {
  it('have one gap and a filler never also offered as wrong', () => {
    for (const { it, where } of gapItems) {
      expect(it.fr.split(GAP).length - 1, `${where}: one "${GAP}"`).toBe(1);
      expect(it.fr, `${where}: five underscores`).not.toMatch(/_{5,}/);
      expect(it.answer, where).toBe(it.answer.trim());
      expect(it.answer, where).not.toBe('');
      expect(it.wrong.length, `${where}: wrong options`).toBeGreaterThanOrEqual(2);
      const right = [it.answer, ...(it.accept ?? [])].map(normalizeAnswer);
      const wrong = it.wrong.map(normalizeAnswer);
      expect(dupes(wrong), `${where}: duplicate wrong options`).toEqual([]);
      for (const w of wrong) expect(right, `${where}: "${w}" is both right and wrong`).not.toContain(w);
      expect(it.en.trim(), `${where} en`).toMatch(/[.?!]$/);
      expect(it.why.trim(), `${where} why`).not.toBe('');
      const full = it.fr.replace(GAP, it.answer);
      expect(full, `${where}: sentence end`).toMatch(/[.?!»]$/);
      frenchTypo(full, where);
      for (const w of [it.answer, ...(it.accept ?? []), ...it.wrong]) {
        const filled = it.fr.replace(GAP, w);
        expect(filled, `${where}: missing elision in "${filled}"`).not.toMatch(/(^|[\s'’])(que|de|je|le|la|ne|se|me|te|ce) (il|ils|on|elle|elles|a|ai|as|avez|avons|ont|est|es|un|une|eu|été)\b/i);
        expect(filled, `${where}: missing elision in "${filled}"`).not.toMatch(/(^|[\s'’])(que|de|je|ne|se|me|te) (en|y)\b|(^|[\s'’])si (il|ils)\b/i);
      }
    }
  });
});

describe('Construire des phrases: build items', () => {
  it('build one clear sentence, with wrong versions that are really wrong', () => {
    for (const { it, where } of buildItems) {
      expect(it.from.trim(), `${where} from`).not.toBe('');
      expect(it.from, `${where} from: curly apostrophe`).not.toMatch(/[’‘]/);
      expect(it.from, `${where} from: double space`).not.toMatch(/ {2}/);
      for (const s of [it.answer, ...(it.accept ?? []), ...it.wrong]) {
        expect(s, `${where}: sentence end`).toMatch(/[.?!»]$/);
        frenchTypo(s, where);
      }
      const n = sentenceTokens(it.answer).length;
      expect(n, `${where}: ${n} words to build`).toBeGreaterThanOrEqual(3);
      expect(n, `${where}: ${n} words to build`).toBeLessThanOrEqual(18);
      expect(it.wrong.length, `${where}: wrong versions`).toBeGreaterThanOrEqual(2);
      const right = [it.answer, ...(it.accept ?? [])].map(normalizeAnswer);
      const wrong = it.wrong.map(normalizeAnswer);
      expect(dupes(wrong), `${where}: duplicate wrong versions`).toEqual([]);
      for (const w of wrong) expect(right, `${where}: "${w}" is both right and wrong`).not.toContain(w);
      const answerWords = new Set(sentenceTokens(it.answer).map((t) => t.toLowerCase()));
      for (const d of it.decoys ?? []) expect(answerWords.has(d.toLowerCase()), `${where}: decoy "${d}" is in the answer`).toBe(false);
      expect(it.en.trim(), `${where} en`).toMatch(/[.?!]$/);
      expect(it.why.trim(), `${where} why`).not.toBe('');
    }
  });
});

describe('Courses: every sentence once', () => {
  it('no sentence is used twice in the two courses or the Structures drills', () => {
    const uses = new Map<string, string[]>();
    const add = (sentence: string, where: string) => {
      const k = normalizeAnswer(sentence);
      uses.set(k, [...(uses.get(k) ?? []), where]);
    };
    for (const e of ALL_EXERCISES) {
      for (const it of e.items) add(e.kind === 'gap' ? (it as DrillItem).fr.replace(GAP, (it as DrillItem).answer) : (it as BuildItem).answer, `${e.id}/${it.id}`);
    }
    for (const d of DRILL_SETS) for (const it of d.items) add(it.fr.replace(GAP, it.answer), `drill:${d.id}/${it.id}`);
    // only the chapters being checked: a clash involving one of them
    const mine = new Set(EXERCISES.map((e) => e.id));
    const clashes = [...uses.entries()].filter(([, where]) => where.length > 1 && where.some((w) => mine.has(w.split('/')[0]))).map(([k, where]) => `${where.join(' = ')}: ${k}`);
    expect(clashes).toEqual([]);
  });
});
