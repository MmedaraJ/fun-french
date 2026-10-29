import { useLiveQuery } from 'dexie-react-hooks';
import { motion } from 'framer-motion';
import { useMemo, useRef, useState } from 'react';
import { Route, Routes, useNavigate } from 'react-router-dom';
import { wipeFrom } from '../../components/ColorWipe';
import { Emoji } from '../../components/Emoji';
import { GameSetup } from '../../components/GameSetup';
import { Mascot } from '../../components/Mascot';
import { Page } from '../../components/Page';
import { ProgressRing } from '../../components/ProgressRing';
import { LESSONS } from '../../data/grammar/lessons';
import { getBookGrammar } from '../../lib/book';
import { db } from '../../lib/db';
import { MODES, type ModeInfo } from '../../lib/engine/modes';
import { inBand } from '../../lib/level';
import { lessonSkillIds } from '../../lib/grammar/exercises';
import type { Lesson } from '../../lib/grammar/types';
import { inkOn, paletteColor } from '../../lib/palette';
import { useSettings } from '../../lib/settings';
import { sfx } from '../../lib/sound';
import { MAX_BOX } from '../../lib/srs';
import type { Progress, Session } from '../../types';
import { Conjugator } from './Conjugator';
import { LessonView } from './LessonView';
import './Grammar.css';

export const UNIT_INFO: Record<Lesson['unit'], { fr: string; en: string; emoji: string; color: string }> = {
  bases: { fr: 'Les bases', en: 'The basics', emoji: '🧱', color: 'var(--sky)' },
  present: { fr: 'Le présent', en: 'Present tense', emoji: '☀️', color: 'var(--sunshine)' },
  questions: { fr: 'Poser des questions', en: 'Asking questions', emoji: '❓', color: 'var(--tangerine)' },
  negation: { fr: 'La négation', en: 'Negation', emoji: '🚫', color: 'var(--berry)' },
  futur: { fr: 'Le futur', en: 'The future', emoji: '🔮', color: 'var(--grape)' },
  passe: { fr: 'Le passé', en: 'The past', emoji: '🕰️', color: 'var(--plum)' },
  conditionnel: { fr: 'Le conditionnel', en: 'The conditional', emoji: '💭', color: 'var(--lagoon)' },
  imperatif: { fr: 'L’impératif', en: 'Commands', emoji: '📣', color: 'var(--leaf)' },
  subjonctif: { fr: 'Le subjonctif', en: 'The subjunctive', emoji: '🎭', color: 'var(--berry)' },
  pronoms: { fr: 'Les pronoms', en: 'Pronouns', emoji: '🔗', color: 'var(--sky)' },
  subordonnees: { fr: 'Les subordonnées', en: 'Mood and si-clauses', emoji: '🧩', color: 'var(--grape)' },
  discours: { fr: 'Le discours rapporté', en: 'Reported speech', emoji: '💬', color: 'var(--tangerine)' },
  formes: { fr: 'Les formes du verbe', en: 'Passive, gerund & agreement', emoji: '🔧', color: 'var(--lagoon)' },
  relations: { fr: 'Articuler ses idées', en: 'Cause, purpose, contrast', emoji: '🧠', color: 'var(--plum)' },
  style: { fr: 'Nuances et style', en: 'Nuance and style', emoji: '🎨', color: 'var(--leaf)' },
};

/** CEFR badge for a lesson level. */
export const LESSON_LEVEL = ['', 'A1', 'A2', 'B1', 'B2'];

/** A lesson counts as done once one of its practice rounds went well (8+ questions, 80%+ right). */
export function lessonsDone(sessions: Session[]): Set<string> {
  return new Set(sessions.filter((s) => s.lesson && s.total >= 8 && s.correct / s.total >= 0.8).map((s) => s.lesson!));
}

/** Lessons whose practice rounds went well, kept up to date from the stored rounds. */
export function useLessonsDone(): Set<string> {
  return useLiveQuery(async () => lessonsDone(await db.sessions.filter((s) => !!s.lesson).toArray()), []) ?? new Set<string>();
}

/** Lessons in her band, plus any her own PDFs teach, in path order. */
export function useVisibleLessons(): Lesson[] {
  const band = useSettings((s) => s.minLevel);
  const book = useBookLessons();
  return LESSONS.filter((l) => inBand(l.level, band) || book.has(l.id));
}

/** Lesson ids the PDFs she imported teach. */
export function useBookLessons(): Set<string> {
  return new Set(useLiveQuery(() => getBookGrammar(), [])?.lessonIds ?? []);
}

/** 0..1 mastery from the skills a lesson trains. */
export function lessonMastery(lesson: Lesson, skills: Map<string, Progress>): number {
  const ids = lessonSkillIds(lesson.practice);
  if (!ids.length) return 0;
  const seen = ids.map((id) => skills.get(id)).filter(Boolean) as Progress[];
  if (!seen.length) return 0;
  return seen.reduce((a, p) => a + Math.min(1, p.box / MAX_BOX), 0) / ids.length;
}

export default function Grammar() {
  return (
    <Routes>
      <Route index element={<GrammarHome />} />
      <Route path="lecon/:lessonId" element={<LessonView />} />
      <Route path="verbes" element={<Conjugator />} />
    </Routes>
  );
}

function GrammarHome() {
  const navigate = useNavigate();
  const mascotColor = useSettings((s) => s.mascotColor);
  const [setupMode, setSetupMode] = useState<ModeInfo | null>(null);
  const skills = useLiveQuery(async () => new Map((await db.skills.toArray()).map((p) => [p.cardId, p])), []) ?? new Map<string, Progress>();
  const games = MODES.filter((m) => m.section === 'grammar' && m.id !== 'grammaire');
  const conjRef = useRef<HTMLButtonElement>(null);
  const visible = useVisibleLessons();

  const units = useMemo(() => {
    const out: { unit: Lesson['unit']; lessons: Lesson[] }[] = [];
    for (const l of visible) {
      const last = out[out.length - 1];
      if (last && last.unit === l.unit) last.lessons.push(l);
      else out.push({ unit: l.unit, lessons: [l] });
    }
    return out;
  }, [visible]);

  const done = useLessonsDone();
  const book = useBookLessons();
  const bookRef = useRef<HTMLButtonElement>(null);
  const total = visible.length;
  const doneCount = visible.filter((l) => done.has(l.id)).length;
  const started = visible.filter((l) => lessonMastery(l, skills) > 0 || done.has(l.id)).length;

  return (
    <Page className="grammar">
      <header className="gr-hero panel">
        <Mascot mood="thinking" size={96} color={mascotColor} />
        <div>
          <h1 className="screen-title">Grammaire</h1>
          <p className="muted">
            Every tense, questions, negation: short lessons, then games. {doneCount}/{total} lessons done
            {started > doneCount ? `, ${started - doneCount} started` : ''}.
          </p>
        </div>
      </header>

      {book.size > 0 && (
        <motion.button
          ref={bookRef}
          className="gr-book panel"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          whileTap={{ scale: 0.97 }}
          onClick={async () => {
            sfx.whoosh();
            await wipeFrom(bookRef.current, 'var(--leaf)');
            navigate('/play/grammaire?book=1');
          }}
        >
          <Emoji e="📗" size={40} />
          <span>
            <strong>La grammaire de mon livre</strong>
            <span>
              Practise the {book.size} grammar topic{book.size === 1 ? '' : 's'} your PDFs teach
            </span>
          </span>
        </motion.button>
      )}

      <div className="gr-games">
        {games.map((m, i) => (
          <motion.button
            key={m.id}
            className="gr-game"
            style={{ background: paletteColor(m.color), color: inkOn(m.color) }}
            onClick={() => {
              sfx.pop();
              setSetupMode(m);
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 + i * 0.05, type: 'spring', stiffness: 300, damping: 22 }}
            whileTap={{ scale: 0.95 }}
          >
            <Emoji e={m.emoji} size={40} />
            <strong>{m.name}</strong>
            <span>{m.en}</span>
          </motion.button>
        ))}
        <motion.button
          ref={conjRef}
          className="gr-game gr-game--light"
          onClick={async () => {
            sfx.whoosh();
            await wipeFrom(conjRef.current, 'var(--sky)');
            navigate('/grammaire/verbes');
          }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, type: 'spring', stiffness: 300, damping: 22 }}
          whileTap={{ scale: 0.95 }}
        >
          <Emoji e="📒" size={40} />
          <strong>Conjugueur</strong>
          <span>Verb tables</span>
        </motion.button>
      </div>

      {units.map(({ unit, lessons }) => {
        const u = UNIT_INFO[unit];
        return (
          <section key={unit + lessons[0].id} className="gr-unit">
            <h2 className="section-title">
              <Emoji e={u.emoji} size={24} /> {u.fr} <small>{u.en}</small>
            </h2>
            <div className="gr-path">
              {lessons.map((l, i) => {
                const m = lessonMastery(l, skills);
                const isDone = done.has(l.id);
                return (
                  <motion.button
                    key={l.id}
                    className={'gr-lesson' + (isDone ? ' is-done' : '')}
                    onClick={() => {
                      sfx.tap();
                      navigate(`/grammaire/lecon/${l.id}`);
                    }}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.03 * i }}
                    whileTap={{ scale: 0.97 }}
                    style={{ '--unit': u.color } as React.CSSProperties}
                  >
                    <ProgressRing value={isDone ? Math.max(m, 0.34) : m} size={48} stroke={6} color={u.color}>
                      {m >= 0.99 ? <Emoji e="⭐" size={20} /> : isDone ? <span className="gr-check" aria-label="done">✓</span> : <span className="gr-num">{visible.indexOf(l) + 1}</span>}
                    </ProgressRing>
                    <span className="gr-lesson-text">
                      <strong>{l.title}</strong>
                      <span>
                        {book.has(l.id) && <span className="gr-in-book">📗 Dans ton livre · </span>}
                        {l.en}
                      </span>
                    </span>
                    <span className={'badge gr-level l' + l.level}>{LESSON_LEVEL[l.level]}</span>
                  </motion.button>
                );
              })}
            </div>
          </section>
        );
      })}

      <GameSetup mode={setupMode} onClose={() => setSetupMode(null)} />
    </Page>
  );
}
