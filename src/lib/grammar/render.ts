// Sentence renderer: puts a Frame (verb + complement) into a tense, person, negation and
// question form, in French and English, with a time/context cue that makes the tense
// inferable ("Hier, j'ai mangé une pomme." / "Yesterday, I ate an apple.").
//
// Optional notation inside frame complements (fr, frNeg, en, enNeg, enVerb):
//   {content|contente}               masculine | feminine form, chosen from the subject's gender
//   {content|contente|contents|contentes}  m.sg | f.sg | m.pl | f.pl (1p, 2p, 3p are plural)
//   {mon} {ma} {mes}                 possessive agreeing with the subject: mon/ton/son/notre/votre/leur…
//   {my} {myself}                    English possessive / reflexive agreeing with the subject
import { conjugate, ETRE_AVOIR_VERBS, hasVerb, isImpersonal, vowelSound, type ConjugateOptions } from './conjugate';
import { englishBare, englishObject, englishParts, englishPossessive, englishReflexive, englishVerb, participlePhrase } from './english';
import { PERSONS, type Frame, type Negation, type Person, type QForm, type Subject, type Tense } from './types';
import { baseInf, isPronominal, normInf, VERB_BY_INF } from './verb-list';

export interface Rendered {
  fr: string; // "Hier, j'ai mangé une pomme."
  en: string; // "Yesterday, I ate an apple."
  verbFr: string; // the conjugated verb group exactly as it appears inside fr ("j'ai mangé" or, with a noun subject, "a mangé"), so the UI can blank it
  before: string; // fr text before verbFr
  after: string; // fr text after verbFr (complement + punctuation)
  tense: Tense;
  person: Person;
  negation?: Negation;
  qform?: QForm;
}

type Polarity = Negation | 'none';

export interface Cue {
  fr: string;
  en: string;
  aspect?: 'habitual' | 'progressive';
  /** Clause persons the cue fits (default: all). */
  persons?: Person[];
  /** Polarities the cue fits; 'none' = affirmative (default: all). */
  neg?: Polarity[];
  /** false = statements only. */
  q?: false;
  /** Subjunctive trigger — how the English is built: "you have to eat" (must), "my mother wants you to eat" (want), "it's good that you have eaten" (that). */
  sub?: 'must' | 'want' | 'that';
  /** Person of the trigger's own subject: never paired with the same clause person ("Je veux que je…" needs an infinitive). */
  self?: Person;
  /** An interrupting event: needs an action in progress, not a state ("When the phone rang, they believed…"). */
  interrupt?: boolean;
}

const ALL_BUT = (...x: Polarity[]): Polarity[] =>
  (['none', 'pas', 'jamais', 'plus', 'rien', 'personne'] as Polarity[]).filter((n) => !x.includes(n));
/** A precise time ("Hier", "Ce soir") doesn't go with jamais / plus. */
const DATED = ALL_BUT('jamais', 'plus');

/** Time/context cues per tense, so the tense can be inferred from the sentence. */
export const CUES: Record<Tense, Cue[]> = {
  present: [
    { fr: "D'habitude,", en: 'Usually,', aspect: 'habitual', neg: ALL_BUT('plus') },
    { fr: 'Le week-end,', en: 'At the weekend,', aspect: 'habitual' },
    { fr: 'Le soir,', en: 'In the evening,', aspect: 'habitual' },
    { fr: 'En général,', en: 'In general,', aspect: 'habitual', neg: ALL_BUT('plus') },
    { fr: 'Maintenant,', en: 'Now,', neg: ['plus'] },
  ],
  passe_compose: [
    { fr: 'Hier,', en: 'Yesterday,', neg: DATED },
    { fr: 'Le week-end dernier,', en: 'Last weekend,', neg: DATED },
    { fr: 'Ce matin,', en: 'This morning,', neg: DATED },
    { fr: 'Après ça,', en: 'After that,', neg: ['plus'] },
    { fr: "Jusqu'à présent,", en: 'So far,', neg: ['jamais'] },
  ],
  imparfait: [
    { fr: 'Autrefois,', en: 'In the past,', aspect: 'habitual', neg: ALL_BUT('plus') },
    { fr: "Quand j'étais enfant,", en: 'When I was a child,', aspect: 'habitual', persons: ['1s'], neg: ALL_BUT('plus') },
    { fr: 'Quand nous étions enfants,', en: 'When we were children,', aspect: 'habitual', persons: ['1p'], neg: ALL_BUT('plus') },
    { fr: 'À cette époque,', en: 'At that time,', aspect: 'habitual' },
    { fr: 'À ce moment-là,', en: 'At that moment,', aspect: 'progressive', neg: DATED },
    { fr: 'Quand le téléphone a sonné,', en: 'When the phone rang,', aspect: 'progressive', neg: DATED, interrupt: true },
  ],
  plus_que_parfait: [
    { fr: 'Ce jour-là,', en: 'That day,', neg: DATED },
    { fr: 'À midi,', en: 'By noon,', neg: DATED },
    { fr: 'Avant ce voyage,', en: 'Before that trip,', neg: ['jamais'] },
  ],
  passe_simple: [{ fr: 'Il y a très longtemps,', en: 'A very long time ago,', persons: ['3s', '3p'], neg: DATED }],
  futur_simple: [
    { fr: "L'année prochaine,", en: 'Next year,', neg: DATED },
    { fr: 'Demain,', en: 'Tomorrow,', neg: DATED },
    { fr: 'Un jour,', en: 'One day,', neg: ['none'] },
    { fr: "À l'avenir,", en: 'In the future,', neg: ['jamais'] },
    { fr: 'À partir de demain,', en: 'From tomorrow,', neg: ['plus'] },
  ],
  futur_anterieur: [
    { fr: "D'ici demain,", en: 'By tomorrow,' },
    { fr: 'Dans une heure,', en: 'In an hour,' },
    { fr: "D'ici la fin de la semaine,", en: 'By the end of the week,' },
  ],
  futur_proche: [
    { fr: 'Ce soir,', en: 'Tonight,', neg: DATED },
    { fr: 'Demain matin,', en: 'Tomorrow morning,', neg: DATED },
    { fr: 'Bientôt,', en: 'Soon,', neg: ['none'] },
    { fr: 'À partir de maintenant,', en: 'From now on,', neg: ['plus'] },
  ],
  passe_recent: [],
  conditionnel_present: [
    { fr: 'Avec plus de temps,', en: 'With more time,', neg: ['none'] },
    { fr: 'À ta place,', en: 'If I were you,', persons: ['1s'], q: false },
    { fr: 'Dans un monde idéal,', en: 'In an ideal world,' },
  ],
  conditionnel_passe: [
    { fr: 'Avec plus de temps,', en: 'With more time,', neg: ['none'] },
    { fr: 'À ta place,', en: 'If I were you,', persons: ['1s'], q: false },
    { fr: 'Sans la pluie,', en: 'Without the rain,', neg: DATED },
  ],
  subjonctif_present: [
    { fr: 'Il faut que', en: 'have to', sub: 'must' },
    { fr: 'Ma mère veut que', en: 'My mother wants', sub: 'want' },
    { fr: 'Mes parents veulent que', en: 'My parents want', sub: 'want' },
    { fr: 'Le professeur veut que', en: 'The teacher wants', sub: 'want' },
    { fr: 'Je veux que', en: 'I want', sub: 'want', self: '1s' },
    { fr: 'Je voudrais que', en: "I'd like", sub: 'want', self: '1s' },
  ],
  subjonctif_passe: [
    { fr: "C'est bien que", en: "It's good that", sub: 'that' },
    { fr: 'Il est possible que', en: "It's possible that", sub: 'that' },
    { fr: 'Mes parents sont contents que', en: 'My parents are happy that', sub: 'that' },
  ],
  imperatif: [],
};

/** Frames without `tenses` allow every tense except these. */
const DEFAULT_EXCLUDED: Tense[] = ['passe_simple', 'subjonctif_passe'];
/** Negations that make sense per tense (others: all). */
const NEG_OK: Partial<Record<Tense, Negation[]>> = {
  passe_recent: ['pas'],
  plus_que_parfait: ['pas', 'jamais', 'rien', 'personne'],
  futur_anterieur: ['pas', 'rien', 'personne'],
  conditionnel_passe: ['pas', 'jamais', 'rien', 'personne'],
};

const DETERMINER = /^(le|la|les|un|une|mon|ma|mes|ton|ta|tes|son|sa|ses|notre|nos|votre|vos|leur|leurs|ce|cet|cette|ces)\s+(\S+)|^l'(\S+)/i;
/** Nouns that make an adverbial, not an object: "sortir ce soir", "monter un peu". */
const ADVERBIAL_NOUN =
  /^(soir|matin|après-midi|nuit|jour|journée|soirée|week-end|weekend|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|semaine|mois|année|an|été|hiver|printemps|automne|midi|minuit|peu|moment|instant|heure|minute|seconde|fois|long)s?$/i;
/** Reflexive + body part: the participle doesn't agree ("elle s'est brossé les dents"). */
const BODY_PART =
  /^(les?|la|l['’])\s*(dents?|mains?|cheveux|visage|figure|yeux|œil|oeil|barbe|moustache|jambes?|pieds?|bras|cou|nez|ongles?|doigts?|tête|genoux?|oreilles?|lèvres?|peau|dos|bouche|ventre|épaules?|front|joues?)\b/i;
const H_ASPIRE_NOUN = /^(hugo|henri|héros|haricot|hibou|homard|hamster|hollande|hongrie|honte|hasard|haut|hall|hockey|huit)/i;
/** A complement introduced by a preposition keeps it before rien/personne: "parler à sa mère" → "je ne parle à personne". */
const PREP_FR = /^(à|au|aux|avec|pour|chez|sur|sans|contre|par|vers)(?=\s)/i;
/** "de" is only a preposition for verbs built with it ("du pain" after manger is a partitive object). */
const DE_VERBS = new Set(['parler', 'rêver', 'discuter', 'douter', 'jouer', 'manquer', 'changer']);
const PREP_EN = /^(to|with|about|for|at|of|on|in|from|into|after)\s/i;

function negationPreposition(comp: string, base: string, pronominal: boolean): string | undefined {
  const c = comp.trim().replace(/’/g, "'");
  const m = c.match(PREP_FR);
  if (m) return /^au/i.test(m[1]) ? 'à' : m[1].toLowerCase();
  if ((pronominal || DE_VERBS.has(base)) && /^(de\s|du\s|des\s|d')/i.test(c)) return 'de';
  return undefined;
}

/** The complement starts with a direct object ("les valises", "une semaine"), not an adverbial ("le soir", "un peu"). */
function directObject(comp: string, passer: boolean): boolean {
  const c = comp.trim().replace(/’/g, "'");
  if (passer && /^(du|de la|de l'|des)\s/i.test(c)) return true; // passer du temps, des vacances
  const m = c.match(DETERMINER);
  if (!m) return false;
  const noun = m[2] ?? m[3] ?? '';
  // passer + duration is an object: "passer une semaine", "passer le week-end"
  return passer ? !/^(peu|long)$/i.test(noun) : !ADVERBIAL_NOUN.test(noun);
}

const POSS_FR: Record<string, Record<Person, string>> = {
  mon: { '1s': 'mon', '2s': 'ton', '3s': 'son', '1p': 'notre', '2p': 'votre', '3p': 'leur' },
  ma: { '1s': 'ma', '2s': 'ta', '3s': 'sa', '1p': 'notre', '2p': 'votre', '3p': 'leur' },
  mes: { '1s': 'mes', '2s': 'tes', '3s': 'ses', '1p': 'nos', '2p': 'vos', '3p': 'leurs' },
};

const isPlural = (p: Person) => p === '1p' || p === '2p' || p === '3p';

/** Resolves the {…} notation of frame complements for a subject. */
export function resolveComplement(text: string, person: Person, gender: 'm' | 'f'): string {
  return text
    .replace(/\{(mon|ma|mes)\}/g, (_, k: string) => POSS_FR[k][person])
    .replace(/\{my\}/g, () => englishPossessive(person, gender))
    .replace(/\{myself\}/g, () => englishReflexive(person, gender))
    .replace(/\{([^{}|]*(?:\|[^{}|]*)+)\}/g, (_, body: string) => {
      const opts = body.split('|');
      if (opts.length === 4) return opts[(isPlural(person) ? 2 : 0) + (gender === 'f' ? 1 : 0)];
      return opts[gender === 'f' ? 1 : 0] ?? opts[0];
    });
}

function capitalize(s: string): string {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

const PRONOUN_PERSON: Record<string, Person> = { i: '1s', you: '2s', he: '3s', she: '3s', it: '3s', we: '1p', they: '3p' };

/** Cue words naming a time of day, and frame words that contradict them ("Ce matin" + dîner). */
const TIME_CLASH: [cue: RegExp, frame: RegExp][] = [
  [/\bmatin\b/i, /d[îi]n(er|é)|\bsoir|\bnuit|couch|au lit|souper/i],
  [/\bsoir\b/i, /petit-déjeuner|\bmatin|réveil|se lever|\btôt\b/i],
  [/\bmidi\b/i, /d[îi]n(er|é)|petit-déjeuner|\bsoir|\bnuit|\bmatin|couch/i],
];

function clashesWithFrame(cue: Cue, frame: Frame): boolean {
  if (cue.interrupt && frame.stative) return true;
  const text = `${frame.verb} ${frame.fr}`;
  return TIME_CLASH.some(([c, f]) => c.test(cue.fr) && f.test(text));
}

function pickCue(list: Cue[], rand: () => number): Cue | undefined {
  if (!list.length) return undefined;
  return list[Math.min(list.length - 1, Math.floor(rand() * list.length))];
}

export function renderSentence(
  frame: Frame,
  opts: { tense: Tense; subject: Subject; negation?: Negation; qform?: QForm; cue?: boolean /* default true */; rand?: () => number },
): Rendered | null {
  const { tense, subject, negation, qform } = opts;
  const { person, gender } = subject;
  const rand = opts.rand ?? Math.random;
  const verb = normInf(frame.verb);
  if (!hasVerb(verb)) return null;

  // ---- what makes sense -----------------------------------------------------------------
  if (!(frame.persons ?? PERSONS).includes(person)) return null;
  const allowedTenses = frame.tenses;
  if (allowedTenses ? !allowedTenses.includes(tense) : DEFAULT_EXCLUDED.includes(tense)) return null;
  const imperative = tense === 'imperatif';
  const subjunctive = tense === 'subjonctif_present' || tense === 'subjonctif_passe';
  const nounSubject = subject.fr && subject.fr.trim().toLowerCase() !== 'on' ? subject.fr.trim() : undefined;
  const onSubject = !!subject.fr && subject.fr.trim().toLowerCase() === 'on';
  if (imperative && (qform || subject.fr)) return null;
  if (subjunctive && qform) return null;
  if (tense === 'passe_simple' && person !== '3s' && person !== '3p') return null;
  if (negation && NEG_OK[tense] && !NEG_OK[tense]!.includes(negation)) return null;
  if (negation === 'rien' && frame.object !== 'thing') return null;
  if (negation === 'personne' && frame.object !== 'person') return null;
  const impersonal = isImpersonal(verb);
  if (impersonal && (person !== '3s' || subject.fr)) return null;

  // ---- cue ------------------------------------------------------------------------------
  const polarity: Polarity = negation ?? 'none';
  const candidates = CUES[tense].filter(
    (c) =>
      (!c.persons || c.persons.includes(person)) &&
      (!c.neg || c.neg.includes(polarity)) &&
      (c.q !== false || !qform) &&
      c.self !== person &&
      !clashesWithFrame(c, frame) &&
      !(nounSubject && c.fr.toLowerCase().includes(nounSubject.toLowerCase())),
  );
  const cue = subjunctive || opts.cue !== false ? pickCue(candidates, rand) : undefined;
  if (subjunctive && !cue) return null;

  // ---- French ---------------------------------------------------------------------------
  const pronominal = isPronominal(verb);
  const base = baseInf(verb);
  const objectReplaced = negation === 'rien' || negation === 'personne';
  const compSource = negation ? (frame.frNeg ?? frame.fr) : frame.fr;
  const compFr = objectReplaced ? '' : resolveComplement(compSource, person, gender).trim();
  const conjOpts: ConjugateOptions = { gender, negation, on: onSubject };
  const prep = negationPreposition(frame.fr, base, pronominal); // "à sa mère", "avec ses amis"
  // passer/monter/descendre/sortir/rentrer/retourner + direct object take avoir: "j'ai monté les valises"
  if (!pronominal && ETRE_AVOIR_VERBS.has(base) && ((frame.object && !prep) || directObject(frame.fr, base === 'passer'))) conjOpts.aux = 'avoir';
  // reflexive + direct object: no agreement ("elle s'est brossé les dents", but "elle s'est souvenue de…")
  if (pronominal && (BODY_PART.test(frame.fr.trim()) || (frame.object && !prep && directObject(frame.fr, false)))) conjOpts.agree = false;
  // "je n'ai parlé à personne", "je ne joue à rien"
  if (objectReplaced) conjOpts.negationPrep = prep;
  let enAdverb: string | undefined;
  let enExtraTail = '';
  if (tense === 'plus_que_parfait' && !negation) {
    conjOpts.adverb = 'déjà';
    enAdverb = 'already';
  } else if (tense === 'plus_que_parfait' && negation === 'pas') {
    conjOpts.adverb = 'encore';
    enExtraTail = 'yet';
  }
  const inversion = qform === 'inversion';
  if (inversion) conjOpts.inversion = true;
  else if (nounSubject) conjOpts.pronoun = false;
  let verbFr = conjugate(verb, tense, person, conjOpts);
  if (!verbFr) return null;

  let before = '';
  if (cue) before = cue.fr + ' ';
  // what comes right after a "que": the noun subject or the verb group
  const nextWord = nounSubject ?? verbFr;
  const queBefore = (q: string) => {
    const elide = vowelSound(nextWord, H_ASPIRE_NOUN.test(nextWord));
    return elide ? q.slice(0, -1) + "'" : q + ' ';
  };
  if (subjunctive) {
    before = queBefore(cue!.fr);
  } else if (qform === 'est-ce-que') {
    before += queBefore(cue ? 'est-ce que' : 'Est-ce que');
  }
  if (nounSubject) before += nounSubject + ' ';
  const punct = qform ? ' ?' : imperative ? ' !' : '.';
  const after = (compFr ? ' ' + compFr : '') + punct;
  if (before) before = capitalize(before);
  else verbFr = capitalize(verbFr);
  const fr = before + verbFr + after;

  // ---- English --------------------------------------------------------------------------
  const gloss = VERB_BY_INF[verb]?.en ?? VERB_BY_INF[base]?.en;
  let subjectEn = impersonal ? 'it' : nounSubject ? (subject.en ?? nounSubject) : onSubject ? (subject.en ?? 'we') : undefined;
  // a pronoun given as the English subject drives the agreement ("on" → "we")
  const enPerson = (subjectEn && PRONOUN_PERSON[subjectEn.toLowerCase()]) || person;
  const enVerb = resolveComplement(frame.enVerb ?? (gloss ? englishVerb(gloss) : ''), enPerson, gender).trim();
  if (!enVerb) return null;
  if (subjectEn && PRONOUN_PERSON[subjectEn.toLowerCase()] === '1s') subjectEn = 'I';
  const enCompSource = negation ? (frame.enNeg ?? frame.en) : frame.en;
  let compEn = objectReplaced ? '' : resolveComplement(enCompSource, enPerson, gender).trim();
  // "talk to my mother" → "talk to anyone"
  const enPrep = objectReplaced ? frame.en.trim().match(PREP_EN)?.[1].toLowerCase() : undefined;
  const withPrep = (tail: string) => (enPrep && /^any(thing|one)$/.test(tail) ? `${enPrep} ${tail}` : tail);

  let clause: string;
  if (subjunctive) {
    clause = subjunctiveEnglish(cue!, enVerb, enPerson, gender, negation, subjectEn, compEn, withPrep);
  } else {
    const parts = englishParts(enVerb, tense, enPerson, {
      gender,
      negation,
      question: !!qform,
      aspect: cue?.aspect,
      stative: frame.stative,
      subject: subjectEn,
      adverb: enAdverb,
    });
    if (parts.complementForm === 'participle' && compEn) compEn = participlePhrase(compEn);
    clause = [parts.text, compEn, withPrep(parts.tail), enExtraTail].filter(Boolean).join(' ');
  }
  const en = capitalize((cue && !subjunctive ? cue.en + ' ' : '') + clause) + (qform ? '?' : imperative ? '!' : '.');

  return { fr, en, verbFr, before, after, tense, person, negation, qform };
}

function subjunctiveEnglish(
  cue: Cue,
  verb: string,
  person: Person,
  gender: 'm' | 'f',
  negation: Negation | undefined,
  subjectEn: string | undefined,
  comp: string,
  withPrep: (tail: string) => string,
): string {
  const tail = withPrep(negation === 'plus' ? 'anymore' : negation === 'rien' ? 'anything' : negation === 'personne' ? 'anyone' : '');
  const join = (...w: string[]) => w.filter(Boolean).join(' ');
  if (cue.sub === 'want') {
    const asObject: Record<string, string> = { i: 'me', he: 'him', she: 'her', we: 'us', they: 'them' };
    const obj = subjectEn ? (asObject[subjectEn.toLowerCase()] ?? subjectEn) : englishObject(person, gender);
    const not = negation === 'jamais' ? 'never' : negation ? 'not' : '';
    return join(cue.en, obj, not, 'to', englishBare(verb), comp, tail);
  }
  if (cue.sub === 'that') {
    const p = englishParts(verb, 'subjonctif_passe', person, { gender, negation, subject: subjectEn });
    return join(cue.en, p.text, comp, withPrep(p.tail));
  }
  // 'must': "you have to eat" / "you mustn't eat" / "you must never eat"
  const p = englishParts(negation ? 'must' : 'have to', 'present', person, { gender, negation, subject: subjectEn });
  return join(p.text, englishBare(verb), comp, withPrep(p.tail));
}
