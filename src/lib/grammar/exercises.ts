// Grammar questions generated from the conjugation engine, the sentence frames
// and the question bank. Nothing here plays or shows the answer before the
// learner responds: audio is only the question in the listening exercise.
import { FRAMES } from '../../data/grammar/frames';
import { QUESTIONS } from '../../data/grammar/questions';
import type { Card, GrammarType, Progress } from '../../types';
import { decapitalize, normalizeAnswer, sentenceTokens } from '../french';
import { shuffle, type Question } from '../engine/round';
import { auxiliary, conjugate, pastParticiple } from './conjugate';
import { englishClause, englishVerb } from './english';
import { renderSentence, type Rendered } from './render';
import {
  PERSONS,
  QWORD_LABEL,
  TENSE_BY_ID,
  TENSES,
  type Frame,
  type Lesson,
  type Negation,
  type Person,
  type QAItem,
  type QForm,
  type QWord,
  type Subject,
  type Tense,
} from './types';
import { tensesAtLevel } from '../level';
import { VERBS, VERB_BY_INF } from './verb-list';

export interface GrammarPayload {
  kind: GrammarType;
  /** Spaced-repetition skill this question trains, e.g. "g:tense:imparfait". */
  skill: string;
  /** Instruction, French · English. */
  title: string;
  /** Main prompt text; "____" marks a gap. */
  prompt?: string;
  /** A second line under the prompt (e.g. the answer to a question in "qword"). */
  promptSub?: string;
  /** Small labels: subject, infinitive, tense... */
  chips?: string[];
  mode: 'choice' | 'type' | 'tiles';
  options?: string[];
  /** Optional second line for each option (e.g. English tense names). */
  optionSubs?: string[];
  /** Canonical answer. */
  answer: string;
  /** Other typed answers that count as right (gender variants, without the pronoun...). */
  accept?: string[];
  /** Spoken as the question (listening exercise only). */
  audio?: string;
  /** Shown after answering. */
  reveal: { fr: string; en: string };
  /** Grammar reminder shown in the feedback. */
  note?: string;
}

export interface GrammarConfig {
  kinds: GrammarType[];
  length: number;
  tenses?: Tense[];
  verbs?: string[];
  /** Which verbs conjugation drills use when `verbs` isn't given. */
  verbSet?: 'book' | 'core' | 'all';
  negations?: Negation[];
  qforms?: QForm[];
  qwords?: QWord[];
  /** Skill progress, for spaced repetition and difficulty. */
  skills: Map<string, Progress>;
  /** 1 beginner, 2 A2, 3 B1 – typing comes earlier at higher levels. */
  level: 1 | 2 | 3;
  /**
   * Level floor (1 A1, 2 A2, 3 B1): below it, tenses, plain "ne… pas", the easy ways to ask
   * and the easy question-bank items are left out, unless a lesson asks for them by name.
   */
  minLevel?: 1 | 2 | 3;
}

type Rand = () => number;

const pick = <T,>(arr: readonly T[], rand: Rand): T => arr[Math.floor(rand() * arr.length)];

function pickWeighted<T>(items: readonly T[], weight: (t: T) => number, rand: Rand): T | undefined {
  const ws = items.map((t) => Math.max(0, weight(t)));
  const total = ws.reduce((a, b) => a + b, 0);
  if (!total) return undefined;
  let r = rand() * total;
  for (let i = 0; i < items.length; i++) {
    r -= ws[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

const uniq = (xs: (string | null | undefined)[]): string[] => [...new Set(xs.filter((x): x is string => !!x))];

/* ------------------------------------------------------------------ tenses */

const TENSE_WEIGHT: Record<1 | 2 | 3, number> = { 1: 3, 2: 2.5, 3: 1.3 };

/** Tenses each exercise can use. Passé simple is recognition only. */
const KIND_TENSES: Partial<Record<GrammarType, Tense[]>> = {
  conj: TENSES.map((t) => t.id).filter((t) => t !== 'passe_simple'),
  cloze: TENSES.map((t) => t.id).filter((t) => t !== 'passe_simple'),
  'tense-id': TENSES.map((t) => t.id).filter((t) => t !== 'imperatif'),
  transform: TENSES.map((t) => t.id).filter((t) => t !== 'passe_simple' && t !== 'imperatif'),
  negate: ['present', 'passe_compose', 'imparfait', 'futur_proche', 'futur_simple', 'conditionnel_present', 'imperatif', 'plus_que_parfait'],
  qform: ['present', 'passe_compose', 'futur_proche', 'futur_simple', 'imparfait', 'conditionnel_present'],
  gtranslate: TENSES.map((t) => t.id).filter((t) => t !== 'passe_simple' && t !== 'subjonctif_passe'),
  glisten: ['present', 'passe_compose', 'imparfait', 'futur_proche', 'futur_simple', 'conditionnel_present', 'plus_que_parfait', 'passe_recent', 'conditionnel_passe'],
};

/** Tenses a learner mixes up, used for wrong options. */
const CONFUSABLE: Record<Tense, Tense[]> = {
  present: ['imparfait', 'passe_compose', 'futur_simple', 'subjonctif_present'],
  passe_compose: ['imparfait', 'plus_que_parfait', 'present', 'passe_recent'],
  imparfait: ['passe_compose', 'conditionnel_present', 'present', 'plus_que_parfait'],
  plus_que_parfait: ['passe_compose', 'imparfait', 'conditionnel_passe'],
  passe_simple: ['passe_compose', 'imparfait', 'present'],
  futur_simple: ['conditionnel_present', 'futur_proche', 'present'],
  futur_anterieur: ['futur_simple', 'conditionnel_passe', 'passe_compose'],
  futur_proche: ['futur_simple', 'passe_recent', 'present'],
  passe_recent: ['passe_compose', 'futur_proche', 'present'],
  conditionnel_present: ['futur_simple', 'imparfait', 'conditionnel_passe'],
  conditionnel_passe: ['plus_que_parfait', 'futur_anterieur', 'conditionnel_present'],
  subjonctif_present: ['present', 'imparfait', 'subjonctif_passe'],
  subjonctif_passe: ['passe_compose', 'subjonctif_present'],
  imperatif: ['present', 'futur_simple'],
};

function skillWeight(skills: Map<string, Progress>, id: string): number {
  const p = skills.get(id);
  if (!p || p.seen === 0) return 1.4;
  const dueBoost = p.due <= Date.now() ? 1.5 : 1;
  const weak = p.box <= 1 ? 1.4 : p.box <= 3 ? 1 : 0.6;
  return weak * dueBoost;
}

function pickTense(cfg: GrammarConfig, kind: GrammarType, skillPrefix: string, rand: Rand): Tense | undefined {
  const allowed = KIND_TENSES[kind] ?? TENSES.map((t) => t.id);
  const atLevel = tensesAtLevel(cfg.minLevel ?? 1);
  const pool = cfg.tenses?.length ? allowed.filter((t) => cfg.tenses!.includes(t)) : allowed.filter((t) => atLevel.includes(t));
  return pickWeighted(pool, (t) => TENSE_WEIGHT[TENSE_BY_ID[t].level] * skillWeight(cfg.skills, `${skillPrefix}:${t}`), rand);
}

/**
 * Multiple choice while a skill is new; typing once it's known. Difficile types from the
 * second time on, Normal once it's learned, Facile only when it's solid.
 */
function answerMode(cfg: GrammarConfig, skill: string, rand: Rand, canTiles = false): 'choice' | 'type' | 'tiles' {
  const box = cfg.skills.get(skill)?.box ?? 0;
  const typeFrom = cfg.level >= 3 ? 1 : cfg.level === 2 ? 2 : 3;
  if (box >= typeFrom && rand() < (cfg.level >= 3 ? 0.8 : 0.7)) return 'type';
  if (canTiles && box >= (cfg.level >= 2 ? 0 : 1) && rand() < 0.5) return 'tiles';
  return 'choice';
}

/** Wrong options: 3 at Facile, 4 at Normal, 5 at Difficile (4 when the options are whole sentences). */
function wrongCount(cfg: GrammarConfig, sentences = false): number {
  const n = cfg.level >= 3 ? 5 : cfg.level === 2 ? 4 : 3;
  return sentences ? Math.min(n, 4) : n;
}

/** Wrong word tiles: more of them as the difficulty goes up. */
const tileDecoys = (cfg: GrammarConfig) => (cfg.level >= 3 ? 4 : cfg.level === 2 ? 3 : 2);

/* ---------------------------------------------------------------- subjects */

const PRONOUN: Record<Person, { m: string; f: string }> = {
  '1s': { m: 'je', f: 'je' },
  '2s': { m: 'tu', f: 'tu' },
  '3s': { m: 'il', f: 'elle' },
  '1p': { m: 'nous', f: 'nous' },
  '2p': { m: 'vous', f: 'vous' },
  '3p': { m: 'ils', f: 'elles' },
};

const NOUN_SUBJECTS: Subject[] = [
  { person: '3s', gender: 'f', fr: 'Marie', en: 'Marie' },
  { person: '3s', gender: 'm', fr: 'Paul', en: 'Paul' },
  { person: '3s', gender: 'm', fr: 'mon frère', en: 'my brother' },
  { person: '3s', gender: 'f', fr: 'ma sœur', en: 'my sister' },
  { person: '3s', gender: 'f', fr: 'la voisine', en: 'the neighbour' },
  { person: '3p', gender: 'm', fr: 'mes parents', en: 'my parents' },
  { person: '3p', gender: 'f', fr: 'mes amies', en: 'my friends' },
  { person: '3p', gender: 'm', fr: 'les enfants', en: 'the children' },
];

const DEFAULT_FRAME_TENSES: Tense[] = TENSES.map((t) => t.id).filter((t) => t !== 'passe_simple' && t !== 'subjonctif_passe');

function frameTenses(f: Frame): Tense[] {
  return f.tenses ?? DEFAULT_FRAME_TENSES;
}

function personsFor(f: Frame, tense: Tense): Person[] {
  let ps = f.persons ?? PERSONS;
  if (tense === 'imperatif') ps = ps.filter((p) => p === '2s' || p === '1p' || p === '2p');
  if (tense === 'passe_simple') ps = ps.filter((p) => p === '3s' || p === '3p');
  return ps;
}

function pickSubject(f: Frame, tense: Tense, rand: Rand, opts: { nouns?: boolean; avoid1s?: boolean } = {}): Subject | null {
  let persons = personsFor(f, tense);
  if (opts.avoid1s) persons = persons.filter((p) => p !== '1s');
  if (!persons.length) return null;
  if (opts.nouns !== false && tense !== 'imperatif' && rand() < 0.25) {
    // never "Les enfants gardent les enfants": the subject's noun can't be in the complement
    const head = (s: Subject) => s.fr!.split(' ').pop()!.toLowerCase();
    const nouns = NOUN_SUBJECTS.filter((s) => persons.includes(s.person) && !` ${f.fr.toLowerCase()} `.includes(` ${head(s)} `));
    if (nouns.length) return pick(nouns, rand);
  }
  return { person: pick(persons, rand), gender: rand() < 0.5 ? 'm' : 'f' };
}

function subjectChip(s: Subject, tense: Tense): string {
  if (s.fr) return s.fr;
  if (tense === 'imperatif') return { '2s': 'tu', '1p': 'nous', '2p': 'vous' }[s.person as '2s' | '1p' | '2p'] ?? PRONOUN[s.person].m;
  return PRONOUN[s.person][s.gender];
}

function pickFrame(tense: Tense, rand: Rand, used: Set<string>, filter: (f: Frame) => boolean = () => true): Frame | undefined {
  const pool = FRAMES.filter((f) => frameTenses(f).includes(tense) && personsFor(f, tense).length && filter(f));
  const fresh = pool.filter((f) => !used.has(f.id));
  const f = pick(fresh.length ? fresh : pool, rand);
  if (f) used.add(f.id);
  return f;
}

function render(frame: Frame, tense: Tense, subject: Subject, extra: { negation?: Negation; qform?: QForm; cue?: boolean } = {}, rand?: Rand): Rendered | null {
  try {
    // a subjunctive only makes sense after its trigger ("Il faut que…"), so it always keeps its cue
    const cue = extra.cue ?? tense.startsWith('subjonctif');
    return renderSentence(frame, { tense, subject, negation: extra.negation, qform: extra.qform, cue: cue || tense.startsWith('subjonctif'), rand });
  } catch {
    return null;
  }
}

/* --------------------------------------------------------- shared helpers */

let seq = 0;
function card(skill: string, fr: string, en: string): Card {
  return { id: skill, deckId: 'grammar', kind: 'sentence', fr, en, source: 'starter', order: 0, createdAt: 0, updatedAt: 0 };
}

function question(g: GrammarPayload, extra: Partial<Question> = {}): Question {
  return { key: `g${++seq}-${Date.now().toString(36)}`, type: g.kind, card: card(g.skill, g.reveal.fr, g.reveal.en), isNew: false, g, ...extra } as Question;
}

/** "je" + "aime" -> "j'aime" (also before a mute h). */
function withPronoun(pronoun: string, verb: string): string {
  if (/^(je|me|te|se|ne)$/i.test(pronoun) && /^[aeiouyhâàäéèêëîïôöûùüœ]/i.test(verb)) return pronoun.slice(0, -1) + "'" + verb;
  return `${pronoun} ${verb}`;
}

/** A classic learner mistake: the right pronoun with another person's verb form ("je mangera"). */
function personMistake(inf: string, tense: Tense, person: Person, gender: 'm' | 'f', rand: Rand): string | null {
  if (tense === 'imperatif') return null;
  const wrong = pick(PERSONS.filter((p) => p !== person && p[0] !== person[0]), rand);
  const bare = conjugate(inf, tense, wrong, { gender, pronoun: false });
  if (!bare) return null;
  return withPronoun(PRONOUN[person][gender], bare);
}

/** The other auxiliary in the passé composé ("j'ai allé", "je suis mangé"). */
function auxMistake(inf: string, person: Person, gender: 'm' | 'f'): string | null {
  if (/^(se |s'|s’)/.test(inf)) return null;
  const aux = conjugate(auxiliary(inf) === 'être' ? 'avoir' : 'être', 'present', person, { gender, pronoun: false });
  if (!aux) return null;
  return withPronoun(PRONOUN[person][gender], `${aux} ${pastParticiple(inf)}`);
}

function optionsFrom(
  correct: string,
  candidates: (string | null | undefined)[],
  rand: Rand,
  n = 3,
  exclude: string[] = [],
  /** Used, in order, only when the candidates give fewer than n wrong options. */
  fallback: (string | null | undefined)[] = [],
): string[] {
  const norm = (s: string) => normalizeAnswer(s);
  const bad = new Set([correct, ...exclude].map(norm));
  const chosen: string[] = [];
  const take = (list: string[]) => {
    for (const c of list) {
      if (chosen.length >= n) break;
      if (bad.has(norm(c)) || chosen.some((x) => norm(x) === norm(c))) continue;
      chosen.push(c);
    }
  };
  take(shuffle(uniq(candidates), rand));
  take(uniq(fallback));
  return shuffle([correct, ...chosen], rand);
}

/** Gives an option the same opening case as the answer, so capitals never point at it. */
function sameCase(option: string | null | undefined, like: string): string | null {
  if (!option) return null;
  const upper = like[0] === like[0].toUpperCase() && like[0] !== like[0].toLowerCase();
  return upper ? option[0].toUpperCase() + option.slice(1) : decapitalize(option);
}

/** Word tiles for a sentence: the opening capital is dropped so it doesn't mark the first tile. */
function tilesOf(fr: string): string[] {
  const t = sentenceTokens(fr);
  if (t.length) t[0] = decapitalize(t[0]);
  return t;
}

/** Wrong word tiles taken from other forms of the verb, all lowercase like the answer tiles. */
function decoyTiles(forms: (string | null | undefined)[], answerTiles: string[], n = 2): string[] {
  return uniq(forms.flatMap((v) => (v ? sentenceTokens(v).map(decapitalize) : [])))
    .filter((t) => !answerTiles.some((a) => a.toLowerCase() === t.toLowerCase()))
    .slice(0, n);
}

/** "Mets au présent", "Mets à l'imparfait". */
function auTense(t: Tense): string {
  const fr = TENSE_BY_ID[t].fr;
  return /^[aeiouéèêî]/i.test(fr) ? `à l'${fr}` : `au ${fr}`;
}

const FALLBACK_TENSES: Tense[] = ['present', 'imparfait', 'passe_compose', 'futur_simple', 'conditionnel_present', 'futur_proche'];

function tenseNote(t: Tense): string {
  const info = TENSE_BY_ID[t];
  return `${cap(info.fr)} — ${info.use}.`;
}

const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

/* ------------------------------------------------------------- generators */

type Gen = (cfg: GrammarConfig, rand: Rand, used: Set<string>) => Question | null;

const BOOK = VERBS.filter((v) => v.source === 'book-er');
const CORE = VERBS.filter((v) => v.source === 'core');
const IMPERSONAL = new Set(['pleuvoir', 'falloir']);

/** Conjugation drill: subject + infinitive + tense → the form. */
const genConj: Gen = (cfg, rand) => {
  const tense = pickTense(cfg, 'conj', 'g:conj', rand);
  if (!tense) return null;
  const pool = cfg.verbs?.length
    ? cfg.verbs.map((v) => VERB_BY_INF[v]).filter(Boolean)
    : cfg.verbSet === 'book'
      ? BOOK
      : cfg.verbSet === 'core'
        ? CORE
        : rand() < 0.55
          ? BOOK
          : CORE;
  const verb = pick(pool, rand);
  if (!verb || (IMPERSONAL.has(verb.inf) && tense === 'imperatif')) return null;
  let persons: Person[] = tense === 'imperatif' ? ['2s', '1p', '2p'] : PERSONS;
  if (IMPERSONAL.has(verb.inf)) persons = ['3s'];
  const person = pick(persons, rand);
  const gender: 'm' | 'f' = IMPERSONAL.has(verb.inf) || rand() < 0.5 ? 'm' : 'f';
  // the subjunctive is drilled with its "que", as in the lesson tables ("que je parle")
  const subj = tense.startsWith('subjonctif');
  const withQue = (f: string | null) => (f && subj ? (/^[aeiouyhéèêà]/i.test(f) ? "qu'" : 'que ') + f : f);
  const plain = conjugate(verb.inf, tense, person, { gender });
  const form = withQue(plain);
  if (!form || !plain) return null;
  const otherGender = withQue(conjugate(verb.inf, tense, person, { gender: gender === 'm' ? 'f' : 'm' }));
  const bare = conjugate(verb.inf, tense, person, { gender, pronoun: false });
  const ambiguous = !!otherGender && otherGender !== form && person !== '3s' && person !== '3p';
  const skill = `g:conj:${tense}`;
  const mode = answerMode(cfg, skill, rand) === 'type' ? 'type' : 'choice';
  const info = TENSE_BY_ID[tense];
  const subjectLabel = tense === 'imperatif' ? `(${PRONOUN[person].m})` : PRONOUN[person][gender];
  const candidates = [
    // with a subjunctive target every option gets its "que", so only the verb form decides
    ...(CONFUSABLE[tense] ?? []).map((t) => withQue(conjugate(verb.inf, t, person, { gender }))),
    withQue(personMistake(verb.inf, tense, person, gender, rand)),
    tense === 'passe_compose' ? auxMistake(verb.inf, person, gender) : null,
    // imperative: the present form without its pronoun ("manges") and another person ("mangez")
    tense === 'imperatif' ? conjugate(verb.inf, 'present', person, { pronoun: false }) : null,
    tense === 'imperatif' ? conjugate(verb.inf, 'imperatif', person === '2p' ? '2s' : '2p') : null,
  ];
  const en = englishClause(englishVerb(verb.en), tense, person, { gender });
  return question({
    kind: 'conj',
    skill,
    title: 'Conjugue · Conjugate',
    chips: [subjectLabel, verb.inf, info.fr],
    mode,
    options: mode === 'choice' ? optionsFrom(form, candidates, rand, wrongCount(cfg), otherGender ? [otherGender] : []) : undefined,
    answer: form,
    accept: uniq([form, plain, bare, ambiguous ? otherGender : null, ambiguous && otherGender ? otherGender.replace(/^(que |qu')?\S+\s/, '') : null]),
    reveal: { fr: ambiguous ? `${form} / ${otherGender}` : form, en },
    note: `${cap(info.fr)} of ${verb.inf} (${verb.en}). ${info.use}.`,
  });
};

/** A sentence with the verb gapped; the time cue tells which tense. */
const genCloze: Gen = (cfg, rand, used) => {
  const tense = pickTense(cfg, 'cloze', 'g:tense', rand);
  if (!tense) return null;
  const frame = pickFrame(tense, rand, used);
  if (!frame) return null;
  const subject = pickSubject(frame, tense, rand);
  if (!subject) return null;
  const r = render(frame, tense, subject, { cue: true }, rand);
  if (!r || !r.verbFr || !r.fr.includes(r.verbFr)) return null;
  const skill = `g:tense:${tense}`;
  const mode = answerMode(cfg, skill, rand) === 'type' ? 'type' : 'choice';
  const bare = conjugate(frame.verb, tense, subject.person, { gender: subject.gender, pronoun: false });
  const altTenses = uniq([...(CONFUSABLE[tense] ?? []), ...FALLBACK_TENSES]).filter((t) => t !== tense) as Tense[];
  const alternatives =
    tense === 'imperatif'
      ? // no pronoun in any option, so the form decides: "allumes" (the -s stays), "allumez" (wrong person)
        [
          conjugate(frame.verb, 'present', subject.person, { pronoun: false }),
          ...(['2s', '1p', '2p'] as Person[]).filter((p) => p !== subject.person).map((p) => conjugate(frame.verb, 'imperatif', p)),
          conjugate(frame.verb, 'futur_simple', subject.person, { pronoun: false }),
        ].map((v) => sameCase(v, r.verbFr))
      : altTenses.map((t) => sameCase(render(frame, t, subject, {})?.verbFr, r.verbFr));
  // Time words alone often allow two tenses ("Hier, j'ai mangé" / "je mangeais"), so the tense is named:
  // exactly one option is right, and the cue shows how the tense is used.
  const chips = [subjectChip(subject, tense), frame.verb, TENSE_BY_ID[tense].fr];
  const firstChoice = tense === 'imperatif' ? 3 : (CONFUSABLE[tense] ?? []).length;
  return question({
    kind: 'cloze',
    skill,
    title: 'Complète avec le verbe · Fill in the verb',
    prompt: `${r.before}____${r.after}`,
    chips: subject.fr ? chips.slice(1) : chips,
    mode,
    options:
      mode === 'choice'
        ? optionsFrom(
            r.verbFr,
            // the classic mistakes first (confusable tenses, wrong person), then other tenses to make four
            [...alternatives.slice(0, firstChoice), subject.fr ? null : sameCase(personMistake(frame.verb, tense, subject.person, subject.gender, rand), r.verbFr)],
            rand,
            wrongCount(cfg),
            [],
            alternatives.slice(firstChoice),
          )
        : undefined,
    answer: r.verbFr,
    accept: uniq([r.verbFr, bare, r.verbFr.replace(/\s+déjà\b/, ''), bare?.replace(/\s+déjà\b/, '')]),
    reveal: { fr: r.fr, en: r.en },
    note: tenseNote(tense),
  });
};

/** Which tense is this? (no time words, so it's about the form) */
const genTenseId: Gen = (cfg, rand, used) => {
  const tense = pickTense(cfg, 'tense-id', 'g:id', rand);
  if (!tense) return null;
  const frame = pickFrame(tense, rand, used);
  if (!frame) return null;
  const subject = pickSubject(frame, tense, rand);
  if (!subject) return null;
  const r = render(frame, tense, subject, { cue: false }, rand);
  if (!r) return null;
  // e.g. "que je parle" (subjonctif) vs "je parle" (présent): skip forms another tense shares
  const lookalike = (t: Tense) => {
    const other = render(frame, t, subject, { cue: false });
    return !!other && normalizeAnswer(other.fr) === normalizeAnswer(r.fr);
  };
  const candidates = uniq([...(CONFUSABLE[tense] ?? []), ...shuffle(TENSES.map((t) => t.id), rand)]).filter((t) => t !== tense && t !== 'imperatif') as Tense[];
  if (candidates.some(lookalike)) return null;
  const wrong = shuffle(candidates, rand).slice(0, wrongCount(cfg));
  const opts = shuffle([tense, ...wrong], rand);
  return question({
    kind: 'tense-id',
    skill: `g:id:${tense}`,
    title: 'Quel temps ? · Which tense?',
    prompt: r.fr,
    mode: 'choice',
    options: opts.map((t) => TENSE_BY_ID[t].fr),
    optionSubs: opts.map((t) => TENSE_BY_ID[t].en),
    answer: TENSE_BY_ID[tense].fr,
    reveal: { fr: r.fr, en: r.en },
    note: tenseNote(tense),
  });
};

/** Rewrite the sentence in another tense. */
const genTransform: Gen = (cfg, rand, used) => {
  const target = pickTense(cfg, 'transform', 'g:tense', rand);
  if (!target) return null;
  const frame = pickFrame(target, rand, used, (f) => frameTenses(f).includes('present'));
  if (!frame) return null;
  const subject = pickSubject(frame, target, rand);
  if (!subject) return null;
  const source: Tense = target === 'present' ? pick(['passe_compose', 'futur_simple', 'imparfait'] as Tense[], rand) : 'present';
  if (!frameTenses(frame).includes(source)) return null;
  const src = render(frame, source, subject);
  const dst = render(frame, target, subject);
  if (!src || !dst) return null;
  const skill = `g:tense:${target}`;
  const mode = answerMode(cfg, skill, rand, true);
  const info = TENSE_BY_ID[target];
  const subjunctive = target.startsWith('subjonctif');
  // the subjunctive needs its trigger ("Il faut que…"), which the learner can't guess: it's given
  const trigger = subjunctive ? dst.before.slice(0, dst.before.length - (subject.fr ? subject.fr.length + 1 : 0)).trim() : '';
  const confusable = (CONFUSABLE[target] ?? []).filter((t) => t !== source);
  // after the trigger, the wrong options keep it and only the verb changes ("Il faut que tu viens")
  const others = subjunctive
    ? uniq([...confusable, ...FALLBACK_TENSES])
        .filter((t) => !t.startsWith('subjonctif'))
        .map((t) => render(frame, t as Tense, subject)?.verbFr)
        .map((v) => (v ? `${dst.before}${sameCase(v, 'a')}${dst.after}` : null))
    : confusable.map((t) => render(frame, t, subject)?.fr);
  const fallback = FALLBACK_TENSES.filter((t) => t !== source && t !== target).map((t) => render(frame, t, subject)?.fr);
  const answerTiles = tilesOf(dst.fr);
  const decoys = decoyTiles(confusable.map((t) => render(frame, t, subject)?.verbFr), answerTiles, tileDecoys(cfg));
  return question(
    {
      kind: 'transform',
      skill,
      title: `Mets ${auTense(target)} · Put it in the ${info.en}`,
      prompt: src.fr,
      chips: trigger ? [info.fr, `${trigger}${trigger.endsWith("'") ? '' : ' '}…`] : [info.fr],
      mode,
      options: mode === 'choice' ? optionsFrom(dst.fr, others, rand, wrongCount(cfg, true), [src.fr], subjunctive ? [] : fallback) : undefined,
      answer: dst.fr,
      accept: uniq([dst.fr, dst.fr.replace(/\s+déjà\b/, '')]),
      reveal: { fr: dst.fr, en: dst.en },
      note: tenseNote(target),
    },
    mode === 'tiles' ? { tiles: shuffle([...answerTiles, ...decoys], rand), answer: answerTiles } : {},
  );
};

const NEG_LABEL: Record<Negation, string> = {
  pas: 'ne… pas',
  jamais: 'ne… jamais (never)',
  plus: 'ne… plus (no longer)',
  rien: 'ne… rien (nothing)',
  personne: 'ne… personne (nobody)',
};

/** Make the sentence negative (pas / jamais / plus / rien / personne). */
const genNegate: Gen = (cfg, rand, used) => {
  const above = (cfg.minLevel ?? 1) >= 2 && !cfg.negations?.length;
  const weights: Record<Negation, number> = above ? { pas: 1, jamais: 3, plus: 3, rien: 2, personne: 2 } : { pas: 4, jamais: 2, plus: 2, rien: 1.5, personne: 1.5 };
  let negation = (cfg.negations?.length ? pick(cfg.negations, rand) : pickWeighted<Negation>(['pas', 'jamais', 'plus', 'rien', 'personne'], (n) => weights[n], rand)) ?? 'pas';
  const tense = pickTense(cfg, 'negate', `g:neg:${negation}`, rand);
  if (!tense) return null;
  // above A1, plain "ne… pas" only where its place is the point: around the auxiliary
  if (above && negation === 'pas' && !TENSE_BY_ID[tense].compound) negation = pick(['jamais', 'plus'] as Negation[], rand);
  const needs = negation === 'rien' ? 'thing' : negation === 'personne' ? 'person' : null;
  const frame = pickFrame(tense, rand, used, (f) => !needs || f.object === needs);
  if (!frame) return null;
  const subject = pickSubject(frame, tense, rand);
  if (!subject) return null;
  const aff = render(frame, tense, subject);
  const neg = render(frame, tense, subject, { negation });
  if (!aff || !neg) return null;
  const skill = `g:neg:${negation}`;
  const mode = answerMode(cfg, skill, rand, true);
  const wrong: (string | null)[] = [];
  // the negation word in the wrong place ("je n'ai mangé pas", "je ne pas mange")
  const end = neg.fr.match(/\s*[.!?]$/)?.[0] ?? '';
  const toks = neg.fr.slice(0, neg.fr.length - end.length).split(' ');
  const ni = toks.indexOf(negation);
  if (ni > 0 && negation !== 'personne') {
    const moved = [...toks];
    const [w] = moved.splice(ni, 1);
    if (TENSE_BY_ID[tense].compound && ni < moved.length) moved.splice(ni + 1, 0, w);
    else if (/^n'/i.test(moved[ni - 1] ?? '')) moved.splice(ni - 1, 1, moved[ni - 1].slice(0, 1) + 'e', w, moved[ni - 1].slice(2));
    else moved.splice(Math.max(1, ni - 1), 0, w);
    wrong.push(moved.join(' ') + end);
  }
  // the article not changed after the negation ("pas une pomme")
  if (frame.frNeg && frame.fr && neg.fr.includes(frame.frNeg)) wrong.push(neg.fr.replace(frame.frNeg, frame.fr));
  // another negation word
  for (const other of shuffle(['pas', 'jamais', 'plus'] as Negation[], rand)) {
    if (other !== negation) wrong.push(render(frame, tense, subject, { negation: other })?.fr ?? null);
  }
  const answerTiles = tilesOf(neg.fr);
  const decoys = decoyTiles(
    [negation === 'pas' ? 'jamais' : 'pas', negation === 'plus' ? 'pas' : 'plus', frame.frNeg && frame.fr ? sentenceTokens(frame.fr)[0] : null, 'ne', "n'"],
    answerTiles,
    tileDecoys(cfg),
  );
  return question(
    {
      kind: 'negate',
      skill,
      title: `Forme négative · Make it negative`,
      chips: [NEG_LABEL[negation]],
      prompt: aff.fr,
      mode,
      options: mode === 'choice' ? optionsFrom(neg.fr, wrong, rand, wrongCount(cfg, true)) : undefined,
      answer: neg.fr,
      accept: uniq([neg.fr, neg.fr.replace(/\s+encore\b/, '')]),
      reveal: { fr: neg.fr, en: neg.en },
      note:
        negation === 'personne'
          ? 'Personne goes after the past participle: je n’ai vu personne.'
          : frame.frNeg
            ? `After a negation, un/une/des/du/de la become de (d’): ${frame.frNeg}.`
            : `Ne goes before the conjugated verb (or the auxiliary), ${negation} right after it.`,
    },
    mode === 'tiles' ? { tiles: shuffle([...answerTiles, ...decoys], rand), answer: answerTiles } : {},
  );
};

const QFORM_LABEL: Record<QForm, { fr: string; en: string }> = {
  intonation: { fr: 'intonation', en: 'rising voice' },
  'est-ce-que': { fr: 'est-ce que', en: '“est-ce que”' },
  inversion: { fr: 'inversion', en: 'inversion' },
};

/** Turn the statement into a question with the requested form. */
const genQForm: Gen = (cfg, rand, used) => {
  // above A1 it's mostly inversion; intonation (the statement with a rising voice) is left out
  const qWeights: Record<QForm, number> = (cfg.minLevel ?? 1) >= 2 ? { inversion: 4, 'est-ce-que': 1, intonation: 0 } : { inversion: 3, 'est-ce-que': 2, intonation: 1 };
  const qform = (cfg.qforms?.length ? pick(cfg.qforms, rand) : pickWeighted<QForm>(['inversion', 'est-ce-que', 'intonation'], (q) => qWeights[q], rand)) ?? 'inversion';
  const tense = pickTense(cfg, 'qform', `g:qf:${qform}`, rand);
  if (!tense) return null;
  const frame = pickFrame(tense, rand, used);
  if (!frame) return null;
  const subject = pickSubject(frame, tense, rand, { avoid1s: true });
  if (!subject) return null;
  const stmt = render(frame, tense, subject);
  const q = render(frame, tense, subject, { qform });
  if (!stmt || !q) return null;
  // intonation is the statement with a rising voice, so it's practised by undoing an inversion instead
  const fromForm: QForm | undefined = qform === 'intonation' ? 'inversion' : undefined;
  const from = fromForm ? render(frame, tense, subject, { qform: fromForm }) : stmt;
  if (!from) return null;
  const others = (['intonation', 'est-ce-que', 'inversion'] as QForm[])
    .filter((f) => f !== qform && f !== fromForm)
    .map((f) => render(frame, tense, subject, { qform: f })?.fr);
  const broken: (string | null)[] = [];
  const inv = qform === 'inversion' ? q.fr : render(frame, tense, subject, { qform: 'inversion' })?.fr;
  if (inv && /-t-/.test(inv)) broken.push(inv.replace('-t-', '-'));
  if (inv) {
    const [first, ...rest] = inv.split(' ');
    broken.push(['Est-ce que', decapitalize(first), ...rest].join(' '));
  }
  const skill = `g:qf:${qform}`;
  const typed = answerMode(cfg, skill, rand) === 'type';
  return question({
    kind: 'qform',
    skill,
    title: fromForm ? 'Pose la question autrement · Ask it another way' : 'Pose la question · Ask the question',
    chips: [QFORM_LABEL[qform].fr],
    prompt: from.fr,
    mode: typed ? 'type' : 'choice',
    // the other (valid) forms aren't what was asked for, so they make good wrong options
    options: typed ? undefined : optionsFrom(q.fr, [...broken, ...others], rand, wrongCount(cfg, true), [from.fr]),
    answer: q.fr,
    reveal: { fr: q.fr, en: q.en },
    note:
      qform === 'inversion'
        ? 'Inversion: verb-subject with a hyphen; add -t- between two vowels (parle-t-il ?).'
        : qform === 'est-ce-que'
          ? 'Est-ce que + the normal sentence (est-ce qu’ before a vowel).'
          : 'Intonation: the normal sentence, with your voice going up at the end.',
  });
};

function questionForms(item: QAItem): { form: string; text: string }[] {
  return (['estceque', 'inversion', 'intonation'] as const)
    .map((k) => ({ form: k, text: item.forms[k] ?? '' }))
    .filter((x) => x.text);
}

const LETTER = /[a-zàâäçéèêëîïôöùûüœæ]/i;

/** Blanks the question word as a whole word ("quel" never matches inside "quelle"). */
function blankWord(text: string, wordFr: string): string | null {
  const lower = text.toLowerCase();
  const w = wordFr.toLowerCase();
  for (let idx = lower.indexOf(w); idx >= 0; idx = lower.indexOf(w, idx + 1)) {
    const before = text[idx - 1] ?? ' ';
    const after = text[idx + w.length] ?? ' ';
    if (!LETTER.test(before) && (!LETTER.test(after) || w.endsWith("'"))) return text.slice(0, idx) + '____' + text.slice(idx + w.length);
  }
  return null;
}

function caseLike(word: string, sentenceInitial: boolean): string {
  return sentenceInitial ? word[0].toUpperCase() + word.slice(1) : word[0].toLowerCase() + word.slice(1);
}

/** Pick the question word that fits the answer. */
/** Question-bank items at the level floor (the bank tops out at A2), or all of them if none fit. */
function questionBank(cfg: GrammarConfig): QAItem[] {
  const floor = Math.min(cfg.minLevel ?? 1, 2);
  const atLevel = QUESTIONS.filter((q) => q.level >= floor && (!cfg.qwords?.length || cfg.qwords.includes(q.word)));
  return atLevel.length ? atLevel : QUESTIONS.filter((q) => !cfg.qwords?.length || cfg.qwords.includes(q.word));
}

const genQWord: Gen = (cfg, rand, used) => {
  const pool = questionBank(cfg).filter((q) => !used.has(q.id));
  const item = pickWeighted(pool, (q) => skillWeight(cfg.skills, `g:qw:${q.word}`), rand);
  if (!item) return null;
  used.add(item.id);
  const forms = shuffle(questionForms(item), rand)
    .map((f) => ({ ...f, blank: blankWord(f.text, item.wordFr) }))
    .filter((f) => f.blank);
  const f = forms[0];
  if (!f?.blank) return null;
  const initial = f.blank.startsWith('____');
  const answer = caseLike(item.wordFr, initial);
  const bad = new Set<QWord>([item.word, ...(item.alsoOk ?? [])]);
  // the agreement is part of the question: quel/quelle/quels/quelles, lequel/laquelle/lesquels/lesquelles
  const siblings = /^quel/i.test(item.wordFr)
    ? ['quel', 'quelle', 'quels', 'quelles']
    : /^(lequel|laquelle|lesquel)/i.test(item.wordFr)
      ? ['lequel', 'laquelle', 'lesquels', 'lesquelles']
      : [];
  const others = QUESTIONS.filter((q) => !bad.has(q.word)).map((q) => q.wordFr);
  const sibs = siblings.filter((w) => w.toLowerCase() !== item.wordFr.toLowerCase());
  const opts = optionsFrom(
    answer,
    // two wrong agreements when there are some, the rest other question words
    shuffle(sibs, rand).slice(0, 2).map((w) => caseLike(w, initial)),
    rand,
    wrongCount(cfg),
    [],
    shuffle(others, rand).map((w) => caseLike(w, initial)),
  );
  return question({
    kind: 'qword',
    skill: `g:qw:${item.word}`,
    title: 'Quel mot interrogatif ? · Which question word?',
    prompt: f.blank,
    promptSub: `— ${item.answer.fr}`,
    mode: 'choice',
    options: opts,
    answer,
    reveal: { fr: `${f.text} — ${item.answer.fr}`, en: `${item.en} — ${item.answer.en}` },
    note: `${QWORD_LABEL[item.word]}: ${item.en}`,
  });
};

/** Choose the answer that fits the question. */
const genQMatch: Gen = (cfg, rand, used) => {
  const pool = questionBank(cfg).filter((q) => !used.has(q.id));
  const item = pickWeighted(pool, (q) => skillWeight(cfg.skills, `g:qa:${q.word}`), rand);
  if (!item) return null;
  used.add(item.id);
  const form = pick(questionForms(item), rand);
  if (!form) return null;
  const others = QUESTIONS.filter((q) => q.word !== item.word && !(item.alsoOk ?? []).includes(q.word)).map((q) => q.answer.fr);
  return question({
    kind: 'qmatch',
    skill: `g:qa:${item.word}`,
    title: 'Quelle est la bonne réponse ? · Pick the right answer',
    prompt: form.text,
    mode: 'choice',
    options: optionsFrom(item.answer.fr, others, rand, wrongCount(cfg, true)),
    answer: item.answer.fr,
    reveal: { fr: `${form.text} — ${item.answer.fr}`, en: `${item.en} — ${item.answer.en}` },
  });
};

/** English sentence → build or type the French. */
const genTranslate: Gen = (cfg, rand, used) => {
  const tense = pickTense(cfg, 'gtranslate', 'g:tense', rand);
  if (!tense) return null;
  const frame = pickFrame(tense, rand, used);
  if (!frame) return null;
  const subject = pickSubject(frame, tense, rand);
  if (!subject) return null;
  const negation = rand() < 0.2 && tense !== 'passe_recent' ? 'pas' : undefined;
  const qform = !negation && tense !== 'imperatif' && subject.person !== '1s' && rand() < 0.15 ? 'est-ce-que' : undefined;
  const withCue = rand() < 0.5;
  const seed = rand();
  const r = render(frame, tense, subject, { negation, qform, cue: withCue }, () => seed);
  if (!r) return null;
  const skill = `g:tense:${tense}`;
  const typed = answerMode(cfg, skill, rand) === 'type' && cfg.level >= 2;
  // the English can't show tu/vous, ils/elles, the speaker's gender or how the question is asked
  const variants: Subject[] = subject.fr
    ? [subject]
    : [
        { person: subject.person, gender: subject.gender === 'm' ? 'f' : 'm' },
        ...(subject.person === '2s' || subject.person === '2p' ? (['m', 'f'] as const).map((gender) => ({ person: subject.person === '2s' ? '2p' : '2s', gender }) as Subject) : []),
      ];
  const qforms: (QForm | undefined)[] = qform ? ['est-ce-que', 'intonation', 'inversion'] : [undefined];
  const accept = typed
    ? uniq([
        r.fr,
        ...[subject, ...variants].flatMap((sub) => qforms.map((qf) => render(frame, tense, sub, { negation, qform: qf, cue: withCue }, () => seed)?.fr)),
      ])
    : undefined;
  const answerTiles = tilesOf(r.fr);
  const decoys = decoyTiles((CONFUSABLE[tense] ?? []).map((t) => render(frame, t, subject, { negation, qform })?.verbFr), answerTiles, tileDecoys(cfg));
  return question(
    {
      kind: 'gtranslate',
      skill,
      title: 'Traduis en français · Translate into French',
      prompt: r.en,
      mode: typed ? 'type' : 'tiles',
      answer: r.fr,
      accept,
      reveal: { fr: r.fr, en: r.en },
      note: tenseNote(tense),
    },
    typed ? {} : { tiles: shuffle([...answerTiles, ...decoys], rand), answer: answerTiles },
  );
};

/** Hear a sentence, pick what it means (the tense decides). */
const genListen: Gen = (cfg, rand, used) => {
  const tense = pickTense(cfg, 'glisten', 'g:listen', rand);
  if (!tense) return null;
  const frame = pickFrame(tense, rand, used);
  if (!frame) return null;
  const subject = pickSubject(frame, tense, rand, { nouns: false });
  if (!subject) return null;
  const r = render(frame, tense, subject);
  if (!r) return null;
  const homophone = (t: Tense) =>
    subject.person === '1s' &&
    ((tense === 'futur_simple' && t === 'conditionnel_present') || (tense === 'conditionnel_present' && t === 'futur_simple') ||
      (tense === 'futur_anterieur' && t === 'conditionnel_passe') || (tense === 'conditionnel_passe' && t === 'futur_anterieur'));
  const others = [
    ...(CONFUSABLE[tense] ?? []).filter((t) => !homophone(t)).map((t) => render(frame, t, subject)?.en),
    render(frame, tense, subject, { negation: 'pas' })?.en,
  ];
  return question({
    kind: 'glisten',
    skill: `g:listen:${tense}`,
    title: 'Écoute : ça veut dire… ? · Listen: what does it mean?',
    mode: 'choice',
    audio: r.fr,
    options: optionsFrom(r.en, others, rand, wrongCount(cfg, true)),
    answer: r.en,
    reveal: { fr: r.fr, en: r.en },
    note: tenseNote(tense),
  });
};

const GENERATORS: Record<GrammarType, Gen> = {
  conj: genConj,
  cloze: genCloze,
  'tense-id': genTenseId,
  transform: genTransform,
  negate: genNegate,
  qform: genQForm,
  qword: genQWord,
  qmatch: genQMatch,
  gtranslate: genTranslate,
  glisten: genListen,
};

const KIND_WEIGHT: Record<GrammarType, number> = {
  conj: 3,
  cloze: 4,
  'tense-id': 2,
  transform: 2.5,
  negate: 2,
  qform: 2,
  qword: 3,
  qmatch: 2,
  gtranslate: 3,
  glisten: 2,
};

/** Build a round of grammar questions; never repeats a frame or question item. */
export function buildGrammarQuestions(cfg: GrammarConfig, rand: Rand = Math.random): Question[] {
  const out: Question[] = [];
  const used = new Set<string>();
  const kinds = cfg.kinds.length ? cfg.kinds : (Object.keys(GENERATORS) as GrammarType[]);
  let attempts = 0;
  while (out.length < cfg.length && attempts < cfg.length * 15) {
    attempts++;
    const kind = pickWeighted(kinds, (k) => KIND_WEIGHT[k], rand);
    if (!kind) break;
    let q: Question | null = null;
    try {
      q = GENERATORS[kind](cfg, rand, used);
    } catch {
      q = null;
    }
    if (!q?.g) continue;
    // never two identical prompts in one round
    if (out.some((o) => o.g!.prompt && o.g!.prompt === q!.g!.prompt && o.g!.answer === q!.g!.answer)) continue;
    out.push(q);
  }
  return out;
}

/** One practice covering several lessons (the grammar her book teaches). */
export function mergePractice(list: Lesson['practice'][]): Lesson['practice'] | undefined {
  if (!list.length) return undefined;
  const union = <T,>(get: (p: Lesson['practice']) => T[] | undefined): T[] | undefined => {
    const all = list.flatMap((p) => get(p) ?? []);
    return all.length ? [...new Set(all)] : undefined;
  };
  return {
    kinds: union((p) => p.kinds) ?? [],
    tenses: union((p) => p.tenses),
    verbs: union((p) => p.verbs),
    negations: union((p) => p.negations),
    qforms: union((p) => p.qforms),
    qwords: union((p) => p.qwords),
  };
}

/** Skills a lesson trains, for its mastery ring. */
export function lessonSkillIds(practice: { kinds: GrammarType[]; tenses?: Tense[]; negations?: Negation[]; qforms?: QForm[]; qwords?: QWord[] }): string[] {
  const ids: string[] = [];
  for (const t of practice.tenses ?? []) ids.push(`g:conj:${t}`, `g:tense:${t}`, `g:id:${t}`);
  for (const n of practice.negations ?? []) ids.push(`g:neg:${n}`);
  for (const f of practice.qforms ?? []) ids.push(`g:qf:${f}`);
  for (const w of practice.qwords ?? []) ids.push(`g:qw:${w}`, `g:qa:${w}`);
  return ids;
}

export { TENSES, TENSE_BY_ID, VERBS };
