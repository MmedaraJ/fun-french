import type { Progress } from '../types';
import { DAY, MINUTE } from './date';

/** Waiting time after a correct answer, by box. */
export const INTERVALS = [0, 10 * MINUTE, 1 * DAY, 3 * DAY, 7 * DAY, 16 * DAY, 35 * DAY];
export const MAX_BOX = INTERVALS.length - 1;
/** A card counts as "learned" from this box on (correct again after a gap). */
export const LEARNED_BOX = 2;
export const MASTERED_BOX = 5;
/** After a miss the card comes back this soon. */
export const RETRY_DELAY = 2 * MINUTE;

export type CardStatus = 'new' | 'learning' | 'learned' | 'mastered';

export function statusOf(p?: Progress): CardStatus {
  if (!p || p.seen === 0) return 'new';
  if (p.box >= MASTERED_BOX) return 'mastered';
  if (p.box >= LEARNED_BOX) return 'learned';
  return 'learning';
}

export function freshProgress(cardId: string, now: number): Progress {
  return { cardId, box: 0, due: now, seen: 0, correct: 0, wrong: 0, lapses: 0, streak: 0, firstSeen: now, lastSeen: now };
}

/**
 * Leitner-style update. A correct answer only moves a card up when it was due,
 * so drilling the same word five times in one sitting doesn't fake long-term memory.
 * An early correct answer leaves the due time alone: pushing it back would keep a word
 * that's practised every few minutes from ever coming due, and so from ever being learned.
 */
export function applyAnswer(prev: Progress | undefined, cardId: string, correct: boolean, now = Date.now()): Progress {
  const p: Progress = prev ? { ...prev } : freshProgress(cardId, now);
  const wasDue = p.due <= now;
  p.seen += 1;
  p.lastSeen = now;
  if (correct) {
    p.correct += 1;
    p.streak += 1;
    const before = p.box;
    if (p.box === 0) p.box = 1;
    else if (wasDue) p.box = Math.min(MAX_BOX, p.box + 1);
    if (p.box !== before || wasDue) p.due = now + INTERVALS[p.box];
  } else {
    p.wrong += 1;
    p.streak = 0;
    if (p.box >= LEARNED_BOX) p.lapses += 1;
    p.box = Math.max(1, p.box - 2);
    p.due = now + RETRY_DELAY;
  }
  if (p.box >= LEARNED_BOX && !p.learnedAt) p.learnedAt = now;
  if (p.box >= MASTERED_BOX && !p.masteredAt) p.masteredAt = now;
  return p;
}

/** Right answers in a row that move a grammar skill up a box without waiting for it to be due. */
export const SKILL_STREAK = 3;

/**
 * Grammar skills ("passé composé", "ne… jamais") come up many times in one round, so a run of
 * right answers moves them up too, not only a right answer when due (mastery still needs a
 * review on a later day). A miss costs one box.
 */
export function applySkillAnswer(prev: Progress | undefined, skillId: string, correct: boolean, now = Date.now()): Progress {
  const p: Progress = prev ? { ...prev } : freshProgress(skillId, now);
  const wasDue = p.due <= now;
  p.seen += 1;
  p.lastSeen = now;
  if (correct) {
    p.correct += 1;
    p.streak += 1;
    const run = p.streak % SKILL_STREAK === 0 && p.box < MASTERED_BOX - 1;
    if (p.box === 0 || (wasDue && p.seen > 1) || run) {
      p.box = Math.min(MAX_BOX, p.box + 1);
      p.due = now + INTERVALS[p.box];
    }
  } else {
    p.wrong += 1;
    p.streak = 0;
    if (p.box >= LEARNED_BOX) p.lapses += 1;
    p.box = Math.max(1, p.box - 1);
    p.due = now + RETRY_DELAY;
  }
  if (p.box >= LEARNED_BOX && !p.learnedAt) p.learnedAt = now;
  if (p.box >= MASTERED_BOX && !p.masteredAt) p.masteredAt = now;
  return p;
}

/** How overdue a card is relative to its interval (>= 0 means due). */
export function overdueRatio(p: Progress, now = Date.now()): number {
  const interval = Math.max(INTERVALS[p.box] || 0, 10 * MINUTE);
  return (now - p.due) / interval;
}

export function isDue(p: Progress | undefined, now = Date.now()): boolean {
  return !!p && p.seen > 0 && p.due <= now;
}

/** 0..1 strength for the little mastery rings. */
export function strength(p?: Progress): number {
  if (!p || p.seen === 0) return 0;
  return Math.min(1, p.box / MAX_BOX);
}
