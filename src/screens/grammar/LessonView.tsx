import { motion } from 'framer-motion';
import { Fragment, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { wipeFrom } from '../../components/ColorWipe';
import { Emoji } from '../../components/Emoji';
import { Page } from '../../components/Page';
import { SpeakButton } from '../../components/SpeakButton';
import { LESSONS } from '../../data/grammar/lessons';
import { conjugationTable } from '../../lib/grammar/conjugate';
import { PERSONS, TENSE_BY_ID, type Tense } from '../../lib/grammar/types';
import { VERB_BY_INF } from '../../lib/grammar/verb-list';
import { sfx } from '../../lib/sound';
import { speak } from '../../lib/speech';
import { LESSON_LEVEL, UNIT_INFO, useBookLessons, useLessonsDone, useVisibleLessons } from './Grammar';

/** **bold** and line breaks, nothing more. */
export function RichText({ text }: { text: string }): ReactNode {
  return text.split(/\n{2,}/).map((para, i) => (
    <p key={i}>
      {para.split('\n').map((line, j) => (
        <Fragment key={j}>
          {j > 0 && <br />}
          {line.split(/(\*\*[^*]+\*\*)/g).map((chunk, k) =>
            chunk.startsWith('**') && chunk.endsWith('**') ? <strong key={k}>{chunk.slice(2, -2)}</strong> : <Fragment key={k}>{chunk}</Fragment>,
          )}
        </Fragment>
      ))}
    </p>
  ));
}

const DEFAULT_VERBS = ['parler', 'finir', 'être', 'avoir', 'aller', 'faire', 'prendre', 'se lever'];

export function LessonView() {
  const { lessonId } = useParams();
  const navigate = useNavigate();
  const index = LESSONS.findIndex((l) => l.id === lessonId);
  const lesson = LESSONS[index];
  const goRef = useRef<HTMLButtonElement>(null);
  const done = useLessonsDone();
  const book = useBookLessons();
  const visible = useVisibleLessons();

  const tenses = useMemo(() => lesson?.practice.tenses ?? [], [lesson]);
  const verbs = useMemo(() => {
    const own = (lesson?.practice.verbs ?? []).filter((v) => VERB_BY_INF[v]);
    return (own.length ? own : DEFAULT_VERBS).slice(0, 10);
  }, [lesson]);
  const [tense, setTense] = useState<Tense | undefined>(tenses[0]);
  const [verb, setVerb] = useState(verbs[0]);

  if (!lesson) {
    return (
      <Page narrow>
        <h1 className="screen-title">Leçon introuvable</h1>
        <button className="btn" onClick={() => navigate('/grammaire')}>
          Retour
        </button>
      </Page>
    );
  }

  const unit = UNIT_INFO[lesson.unit];
  const table = tense && verb ? conjugationTable(verb, tense) : null;
  // previous / next among the lessons the path shows (a hidden lesson opened by link still has neighbours)
  const path = visible.some((l) => l.id === lesson.id) ? visible : LESSONS;
  const at = path.findIndex((l) => l.id === lesson.id);
  const prev = path[at - 1];
  const next = path[at + 1];

  const practise = async () => {
    sfx.whoosh();
    await wipeFrom(goRef.current, 'var(--leaf)');
    navigate(`/play/grammaire?lesson=${lesson.id}`);
  };

  return (
    <Page narrow className="lesson">
      <div className="lesson-top">
        <button className="icon-btn icon-btn--solid" onClick={() => navigate('/grammaire')} aria-label="Back to lessons">
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
            <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <span className="badge" style={{ background: unit.color, color: '#fff' }}>
          <Emoji e={unit.emoji} size={16} /> {unit.fr}
        </span>
        <span className={'badge gr-level l' + lesson.level}>{LESSON_LEVEL[lesson.level]}</span>
        {done.has(lesson.id) && <span className="badge lesson-done">✓ Réussie · Done</span>}
        {book.has(lesson.id) && <span className="badge lesson-in-book">📗 Dans ton livre</span>}
      </div>

      <motion.header className="lesson-head" initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
        <h1>{lesson.title}</h1>
        <div className="lesson-en">{lesson.en}</div>
        <div className="lesson-intro">
          <RichText text={lesson.intro} />
        </div>
      </motion.header>

      {lesson.sections.map((sec, i) => (
        <motion.section key={i} className="lesson-sec panel" initial={{ y: 18, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true, margin: '-40px' }} transition={{ type: 'spring', stiffness: 260, damping: 26 }}>
          <h2>{sec.heading}</h2>
          <div className="lesson-body">
            <RichText text={sec.body} />
          </div>
          {sec.table && (
            <div className="lesson-table-wrap">
              <table className={'lesson-table' + (sec.table.head.length >= 4 ? ' lesson-table--wide' : '')}>
                <thead>
                  <tr>
                    {sec.table.head.map((h, k) => (
                      <th key={k}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sec.table.rows.map((row, r) => (
                    <tr key={r}>
                      {row.map((cell, k) => (
                        <td key={k}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {sec.examples?.length ? (
            <ul className="lesson-examples">
              {sec.examples.map((ex, k) => (
                <li key={k}>
                  <SpeakButton text={ex.fr} size="sm" tone="solid" />
                  <span>
                    <strong>{ex.fr}</strong>
                    <span>{ex.en}</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </motion.section>
      ))}

      {lesson.tips?.map((tip, i) => (
        <div key={i} className="lesson-tip">
          <Emoji e="💡" size={26} />
          <RichText text={tip} />
        </div>
      ))}

      {tenses.length > 0 && (
        <section className="lesson-sec panel lesson-explorer">
          <h2>
            <Emoji e="📒" size={22} /> Conjugue toi-même
          </h2>
          <p className="muted">Pick a verb and a tense; tap a line to hear it.</p>
          <div className="row row--wrap" style={{ gap: 6, marginTop: 10 }}>
            {verbs.map((v) => (
              <button key={v} className="chip" aria-pressed={verb === v} onClick={() => setVerb(v)}>
                {v}
              </button>
            ))}
          </div>
          {tenses.length > 1 && (
            <div className="row row--wrap" style={{ gap: 6, marginTop: 8 }}>
              {tenses.map((t) => (
                <button key={t} className="chip" aria-pressed={tense === t} onClick={() => setTense(t)}>
                  {TENSE_BY_ID[t].fr}
                </button>
              ))}
            </div>
          )}
          {table && (
            <div className="conj-rows">
              {PERSONS.filter((p) => table[p]).map((p) => (
                <button key={p} className="conj-row" onClick={() => void speak(table[p]!)}>
                  <span>{table[p]}</span>
                  <Emoji e="🔊" size={16} />
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      <button ref={goRef} className="btn btn--lg btn--block btn--ok lesson-go" onClick={practise}>
        <Emoji e="🎯" size={24} /> {done.has(lesson.id) ? 'Encore une fois · Practise again' : 'S’entraîner · Practise'}
      </button>

      <div className="lesson-nav">
        {prev ? (
          <button className="btn btn--ghost btn--sm" onClick={() => navigate(`/grammaire/lecon/${prev.id}`)}>
            ← {prev.title}
          </button>
        ) : (
          <span />
        )}
        {next && (
          <button className="btn btn--ghost btn--sm" onClick={() => navigate(`/grammaire/lecon/${next.id}`)}>
            {next.title} →
          </button>
        )}
      </div>
    </Page>
  );
}
