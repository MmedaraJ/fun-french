// Creating, editing and removing the learner's own cards and decks.
import type { Card, CardKind, CardSource, Deck, Gender, PaletteKey } from '../types';
import { checkAchievements } from './achievements';
import { db } from './db';
import { normalizeAnswer } from './french';
import { uid } from './ids';
import { forgetImageUrl } from './images';

export const MY_WORDS_DECK = 'my-words';

export interface NewCard {
  fr: string;
  en: string;
  kind: CardKind;
  gender?: Gender;
  plural?: boolean;
  emoji?: string;
  imageId?: string;
  note?: string;
  focus?: boolean;
}

function clean(s: string | undefined): string | undefined {
  const t = s?.replace(/\s+/g, ' ').trim();
  return t ? t : undefined;
}

/** The default deck for the learner's own words, created on first use. */
export async function ensureMyWordsDeck(): Promise<Deck> {
  const existing = await db.decks.get(MY_WORDS_DECK);
  if (existing) return existing;
  const deck: Deck = {
    id: MY_WORDS_DECK,
    name: 'Mes mots',
    nameEn: 'My words',
    emoji: '💝',
    color: 'plum',
    builtin: false,
    active: true,
    level: 1,
    order: -1,
    createdAt: Date.now(),
  };
  await db.decks.put(deck);
  return deck;
}

/** Adds cards to a deck; returns the stored rows. */
export async function addCards(
  items: NewCard[],
  opts: { deckId: string; source: CardSource; celebrate?: boolean },
): Promise<Card[]> {
  const valid = items.filter((i) => clean(i.fr));
  if (!valid.length) return [];
  if (opts.deckId === MY_WORDS_DECK) await ensureMyWordsDeck();
  const now = Date.now();
  const inDeck = await db.cards.where('deckId').equals(opts.deckId).toArray();
  let order = inDeck.reduce((m, c) => Math.max(m, c.order ?? 0), 0);
  const rows: Card[] = valid.map((i, k) => ({
    id: uid(),
    deckId: opts.deckId,
    kind: i.kind,
    fr: clean(i.fr)!,
    en: clean(i.en) ?? '',
    gender: i.kind === 'word' ? i.gender : undefined,
    plural: i.kind === 'word' && i.plural ? true : undefined,
    emoji: clean(i.emoji),
    imageId: i.imageId,
    note: clean(i.note),
    focus: i.focus || undefined,
    source: opts.source,
    order: ++order,
    // keep creation order stable inside one batch
    createdAt: now + k,
    updatedAt: now + k,
  }));
  await db.cards.bulkAdd(rows);
  if (opts.celebrate !== false) void celebrateUnlocks();
  return rows;
}

export async function updateCard(id: string, patch: Partial<Omit<Card, 'id' | 'createdAt'>>): Promise<void> {
  const next: Partial<Card> = { ...patch, updatedAt: Date.now() };
  for (const k of ['fr', 'en', 'note', 'emoji'] as const) {
    if (k in patch) (next as Record<string, unknown>)[k] = k === 'fr' || k === 'en' ? (clean(patch[k] as string) ?? '') : clean(patch[k] as string);
  }
  await db.cards.update(id, next);
}

/** Star / un-star without counting as an edit (built-in cards keep receiving fixes). */
export async function setFocus(id: string, focus: boolean): Promise<void> {
  await db.cards.update(id, { focus: focus || undefined });
}

export async function moveCards(ids: string[], deckId: string): Promise<void> {
  if (deckId === MY_WORDS_DECK) await ensureMyWordsDeck();
  await db.transaction('rw', db.cards, async () => {
    for (const id of ids) await db.cards.update(id, { deckId });
  });
}

/**
 * Built-in cards are archived (so app updates don't bring them back);
 * the learner's own cards are deleted with their photo and memory.
 */
export async function deleteCard(card: Pick<Card, 'id' | 'source' | 'imageId'>): Promise<void> {
  if (card.source === 'starter') {
    await db.cards.update(card.id, { archived: true });
    return;
  }
  await db.transaction('rw', db.cards, db.images, db.progress, async () => {
    await db.cards.delete(card.id);
    await db.progress.delete(card.id);
    if (card.imageId) {
      const stillUsed = await db.cards.filter((c) => c.imageId === card.imageId).count();
      if (!stillUsed) await db.images.delete(card.imageId);
    }
  });
  if (card.imageId) forgetImageUrl(card.imageId);
}

export async function restoreCard(id: string): Promise<void> {
  await db.cards.update(id, { archived: false });
}

/** Replace a card's photo, cleaning up the old one. */
export async function replaceImage(cardId: string, imageId: string | undefined): Promise<void> {
  const card = await db.cards.get(cardId);
  if (!card) return;
  const old = card.imageId;
  await db.cards.update(cardId, { imageId, updatedAt: Date.now() });
  if (old && old !== imageId) {
    const stillUsed = await db.cards.filter((c) => c.imageId === old).count();
    if (!stillUsed) {
      await db.images.delete(old);
      forgetImageUrl(old);
    }
  }
}

export async function createDeck(input: { name: string; nameEn?: string; emoji: string; color: PaletteKey }): Promise<Deck> {
  const decks = await db.decks.toArray();
  const deck: Deck = {
    id: uid(),
    name: input.name.trim() || 'Mon thème',
    nameEn: input.nameEn?.trim() || input.name.trim() || 'My theme',
    emoji: input.emoji || '📒',
    color: input.color,
    builtin: false,
    active: true,
    level: 1,
    order: decks.reduce((m, d) => Math.max(m, d.order), 0) + 1,
    createdAt: Date.now(),
  };
  await db.decks.add(deck);
  return deck;
}

export async function updateDeck(id: string, patch: Partial<Pick<Deck, 'name' | 'nameEn' | 'emoji' | 'color' | 'active'>>): Promise<void> {
  await db.decks.update(id, patch);
}

/**
 * Deletes one of the learner's decks. Its cards move to `moveTo` when given,
 * otherwise they are removed too (built-in cards that were moved in get archived).
 */
export async function deleteDeck(id: string, opts: { moveTo?: string } = {}): Promise<void> {
  const deck = await db.decks.get(id);
  if (!deck || deck.builtin) throw new Error('Built-in themes can’t be deleted.');
  const cards = await db.cards.where('deckId').equals(id).toArray();
  if (opts.moveTo) {
    await moveCards(
      cards.map((c) => c.id),
      opts.moveTo,
    );
  } else {
    for (const c of cards) await deleteCard(c);
    // archived built-in cards need a home that still exists
    const home = (await db.decks.toArray()).find((d) => d.builtin);
    if (home) await db.cards.where('deckId').equals(id).modify({ deckId: home.id });
  }
  await db.decks.delete(id);
}

/** Cards (not archived) with the same French text. */
export async function findDuplicates(fr: string, excludeId?: string): Promise<Card[]> {
  const key = normalizeAnswer(fr);
  if (!key) return [];
  return db.cards.filter((c) => !c.archived && c.id !== excludeId && normalizeAnswer(c.fr) === key).toArray();
}

export async function existingFrench(): Promise<string[]> {
  return (await db.cards.toArray()).filter((c) => !c.archived).map((c) => c.fr);
}

/** French + English of every live card, to correct OCR slips against. */
export async function existingPairs(): Promise<{ fr: string; en: string }[]> {
  return (await db.cards.toArray()).filter((c) => !c.archived).map((c) => ({ fr: c.fr, en: c.en }));
}

/** Normalised French text -> the card that already has it, and its theme (all decks). */
export async function existingByFrench(): Promise<Map<string, { id: string; deck: string }>> {
  const [cards, decks] = await Promise.all([db.cards.toArray(), db.decks.toArray()]);
  const names = new Map(decks.map((d) => [d.id, d.name]));
  const out = new Map<string, { id: string; deck: string }>();
  for (const c of cards) {
    if (c.archived) continue;
    const key = normalizeAnswer(c.fr);
    if (!out.has(key)) out.set(key, { id: c.id, deck: names.get(c.deckId) ?? 'Mes mots' });
  }
  return out;
}

/** Checks badges after content changes and throws a little party for new ones. */
export async function celebrateUnlocks(): Promise<void> {
  try {
    const fresh = await checkAchievements();
    if (!fresh.length) return;
    const [{ toast }, { sfx }, { emojiRain }] = await Promise.all([
      import('../components/Toasts'),
      import('./sound'),
      import('./confetti'),
    ]);
    fresh.forEach((a, i) =>
      setTimeout(() => {
        toast({ title: `Badge : ${a.title()}`, body: a.desc, emoji: a.emoji, tone: 'gold' }, 4200);
        sfx.achievement();
        emojiRain([a.emoji, '⭐', '🎉'], 36);
      }, 600 + i * 1400),
    );
  } catch {
    /* celebrations are best-effort */
  }
}
