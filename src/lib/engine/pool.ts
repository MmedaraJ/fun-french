import type { Card } from '../../types';
import { db } from '../db';
import { deckShown } from '../level';
import type { Pool, RoundConfig } from './round';

/**
 * Loads the cards a round may use. With no deck chosen: new words come from
 * active decks, and anything already studied (any deck) can come back for review.
 * Themes below the level floor are left out entirely, wrong-answer options included,
 * unless she picked the exact words herself.
 */
export async function loadPool(cfg: Pick<RoundConfig, 'deckIds' | 'cardIds' | 'focusOnly' | 'minLevel'>): Promise<Pool> {
  const [allDecks, allCards, progressRows] = await Promise.all([db.decks.toArray(), db.cards.toArray(), db.progress.toArray()]);
  const progress = new Map(progressRows.map((p) => [p.cardId, p]));
  const decks = allDecks.filter((d) => deckShown(d, cfg.minLevel ?? 1));
  const shown = new Set(decks.map((d) => d.id));
  const usable = allCards.filter((c) => !c.archived && shown.has(c.deckId));
  let cards: Card[];
  const chosenDecks = cfg.deckIds?.filter((id) => shown.has(id)) ?? [];
  if (cfg.cardIds?.length) {
    const ids = new Set(cfg.cardIds);
    cards = allCards.filter((c) => !c.archived && ids.has(c.id));
  } else if (chosenDecks.length) {
    const set = new Set(chosenDecks);
    cards = usable.filter((c) => set.has(c.deckId));
  } else {
    let active = new Set(decks.filter((d) => d.active).map((d) => d.id));
    if (!active.size) active = new Set(decks.map((d) => d.id));
    cards = usable.filter((c) => active.has(c.deckId) || (progress.get(c.id)?.seen ?? 0) > 0);
  }
  if (cfg.focusOnly) cards = cards.filter((c) => c.focus);
  return { cards, all: usable, progress };
}
