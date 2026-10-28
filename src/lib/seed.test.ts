import { beforeEach, describe, expect, it } from 'vitest';
import type { Card, Progress } from '../types';
import { db, setMeta } from './db';
import { ensureSeeded, starterCardId } from './seed';

function oldStarter(deckId: string, fr: string, edited = false): Card {
  return { id: starterCardId(deckId, fr), deckId, kind: 'word', fr, en: fr, source: 'starter', order: 0, createdAt: 1, updatedAt: edited ? 2 : 1 };
}

function progress(cardId: string, box: number): Progress {
  return { cardId, box, due: 0, seen: 5, correct: 4, wrong: 1, lapses: 0, streak: 2, firstSeen: 1, lastSeen: 1 };
}

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()));
});

describe('ensureSeeded', () => {
  it('adds the textbook verbs deck, active, with all its verbs', async () => {
    await ensureSeeded();
    const deck = await db.decks.get('verbs-er');
    expect(deck?.active).toBe(true);
    expect(await db.cards.where('deckId').equals('verbs-er').count()).toBeGreaterThanOrEqual(220);
  });

  it('moves a built-in card that changed deck, with its progress', async () => {
    // an install from before "parler" moved from "verbs" into "verbs-er"
    await db.cards.bulkPut([oldStarter('verbs', 'parler'), oldStarter('verbs', 'gagner', true)]);
    await db.progress.put(progress(starterCardId('verbs', 'parler'), 3));
    await setMeta('starterHash', 'old');

    await ensureSeeded();

    expect(await db.cards.get(starterCardId('verbs', 'parler'))).toBeUndefined();
    expect(await db.progress.get(starterCardId('verbs', 'parler'))).toBeUndefined();
    expect((await db.progress.get(starterCardId('verbs-er', 'parler')))?.box).toBe(3);
    expect((await db.cards.toArray()).filter((c) => c.fr === 'parler')).toHaveLength(1);
    // a card she edited is hers now and stays
    expect(await db.cards.get(starterCardId('verbs', 'gagner'))).toBeDefined();
  });
});
