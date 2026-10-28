import type { DailyStat, Progress } from '../types';
import { addDays, dayKey, daysBetween } from './date';
import { statusOf, type CardStatus } from './srs';

export interface StreakInfo {
  current: number;
  best: number;
  practicedToday: boolean;
  /** Streak is alive but needs practice today to continue. */
  atRisk: boolean;
}

/** Streaks count consecutive local days with at least one answer. */
export function computeStreak(days: Pick<DailyStat, 'day' | 'answers'>[], today = dayKey()): StreakInfo {
  const active = new Set(days.filter((d) => d.answers > 0).map((d) => d.day));
  const practicedToday = active.has(today);
  let current = 0;
  let cursor = practicedToday ? today : addDays(today, -1);
  while (active.has(cursor)) {
    current++;
    cursor = addDays(cursor, -1);
  }
  const sorted = [...active].sort();
  let best = 0;
  let run = 0;
  let prev = '';
  for (const d of sorted) {
    run = prev && daysBetween(prev, d) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  return { current, best: Math.max(best, current), practicedToday, atRisk: !practicedToday && current > 0 };
}

export type StatusCounts = Record<CardStatus, number>;

export function statusCounts(cardIds: string[], progress: Map<string, Progress>): StatusCounts {
  const out: StatusCounts = { new: 0, learning: 0, learned: 0, mastered: 0 };
  for (const id of cardIds) out[statusOf(progress.get(id))]++;
  return out;
}

export function sumXp(days: Pick<DailyStat, 'xp'>[]): number {
  return days.reduce((a, d) => a + d.xp, 0);
}

/** Last `n` days ending today (oldest first), filling gaps with zeros. */
export function lastNDays(days: DailyStat[], n: number, today = dayKey()): DailyStat[] {
  const map = new Map(days.map((d) => [d.day, d]));
  const out: DailyStat[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const key = addDays(today, -i);
    out.push(map.get(key) ?? { day: key, xp: 0, answers: 0, correct: 0, ms: 0, sessions: 0, newCards: 0 });
  }
  return out;
}

export function accuracy(correct: number, total: number): number {
  return total ? correct / total : 0;
}

export function pct(x: number): string {
  return `${Math.round(x * 100)}%`;
}
