import Dexie, { type Table } from 'dexie';
import type { AnswerEvent, Card, DailyStat, Deck, Progress, Session, StoredImage, Unlocked } from '../types';

export interface MetaRow {
  key: string;
  value: unknown;
}

export class BonbonDB extends Dexie {
  decks!: Table<Deck, string>;
  cards!: Table<Card, string>;
  progress!: Table<Progress, string>;
  /** Grammar skills ("g:tense:imparfait"…), same shape as word progress. */
  skills!: Table<Progress, string>;
  events!: Table<AnswerEvent, number>;
  sessions!: Table<Session, string>;
  daily!: Table<DailyStat, string>;
  images!: Table<StoredImage, string>;
  unlocked!: Table<Unlocked, string>;
  meta!: Table<MetaRow, string>;

  constructor(name = 'bonbon') {
    super(name);
    this.version(1).stores({
      decks: 'id, order',
      cards: 'id, deckId, kind, source, createdAt',
      progress: 'cardId, due, box',
      events: '++id, sessionId, cardId, type, day, ts',
      sessions: 'id, mode, day, startedAt',
      daily: 'day',
      images: 'id',
      unlocked: 'id',
      meta: 'key',
    });
    this.version(2).stores({ skills: 'cardId, due, box' });
  }
}

export const db = new BonbonDB();

export async function getMeta<T>(key: string, fallback: T): Promise<T> {
  const row = await db.meta.get(key);
  return row ? (row.value as T) : fallback;
}

export function setMeta(key: string, value: unknown) {
  return db.meta.put({ key, value });
}

/** Ask the browser not to evict our data (best effort; matters most on Safari). */
export async function requestPersistence(): Promise<boolean> {
  try {
    if (navigator.storage?.persisted && (await navigator.storage.persisted())) return true;
    if (navigator.storage?.persist) return await navigator.storage.persist();
  } catch {
    /* not supported */
  }
  return false;
}
