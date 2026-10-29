// The courses on the home screen, chapter by chapter: "Construire des phrases" (./chNN-*.ts)
// and "Les temps des verbes" (./temps/). Each chapter is a detailed lesson followed by its
// exercises: gap sentences (DrillItem) and whole sentences to build (BuildItem).
import type { Chapter, ChapterExercise, Course } from '../../lib/grammar/types';
import { TEMPS_CHAPTERS } from './temps';
import { CH_ORDRE } from './ch01-ordre-des-mots';
import { CH_QUESTIONS } from './ch02-questions';
import { CH_NEGATION } from './ch03-negation';
import { CH_EXCLAMATION } from './ch04-exclamation-imperatif';
import { CH_COORDINATION } from './ch05-coordination';
import { CH_RELATIVES } from './ch06-relatives';
import { CH_TEMPS } from './ch07-temps';
import { CH_CAUSE } from './ch08-cause-consequence';
import { CH_BUT } from './ch09-but-concession';
import { CH_HYPOTHESE } from './ch10-hypothese';
import { CH_DISCOURS } from './ch11-discours-rapporte';
import { CH_TRANSFORMER } from './ch12-transformer';
import { CH_COMPARER } from './ch13-comparer';
import { CH_RACONTER } from './ch14-raconter';
import { CH_ARGUMENTER } from './ch15-argumenter';
import { CH_STYLE } from './ch16-style';

const PHRASES_CHAPTERS: Chapter[] = [CH_ORDRE, CH_QUESTIONS, CH_NEGATION, CH_EXCLAMATION, CH_COORDINATION, CH_RELATIVES, CH_TEMPS, CH_CAUSE, CH_BUT, CH_HYPOTHESE, CH_DISCOURS, CH_TRANSFORMER, CH_COMPARER, CH_RACONTER, CH_ARGUMENTER, CH_STYLE];

export const COURSES: Course[] = [
  { id: 'phrases', title: 'Construire des phrases', en: 'Sentence building', emoji: '🧱', color: 'grape', chapters: PHRASES_CHAPTERS },
  { id: 'temps', title: 'Les temps des verbes', en: 'Verb tenses', emoji: '⏳', color: 'lagoon', chapters: TEMPS_CHAPTERS },
];

export const COURSE_BY_ID: Record<string, Course> = Object.fromEntries(COURSES.map((c) => [c.id, c]));

/** Every chapter of every course. */
export const CHAPTERS: Chapter[] = COURSES.flatMap((c) => c.chapters);

export const CHAPTER_BY_ID: Record<string, Chapter> = Object.fromEntries(CHAPTERS.map((c) => [c.id, c]));

export type CourseExercise = ChapterExercise & { chapter: Chapter; course: Course };

/** Every exercise, with its chapter and course. */
export const EXERCISES: CourseExercise[] = COURSES.flatMap((course) => course.chapters.flatMap((chapter) => chapter.exercises.map((e) => ({ ...e, chapter, course }))));

export const EXERCISE_BY_ID: Record<string, CourseExercise> = Object.fromEntries(EXERCISES.map((e) => [e.id, e]));
