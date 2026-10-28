import { describe, expect, it } from 'vitest';
import { renderSentence } from '../../lib/grammar/render';
import { PERSONS, TENSES, type ExerciseKind, type Negation, type Person, type QForm, type QWord, type Tense } from '../../lib/grammar/types';
import { isPronominal, VERB_BY_INF } from '../../lib/grammar/verb-list';
import { FRAME_TOPICS, FRAMES } from './frames';
import { LESSONS } from './lessons';
import { QUESTIONS } from './questions';

const TENSE_IDS = TENSES.map((t) => t.id);
const DEFAULT_TENSES = TENSE_IDS.filter((t) => t !== 'passe_simple' && t !== 'subjonctif_passe');
const NEGATIONS: Negation[] = ['pas', 'jamais', 'plus', 'rien', 'personne'];
const QFORMS: QForm[] = ['intonation', 'est-ce-que', 'inversion'];
const QWORDS: QWord[] = [
  'qui', 'que', 'quoi', 'ou', 'quand', 'comment', 'pourquoi', 'combien', 'quel', 'lequel',
  'qu-est-ce-qui', 'd-ou', 'a-quelle-heure', 'depuis-quand', 'avec-qui',
];
const MAIN_QWORDS: QWord[] = ['qui', 'que', 'ou', 'quand', 'comment', 'pourquoi', 'combien', 'quel'];
const KINDS: ExerciseKind[] = ['conj', 'cloze', 'tense-id', 'transform', 'negate', 'qform', 'qword', 'qmatch', 'gtranslate', 'glisten'];
const UNITS = ['present', 'passe', 'futur', 'conditionnel', 'subjonctif', 'imperatif', 'negation', 'questions', 'bases'];
const TOPICS = FRAME_TOPICS.map((t) => t.id);
const IMPERATIVE_PERSONS: Person[] = ['2s', '1p', '2p'];
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const frameTenses = (f: (typeof FRAMES)[number]): Tense[] => f.tenses ?? DEFAULT_TENSES;
const framePersons = (f: (typeof FRAMES)[number]): Person[] => f.persons ?? PERSONS;

/** Every French string in the banks, with a label for error messages. */
function frenchStrings(): [string, string][] {
  const out: [string, string][] = [];
  for (const f of FRAMES) {
    out.push([`frame ${f.id} fr`, f.fr]);
    if (f.frNeg !== undefined) out.push([`frame ${f.id} frNeg`, f.frNeg]);
  }
  for (const q of QUESTIONS) {
    out.push([`question ${q.id} wordFr`, q.wordFr], [`question ${q.id} answer`, q.answer.fr]);
    for (const [k, v] of Object.entries(q.forms)) if (v !== undefined) out.push([`question ${q.id} ${k}`, v]);
  }
  for (const l of LESSONS) {
    out.push([`lesson ${l.id} title`, l.title]);
    for (const s of l.sections) {
      for (const e of s.examples ?? []) out.push([`lesson ${l.id} example`, e.fr]);
      for (const row of s.table?.rows ?? []) for (const cell of row) out.push([`lesson ${l.id} table`, cell]);
    }
  }
  return out;
}

/** Every English string, for the apostrophe and spacing checks. */
function englishStrings(): [string, string][] {
  const out: [string, string][] = [];
  for (const f of FRAMES) {
    out.push([`frame ${f.id} en`, f.en]);
    if (f.enNeg !== undefined) out.push([`frame ${f.id} enNeg`, f.enNeg]);
    if (f.enVerb !== undefined) out.push([`frame ${f.id} enVerb`, f.enVerb]);
  }
  for (const q of QUESTIONS) out.push([`question ${q.id} en`, q.en], [`question ${q.id} answer en`, q.answer.en]);
  for (const l of LESSONS) {
    out.push([`lesson ${l.id} en`, l.en], [`lesson ${l.id} intro`, l.intro]);
    for (const t of l.tips ?? []) out.push([`lesson ${l.id} tip`, t]);
    for (const s of l.sections) {
      out.push([`lesson ${l.id} heading`, s.heading], [`lesson ${l.id} body`, s.body]);
      for (const e of s.examples ?? []) out.push([`lesson ${l.id} example en`, e.en]);
    }
  }
  return out;
}

const unique = (ids: string[]) => ids.filter((id, i) => ids.indexOf(id) !== i);

describe('grammar content: sizes', () => {
  it('has enough frames, questions and lessons', () => {
    expect(FRAMES.length).toBeGreaterThanOrEqual(320);
    expect(QUESTIONS.length).toBeGreaterThanOrEqual(170);
    expect(LESSONS.length).toBeGreaterThanOrEqual(28);
  });

  it('uses unique, slug-shaped ids', () => {
    for (const ids of [FRAMES.map((f) => f.id), QUESTIONS.map((q) => q.id), LESSONS.map((l) => l.id)]) {
      expect(unique(ids)).toEqual([]);
      for (const id of ids) expect(id, id).toMatch(SLUG);
    }
  });
});

describe('grammar content: frames', () => {
  it('only use verbs from the verb list', () => {
    expect(FRAMES.filter((f) => !VERB_BY_INF[f.verb]).map((f) => `${f.id}: ${f.verb}`)).toEqual([]);
  });

  it('have valid persons, tenses, topics and levels', () => {
    for (const f of FRAMES) {
      for (const p of framePersons(f)) expect(PERSONS, `${f.id} person`).toContain(p);
      for (const t of frameTenses(f)) expect(TENSE_IDS, `${f.id} tense`).toContain(t);
      expect(frameTenses(f).length, `${f.id} tenses`).toBeGreaterThan(0);
      expect(new Set(frameTenses(f)).size, `${f.id} duplicate tense`).toBe(frameTenses(f).length);
      expect(TOPICS, `${f.id} topic`).toContain(f.topic);
      expect([1, 2, 3], `${f.id} level`).toContain(f.level);
      if (f.object) expect(['thing', 'person'], `${f.id} object`).toContain(f.object);
    }
  });

  it('only allow the imperative / passé simple when a fitting person exists', () => {
    for (const f of FRAMES) {
      if (frameTenses(f).includes('imperatif')) {
        expect(framePersons(f).some((p) => IMPERATIVE_PERSONS.includes(p)), `${f.id} imperative`).toBe(true);
      }
      if (frameTenses(f).includes('passe_simple')) {
        expect(framePersons(f).some((p) => p === '3s' || p === '3p'), `${f.id} passé simple`).toBe(true);
      }
    }
  });

  it('cover the textbook verbs, reflexives and the passé simple', () => {
    const book = new Set(FRAMES.map((f) => f.verb).filter((v) => VERB_BY_INF[v]?.source === 'book-er'));
    expect(book.size).toBeGreaterThanOrEqual(150);
    expect(FRAMES.filter((f) => isPronominal(f.verb)).length).toBeGreaterThanOrEqual(25);
    expect(FRAMES.filter((f) => frameTenses(f).includes('passe_simple')).length).toBeGreaterThanOrEqual(30);
  });

  it('spread over every topic', () => {
    for (const t of TOPICS) expect(FRAMES.filter((f) => f.topic === t).length, t).toBeGreaterThanOrEqual(20);
  });

  it('give frNeg when un / une / des change after a negative, and never after être', () => {
    for (const f of FRAMES) {
      if (f.verb === 'être') {
        expect(f.frNeg, `${f.id} frNeg after être`).toBeUndefined();
        continue;
      }
      // "un peu" is an adverb, not an article
      if (/^(un|une|des) (?!peu\b)/.test(f.fr)) expect(f.frNeg, `${f.id} needs frNeg`).toBeDefined();
      if (f.frNeg !== undefined) {
        expect(f.frNeg, `${f.id} frNeg = fr`).not.toBe(f.fr);
        expect(f.frNeg, `${f.id} frNeg article`).toMatch(/(^|\s)(de|d')/);
      }
      if (f.enNeg !== undefined) expect(f.enNeg, `${f.id} enNeg = en`).not.toBe(f.en);
    }
  });

  it('render in every allowed tense', () => {
    const failures: string[] = [];
    for (const f of FRAMES) {
      for (const tense of frameTenses(f)) {
        const persons = framePersons(f).filter(
          (p) => (tense !== 'imperatif' || IMPERATIVE_PERSONS.includes(p)) && (tense !== 'passe_simple' || p === '3s' || p === '3p'),
        );
        const ok = persons.some((person) => renderSentence(f, { tense, subject: { person, gender: 'f' }, rand: () => 0 }));
        if (!ok) failures.push(`${f.id} ${tense}`);
      }
    }
    expect(failures).toEqual([]);
  });
});

describe('grammar content: questions', () => {
  it('cover every question word', () => {
    for (const w of QWORDS) {
      const n = QUESTIONS.filter((q) => q.word === w).length;
      expect(n, w).toBeGreaterThanOrEqual(MAIN_QWORDS.includes(w) ? 12 : 5);
    }
  });

  it('are well formed', () => {
    for (const q of QUESTIONS) {
      expect(QWORDS, `${q.id} word`).toContain(q.word);
      expect(TOPICS, `${q.id} topic`).toContain(q.topic);
      expect([1, 2, 3], `${q.id} level`).toContain(q.level);
      const forms = [q.forms.estceque, q.forms.inversion, q.forms.intonation].filter((s): s is string => !!s);
      expect(forms.length, `${q.id} forms`).toBeGreaterThan(0);
      for (const form of forms) expect(form, `${q.id} form`).toMatch(/ \?$/);
      expect(
        forms.some((s) => s.toLowerCase().includes(q.wordFr.toLowerCase())),
        `${q.id}: "${q.wordFr}" not in any form`,
      ).toBe(true);
      expect(q.alsoOk ?? [], `${q.id} alsoOk`).not.toContain(q.word);
      for (const w of q.alsoOk ?? []) expect(QWORDS, `${q.id} alsoOk`).toContain(w);
      expect(q.en.trim(), `${q.id} en`).toMatch(/\?$/);
      expect(q.answer.fr.trim(), `${q.id} answer`).not.toBe('');
      expect(q.answer.en.trim(), `${q.id} answer en`).not.toBe('');
    }
  });
});

describe('grammar content: lessons', () => {
  it('are well formed', () => {
    for (const l of LESSONS) {
      expect(UNITS, `${l.id} unit`).toContain(l.unit);
      expect([1, 2, 3], `${l.id} level`).toContain(l.level);
      expect(l.title.trim() && l.en.trim() && l.intro.trim(), `${l.id} text`).toBeTruthy();
      expect(l.sections.length, `${l.id} sections`).toBeGreaterThanOrEqual(2);
      expect(l.sections.length, `${l.id} sections`).toBeLessThanOrEqual(5);
      expect((l.tips ?? []).length, `${l.id} tips`).toBeGreaterThanOrEqual(1);
      expect((l.tips ?? []).length, `${l.id} tips`).toBeLessThanOrEqual(3);
      for (const s of l.sections) {
        expect(s.heading.trim() && s.body.trim(), `${l.id} section`).toBeTruthy();
        expect((s.examples ?? []).length, `${l.id} examples`).toBeLessThanOrEqual(6);
        for (const row of s.table?.rows ?? []) expect(row.length, `${l.id} table row`).toBe(s.table!.head.length);
      }
      for (const text of [l.intro, ...(l.tips ?? []), ...l.sections.map((s) => s.body)]) {
        expect((text.match(/\*\*/g) ?? []).length % 2, `${l.id} unbalanced **`).toBe(0);
      }
    }
  });

  it('have valid practice specs', () => {
    for (const l of LESSONS) {
      const p = l.practice;
      expect(p.kinds.length, `${l.id} kinds`).toBeGreaterThan(0);
      for (const k of p.kinds) expect(KINDS, `${l.id} kind`).toContain(k);
      for (const t of p.tenses ?? []) expect(TENSE_IDS, `${l.id} tense`).toContain(t);
      for (const v of p.verbs ?? []) expect(VERB_BY_INF[v], `${l.id} verb ${v}`).toBeDefined();
      for (const n of p.negations ?? []) expect(NEGATIONS, `${l.id} negation`).toContain(n);
      for (const f of p.qforms ?? []) expect(QFORMS, `${l.id} qform`).toContain(f);
      for (const w of p.qwords ?? []) expect(QWORDS, `${l.id} qword`).toContain(w);
    }
  });

  it('cover every tense', () => {
    const covered = new Set(LESSONS.flatMap((l) => l.practice.tenses ?? []));
    expect(TENSE_IDS.filter((t) => !covered.has(t))).toEqual([]);
  });
});

describe('grammar content: typography', () => {
  it('uses straight apostrophes and no double or stray spaces', () => {
    for (const [label, s] of [...frenchStrings(), ...englishStrings()]) {
      expect(s, `${label}: curly apostrophe`).not.toMatch(/[’‘]/);
      expect(s, `${label}: double space`).not.toMatch(/ {2}/);
      expect(s, `${label}: non-breaking space`).not.toMatch(/[  ]/);
      expect(s, `${label}: leading/trailing space`).toBe(s.trim());
    }
  });

  it('puts a regular space before ? and ! in French', () => {
    for (const [label, s] of frenchStrings()) {
      for (let i = 0; i < s.length; i++) {
        if (s[i] !== '?' && s[i] !== '!') continue;
        expect(s[i - 1] === ' ' && s[i - 2] !== ' ', `${label}: "${s}"`).toBe(true);
      }
    }
  });
});
