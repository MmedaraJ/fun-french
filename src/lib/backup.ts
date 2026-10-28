// Backups (everything, for safekeeping) and deck sharing (only the learner's own
// words, so a partner can make cards on one phone and send them to another).
import type { AnswerEvent, Card, DailyStat, Deck, Progress, Session, Unlocked } from '../types';
import { dayKey } from './date';
import { db, type MetaRow } from './db';
import { DEFAULT_SETTINGS, snapshotSettings, useSettings, type Settings } from './settings';

export const BACKUP_FORMAT = 'bonbon-backup';
export const DECK_FORMAT = 'bonbon-deck';
export const BACKUP_VERSION = 1;

export interface ImageRecord {
  id: string;
  createdAt: number;
  /** data: URL */
  data: string;
}

export interface BackupTables {
  decks: Deck[];
  cards: Card[];
  progress: Progress[];
  events: AnswerEvent[];
  sessions: Session[];
  daily: DailyStat[];
  unlocked: Unlocked[];
  meta: MetaRow[];
}

export interface BackupFile {
  format: typeof BACKUP_FORMAT;
  version: number;
  exportedAt: number;
  settings: Partial<Settings>;
  tables: BackupTables;
  images: ImageRecord[];
}

export interface DeckFile {
  format: typeof DECK_FORMAT;
  version: number;
  exportedAt: number;
  /** Name of the person who shared it, if known. */
  from?: string;
  decks: Deck[];
  cards: Card[];
  images: ImageRecord[];
}

export class BackupError extends Error {}

// ---------- encoding helpers (work in browsers and in Node for tests) ----------

function bytesToBase64(bytes: Uint8Array): string {
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return btoa(bin);
}

export async function blobToDataUrl(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  return `data:${blob.type || 'application/octet-stream'};base64,${bytesToBase64(bytes)}`;
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const m = dataUrl.match(/^data:([^;,]*)(;base64)?,(.*)$/s);
  if (!m) throw new BackupError('Broken picture in file');
  const type = m[1] || 'application/octet-stream';
  if (!m[2]) return new Blob([decodeURIComponent(m[3])], { type });
  const bin = atob(m[3]);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type });
}

async function imagesToRecords(ids: Iterable<string>): Promise<ImageRecord[]> {
  const rows = await db.images.bulkGet([...new Set(ids)]);
  const out: ImageRecord[] = [];
  for (const row of rows) {
    if (!row) continue;
    out.push({ id: row.id, createdAt: row.createdAt, data: await blobToDataUrl(row.blob) });
  }
  return out;
}

// ---------- full backup ----------

/** Settings that travel with a backup. The API key never leaves the device. */
function portableSettings(): Partial<Settings> {
  const { aiKey: _key, ...rest } = snapshotSettings();
  void _key;
  return rest;
}

export async function buildBackup(): Promise<BackupFile> {
  const [decks, cards, progress, events, sessions, daily, unlocked, meta, images] = await Promise.all([
    db.decks.toArray(),
    db.cards.toArray(),
    db.progress.toArray(),
    db.events.toArray(),
    db.sessions.toArray(),
    db.daily.toArray(),
    db.unlocked.toArray(),
    db.meta.toArray(),
    db.images.toArray(),
  ]);
  const imageRecords: ImageRecord[] = [];
  for (const img of images) imageRecords.push({ id: img.id, createdAt: img.createdAt, data: await blobToDataUrl(img.blob) });
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: Date.now(),
    settings: portableSettings(),
    tables: { decks, cards, progress, events, sessions, daily, unlocked, meta },
    images: imageRecords,
  };
}

const TABLE_KEYS: (keyof BackupTables)[] = ['decks', 'cards', 'progress', 'events', 'sessions', 'daily', 'unlocked', 'meta'];

/** Reads and checks a backup file's text. Throws BackupError with a friendly message. */
export function parseBackup(text: string): BackupFile {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new BackupError('This file isn’t a Bonbon backup (it isn’t valid JSON).');
  }
  const f = data as Partial<BackupFile>;
  if (!f || typeof f !== 'object' || f.format !== BACKUP_FORMAT) {
    if ((data as Partial<DeckFile>)?.format === DECK_FORMAT) throw new BackupError('This is a shared word list, not a backup. Use “Importer des mots” instead.');
    throw new BackupError('This file isn’t a Bonbon backup.');
  }
  if (typeof f.version !== 'number' || f.version > BACKUP_VERSION) throw new BackupError('This backup comes from a newer version of Bonbon. Update the app first.');
  if (!f.tables || typeof f.tables !== 'object') throw new BackupError('This backup is incomplete.');
  for (const k of TABLE_KEYS) {
    if (!Array.isArray(f.tables[k])) throw new BackupError(`This backup is missing its “${k}”.`);
  }
  if (!f.tables.decks.length || !f.tables.cards.length) throw new BackupError('This backup has no words in it.');
  if (!Array.isArray(f.images)) f.images = [];
  return f as BackupFile;
}

export function backupSummary(f: BackupFile) {
  return {
    exportedAt: f.exportedAt,
    cards: f.tables.cards.filter((c) => !c.archived).length,
    own: f.tables.cards.filter((c) => c.source !== 'starter').length,
    sessions: f.tables.sessions.length,
    days: f.tables.daily.filter((d) => d.answers > 0).length,
    images: f.images.length,
  };
}

/** Replaces everything on this device with the backup. Reload the page afterwards. */
export async function restoreBackup(f: BackupFile, opts: { applySettings?: boolean } = {}): Promise<void> {
  // Decode pictures first: async work that isn't Dexie can't run inside a transaction.
  const images = f.images.map((img) => ({ id: img.id, createdAt: img.createdAt, blob: dataUrlToBlob(img.data) }));
  const t = f.tables;
  await db.transaction('rw', [db.decks, db.cards, db.progress, db.events, db.sessions, db.daily, db.unlocked, db.meta, db.images], async () => {
    await Promise.all([db.decks.clear(), db.cards.clear(), db.progress.clear(), db.events.clear(), db.sessions.clear(), db.daily.clear(), db.unlocked.clear(), db.meta.clear(), db.images.clear()]);
    await db.decks.bulkAdd(t.decks);
    await db.cards.bulkAdd(t.cards);
    await db.progress.bulkAdd(t.progress);
    await db.events.bulkAdd(t.events);
    await db.sessions.bulkAdd(t.sessions);
    await db.daily.bulkAdd(t.daily);
    await db.unlocked.bulkAdd(t.unlocked);
    await db.meta.bulkAdd(t.meta);
    await db.images.bulkAdd(images);
  });
  if (opts.applySettings !== false && f.settings) {
    const current = useSettings.getState();
    const allowed = Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[];
    const patch: Partial<Settings> = {};
    for (const k of allowed) {
      if (k === 'aiKey') continue;
      if (k in f.settings) (patch as Record<string, unknown>)[k] = (f.settings as Record<string, unknown>)[k];
    }
    current.update({ ...patch, onboarded: true });
  }
}

// ---------- sharing the learner's own words ----------

/** The learner's own cards (any deck) plus the decks they live in. */
export async function buildDeckShare(): Promise<DeckFile> {
  const cards = (await db.cards.toArray()).filter((c) => c.source !== 'starter' && !c.archived);
  const deckIds = new Set(cards.map((c) => c.deckId));
  const decks = (await db.decks.bulkGet([...deckIds])).filter(Boolean) as Deck[];
  const images = await imagesToRecords(cards.map((c) => c.imageId).filter(Boolean) as string[]);
  return {
    format: DECK_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: Date.now(),
    from: useSettings.getState().name || undefined,
    decks,
    cards: cards.map((c) => ({ ...c, focus: undefined })),
    images,
  };
}

export function parseDeckShare(text: string): DeckFile {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new BackupError('This file isn’t a Bonbon word list.');
  }
  const f = data as Partial<DeckFile>;
  if ((data as Partial<BackupFile>)?.format === BACKUP_FORMAT) throw new BackupError('This is a full backup. Use “Importer une sauvegarde” instead.');
  if (!f || f.format !== DECK_FORMAT || !Array.isArray(f.cards) || !Array.isArray(f.decks)) throw new BackupError('This file isn’t a Bonbon word list.');
  if (typeof f.version !== 'number' || f.version > BACKUP_VERSION) throw new BackupError('This word list comes from a newer version of Bonbon.');
  if (!Array.isArray(f.images)) f.images = [];
  return f as DeckFile;
}

const norm = (s: string) => s.trim().toLowerCase().replace(/[’]/g, "'");

/** Merges a shared word list: new decks are added (active), duplicates skipped. */
export async function importDeckShare(f: DeckFile): Promise<{ decks: number; cards: number; skipped: number }> {
  const now = Date.now();
  const images = f.images.map((img) => ({ id: img.id, createdAt: img.createdAt, blob: dataUrlToBlob(img.data) }));
  let addedDecks = 0;
  let addedCards = 0;
  let skipped = 0;
  await db.transaction('rw', db.decks, db.cards, db.images, async () => {
    const existingDecks = new Map((await db.decks.toArray()).map((d) => [d.id, d]));
    let order = Math.max(0, ...[...existingDecks.values()].map((d) => d.order)) + 1;
    for (const d of f.decks) {
      if (existingDecks.has(d.id)) continue;
      const deck: Deck = { ...d, builtin: false, active: true, order: order++, createdAt: now };
      await db.decks.add(deck);
      existingDecks.set(deck.id, deck);
      addedDecks++;
    }
    const cards = await db.cards.toArray();
    const ids = new Set(cards.map((c) => c.id));
    const keys = new Set(cards.map((c) => `${c.deckId}|${norm(c.fr)}`));
    const imageIds = new Set((await db.images.toCollection().primaryKeys()) as string[]);
    const usedImages = new Set<string>();
    for (const c of f.cards) {
      const key = `${c.deckId}|${norm(c.fr)}`;
      if (ids.has(c.id) || keys.has(key) || !existingDecks.has(c.deckId)) {
        skipped++;
        continue;
      }
      ids.add(c.id);
      keys.add(key);
      if (c.imageId) usedImages.add(c.imageId);
      await db.cards.add({ ...c, source: 'import', focus: false, archived: false, createdAt: now + addedCards, updatedAt: now + addedCards });
      addedCards++;
    }
    for (const img of images) {
      if (usedImages.has(img.id) && !imageIds.has(img.id)) await db.images.add(img);
    }
  });
  return { decks: addedDecks, cards: addedCards, skipped };
}

// ---------- resets ----------

/** Forget all learning history but keep every word. */
export async function resetProgress(): Promise<void> {
  await db.transaction('rw', [db.progress, db.events, db.sessions, db.daily, db.unlocked], async () => {
    await Promise.all([db.progress.clear(), db.events.clear(), db.sessions.clear(), db.daily.clear(), db.unlocked.clear()]);
  });
}

/** Delete everything, including the learner's own words. Reload afterwards to re-seed. */
export async function eraseEverything(): Promise<void> {
  await db.transaction('rw', db.tables, async () => {
    await Promise.all(db.tables.map((t) => t.clear()));
  });
  useSettings.getState().reset();
}

// ---------- files (browser only) ----------

export function backupFileName(): string {
  return `bonbon-backup-${dayKey()}.json`;
}

export function deckFileName(): string {
  const who = useSettings
    .getState()
    .name.normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `${who ? who + '-' : ''}mots-${dayKey()}.bonbon-deck.json`;
}

/** Saves a file: the share sheet on phones when asked and possible, else a download. */
export async function saveFile(name: string, data: unknown, preferShare = false): Promise<'shared' | 'downloaded'> {
  const json = JSON.stringify(data);
  const file = new File([json], name, { type: 'application/json' });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (preferShare && nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: name });
      return 'shared';
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') throw e;
      // fall through to a normal download
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return 'downloaded';
}

/** Opens a file picker and resolves with the chosen file's text (or null if cancelled). */
export function pickTextFile(accept = '.json,application/json'): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = async () => {
      const f = input.files?.[0];
      resolve(f ? await f.text() : null);
    };
    input.oncancel = () => resolve(null);
    input.click();
  });
}
