// Her level (Réglages → Mon niveau) is a band of CEFR levels: built-in material outside it
// is left out of every game, list and lesson path. Nothing is deleted, so choosing another
// band brings it back. Her own themes (typed, photographed, imported PDFs) always stay.
import type { Deck, QuestionType } from '../types';
import type { ModeInfo } from './engine/modes';
import { TENSES, type Tense } from './grammar/types';
import type { MinLevel } from './settings';

export type { MinLevel };

/** A band of content levels (1 = A1, 2 = A2, 3 = B1, 4 = B2 and up). */
export interface Band {
  min: number;
  max: number;
  name: string;
  /** CEFR range as shown to her. */
  range: string;
  emoji: string;
}

export const BANDS: Record<MinLevel, Band> = {
  // A0 to A2, but centred on A1: the A1 material comes first and most, A2 stretches it
  1: { min: 1, max: 2, name: 'Débutant', range: 'A0 → A2', emoji: '🌱' },
  2: { min: 2, max: 3, name: 'Intermédiaire', range: 'A2 → B1', emoji: '🌳' },
  3: { min: 3, max: 4, name: 'Avancé', range: 'B1 → C1', emoji: '🎓' },
};

export function inBand(level: number, band: MinLevel): boolean {
  return level >= BANDS[band].min && level <= BANDS[band].max;
}

/** Her textbook's regular -er verbs stay up to Intermédiaire; at Avancé they're beginner words like the rest. */
const KEPT_TO_A2 = new Set(['verbs-er']);

/** Built-in themes outside her band are hidden; hers never are. */
export function deckShown(deck: Pick<Deck, 'id' | 'builtin' | 'level'>, band: MinLevel): boolean {
  if (!deck.builtin) return true;
  if (KEPT_TO_A2.has(deck.id)) return band <= 2;
  return inBand(deck.level ?? 1, band);
}

/**
 * Tenses the games drill in a band. Débutant: the A1 tenses and the A2 ones (imparfait,
 * futur simple, conditionnel), the A1 ones weighted more. Intermédiaire leaves out the A1
 * tenses but keeps the passé composé (être, agreement and reflexives are A2 work) and adds
 * the B1 ones. Avancé keeps only the hardest (plus-que-parfait, subjonctif, futur antérieur,
 * conditionnel passé, passé simple).
 */
export function tensesAtLevel(band: MinLevel): Tense[] {
  if (band === 1) return TENSES.filter((t) => t.level <= 2).map((t) => t.id);
  return TENSES.filter((t) => t.level >= band || (band === 2 && t.id === 'passe_compose')).map((t) => t.id);
}

/** Questions that only ask her to recognise a word: tap its picture, match pairs, flip a card. */
const BASIC_TYPES: QuestionType[] = ['pick-image', 'pick-word', 'pairs', 'flash'];

/**
 * Games on the home screen for a band: from Intermédiaire on, not the ones made only of
 * recognition questions; the advanced structures start at Intermédiaire.
 */
export function modeShown(mode: Pick<ModeInfo, 'types'>, band: MinLevel): boolean {
  if (band >= 2 && mode.types.every((t) => BASIC_TYPES.includes(t))) return false;
  if (band === 1 && mode.types.every((t) => t === 'drill')) return false;
  return true;
}

/** The question types a game asks in a band: from Intermédiaire on, a mix leaves out the recognition-only ones. */
export function typesAtLevel(types: QuestionType[], band: MinLevel): QuestionType[] {
  if (band < 2) return types;
  const harder = types.filter((t) => !BASIC_TYPES.includes(t));
  // a basic game opened directly still plays as itself
  return harder.length ? harder : types;
}
