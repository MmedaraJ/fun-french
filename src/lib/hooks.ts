import { useLiveQuery } from 'dexie-react-hooks';
import type { Card, DailyStat, Deck, Progress } from '../types';
import { dayKey } from './date';
import { db } from './db';
import { levelFromXp } from './engine/scoring';
import { computeStreak, statusCounts, sumXp, type StatusCounts } from './stats';

export function useDecks(): Deck[] | undefined {
  return useLiveQuery(() => db.decks.orderBy('order').toArray(), []);
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
  return useLiveQuery(async () => {
    const [daily, cards, progressRows] = await Promise.all([db.daily.toArray(), db.cards.toArray(), db.progress.toArray()]);
    const progress = new Map(progressRows.map((p) => [p.cardId, p]));
    const live = cards.filter((c) => !c.archived);
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
  }, []);
}

export interface DeckSummary extends Deck {
  total: number;
  counts: StatusCounts;
}

export function useDeckSummaries(): DeckSummary[] | undefined {
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
    return decks.map((d) => {
      const ids = byDeck.get(d.id) ?? [];
      return { ...d, total: ids.length, counts: statusCounts(ids, progress) };
    });
  }, []);
}
