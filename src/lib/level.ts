// The level floor (Réglages → Niveau): built-in material below it is left out of every
// game, list and lesson path. Nothing is deleted, so lowering the floor brings it back.
import type { Deck, QuestionType } from '../types';
import type { ModeInfo } from './engine/modes';
import { TENSES, type Tense } from './grammar/types';
import type { MinLevel } from './settings';

export type { MinLevel };

export const LEVEL_NAMES: Record<MinLevel, string> = { 1: 'A1', 2: 'A2', 3: 'B1' };

/** Her textbook's verbs stay whatever the floor: they're her course, not the app's basics. */
const ALWAYS_SHOWN = new Set(['verbs-er']);

/** Her own themes (typed, photographed, imported PDFs) are never hidden; built-in ones below the floor are. */
export function deckShown(deck: Pick<Deck, 'id' | 'builtin' | 'level'>, minLevel: MinLevel): boolean {
  return !deck.builtin || ALWAYS_SHOWN.has(deck.id) || (deck.level ?? 1) >= minLevel;
}

/**
 * Tenses the games drill at a floor. A2 leaves out the A1 tenses (présent, futur proche,
 * passé récent, impératif) but keeps the passé composé: être, agreement and reflexives are
 * A2 work. B1 keeps only the B1 tenses.
 */
export function tensesAtLevel(minLevel: MinLevel): Tense[] {
  return TENSES.filter((t) => t.level >= minLevel || (minLevel === 2 && t.id === 'passe_compose')).map((t) => t.id);
}

/** Questions that only ask her to recognise a word: tap its picture, match pairs, flip a card. */
const BASIC_TYPES: QuestionType[] = ['pick-image', 'pick-word', 'pairs', 'flash'];

/** From A2 on, the games made only of those questions are left off the home screen. */
export function modeShown(mode: Pick<ModeInfo, 'types'>, minLevel: MinLevel): boolean {
  return minLevel < 2 || !mode.types.every((t) => BASIC_TYPES.includes(t));
}

/** The question types a game asks at a floor: from A2 on, a mix leaves out the recognition-only ones. */
export function typesAtLevel(types: QuestionType[], minLevel: MinLevel): QuestionType[] {
  if (minLevel < 2) return types;
  const harder = types.filter((t) => !BASIC_TYPES.includes(t));
  // a basic game opened directly still plays as itself
  return harder.length ? harder : types;
}
