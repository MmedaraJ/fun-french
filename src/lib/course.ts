// Progress in the courses ("Construire des phrases", "Les temps des verbes"): an exercise is
// done once a round of it went well (8+ questions, 80%+ right), a chapter once all its
// exercises are; mastery comes from the exercise skills ("g:ex:<id>").
import { useLiveQuery } from 'dexie-react-hooks';
import type { Chapter } from './grammar/types';
import { db } from './db';
import { MAX_BOX } from './srs';
import type { Progress, Session } from '../types';

/** Best accuracy (0..1) of each course exercise played on its own. */
export function exerciseBests(sessions: Session[]): Map<string, { best: number; done: boolean; plays: number }> {
  const out = new Map<string, { best: number; done: boolean; plays: number }>();
  for (const s of sessions) {
    const id = s.lesson?.startsWith('ex:') ? s.lesson.slice(3) : '';
    // a whole-chapter review ("ex:a,b,c") doesn't stand for any one exercise
    if (!id || id.includes(',') || !s.total) continue;
    const acc = s.correct / s.total;
    const cur = out.get(id) ?? { best: 0, done: false, plays: 0 };
    out.set(id, { best: Math.max(cur.best, acc), done: cur.done || (s.total >= 8 && acc >= 0.8), plays: cur.plays + 1 });
  }
  return out;
}

export interface CourseProgress {
  bests: Map<string, { best: number; done: boolean; plays: number }>;
  skills: Map<string, Progress>;
}

/** The rounds and skills the course screens need, kept up to date. */
export function useCourseProgress(): CourseProgress | undefined {
  return useLiveQuery(async () => {
    const [sessions, skills] = await Promise.all([db.sessions.filter((s) => !!s.lesson?.startsWith('ex:')).toArray(), db.skills.where('cardId').startsWith('g:ex:').toArray()]);
    return { bests: exerciseBests(sessions), skills: new Map(skills.map((p) => [p.cardId, p])) };
  }, []);
}

export function exerciseMastery(id: string, skills: Map<string, Progress>): number {
  const p = skills.get(`g:ex:${id}`);
  return p ? Math.min(1, p.box / MAX_BOX) : 0;
}

export function chapterDone(chapter: Chapter, p: CourseProgress): boolean {
  return chapter.exercises.length > 0 && chapter.exercises.every((e) => p.bests.get(e.id)?.done);
}

/** 0..1: exercises done count most, mastery fills in the rest. */
export function chapterProgress(chapter: Chapter, p: CourseProgress): number {
  if (!chapter.exercises.length) return 0;
  const per = chapter.exercises.map((e) => (p.bests.get(e.id)?.done ? 1 : Math.max(exerciseMastery(e.id, p.skills), (p.bests.get(e.id)?.best ?? 0) * 0.5)));
  return per.reduce((a, b) => a + b, 0) / per.length;
}

/** The chapter to carry on with: the first one not done (the first one to start with). */
export function nextChapter(chapters: Chapter[], p: CourseProgress): Chapter | undefined {
  return chapters.find((c) => !chapterDone(c, p)) ?? chapters[chapters.length - 1];
}

/** Questions in one round of an exercise: all of it, up to 20. */
export function exerciseRoundLength(items: number): number {
  return Math.max(8, Math.min(20, items));
}
