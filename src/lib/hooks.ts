import { useLiveQuery } from 'dexie-react-hooks';
import type { Card, DailyStat, Deck, Progress } from '../types';
import { dayKey } from './date';
import { db } from './db';
import { levelFromXp } from './engine/scoring';
import { deckShown } from './level';
import { useSettings } from './settings';
import { computeStreak, statusCounts, sumXp, type StatusCounts } from './stats';

/** Every theme, whatever the level floor (onboarding picks a floor of its own). */
export function useAllDecks(): Deck[] | undefined {
  return useLiveQuery(() => db.decks.orderBy('order').toArray(), []);
}

/** Themes at or above the level floor, plus all of hers. */
export function useDecks(): Deck[] | undefined {
  const minLevel = useSettings((s) => s.minLevel);
  return useLiveQuery(async () => (await db.decks.orderBy('order').toArray()).filter((d) => deckShown(d, minLevel)), [minLevel]);
}

/** Ids of the themes the level floor shows. */
async function shownDeckIds(minLevel: 1 | 2 | 3): Promise<Set<string>> {
  return new Set((await db.decks.toArray()).filter((d) => deckShown(d, minLevel)).map((d) => d.id));
}

export function useCards(): Card[] | undefined {
  return useLiveQuery(() => db.cards.toArray(), []);
}

export function useProgressMap(): Map<string, Progress> | undefined {
  return useLiveQuery(async () => new Map((await db.progress.toArray()).map((p) => [p.cardId, p])), []);
}

export function useDaily(): DailyStat[] | undefined {
  return useLiveQuery(() => db.daily.toArray(), []);
}

export interface Overview {
  today: DailyStat;
  streak: ReturnType<typeof computeStreak>;
  xp: number;
  level: ReturnType<typeof levelFromXp>;
  counts: StatusCounts;
  due: number;
  totalCards: number;
}

/** Everything the home screen needs, recomputed live as the database changes. */
export function useOverview(): Overview | undefined {
  const minLevel = useSettings((s) => s.minLevel);
  return useLiveQuery(async () => {
    const [daily, cards, progressRows, shown] = await Promise.all([db.daily.toArray(), db.cards.toArray(), db.progress.toArray(), shownDeckIds(minLevel)]);
    const progress = new Map(progressRows.map((p) => [p.cardId, p]));
    const live = cards.filter((c) => !c.archived && shown.has(c.deckId));
    const now = Date.now();
    const todayKey = dayKey(now);
    const today = daily.find((d) => d.day === todayKey) ?? { day: todayKey, xp: 0, answers: 0, correct: 0, ms: 0, sessions: 0, newCards: 0 };
    const xp = sumXp(daily);
    const liveIds = new Set(live.map((c) => c.id));
    return {
      today,
      streak: computeStreak(daily, todayKey),
      xp,
      level: levelFromXp(xp),
      counts: statusCounts(live.map((c) => c.id), progress),
      due: progressRows.filter((p) => p.seen > 0 && p.due <= now && liveIds.has(p.cardId)).length,
      totalCards: live.length,
    };
  }, [minLevel]);
}

export interface DeckSummary extends Deck {
  total: number;
  counts: StatusCounts;
}

export function useDeckSummaries(): DeckSummary[] | undefined {
  const minLevel = useSettings((s) => s.minLevel);
  return useLiveQuery(async () => {
    const [decks, cards, progressRows] = await Promise.all([db.decks.orderBy('order').toArray(), db.cards.toArray(), db.progress.toArray()]);
    const progress = new Map(progressRows.map((p) => [p.cardId, p]));
    const byDeck = new Map<string, string[]>();
    for (const c of cards) {
      if (c.archived) continue;
      const list = byDeck.get(c.deckId) ?? [];
      list.push(c.id);
      byDeck.set(c.deckId, list);
    }
    return decks
      .filter((d) => deckShown(d, minLevel))
      .map((d) => {
        const ids = byDeck.get(d.id) ?? [];
        return { ...d, total: ids.length, counts: statusCounts(ids, progress) };
      });
  }, [minLevel]);
}
