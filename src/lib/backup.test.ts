// @vitest-environment node
// (Node's Blob survives fake-indexeddb's structured clone; jsdom's doesn't.)
import { beforeEach, describe, expect, it } from 'vitest';
import type { Card, Deck } from '../types';
import {
  backupSummary,
  buildBackup,
  buildDeckShare,
  importDeckShare,
  parseBackup,
  parseDeckShare,
  resetProgress,
  restoreBackup,
  BackupError,
} from './backup';
import { db } from './db';
import { useSettings } from './settings';

const now = 1_760_000_000_000;

function deck(id: string, extra: Partial<Deck> = {}): Deck {
  return { id, name: id, nameEn: id, emoji: '🐾', color: 'berry', builtin: true, active: true, level: 1, order: 0, createdAt: now, ...extra };
}

function card(id: string, deckId: string, fr: string, extra: Partial<Card> = {}): Card {
  return { id, deckId, kind: 'word', fr, en: fr + '-en', source: 'starter', order: 0, createdAt: now, updatedAt: now, ...extra };
}

async function seedSample() {
  await db.decks.bulkAdd([deck('animals'), deck('mine', { builtin: false, name: 'Ma cuisine', emoji: '🍳', order: 5 })]);
  await db.cards.bulkAdd([
    card('s-animals-le-chat', 'animals', 'le chat', { gender: 'm', emoji: '🐈' }),
    card('s-animals-la-vache', 'animals', 'la vache', { gender: 'f', emoji: '🐄', archived: true }),
    card('own-1', 'mine', 'la poêle', { source: 'photo', imageId: 'img-1', gender: 'f' }),
    card('own-2', 'animals', 'le hérisson', { source: 'manual', gender: 'm', emoji: '🦔', focus: true }),
  ]);
  await db.images.add({ id: 'img-1', createdAt: now, blob: new Blob([new Uint8Array([255, 216, 255, 1, 2, 3])], { type: 'image/jpeg' }) });
  await db.progress.add({ cardId: 's-animals-le-chat', box: 3, due: now + 1000, seen: 5, correct: 4, wrong: 1, lapses: 0, streak: 2, firstSeen: now, lastSeen: now, learnedAt: now });
  await db.events.bulkAdd([
    { sessionId: 'sess-1', cardId: 's-animals-le-chat', type: 'pick-image', correct: true, ms: 1200, ts: now, day: '2025-10-09' },
    { sessionId: 'sess-1', cardId: 'own-1', type: 'spell', correct: false, ms: 5000, ts: now + 10, day: '2025-10-09' },
  ]);
  await db.sessions.add({
    id: 'sess-1', mode: 'mix', survival: false, startedAt: now, endedAt: now + 60000, day: '2025-10-09', score: 450, correct: 1, total: 2,
    maxCombo: 1, xp: 32, newCards: 1, deckIds: [], missed: ['own-1'], cardIds: ['s-animals-le-chat', 'own-1'],
  });
  await db.daily.add({ day: '2025-10-09', xp: 32, answers: 2, correct: 1, ms: 6200, sessions: 1, newCards: 1 });
  await db.unlocked.add({ id: 'first-round', unlockedAt: now });
  await db.meta.add({ key: 'starterHash', value: 'abc123' });
}

async function dump() {
  const sortBy = <T,>(rows: T[], key: (r: T) => string | number) => [...rows].sort((a, b) => (key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0));
  const images = await db.images.toArray();
  return {
    decks: sortBy(await db.decks.toArray(), (r) => r.id),
    cards: sortBy(await db.cards.toArray(), (r) => r.id),
    progress: sortBy(await db.progress.toArray(), (r) => r.cardId),
    events: sortBy(await db.events.toArray(), (r) => r.id!),
    sessions: sortBy(await db.sessions.toArray(), (r) => r.id),
    daily: sortBy(await db.daily.toArray(), (r) => r.day),
    unlocked: sortBy(await db.unlocked.toArray(), (r) => r.id),
    meta: sortBy(await db.meta.toArray(), (r) => r.key),
    images: await Promise.all(images.map(async (i) => ({ id: i.id, createdAt: i.createdAt, type: i.blob.type, bytes: [...new Uint8Array(await i.blob.arrayBuffer())] }))),
  };
}

async function wipe() {
  await Promise.all(db.tables.map((t) => t.clear()));
}

beforeEach(async () => {
  await wipe();
  useSettings.getState().reset();
});

describe('full backup', () => {
  it('round-trips every table, including pictures', async () => {
    await seedSample();
    const before = await dump();
    const text = JSON.stringify(await buildBackup());
    await wipe();
    expect(await db.cards.count()).toBe(0);
    await restoreBackup(parseBackup(text));
    expect(await dump()).toEqual(before);
  });

  it('keeps the API key on the device and restores other settings', async () => {
    await seedSample();
    useSettings.getState().update({ name: 'Amélie', aiKey: 'sk-secret', dailyGoal: 100, onboarded: true });
    const file = await buildBackup();
    expect(JSON.stringify(file)).not.toContain('sk-secret');
    expect(file.settings.name).toBe('Amélie');
    useSettings.getState().update({ name: 'Someone else', dailyGoal: 30, aiKey: 'sk-mine', onboarded: false });
    await restoreBackup(parseBackup(JSON.stringify(file)));
    const s = useSettings.getState();
    expect(s.name).toBe('Amélie');
    expect(s.dailyGoal).toBe(100);
    expect(s.aiKey).toBe('sk-mine');
    expect(s.onboarded).toBe(true);
  });

  it('summarises a backup', async () => {
    await seedSample();
    const sum = backupSummary(await buildBackup());
    expect(sum).toMatchObject({ cards: 3, own: 2, sessions: 1, days: 1, images: 1 });
  });

  it('rejects files that are not backups', async () => {
    expect(() => parseBackup('not json')).toThrow(BackupError);
    expect(() => parseBackup(JSON.stringify({ hello: 1 }))).toThrow(/isn’t a Bonbon backup/);
    expect(() => parseBackup(JSON.stringify({ format: 'bonbon-deck', version: 1, cards: [], decks: [] }))).toThrow(/word list/);
    await seedSample();
    const f = await buildBackup();
    expect(() => parseBackup(JSON.stringify({ ...f, version: 99 }))).toThrow(/newer version/);
    expect(() => parseBackup(JSON.stringify({ ...f, tables: { ...f.tables, cards: undefined } }))).toThrow(/missing/);
  });
});

describe('sharing own words', () => {
  it('exports only the learner’s own cards, their decks and pictures', async () => {
    await seedSample();
    const share = await buildDeckShare();
    expect(share.cards.map((c) => c.id).sort()).toEqual(['own-1', 'own-2']);
    expect(share.decks.map((d) => d.id).sort()).toEqual(['animals', 'mine']);
    expect(share.images.map((i) => i.id)).toEqual(['img-1']);
    expect(share.cards.every((c) => !c.focus)).toBe(true);
  });

  it('merges into another device, skipping duplicates, and is idempotent', async () => {
    await seedSample();
    const text = JSON.stringify(await buildDeckShare());
    // The partner's phone: only the built-in deck, with "le hérisson" already typed in by hand.
    await wipe();
    await db.decks.add(deck('animals'));
    await db.cards.add(card('their-own', 'animals', 'Le Hérisson', { source: 'manual' }));

    const r1 = await importDeckShare(parseDeckShare(text));
    expect(r1).toEqual({ decks: 1, cards: 1, skipped: 1 });
    const mine = await db.decks.get('mine');
    expect(mine?.active).toBe(true);
    expect(mine?.builtin).toBe(false);
    const imported = await db.cards.get('own-1');
    expect(imported?.source).toBe('import');
    const img = await db.images.get('img-1');
    expect([...new Uint8Array(await img!.blob.arrayBuffer())]).toEqual([255, 216, 255, 1, 2, 3]);

    const r2 = await importDeckShare(parseDeckShare(text));
    expect(r2).toEqual({ decks: 0, cards: 0, skipped: 2 });
  });

  it('rejects a full backup passed as a word list', async () => {
    await seedSample();
    const backup = JSON.stringify(await buildBackup());
    expect(() => parseDeckShare(backup)).toThrow(/full backup/);
    expect(() => parseDeckShare('{}')).toThrow(BackupError);
  });
});

describe('resetProgress', () => {
  it('clears history but keeps words', async () => {
    await seedSample();
    await resetProgress();
    expect(await db.progress.count()).toBe(0);
    expect(await db.events.count()).toBe(0);
    expect(await db.sessions.count()).toBe(0);
    expect(await db.daily.count()).toBe(0);
    expect(await db.unlocked.count()).toBe(0);
    expect(await db.cards.count()).toBe(4);
    expect(await db.decks.count()).toBe(2);
    expect(await db.images.count()).toBe(1);
  });
});
