import type { Card } from '../../types';
import { db } from '../db';
import type { Pool, RoundConfig } from './round';

/**
 * Loads the cards a round may use. With no deck chosen: new words come from
 * active decks, and anything already studied (any deck) can come back for review.
 */
export async function loadPool(cfg: Pick<RoundConfig, 'deckIds' | 'cardIds' | 'focusOnly'>): Promise<Pool> {
  const [decks, allCards, progressRows] = await Promise.all([db.decks.toArray(), db.cards.toArray(), db.progress.toArray()]);
  const progress = new Map(progressRows.map((p) => [p.cardId, p]));
  const usable = allCards.filter((c) => !c.archived);
  let cards: Card[];
  if (cfg.cardIds?.length) {
    const ids = new Set(cfg.cardIds);
    cards = usable.filter((c) => ids.has(c.id));
  } else if (cfg.deckIds?.length) {
    const set = new Set(cfg.deckIds);
    cards = usable.filter((c) => set.has(c.deckId));
  } else {
    let active = new Set(decks.filter((d) => d.active).map((d) => d.id));
    if (!active.size) active = new Set(decks.map((d) => d.id));
    cards = usable.filter((c) => active.has(c.deckId) || (progress.get(c.id)?.seen ?? 0) > 0);
  }
  if (cfg.focusOnly) cards = cards.filter((c) => c.focus);
  return { cards, all: usable, progress };
}
