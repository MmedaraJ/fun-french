import { STARTER_DECKS } from '../data/starter';
import type { Card, Deck } from '../types';
import { db, getMeta, setMeta } from './db';
import { slugify } from './ids';

function hashString(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

export const STARTER_HASH = hashString(JSON.stringify(STARTER_DECKS));

export function starterCardId(deckId: string, fr: string) {
  return `s-${deckId}-${slugify(fr)}`;
}

/**
 * Inserts the built-in decks and cards, and on later app versions adds new
 * built-in content. Cards the learner edited or archived are left alone.
 */
export async function ensureSeeded(): Promise<void> {
  if ((await getMeta('starterHash', '')) === STARTER_HASH) return;
  const now = Date.now();
  await db.transaction('rw', db.decks, db.cards, db.meta, async () => {
    const existingDecks = new Map((await db.decks.toArray()).map((d) => [d.id, d]));
    for (const [i, sd] of STARTER_DECKS.entries()) {
      const prev = existingDecks.get(sd.id);
      const deck: Deck = {
        id: sd.id,
        name: sd.name,
        nameEn: sd.nameEn,
        emoji: sd.emoji,
        color: sd.color,
        level: sd.level,
        builtin: true,
        active: prev ? prev.active : false,
        order: i,
        createdAt: prev ? prev.createdAt : now,
      };
      await db.decks.put(deck);

      const existing = new Map((await db.cards.where('deckId').equals(sd.id).toArray()).map((c) => [c.id, c]));
      const seen = new Set<string>();
      const rows: Card[] = [];
      sd.cards.forEach((sc, order) => {
        let id = starterCardId(sd.id, sc.fr);
        while (seen.has(id)) id += '-x';
        seen.add(id);
        const old = existing.get(id);
        if (old && old.updatedAt !== old.createdAt) return; // learner edited it
        rows.push({
          id,
          deckId: sd.id,
          kind: sc.kind ?? sd.kind,
          fr: sc.fr,
          en: sc.en,
          gender: sc.g,
          plural: sc.pl,
          emoji: sc.e,
          note: sc.note,
          source: 'starter',
          order,
          focus: old?.focus,
          archived: old?.archived,
          createdAt: old ? old.createdAt : now,
          updatedAt: old ? old.createdAt : now,
        });
      });
      await db.cards.bulkPut(rows);
    }
    await setMeta('starterHash', STARTER_HASH);
  });
}

/** Marks the chosen decks active (used by onboarding). */
export async function setActiveDecks(ids: string[]) {
  await db.transaction('rw', db.decks, async () => {
    const all = await db.decks.toArray();
    for (const d of all) {
      const active = ids.includes(d.id);
      if (d.active !== active) await db.decks.update(d.id, { active });
    }
  });
}
