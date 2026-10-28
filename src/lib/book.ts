// Grammar taught in the learner's own textbook, found in the PDFs she imported (see
// src/lib/pdf-topics.ts). Stored in Dexie meta, so it travels with backups.
import { db, getMeta, setMeta } from './db';

const KEY = 'bookGrammar';

export interface BookGrammar {
  /** Lesson ids from src/data/grammar/lessons.ts, in the order they were found. */
  lessonIds: string[];
  /** Names of the PDFs they were found in. */
  sources: string[];
}

export async function getBookGrammar(): Promise<BookGrammar> {
  const v = await getMeta<Partial<BookGrammar> | null>(KEY, null);
  return {
    lessonIds: Array.isArray(v?.lessonIds) ? v.lessonIds.filter((x): x is string => typeof x === 'string') : [],
    sources: Array.isArray(v?.sources) ? v.sources.filter((x): x is string => typeof x === 'string') : [],
  };
}

/** Records the lessons a book teaches; lessons and sources already known are not repeated. */
export async function addBookGrammar(lessonIds: string[], sourceName: string): Promise<BookGrammar> {
  return db.transaction('rw', db.meta, async () => {
    const cur = await getBookGrammar();
    const fresh = lessonIds.filter((id) => id && !cur.lessonIds.includes(id));
    const name = sourceName.trim();
    const next: BookGrammar = {
      lessonIds: [...cur.lessonIds, ...new Set(fresh)],
      sources: lessonIds.length && name && !cur.sources.includes(name) ? [...cur.sources, name] : cur.sources,
    };
    await setMeta(KEY, next);
    return next;
  });
}
