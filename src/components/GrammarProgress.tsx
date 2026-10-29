import { useLiveQuery } from 'dexie-react-hooks';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { DRILL_SETS } from '../data/grammar/drills';
import { LESSONS } from '../data/grammar/lessons';
import { db } from '../lib/db';
import { QWORD_LABEL, TENSES, type Negation, type QWord } from '../lib/grammar/types';
import { MAX_BOX } from '../lib/srs';
import type { Progress } from '../types';
import { Emoji } from './Emoji';
import './GrammarProgress.css';

interface Row {
  id: string;
  label: string;
  sub: string;
  mastery: number;
  answers: number;
  correct: number;
}

function summarise(ids: string[], skills: Map<string, Progress>): Omit<Row, 'id' | 'label' | 'sub'> {
  const rows = ids.map((id) => skills.get(id)).filter(Boolean) as Progress[];
  const answers = rows.reduce((a, p) => a + p.seen, 0);
  const correct = rows.reduce((a, p) => a + p.correct, 0);
  const mastery = rows.length ? rows.reduce((a, p) => a + Math.min(1, p.box / MAX_BOX), 0) / rows.length : 0;
  return { mastery, answers, correct };
}

const NEGATIONS: Negation[] = ['pas', 'jamais', 'plus', 'rien', 'personne'];

/** Each advanced structure is named after the lesson that teaches it. */
const DRILL_NAMES = new Map(LESSONS.flatMap((l) => (l.practice.drills ?? []).map((d) => [d, l.title] as const)));

/** Mastery of every tense, negation and question word, from the grammar games. */
export function GrammarProgress() {
  const navigate = useNavigate();
  const skills = useLiveQuery(async () => new Map((await db.skills.toArray()).map((p) => [p.cardId, p])), []);
  if (!skills) return null;

  const tenses: Row[] = TENSES.map((t) => ({
    id: t.id,
    label: t.fr,
    sub: t.en,
    ...summarise([`g:conj:${t.id}`, `g:tense:${t.id}`, `g:id:${t.id}`, `g:listen:${t.id}`], skills),
  }));
  const negations: Row[] = NEGATIONS.map((n) => ({ id: n, label: `ne… ${n}`, sub: '', ...summarise([`g:neg:${n}`], skills) }));
  const qwords: Row[] = (Object.keys(QWORD_LABEL) as QWord[]).map((w) => ({ id: w, label: QWORD_LABEL[w], sub: '', ...summarise([`g:qw:${w}`, `g:qa:${w}`], skills) }));
  const structures: Row[] = DRILL_SETS.map((d) => ({ id: d.id, label: DRILL_NAMES.get(d.id) ?? d.en, sub: d.en, ...summarise([`g:dr:${d.id}`], skills) }));
  const played = [...tenses, ...negations, ...qwords, ...structures].some((r) => r.answers > 0);

  if (!played) {
    return (
      <div className="panel gp-empty">
        <Emoji e="📘" size={40} />
        <p>
          Play a grammar game to see every tense grow here.
          <br />
          <button className="btn btn--sm btn--grape" style={{ marginTop: 10 }} onClick={() => navigate('/grammaire')}>
            Grammaire
          </button>
        </p>
      </div>
    );
  }

  return (
    <div className="panel gp">
      <h3 className="gp-title">Les temps · Tenses</h3>
      <ul className="gp-list">
        {tenses.map((r, i) => (
          <li key={r.id}>
            <span className="gp-label">
              <strong>{r.label}</strong>
              <span>{r.answers ? `${Math.round((r.correct / r.answers) * 100)}% right · ${r.answers}` : 'not practised yet'}</span>
            </span>
            <span className="gp-bar" aria-label={`${Math.round(r.mastery * 100)}% mastered`}>
              <motion.span initial={{ width: 0 }} whileInView={{ width: `${Math.max(r.answers ? 4 : 0, r.mastery * 100)}%` }} viewport={{ once: true }} transition={{ delay: i * 0.03, type: 'spring', stiffness: 70, damping: 18 }} />
            </span>
          </li>
        ))}
      </ul>
      <h3 className="gp-title">Structures avancées · Advanced structures</h3>
      {structures.some((r) => r.answers > 0) ? (
        <ul className="gp-list">
          {structures
            .filter((r) => r.answers > 0)
            .map((r, i) => (
              <li key={r.id}>
                <span className="gp-label">
                  <strong>{r.label}</strong>
                  <span>{`${Math.round((r.correct / r.answers) * 100)}% right · ${r.answers}`}</span>
                </span>
                <span className="gp-bar" aria-label={`${Math.round(r.mastery * 100)}% mastered`}>
                  <motion.span initial={{ width: 0 }} whileInView={{ width: `${Math.max(4, r.mastery * 100)}%` }} viewport={{ once: true }} transition={{ delay: i * 0.03, type: 'spring', stiffness: 70, damping: 18 }} />
                </span>
              </li>
            ))}
        </ul>
      ) : (
        <div className="gp-chips">
          <span className="muted">Play “Structures” or an advanced lesson to fill this in.</span>
        </div>
      )}
      <h3 className="gp-title">Négation & questions</h3>
      <div className="gp-chips">
        {[...negations, ...qwords]
          .filter((r) => r.answers > 0)
          .map((r) => (
            <span key={r.id} className="gp-chip" style={{ '--m': r.mastery } as React.CSSProperties}>
              {r.label}
              <small>{Math.round((r.correct / Math.max(1, r.answers)) * 100)}%</small>
            </span>
          ))}
        {![...negations, ...qwords].some((r) => r.answers > 0) && <span className="muted">Play “Questions” or “Les temps” to fill this in.</span>}
      </div>
    </div>
  );
}
