// Shared vocabulary of the grammar system: conjugation engine, sentence
// renderer, content banks (frames, questions, lessons) and exercise generators.

export type Person = '1s' | '2s' | '3s' | '1p' | '2p' | '3p';
export const PERSONS: Person[] = ['1s', '2s', '3s', '1p', '2p', '3p'];

export type Tense =
  | 'present'
  | 'passe_compose'
  | 'imparfait'
  | 'plus_que_parfait'
  | 'passe_simple'
  | 'futur_simple'
  | 'futur_anterieur'
  | 'futur_proche'
  | 'passe_recent'
  | 'conditionnel_present'
  | 'conditionnel_passe'
  | 'subjonctif_present'
  | 'subjonctif_passe'
  | 'imperatif';

export interface TenseInfo {
  id: Tense;
  /** French name, e.g. "passé composé". */
  fr: string;
  /** English name, e.g. "perfect / simple past". */
  en: string;
  mood: 'indicatif' | 'conditionnel' | 'subjonctif' | 'impératif';
  /** Uses an auxiliary (avoir/être) or a helper verb (aller/venir). */
  compound: boolean;
  /** 1 = A1, 2 = A2, 3 = B1+ (passé simple is recognition only). */
  level: 1 | 2 | 3;
  /** Short reminder of what it's for, shown in exercises and lessons. */
  use: string;
}

export const TENSES: TenseInfo[] = [
  { id: 'present', fr: 'présent', en: 'present', mood: 'indicatif', compound: false, level: 1, use: 'now, habits, general truths' },
  { id: 'passe_compose', fr: 'passé composé', en: 'perfect / simple past', mood: 'indicatif', compound: true, level: 1, use: 'finished actions in the past' },
  { id: 'imparfait', fr: 'imparfait', en: 'imperfect', mood: 'indicatif', compound: false, level: 2, use: 'descriptions, habits and ongoing actions in the past' },
  { id: 'futur_proche', fr: 'futur proche', en: 'near future (going to)', mood: 'indicatif', compound: true, level: 1, use: 'plans and things about to happen' },
  { id: 'passe_recent', fr: 'passé récent', en: 'recent past (have just)', mood: 'indicatif', compound: true, level: 1, use: 'something that has just happened' },
  { id: 'futur_simple', fr: 'futur simple', en: 'future (will)', mood: 'indicatif', compound: false, level: 2, use: 'future events, predictions, promises' },
  { id: 'conditionnel_present', fr: 'conditionnel présent', en: 'conditional (would)', mood: 'conditionnel', compound: false, level: 2, use: 'wishes, polite requests, hypotheses' },
  { id: 'imperatif', fr: 'impératif', en: 'imperative', mood: 'impératif', compound: false, level: 1, use: 'orders, advice, instructions' },
  { id: 'plus_que_parfait', fr: 'plus-que-parfait', en: 'pluperfect (had done)', mood: 'indicatif', compound: true, level: 3, use: 'an action before another past action' },
  { id: 'subjonctif_present', fr: 'subjonctif présent', en: 'present subjunctive', mood: 'subjonctif', compound: false, level: 3, use: 'after il faut que, je veux que, bien que…' },
  { id: 'futur_anterieur', fr: 'futur antérieur', en: 'future perfect (will have done)', mood: 'indicatif', compound: true, level: 3, use: 'an action finished before a future moment' },
  { id: 'conditionnel_passe', fr: 'conditionnel passé', en: 'past conditional (would have)', mood: 'conditionnel', compound: true, level: 3, use: 'regrets and what would have happened' },
  { id: 'subjonctif_passe', fr: 'subjonctif passé', en: 'past subjunctive', mood: 'subjonctif', compound: true, level: 3, use: 'subjunctive about a finished action' },
  { id: 'passe_simple', fr: 'passé simple', en: 'simple past (literary)', mood: 'indicatif', compound: false, level: 3, use: 'written stories and history (recognise it)' },
];

export const TENSE_BY_ID = Object.fromEntries(TENSES.map((t) => [t.id, t])) as Record<Tense, TenseInfo>;

export type Negation = 'pas' | 'jamais' | 'plus' | 'rien' | 'personne';
export type QForm = 'intonation' | 'est-ce-que' | 'inversion';

/** A verb the engine can conjugate. */
export interface VerbInfo {
  /** Infinitive; pronominal verbs keep their pronoun: "se lever", "s'appeler". */
  inf: string;
  /** English gloss as shown to learners: "to speak, to talk". */
  en: string;
  /** 1 = regular -er, 2 = -ir like finir, 3 = everything else. */
  group: 1 | 2 | 3;
  /** Where the verb came from (the learner's book list or the core set). */
  source: 'book-er' | 'core';
}

/** Grammatical subject of a rendered sentence. */
export interface Subject {
  person: Person;
  /** Drives agreement: "elle est allée", "ils sont partis". */
  gender: 'm' | 'f';
  /** Noun subject ("Marie", "mes parents"); absent = subject pronoun. */
  fr?: string;
  en?: string;
}

/**
 * A sentence frame: one verb + complement that the renderer can put into any
 * allowed tense, person, negation and question form.
 */
export interface Frame {
  id: string;
  /** Infinitive from the verb list. */
  verb: string;
  /** French complement after the verb (after the past participle in compound tenses). May be "". */
  fr: string;
  /** Complement after a negation when it changes ("une pomme" -> "de pomme"). */
  frNeg?: string;
  /** English complement: "an apple". */
  en: string;
  /** English complement after a negation when it changes ("some bread" -> "any bread"). */
  enNeg?: string;
  /** English verb (base form, may include a particle) when the default gloss doesn't fit: "have" for "prendre un café". */
  enVerb?: string;
  /** Persons that make sense (default: all six). */
  persons?: Person[];
  /** Tenses that make sense (default: every tense except passé simple and subjonctif passé). */
  tenses?: Tense[];
  /** The complement is a thing/person that "rien"/"personne" can replace. */
  object?: 'thing' | 'person';
  /** State verbs (être content, avoir faim…): imparfait reads "I was hungry", not "I used to be hungry". */
  stative?: boolean;
  topic: string;
  level: 1 | 2 | 3;
}

export type QWord =
  | 'qui'
  | 'que'
  | 'quoi'
  | 'ou'
  | 'quand'
  | 'comment'
  | 'pourquoi'
  | 'combien'
  | 'quel'
  | 'lequel'
  | 'qu-est-ce-qui'
  | 'd-ou'
  | 'a-quelle-heure'
  | 'depuis-quand'
  | 'avec-qui';

export const QWORD_LABEL: Record<QWord, string> = {
  qui: 'Qui',
  que: 'Que / Qu’est-ce que',
  quoi: 'Quoi',
  ou: 'Où',
  quand: 'Quand',
  comment: 'Comment',
  pourquoi: 'Pourquoi',
  combien: 'Combien',
  quel: 'Quel / Quelle',
  lequel: 'Lequel / Laquelle',
  'qu-est-ce-qui': 'Qu’est-ce qui',
  'd-ou': 'D’où',
  'a-quelle-heure': 'À quelle heure',
  'depuis-quand': 'Depuis quand',
  'avec-qui': 'Avec qui',
};

/** A question with its answer, in up to three question forms. */
export interface QAItem {
  id: string;
  word: QWord;
  /** The exact question word(s) as they appear in the forms, e.g. "Où", "À quelle heure", "Quelle". */
  wordFr: string;
  forms: {
    /** "Tu vas où ?" */
    intonation?: string;
    /** "Où est-ce que tu vas ?" */
    estceque?: string;
    /** "Où vas-tu ?" */
    inversion?: string;
  };
  /** English question: "Where are you going?" */
  en: string;
  answer: { fr: string; en: string };
  /** Other question words that would also be correct for this answer (never offered as wrong options). */
  alsoOk?: QWord[];
  level: 1 | 2 | 3;
  topic: string;
}

export interface LessonSection {
  heading: string;
  /** Plain text; **bold** and line breaks allowed. */
  body: string;
  examples?: { fr: string; en: string }[];
  table?: { head: string[]; rows: string[][] };
}

export type ExerciseKind =
  | 'conj'
  | 'cloze'
  | 'tense-id'
  | 'transform'
  | 'negate'
  | 'qform'
  | 'qword'
  | 'qmatch'
  | 'gtranslate'
  | 'glisten';

export interface Lesson {
  id: string;
  unit: 'present' | 'passe' | 'futur' | 'conditionnel' | 'subjonctif' | 'imperatif' | 'negation' | 'questions' | 'bases';
  /** French title: "Le passé composé avec être". */
  title: string;
  /** English title. */
  en: string;
  level: 1 | 2 | 3;
  /** One or two sentences: what this is and when to use it. */
  intro: string;
  sections: LessonSection[];
  tips?: string[];
  /** What the practice button drills. */
  practice: {
    kinds: ExerciseKind[];
    tenses?: Tense[];
    verbs?: string[];
    negations?: Negation[];
    qforms?: QForm[];
    qwords?: QWord[];
  };
}
