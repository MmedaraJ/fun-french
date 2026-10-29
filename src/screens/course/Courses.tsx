import { motion } from 'framer-motion';
import { useRef } from 'react';
import { Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { wipeFrom } from '../../components/ColorWipe';
import { Emoji } from '../../components/Emoji';
import { Page } from '../../components/Page';
import { ProgressRing } from '../../components/ProgressRing';
import { COURSE_BY_ID } from '../../data/course';
import { chapterDone, chapterProgress, exerciseMastery, exerciseRoundLength, nextChapter, useCourseProgress, type CourseProgress } from '../../lib/course';
import type { Chapter, Course } from '../../lib/grammar/types';
import { paletteColor } from '../../lib/palette';
import { sfx } from '../../lib/sound';
import { LessonBody, RichText } from '../grammar/LessonBody';
import '../grammar/Grammar.css';
import './Courses.css';

/** CEFR badge for a chapter level. */
const LESSON_LEVEL = ['', 'A1', 'A2', 'B1', 'B2'];

const EMPTY: CourseProgress = { bests: new Map(), skills: new Map() };

export default function Courses() {
  return (
    <Routes>
      <Route path=":courseId" element={<CourseHome />} />
      <Route path=":courseId/:chapterId" element={<ChapterView />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function useCourse(): Course | undefined {
  const { courseId } = useParams();
  return courseId ? COURSE_BY_ID[courseId] : undefined;
}

/** A course: where she is, and every chapter in order. */
function CourseHome() {
  const navigate = useNavigate();
  const course = useCourse();
  const progress = useCourseProgress() ?? EMPTY;
  if (!course) return <Navigate to="/" replace />;
  const color = paletteColor(course.color);
  const done = course.chapters.filter((c) => chapterDone(c, progress)).length;
  const next = nextChapter(course.chapters, progress);

  return (
    <Page className="course">
      <div className="lesson-top">
        <button className="icon-btn icon-btn--solid" onClick={() => navigate('/')} aria-label="Back to the home screen">
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
            <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
      <header className="course-hero panel" style={{ '--course': color } as React.CSSProperties}>
        <span className="course-hero-art">
          <Emoji e={course.emoji} size={46} />
        </span>
        <div>
          <h1 className="screen-title">{course.title}</h1>
          <p className="muted">
            {course.en} · {course.chapters.length} chapitres · {done}/{course.chapters.length} terminés
          </p>
        </div>
      </header>

      {next && (
        <motion.button className="course-continue" style={{ background: color }} onClick={() => navigate(`/cours/${course.id}/${next.id}`)} whileTap={{ scale: 0.97 }}>
          <span>
            <small>{done ? 'Continuer · Carry on' : 'Commencer · Start'}</small>
            <strong>
              Chapitre {next.num} · {next.title}
            </strong>
          </span>
          <span className="course-continue-go" aria-hidden>
            ›
          </span>
        </motion.button>
      )}

      <div className="gr-path course-path">
        {course.chapters.map((c, i) => (
          <ChapterRow key={c.id} course={course} chapter={c} progress={progress} index={i} />
        ))}
      </div>
    </Page>
  );
}

function ChapterRow({ course, chapter, progress, index }: { course: Course; chapter: Chapter; progress: CourseProgress; index: number }) {
  const navigate = useNavigate();
  const color = paletteColor(course.color);
  const m = chapterProgress(chapter, progress);
  const isDone = chapterDone(chapter, progress);
  const items = chapter.exercises.reduce((n, e) => n + e.items.length, 0);
  return (
    <motion.button
      className={'gr-lesson' + (isDone ? ' is-done' : '')}
      style={{ '--unit': color } as React.CSSProperties}
      onClick={() => {
        sfx.tap();
        navigate(`/cours/${course.id}/${chapter.id}`);
      }}
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: Math.min(0.03 * index, 0.4) }}
      whileTap={{ scale: 0.97 }}
    >
      <ProgressRing value={isDone ? Math.max(m, 0.34) : m} size={48} stroke={6} color={color}>
        {isDone ? <span className="gr-check" aria-label="done">✓</span> : <span className="gr-num">{chapter.num}</span>}
      </ProgressRing>
      <span className="gr-lesson-text">
        <strong>{chapter.title}</strong>
        <span>
          {chapter.en} · {chapter.exercises.length} exercices, {items} phrases
        </span>
      </span>
      <span className={'badge gr-level l' + chapter.level}>{LESSON_LEVEL[chapter.level]}</span>
    </motion.button>
  );
}

const LETTERS = 'ABCDEFGH';

/** A chapter: the detailed lesson, then its exercises. */
function ChapterView() {
  const navigate = useNavigate();
  const course = useCourse();
  const { chapterId } = useParams();
  const progress = useCourseProgress() ?? EMPTY;
  const reviewRef = useRef<HTMLButtonElement>(null);
  const index = course?.chapters.findIndex((c) => c.id === chapterId) ?? -1;
  if (!course || index < 0) return <Navigate to={course ? `/cours/${course.id}` : '/'} replace />;
  const chapter = course.chapters[index];
  const prev = course.chapters[index - 1];
  const next = course.chapters[index + 1];
  const color = paletteColor(course.color);
  const isDone = chapterDone(chapter, progress);

  const play = async (ids: string[], len: number, from?: HTMLElement | null) => {
    sfx.whoosh();
    if (from) await wipeFrom(from, color);
    navigate(`/play/cours?ex=${ids.join(',')}&len=${len}`);
  };

  return (
    <Page narrow className="lesson course-chapter">
      <div className="lesson-top">
        <button className="icon-btn icon-btn--solid" onClick={() => navigate(`/cours/${course.id}`)} aria-label={`Back to ${course.title}`}>
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
            <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <span className="badge" style={{ background: color, color: '#fff' }}>
          <Emoji e={course.emoji} size={16} /> {course.title}
        </span>
        <span className={'badge gr-level l' + chapter.level}>{LESSON_LEVEL[chapter.level]}</span>
        {isDone && <span className="badge lesson-done">✓ Terminé · Done</span>}
      </div>

      <motion.header className="lesson-head" initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
        <div className="course-chapter-num">Chapitre {chapter.num}</div>
        <h1>{chapter.title}</h1>
        <div className="lesson-en">{chapter.en}</div>
        <div className="lesson-intro">
          <RichText text={chapter.intro} />
        </div>
      </motion.header>

      <LessonBody sections={chapter.sections} tips={chapter.tips} />

      <section className="course-exercises" aria-label="Exercises">
        <h2 className="section-title">
          Exercices <small>{chapter.exercises.reduce((n, e) => n + e.items.length, 0)} phrases</small>
        </h2>
        {chapter.exercises.map((e, i) => {
          const best = progress.bests.get(e.id);
          const m = exerciseMastery(e.id, progress.skills);
          return (
            <motion.button
              key={e.id}
              className={'course-ex panel' + (best?.done ? ' is-done' : '')}
              onClick={(ev) => void play([e.id], exerciseRoundLength(e.items.length), ev.currentTarget)}
              whileTap={{ scale: 0.98 }}
              data-exercise={e.id}
            >
              <ProgressRing value={best?.done ? Math.max(m, 0.34) : m} size={46} stroke={6} color={color}>
                {best?.done ? <span className="gr-check">✓</span> : <span className="gr-num">{LETTERS[i]}</span>}
              </ProgressRing>
              <span className="course-ex-text">
                <strong>{e.title}</strong>
                <span>{e.en}</span>
                <small>
                  {e.items.length} {e.kind === 'gap' ? 'phrases à compléter' : 'phrases à construire'}
                  {best ? ` · meilleur score ${Math.round(best.best * 100)} %` : ''}
                </small>
              </span>
              <span className="course-ex-go" aria-hidden>
                ▶
              </span>
            </motion.button>
          );
        })}
        <button
          ref={reviewRef}
          className="btn btn--lg btn--block btn--ok lesson-go"
          onClick={() => void play(
            chapter.exercises.map((e) => e.id),
            15,
            reviewRef.current,
          )}
        >
          <Emoji e="🎯" size={24} /> Réviser tout le chapitre · Mixed review
        </button>
      </section>

      <div className="lesson-nav">
        {prev ? (
          <button className="btn btn--ghost btn--sm" onClick={() => navigate(`/cours/${course.id}/${prev.id}`)}>
            ← {prev.num}. {prev.title}
          </button>
        ) : (
          <span />
        )}
        {next && (
          <button className="btn btn--ghost btn--sm" onClick={() => navigate(`/cours/${course.id}/${next.id}`)}>
            {next.num}. {next.title} →
          </button>
        )}
      </div>
    </Page>
  );
}
