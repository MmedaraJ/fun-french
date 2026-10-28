import type { AnswerEvent, DailyStat, Progress, QuestionType, Session } from '../../types';
import { dayKey } from '../date';
import { db } from '../db';
import { applyAnswer } from '../srs';
import { XP } from './scoring';

export function emptyDay(day: string): DailyStat {
  return { day, xp: 0, answers: 0, correct: 0, ms: 0, sessions: 0, newCards: 0 };
}

export interface AnswerOutcome {
  progress: Progress;
  wasNew: boolean;
  learnedNow: boolean;
  masteredNow: boolean;
}

/**
 * Stores one answer: spaced-repetition update, the raw event for stats, and
 * today's totals (so XP counts even if the round is abandoned).
 */
export async function recordAnswer(params: {
  sessionId: string;
  cardId: string;
  type: QuestionType;
  correct: boolean;
  ms: number;
  /** Wall-clock time to credit as practice (capped by the caller). */
  activeMs: number;
  now?: number;
  label?: string;
  labelEn?: string;
}): Promise<AnswerOutcome> {
  const now = params.now ?? Date.now();
  const day = dayKey(now);
  // grammar skills have their own table so they never count as "words learned"
  const table = params.cardId.startsWith('g:') ? db.skills : db.progress;
  return db.transaction('rw', db.progress, db.skills, db.events, db.daily, async () => {
    const prev = await table.get(params.cardId);
    const next = applyAnswer(prev, params.cardId, params.correct, now);
    await table.put(next);
    const ev: AnswerEvent = {
      sessionId: params.sessionId,
      cardId: params.cardId,
      type: params.type,
      correct: params.correct,
      ms: Math.round(params.ms),
      ts: now,
      day,
      ...(params.label ? { label: params.label, labelEn: params.labelEn } : {}),
    };
    await db.events.add(ev);
    const d = (await db.daily.get(day)) ?? emptyDay(day);
    d.answers += 1;
    if (params.correct) d.correct += 1;
    d.ms += Math.round(params.activeMs);
    d.xp += params.correct ? XP.correct : XP.wrong;
    const wasNew = !prev || prev.seen === 0;
    if (wasNew && table === db.progress) d.newCards += 1;
    await db.daily.put(d);
    return {
      progress: next,
      wasNew,
      learnedNow: !prev?.learnedAt && !!next.learnedAt,
      masteredNow: !prev?.masteredAt && !!next.masteredAt,
    };
  });
}

/** Saves the finished (or abandoned) round and adds the completion bonus to today. */
export async function saveSession(session: Session, finished: boolean): Promise<void> {
  const bonus = finished ? XP.finish + (session.total > 0 && session.correct === session.total ? XP.perfect : 0) : 0;
  await db.transaction('rw', db.sessions, db.daily, async () => {
    await db.sessions.put(session);
    if (!finished && session.total === 0) return;
    const d = (await db.daily.get(session.day)) ?? emptyDay(session.day);
    d.sessions += finished ? 1 : 0;
    d.xp += bonus;
    await db.daily.put(d);
  });
}

/** Self-graded flashcards and speaking can be undone within a round; not needed for now. */
export type { Session };
