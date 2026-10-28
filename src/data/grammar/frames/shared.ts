// Shared helpers for the sentence frames (see ../frames.ts).
//
// How to write a frame (see src/lib/grammar/types.ts and src/lib/grammar/render.ts):
// - The complement must work after ANY subject. Prefer neutral complements
//   ("en retard", "le bus"); when agreement or a possessive is really needed,
//   use the renderer's notation: {content|contente}, {mon}/{ma}/{mes}, {my}/{myself}.
// - No time expressions: the renderer adds the time cue ("Hier,", "Demain,"…).
// - frNeg when a negation changes the article (une pomme -> de pomme). Not for
//   le/la/les, not after a preposition (jouer du piano, parler de la météo).
// - object only when "rien"/"personne" can replace the whole complement.
// - The complement always follows the participle, so no short adverbs that
//   move in front of it (bien, mal, beaucoup, tout, rien).
// - enVerb whenever the verb's gloss doesn't fit the frame ("prendre le bus" -> "take").
import type { Frame, Person, Tense } from '../../../lib/grammar/types';

/** The default tense set: every tense except passé simple and subjonctif passé. */
export const BASE: Tense[] = [
  'present',
  'passe_compose',
  'imparfait',
  'plus_que_parfait',
  'futur_simple',
  'futur_anterieur',
  'futur_proche',
  'passe_recent',
  'conditionnel_present',
  'conditionnel_passe',
  'subjonctif_present',
  'imperatif',
];
export const without = (list: Tense[], ...drop: Tense[]): Tense[] => list.filter((t) => !drop.includes(t));

/** Actions with a clear end point: also good in the past subjunctive ("que tu aies fini le rapport"). */
export const DONE: Tense[] = [...BASE, 'subjonctif_passe'];
/** Things that happen to you rather than things you choose to do: no imperative. */
export const NO_IMP = without(BASE, 'imperatif');
export const DONE_NO_IMP = without(DONE, 'imperatif');
/** Open-ended activities ("écouter la radio"): the futur antérieur sounds odd. */
export const ACT = without(BASE, 'futur_anterieur');
export const ACT_NO_IMP = without(ACT, 'imperatif');
/**
 * States you can want or be told to be in (être à la maison, aimer, se sentir mieux…).
 * No imperative, passé récent, futur antérieur, plus-que-parfait or conditionnel passé:
 * "j'avais déjà eu faim", "j'aurais été à la maison" sound odd.
 */
export const STATE: Tense[] = ['present', 'passe_compose', 'imparfait', 'futur_simple', 'futur_proche', 'conditionnel_present', 'subjonctif_present'];
/** States that just happen to you (avoir faim, être malade…): also no subjunctive ("il faut que tu aies faim"). */
export const FEELING = without(STATE, 'subjonctif_present');
/** Long-lasting states (habiter à la campagne, connaître le quartier): they don't fit "Hier," or "Ce soir,". */
export const LASTING: Tense[] = ['present', 'imparfait', 'futur_simple', 'conditionnel_present', 'subjonctif_present'];
export const LASTING_FEELING = without(LASTING, 'subjonctif_present');
/** States you can tell someone to be in: "Sois à l'heure !" */
export const STATE_IMP: Tense[] = [...STATE, 'imperatif'];
/** Things that happen once in a lifetime (épouser, fonder une entreprise): no habits, so no présent or imparfait. */
export const ONCE: Tense[] = [
  'passe_compose',
  'plus_que_parfait',
  'futur_simple',
  'futur_proche',
  'passe_recent',
  'conditionnel_present',
  'conditionnel_passe',
  'subjonctif_present',
  'subjonctif_passe',
];
/** Written narration (3rd person only): past-centred tenses plus the passé simple ("D'habitude, il tue le dragon" would sound silly). */
export const STORY: Tense[] = [
  'passe_compose',
  'imparfait',
  'plus_que_parfait',
  'passe_simple',
  'futur_simple',
  'conditionnel_present',
  'conditionnel_passe',
  'subjonctif_present',
  'subjonctif_passe',
];
/** Narration activities that also work as everyday habits ("Le soir, elle regarde par la fenêtre"). */
export const STORY_ACT: Tense[] = ['present', 'passe_compose', 'imparfait', 'passe_simple', 'futur_simple', 'futur_proche', 'conditionnel_present', 'subjonctif_present'];

/** Narration frames and things only "il/elle/ils/elles" (or a noun) can do. */
export const P3: Person[] = ['3s', '3p'];
/** Frames whose possessive only makes sense for one person ("{mon} amoureux" -> not "notre amoureux"). */
export const SINGULAR: Person[] = ['1s', '2s', '3s'];
/** Things that take at least two people ("se disputer pour des bêtises"). */
export const PLURAL: Person[] = ['1p', '2p', '3p'];
/** Impersonal verbs: "il pleut". */
export const IT: Person[] = ['3s'];

export type Draft = Omit<Frame, 'topic' | 'level'> & { level?: Frame['level'] };

/** Adds the topic (and level 1 unless given) to a list of frames. */
export const group = (topic: string, drafts: Draft[]): Frame[] =>
  drafts.map((d) => ({ ...d, topic, level: d.level ?? 1 }));

/** Topics used by frames and questions, in the order they're offered. */
export const FRAME_TOPICS: { id: string; en: string; fr: string }[] = [
  { id: 'routine', en: 'Daily routine', fr: 'La routine' },
  { id: 'food', en: 'Food & café', fr: 'La cuisine et le café' },
  { id: 'home', en: 'Home & chores', fr: 'La maison' },
  { id: 'work', en: 'Work & study', fr: 'Le travail et les études' },
  { id: 'travel', en: 'Travel & transport', fr: 'Les voyages et les transports' },
  { id: 'shopping', en: 'Shopping & money', fr: "Les courses et l'argent" },
  { id: 'leisure', en: 'Leisure & sport', fr: 'Les loisirs et le sport' },
  { id: 'family', en: 'Family & friends', fr: 'La famille et les amis' },
  { id: 'love', en: 'Love & relationships', fr: "L'amour et les relations" },
  { id: 'nature', en: 'Weather & nature', fr: 'La météo et la nature' },
  { id: 'health', en: 'Health & feelings', fr: 'La santé et les émotions' },
  { id: 'town', en: 'Town & services', fr: 'La ville et les services' },
  { id: 'tech', en: 'Technology & media', fr: 'La technologie et les médias' },
];
