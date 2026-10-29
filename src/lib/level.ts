// Her level (Réglages → Mon niveau) is a band of CEFR levels: built-in material outside it
// is left out of every game, list and lesson path. The floor is A2: the A1 basics, the
// textbook's list of regular -er verbs and the recognition-only games (tap the picture,
// pairs, flip cards) are never shown. Nothing is deleted. Her own themes always stay.
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
  2: { min: 2, max: 3, name: 'Intermédiaire', range: 'A2 → B1', emoji: '🌳' },
  3: { min: 3, max: 4, name: 'Avancé', range: 'B1 → C1', emoji: '🎓' },
};

export function inBand(level: number, band: MinLevel): boolean {
  return level >= BANDS[band].min && level <= BANDS[band].max;
}

/** The textbook's regular -er verbs are A1 words: their list is hidden (the verbs stay in the conjugation drills). */
const BELOW_FLOOR = new Set(['verbs-er']);

/** Built-in themes outside her band are hidden; hers never are. */
export function deckShown(deck: Pick<Deck, 'id' | 'builtin' | 'level'>, band: MinLevel): boolean {
  if (!deck.builtin) return true;
  if (BELOW_FLOOR.has(deck.id)) return false;
  return inBand(deck.level ?? 1, band);
}

/**
 * Tenses the games drill in a band. Intermédiaire leaves out the A1 tenses but keeps the
 * passé composé (être, agreement and reflexives are A2 work) and adds the B1 ones. Avancé
 * keeps only the hardest (plus-que-parfait, subjonctif, futur antérieur, conditionnel passé,
 * passé simple).
 */
export function tensesAtLevel(band: MinLevel): Tense[] {
  return TENSES.filter((t) => t.level >= band || (band === 2 && t.id === 'passe_compose')).map((t) => t.id);
}

/** Questions that only ask her to recognise a word: tap its picture, match pairs, flip a card. */
const BASIC_TYPES: QuestionType[] = ['pick-image', 'pick-word', 'pairs', 'flash'];

/** The games made only of recognition questions are below the floor: never on the home screen. */
export function modeShown(mode: Pick<ModeInfo, 'types'>): boolean {
  return !mode.types.every((t) => BASIC_TYPES.includes(t));
}

/** The question types a game asks: a mix leaves out the recognition-only ones. */
export function typesAtLevel(types: QuestionType[]): QuestionType[] {
  const harder = types.filter((t) => !BASIC_TYPES.includes(t));
  // a basic game opened from an old link still plays as itself
  return harder.length ? harder : types;
}
