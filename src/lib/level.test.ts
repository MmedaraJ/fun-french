import { beforeEach, describe, expect, it } from 'vitest';
import type { Card, Deck } from '../types';
import { db } from './db';
import { MIX_TYPES, MODE_BY_ID, MODES } from './engine/modes';
import { loadPool } from './engine/pool';
import { deckShown, modeShown, tensesAtLevel, typesAtLevel } from './level';

const deck = (id: string, level: number, builtin = true): Deck => ({ id, name: id, nameEn: id, emoji: '📦', color: 'leaf', level, builtin, active: true, order: 0, createdAt: 1 });
const card = (id: string, deckId: string): Card => ({ id, deckId, kind: 'word', fr: id, en: id, source: 'starter', order: 0, createdAt: 1, updatedAt: 1 });

describe('deckShown', () => {
  it('shows the built-in themes of her band only, and always hers', () => {
    // Débutant: A1 and A2, nothing advanced
    expect(deckShown(deck('animals', 1), 1)).toBe(true);
    expect(deckShown(deck('cafe', 2), 1)).toBe(true);
    expect(deckShown(deck('connecteurs', 3), 1)).toBe(false);
    expect(deckShown(deck('societe', 4), 1)).toBe(false);
    // Intermédiaire: A2 and B1
    expect(deckShown(deck('animals', 1), 2)).toBe(false);
    expect(deckShown(deck('cafe', 2), 2)).toBe(true);
    expect(deckShown(deck('connecteurs', 3), 2)).toBe(true);
    expect(deckShown(deck('societe', 4), 2)).toBe(false);
    // Avancé: B1 to C1
    expect(deckShown(deck('cafe', 2), 3)).toBe(false);
    expect(deckShown(deck('connecteurs', 3), 3)).toBe(true);
    expect(deckShown(deck('societe', 4), 3)).toBe(true);
    // her textbook's -er verbs up to Intermédiaire; at Avancé they're beginner words too
    expect(deckShown(deck('verbs-er', 1), 1)).toBe(true);
    expect(deckShown(deck('verbs-er', 1), 2)).toBe(true);
    expect(deckShown(deck('verbs-er', 1), 3)).toBe(false);
    for (const band of [1, 2, 3] as const) expect(deckShown(deck('unite-4', 1, false), band)).toBe(true);
  });
});

describe('tensesAtLevel', () => {
  it('Débutant has the A1 and A2 tenses, nothing beyond', () => {
    const t = tensesAtLevel(1);
    expect(t).toEqual(expect.arrayContaining(['present', 'passe_compose', 'futur_proche', 'passe_recent', 'imperatif', 'imparfait', 'futur_simple', 'conditionnel_present']));
    expect(t).not.toContain('plus_que_parfait');
    expect(t).not.toContain('subjonctif_present');
  });
  it('Intermédiaire drops the A1 tenses but keeps the passé composé, and adds B1', () => {
    const t = tensesAtLevel(2);
    expect(t).toContain('passe_compose');
    expect(t).toContain('imparfait');
    expect(t).toContain('subjonctif_present');
    expect(t).not.toContain('present');
    expect(t).not.toContain('futur_proche');
    expect(t).not.toContain('passe_recent');
    expect(t).not.toContain('imperatif');
  });
  it('Avancé keeps only the hardest tenses', () => {
    expect(tensesAtLevel(3)).toEqual(expect.arrayContaining(['subjonctif_present', 'plus_que_parfait']));
    expect(tensesAtLevel(3)).not.toContain('imparfait');
  });
});

describe('basic games', () => {
  it('from Intermédiaire on, the picture-tapping and flip-card games are hidden and the rest stay', () => {
    for (const id of ['pick-image', 'pick-word', 'pairs', 'flash'] as const) expect(modeShown(MODE_BY_ID[id], 2)).toBe(false);
    for (const id of ['spell', 'listen', 'mix', 'gender', 'build', 'type', 'dictation', 'speak', 'conjugaison', 'temps', 'questions', 'grammaire'] as const)
      expect(modeShown(MODE_BY_ID[id], 2)).toBe(true);
    // Débutant has every game but the advanced structures
    expect(MODES.filter((m) => !modeShown(m, 1)).map((m) => m.id)).toEqual(['structures']);
    expect(modeShown(MODE_BY_ID.structures, 2)).toBe(true);
  });

  it('a mix leaves out the recognition-only questions; a basic game opened directly still plays', () => {
    expect(typesAtLevel(MIX_TYPES, 2)).not.toEqual(expect.arrayContaining(['pick-image']));
    expect(typesAtLevel(MIX_TYPES, 2)).not.toContain('pick-word');
    expect(typesAtLevel(MIX_TYPES, 2)).toEqual(expect.arrayContaining(['listen', 'spell', 'type', 'dictation', 'build', 'gender']));
    expect(typesAtLevel(['flash'], 2)).toEqual(['flash']);
    expect(typesAtLevel(MIX_TYPES, 1)).toEqual(MIX_TYPES);
  });
});

describe('loadPool with a level', () => {
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

  it('Débutant keeps the A1 and A2 themes and hers', async () => {
    const pool = await loadPool({ minLevel: 1 });
    expect(pool.cards).toHaveLength(4);
  });
});
