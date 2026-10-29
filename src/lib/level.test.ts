import { beforeEach, describe, expect, it } from 'vitest';
import type { Card, Deck } from '../types';
import { db } from './db';
import { MIX_TYPES, MODE_BY_ID, MODES } from './engine/modes';
import { loadPool } from './engine/pool';
import { deckShown, modeShown, tensesAtLevel, typesAtLevel } from './level';

const deck = (id: string, level: number, builtin = true): Deck => ({ id, name: id, nameEn: id, emoji: '📦', color: 'leaf', level, builtin, active: true, order: 0, createdAt: 1 });
const card = (id: string, deckId: string): Card => ({ id, deckId, kind: 'word', fr: id, en: id, source: 'starter', order: 0, createdAt: 1, updatedAt: 1 });

describe('deckShown', () => {
  it('hides built-in themes below the floor, never hers or her textbook verbs', () => {
    expect(deckShown(deck('animals', 1), 2)).toBe(false);
    expect(deckShown(deck('cafe', 2), 2)).toBe(true);
    expect(deckShown(deck('verbs-er', 1), 2)).toBe(true);
    expect(deckShown(deck('unite-4', 1, false), 3)).toBe(true);
    expect(deckShown(deck('animals', 1), 1)).toBe(true);
  });
});

describe('tensesAtLevel', () => {
  it('A2 drops the A1 tenses but keeps the passé composé', () => {
    const t = tensesAtLevel(2);
    expect(t).toContain('passe_compose');
    expect(t).toContain('imparfait');
    expect(t).not.toContain('present');
    expect(t).not.toContain('futur_proche');
    expect(t).not.toContain('passe_recent');
    expect(t).not.toContain('imperatif');
  });
  it('B1 keeps only B1 tenses; A1 keeps them all', () => {
    expect(tensesAtLevel(3)).toEqual(expect.arrayContaining(['subjonctif_present', 'plus_que_parfait']));
    expect(tensesAtLevel(3)).not.toContain('imparfait');
    expect(tensesAtLevel(1)).toHaveLength(14);
  });
});

describe('basic games', () => {
  it('from A2 on, the picture-tapping and flip-card games are hidden and the rest stay', () => {
    for (const id of ['pick-image', 'pick-word', 'pairs', 'flash'] as const) expect(modeShown(MODE_BY_ID[id], 2)).toBe(false);
    for (const id of ['spell', 'listen', 'mix', 'gender', 'build', 'type', 'dictation', 'speak', 'conjugaison', 'temps', 'questions', 'grammaire'] as const)
      expect(modeShown(MODE_BY_ID[id], 2)).toBe(true);
    expect(MODES.every((m) => modeShown(m, 1))).toBe(true);
  });

  it('a mix leaves out the recognition-only questions; a basic game opened directly still plays', () => {
    expect(typesAtLevel(MIX_TYPES, 2)).not.toEqual(expect.arrayContaining(['pick-image']));
    expect(typesAtLevel(MIX_TYPES, 2)).not.toContain('pick-word');
    expect(typesAtLevel(MIX_TYPES, 2)).toEqual(expect.arrayContaining(['listen', 'spell', 'type', 'dictation', 'build', 'gender']));
    expect(typesAtLevel(['flash'], 2)).toEqual(['flash']);
    expect(typesAtLevel(MIX_TYPES, 1)).toEqual(MIX_TYPES);
  });
});

describe('loadPool with a level floor', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((t) => t.clear()));
    await db.decks.bulkPut([deck('animals', 1), deck('cafe', 2), deck('verbs-er', 1), deck('mine', 1, false)]);
    await db.cards.bulkPut([card('le chat', 'animals'), card('un café', 'cafe'), card('parler', 'verbs-er'), card('le mien', 'mine')]);
    // a basic word she already studied doesn't come back for review either
    await db.progress.put({ cardId: 'le chat', box: 1, due: 0, seen: 3, correct: 3, wrong: 0, lapses: 0, streak: 3, firstSeen: 1, lastSeen: 1 });
  });

  it('leaves basic themes out of the round and out of the wrong answers', async () => {
    const pool = await loadPool({ minLevel: 2 });
    expect(pool.cards.map((c) => c.id).sort()).toEqual(['le mien', 'parler', 'un café']);
    expect(pool.all.map((c) => c.id)).not.toContain('le chat');
  });

  it('ignores a basic theme picked before the floor went up', async () => {
    const pool = await loadPool({ minLevel: 2, deckIds: ['animals'] });
    expect(pool.cards.map((c) => c.id)).not.toContain('le chat');
  });

  it('the A1 floor keeps everything', async () => {
    const pool = await loadPool({ minLevel: 1 });
    expect(pool.cards).toHaveLength(4);
  });
});
