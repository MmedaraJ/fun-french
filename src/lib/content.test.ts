import { beforeEach, describe, expect, it } from 'vitest';
import type { Card } from '../types';
import {
  addCards,
  createDeck,
  deleteCard,
  deleteDeck,
  ensureMyWordsDeck,
  findDuplicates,
  moveCards,
  MY_WORDS_DECK,
  replaceImage,
  restoreCard,
  setFocus,
  updateCard,
} from './content';
import { db } from './db';

function starter(id: string, fr: string, deckId = 'animals'): Card {
  return { id, deckId, kind: 'word', fr, en: fr, source: 'starter', order: 1, createdAt: 1, updatedAt: 1 };
}

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()));
  await db.decks.put({ id: 'animals', name: 'Les animaux', nameEn: 'Animals', emoji: '🐾', color: 'leaf', builtin: true, active: true, level: 1, order: 0, createdAt: 1 });
});

describe('addCards', () => {
  it('stores cards with ids, order, timestamps and source, creating "Mes mots" on demand', async () => {
    const rows = await addCards(
      [
        { fr: '  la   tasse ', en: 'cup', kind: 'word', gender: 'f', emoji: '☕' },
        { fr: "Je voudrais un thé.", en: 'I would like a tea.', kind: 'sentence', gender: 'm' },
        { fr: '   ', en: 'ignored', kind: 'word' },
      ],
      { deckId: MY_WORDS_DECK, source: 'manual', celebrate: false },
    );
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ fr: 'la tasse', en: 'cup', gender: 'f', source: 'manual', deckId: MY_WORDS_DECK, emoji: '☕' });
    // gender only applies to single words
    expect(rows[1].gender).toBeUndefined();
    expect(rows[1].order).toBeGreaterThan(rows[0].order);
    expect(rows[0].id).not.toBe(rows[1].id);
    expect(await db.cards.count()).toBe(2);
    const deck = await db.decks.get(MY_WORDS_DECK);
    expect(deck).toMatchObject({ name: 'Mes mots', builtin: false, active: true });
  });

  it('keeps ensureMyWordsDeck idempotent', async () => {
    const a = await ensureMyWordsDeck();
    const b = await ensureMyWordsDeck();
    expect(a.id).toBe(b.id);
    expect(await db.decks.count()).toBe(2);
  });
});

describe('update / focus / move', () => {
  it('bumps updatedAt on edits but not when starring', async () => {
    await db.cards.put(starter('s1', 'le chat'));
    await setFocus('s1', true);
    let c = (await db.cards.get('s1'))!;
    expect(c.focus).toBe(true);
    expect(c.updatedAt).toBe(1);
    await updateCard('s1', { en: '  kitty ' });
    c = (await db.cards.get('s1'))!;
    expect(c.en).toBe('kitty');
    expect(c.updatedAt).toBeGreaterThan(1);
  });

  it('moves cards between decks', async () => {
    const [card] = await addCards([{ fr: 'le thé', en: 'tea', kind: 'word', gender: 'm' }], { deckId: 'animals', source: 'manual', celebrate: false });
    await moveCards([card.id], MY_WORDS_DECK);
    expect((await db.cards.get(card.id))!.deckId).toBe(MY_WORDS_DECK);
    expect(await db.decks.get(MY_WORDS_DECK)).toBeTruthy();
  });
});

describe('deleteCard', () => {
  it('archives built-in cards and can restore them', async () => {
    await db.cards.put(starter('s1', 'le chat'));
    await deleteCard({ id: 's1', source: 'starter' });
    expect((await db.cards.get('s1'))!.archived).toBe(true);
    await restoreCard('s1');
    expect((await db.cards.get('s1'))!.archived).toBe(false);
  });

  it('hard-deletes the learner\'s card with its photo and memory', async () => {
    await db.images.put({ id: 'img1', blob: new Blob(['x']), createdAt: 1 });
    const [card] = await addCards([{ fr: 'mon vélo', en: 'my bike', kind: 'phrase', imageId: 'img1' }], { deckId: MY_WORDS_DECK, source: 'photo', celebrate: false });
    await db.progress.put({ cardId: card.id, box: 1, due: 0, seen: 1, correct: 1, wrong: 0, lapses: 0, streak: 1, firstSeen: 0, lastSeen: 0 });
    await deleteCard(card);
    expect(await db.cards.get(card.id)).toBeUndefined();
    expect(await db.progress.get(card.id)).toBeUndefined();
    expect(await db.images.get('img1')).toBeUndefined();
  });

  it('keeps a shared photo while another card still uses it', async () => {
    await db.images.put({ id: 'img2', blob: new Blob(['x']), createdAt: 1 });
    const [a, b] = await addCards(
      [
        { fr: 'la cuisine', en: 'kitchen', kind: 'word', imageId: 'img2' },
        { fr: 'le four', en: 'oven', kind: 'word', imageId: 'img2' },
      ],
      { deckId: MY_WORDS_DECK, source: 'photo', celebrate: false },
    );
    await deleteCard(a);
    expect(await db.images.get('img2')).toBeTruthy();
    await deleteCard(b);
    expect(await db.images.get('img2')).toBeUndefined();
  });
});

describe('replaceImage', () => {
  it('swaps the photo and removes the unused old one', async () => {
    await db.images.put({ id: 'old', blob: new Blob(['x']), createdAt: 1 });
    await db.images.put({ id: 'new', blob: new Blob(['y']), createdAt: 1 });
    const [card] = await addCards([{ fr: 'la plante', en: 'plant', kind: 'word', imageId: 'old' }], { deckId: MY_WORDS_DECK, source: 'photo', celebrate: false });
    await replaceImage(card.id, 'new');
    expect((await db.cards.get(card.id))!.imageId).toBe('new');
    expect(await db.images.get('old')).toBeUndefined();
  });
});

describe('decks', () => {
  it('creates, then deletes a deck moving its cards', async () => {
    const deck = await createDeck({ name: 'Cuisine', emoji: '🍳', color: 'tangerine' });
    expect(deck).toMatchObject({ builtin: false, active: true, nameEn: 'Cuisine' });
    const [card] = await addCards([{ fr: 'la poêle', en: 'pan', kind: 'word', gender: 'f' }], { deckId: deck.id, source: 'manual', celebrate: false });
    await deleteDeck(deck.id, { moveTo: MY_WORDS_DECK });
    expect(await db.decks.get(deck.id)).toBeUndefined();
    expect((await db.cards.get(card.id))!.deckId).toBe(MY_WORDS_DECK);
  });

  it('deletes a deck with its own cards and archives moved-in built-ins', async () => {
    const deck = await createDeck({ name: 'Voyage', emoji: '✈️', color: 'sky' });
    const [mine] = await addCards([{ fr: 'le billet', en: 'ticket', kind: 'word', gender: 'm' }], { deckId: deck.id, source: 'manual', celebrate: false });
    await db.cards.put(starter('s9', "l'avion", deck.id));
    await deleteDeck(deck.id);
    expect(await db.cards.get(mine.id)).toBeUndefined();
    const s9 = (await db.cards.get('s9'))!;
    expect(s9.archived).toBe(true);
    expect(s9.deckId).toBe('animals');
  });

  it('refuses to delete built-in decks', async () => {
    await expect(deleteDeck('animals')).rejects.toThrow();
  });
});

describe('findDuplicates', () => {
  it('matches French text regardless of case and punctuation', async () => {
    await db.cards.put(starter('s1', 'le chat'));
    await db.cards.put({ ...starter('s2', 'le chien'), archived: true });
    expect((await findDuplicates('Le Chat !')).map((c) => c.id)).toEqual(['s1']);
    expect(await findDuplicates('le chien')).toHaveLength(0);
    expect(await findDuplicates('le chat', 's1')).toHaveLength(0);
  });
});

import { existingByFrench } from './content';

describe('existingByFrench', () => {
  it('maps every live card to the theme it is in', async () => {
    await db.cards.put(starter('s1', 'Abaisser'));
    await db.cards.put({ ...starter('s2', 'le chien'), archived: true });
    const map = await existingByFrench();
    expect(map.get('abaisser')).toEqual({ id: 's1', deck: 'Les animaux' });
    expect(map.has('le chien')).toBe(false);
  });
});
