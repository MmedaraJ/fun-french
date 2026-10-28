// French conjugation engine. Simple-tense tables come from src/data/grammar/verbs-fr.json
// (extracted from the Lefff lexicon by scripts/build-verbs.mjs); everything else — compound
// tenses, futur proche, passé récent, reflexive pronouns, negation, inversion, elision and
// past-participle agreement — is composed here.
import data from '../../data/grammar/verbs-fr.json';
import type { Negation, Person, Tense } from './types';
import { baseInf, isPronominal, normInf } from './verb-list';

export interface ConjugateOptions {
  gender?: 'm' | 'f';
  negation?: Negation;
  /** Include the subject pronoun (default true). false = verb group for a noun subject: "ne s'est pas levée". */
  pronoun?: boolean;
  /** Subject–verb inversion: "parles-tu", "a-t-elle mangé" (always with the pronoun, so after a noun it gives complex inversion: "Marie a-t-elle mangé"). null for 1s, the imperative and the subjunctive. */
  inversion?: boolean;
  // ---- additions used by the sentence renderer -------------------------------------------
  /** Force the auxiliary: transitive passer/monter/descendre/sortir/rentrer/retourner take avoir ("j'ai monté les valises"). Ignored for pronominal verbs. */
  aux?: 'avoir' | 'être';
  /** false = no past-participle agreement (reflexive with a direct object: "elle s'est brossé les dents"). Default true. */
  agree?: boolean;
  /** Adverb placed after the conjugated verb / auxiliary and the negation word: "j'avais déjà mangé", "je n'avais pas encore mangé". */
  adverb?: string;
  /** 3s subject "on" instead of il/elle ("va-t-on"). */
  on?: boolean;
  /** Preposition before rien/personne when they are its object; both then go last: "je n'ai parlé à personne", "je ne joue à rien". */
  negationPrep?: string;
}

type Slot = 'P' | 'I' | 'J' | 'F' | 'C' | 'S' | 'Y' | 'K';
type Forms = Record<Slot, (string | null)[]>;
interface VerbsData {
  order: string;
  models: string[];
  verbs: Record<string, number>;
}

const DATA = data as unknown as VerbsData;
const PI: Record<Person, number> = { '1s': 0, '2s': 1, '3s': 2, '1p': 3, '2p': 4, '3p': 5 };
const IMPERATIVE_PERSONS: Person[] = ['2s', '1p', '2p'];
const IMP_INDEX: Partial<Record<Person, number>> = { '2s': 0, '1p': 1, '2p': 2 };
const SUBJECT: Record<Person, [m: string, f: string]> = {
  '1s': ['je', 'je'],
  '2s': ['tu', 'tu'],
  '3s': ['il', 'elle'],
  '1p': ['nous', 'nous'],
  '2p': ['vous', 'vous'],
  '3p': ['ils', 'elles'],
};
const REFLEXIVE: Record<Person, string> = { '1s': 'me', '2s': 'te', '3s': 'se', '1p': 'nous', '2p': 'vous', '3p': 'se' };
const REFLEXIVE_STRESSED: Partial<Record<Person, string>> = { '2s': 'toi', '1p': 'nous', '2p': 'vous' };

const SIMPLE_SLOT: Partial<Record<Tense, Slot>> = {
  present: 'P',
  imparfait: 'I',
  passe_simple: 'J',
  futur_simple: 'F',
  conditionnel_present: 'C',
  subjonctif_present: 'S',
};
/** Tense of the auxiliary in each compound tense. */
const AUX_SLOT: Partial<Record<Tense, Slot>> = {
  passe_compose: 'P',
  plus_que_parfait: 'I',
  futur_anterieur: 'F',
  conditionnel_passe: 'C',
  subjonctif_passe: 'S',
};

/**
 * Verbs conjugated with être. passer, monter, descendre, sortir, rentrer and retourner are
 * listed too (the common A2 use: "je suis passé", "elle est montée"); with a direct object
 * they take avoir, which the renderer requests through the `aux` option.
 */
const ETRE_VERBS = new Set([
  'aller', 'venir', 'revenir', 'devenir', 'redevenir', 'parvenir', 'intervenir', 'survenir', 'provenir',
  'arriver', 'partir', 'repartir', 'entrer', 'rentrer', 'sortir', 'ressortir', 'monter', 'remonter',
  'descendre', 'redescendre', 'naître', 'renaître', 'mourir', 'décéder', 'rester', 'retourner',
  'tomber', 'retomber', 'passer', 'apparaître', 'advenir',
]);
/** The être verbs that become transitive (and take avoir) with a direct object. */
export const ETRE_AVOIR_VERBS = new Set(['passer', 'monter', 'descendre', 'sortir', 'rentrer', 'retourner', 'remonter', 'redescendre', 'ressortir']);
/** Impersonal verbs: only "il" (3s). */
const IMPERSONAL = new Set(['falloir', 'pleuvoir', 'neiger', 'grêler']);
/** Verbs starting with an aspirated h: no elision ("je hais", "il ne hurle pas"). */
const H_ASPIRE = new Set([
  'haïr', 'hacher', 'haleter', 'handicaper', 'hanter', 'happer', 'haranguer', 'harceler', 'harponner',
  'hasarder', 'hâter', 'hausser', 'hennir', 'hérisser', 'heurter', 'hisser', 'hocher', 'honnir',
  'hoqueter', 'huer', 'hululer', 'hurler',
]);

const cache = new Map<string, Forms | null>();

function forms(base: string): Forms | null {
  const hit = cache.get(base);
  if (hit !== undefined) return hit;
  const idx = DATA.verbs[base];
  let out: Forms | null = null;
  if (idx !== undefined) {
    const parts = DATA.models[idx].split('|');
    out = {} as Forms;
    DATA.order.split('').forEach((slot, i) => {
      const raw = parts[i] ?? '';
      (out as Forms)[slot as Slot] =
        raw === ''
          ? []
          : raw.split(',').map((e) => (e === '' ? null : base.slice(0, base.length - Number(e[0])) + e.slice(1)));
    });
  }
  cache.set(base, out);
  return out;
}

interface Parsed {
  inf: string;
  base: string;
  pronominal: boolean;
  forms: Forms;
}

function parse(inf: string): Parsed | null {
  const n = normInf(inf).normalize('NFC').toLowerCase().replace(/\s+/g, ' ');
  const pronominal = isPronominal(n);
  const base = baseInf(n);
  const f = forms(base);
  return f ? { inf: n, base, pronominal, forms: f } : null;
}

/** True when the engine knows this verb (normalises "s’appeler"). */
export function hasVerb(inf: string): boolean {
  return parse(inf) !== null;
}

export function isImpersonal(inf: string): boolean {
  return IMPERSONAL.has(baseInf(normInf(inf)));
}

export function auxiliary(inf: string): 'avoir' | 'être' {
  const n = normInf(inf).toLowerCase();
  return isPronominal(n) || ETRE_VERBS.has(baseInf(n)) ? 'être' : 'avoir';
}

export function pastParticiple(inf: string, gender: 'm' | 'f' = 'm', plural = false): string {
  const p = parse(inf);
  if (!p) return '';
  const k = p.forms.K;
  return k[(gender === 'f' ? 2 : 0) + (plural ? 1 : 0)] ?? k[0] ?? '';
}

// ---- elision ---------------------------------------------------------------------------

const VOWEL_START = /^[aeiouyàâäéèêëîïôöùûüœæ]/i;
const ELIDED: Record<string, string> = { je: "j'", ne: "n'", me: "m'", te: "t'", se: "s'", de: "d'", que: "qu'" };

/** Does `word` start with a vowel sound (vowel or mute h)? */
export function vowelSound(word: string, hAspire = false): boolean {
  if (VOWEL_START.test(word)) return true;
  return /^h/i.test(word) && !hAspire;
}

/** Join words, eliding je/ne/me/te/se/de/que before a vowel sound: "je ne ai" → "je n'ai". */
function joinElided(words: string[], hAspire: boolean): string {
  let out = '';
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    const next = words[i + 1];
    const el = ELIDED[w];
    if (el && next !== undefined && vowelSound(next, hAspire)) {
      out += el;
    } else {
      out += w + (i < words.length - 1 ? ' ' : '');
    }
  }
  return out;
}

// ---- composition -------------------------------------------------------------------------

function subjectPronoun(person: Person, gender: 'm' | 'f', on: boolean, impersonal: boolean): string {
  if (impersonal) return 'il';
  if (person === '3s' && on) return 'on';
  return SUBJECT[person][gender === 'f' ? 1 : 0];
}

/** "parles" → "parles-tu"; "parle" → "parle-t-il". */
function invert(finite: string, pronoun: string): string {
  const t = /^(il|elle|on)$/.test(pronoun) && /[aeiouéèêâ]$/.test(finite) ? 't-' : '';
  return `${finite}-${t}${pronoun}`;
}

/** "personne" (and rien/personne after a preposition) go after the participle or infinitive. */
function lateNegation(neg: Negation | undefined, opts: ConjugateOptions): string[] | null {
  if (neg === 'personne' || (neg === 'rien' && opts.negationPrep)) return opts.negationPrep ? [opts.negationPrep, neg] : [neg];
  return null;
}

function conjugateImperative(p: Parsed, person: Person, opts: ConjugateOptions): string | null {
  const i = IMP_INDEX[person];
  if (i === undefined || opts.inversion || IMPERSONAL.has(p.base)) return null;
  const form = p.forms.Y[i];
  if (!form) return null;
  const hAspire = H_ASPIRE.has(p.base);
  const neg = opts.negation;
  if (!neg) {
    const words = [p.pronominal ? `${form}-${REFLEXIVE_STRESSED[person]}` : form];
    if (opts.adverb) words.push(opts.adverb);
    return words.join(' ');
  }
  const late = lateNegation(neg, opts);
  const words = ['ne'];
  if (p.pronominal) words.push(REFLEXIVE[person]);
  words.push(form);
  if (!late) words.push(neg);
  if (opts.adverb) words.push(opts.adverb);
  if (late) words.push(...late);
  return joinElided(words, hAspire);
}

/** Full verb group in context, e.g. "je me suis levée", "nous ne parlerons pas", "a-t-il mangé", "va", "ne te lève pas". Returns null when the combination is impossible (imperative with 1s/3s/3p, inversion with 1s, etc.). */
export function conjugate(inf: string, tense: Tense, person: Person, opts: ConjugateOptions = {}): string | null {
  const p = parse(inf);
  if (!p) return null;
  const impersonal = IMPERSONAL.has(p.base);
  if (impersonal && person !== '3s') return null;
  if (tense === 'imperatif') return conjugateImperative(p, person, opts);

  const gender = opts.gender ?? 'm';
  const neg = opts.negation;
  const inversion = !!opts.inversion;
  if (inversion && (person === '1s' || tense === 'subjonctif_present' || tense === 'subjonctif_passe')) return null;
  if (tense === 'passe_recent' && neg && neg !== 'pas') return null;

  const pi = PI[person];
  const hAspire = H_ASPIRE.has(p.base);
  const pronoun = subjectPronoun(person, gender, !!opts.on, impersonal);
  const refl = p.pronominal ? REFLEXIVE[person] : null;

  let finite: string | null;
  let clitic: string | null = null; // reflexive pronoun before the conjugated verb
  let rest: string[] = []; // participle or infinitive group after it

  const simple = SIMPLE_SLOT[tense];
  const auxSlot = AUX_SLOT[tense];
  if (simple) {
    finite = p.forms[simple][pi];
    clitic = refl;
  } else if (auxSlot) {
    const aux = p.pronominal ? 'être' : (opts.aux ?? auxiliary(p.inf));
    finite = forms(aux)![auxSlot][pi];
    clitic = refl;
    const agree = aux === 'être' && opts.agree !== false;
    const plural = person === '1p' || person === '2p' || person === '3p';
    const k = p.forms.K;
    rest = [(agree ? k[(gender === 'f' ? 2 : 0) + (plural ? 1 : 0)] : k[0]) ?? k[0] ?? ''];
  } else if (tense === 'futur_proche' || tense === 'passe_recent') {
    finite = forms(tense === 'futur_proche' ? 'aller' : 'venir')!.P[pi];
    if (tense === 'passe_recent') rest.push('de');
    if (refl) rest.push(refl);
    rest.push(p.base);
  } else {
    return null;
  }
  if (!finite || rest.some((w) => !w)) return null;

  const words: string[] = [];
  if (!inversion && opts.pronoun !== false) words.push(pronoun);
  const late = lateNegation(neg, opts);
  if (neg) words.push('ne');
  if (clitic) words.push(clitic);
  words.push(inversion ? invert(finite, pronoun) : finite);
  if (neg && !late) words.push(neg);
  if (opts.adverb) words.push(opts.adverb);
  words.push(...rest);
  if (late) words.push(...late);
  return joinElided(words, hAspire);
}

/** Forms with subject pronouns for a lesson table: { '1s': "je parle", ... } (imperative: only 2s/1p/2p keys). Subjunctive forms start with "que": "que je parle", "qu'il parle". */
export function conjugationTable(inf: string, tense: Tense): Partial<Record<Person, string>> | null {
  const p = parse(inf);
  if (!p) return null;
  const persons: Person[] =
    tense === 'imperatif' ? IMPERATIVE_PERSONS : IMPERSONAL.has(p.base) ? ['3s'] : ['1s', '2s', '3s', '1p', '2p', '3p'];
  const out: Partial<Record<Person, string>> = {};
  for (const person of persons) {
    const form = conjugate(inf, tense, person);
    if (!form) continue;
    out[person] = tense.startsWith('subjonctif') ? (vowelSound(form) ? "qu'" : 'que ') + form : form;
  }
  return Object.keys(out).length ? out : null;
}
