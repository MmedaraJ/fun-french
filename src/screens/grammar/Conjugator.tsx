import { motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Emoji } from '../../components/Emoji';
import { Page } from '../../components/Page';
import { stripAccents } from '../../lib/french';
import { auxiliary, conjugationTable, pastParticiple } from '../../lib/grammar/conjugate';
import { englishVerb } from '../../lib/grammar/english';
import { PERSONS, TENSES } from '../../lib/grammar/types';
import { VERBS, VERB_BY_INF } from '../../lib/grammar/verb-list';
import { sfx } from '../../lib/sound';
import { speak } from '../../lib/speech';

type Filter = 'all' | 'book' | 'core';

/** Reference tables: every supported verb in every tense, tap a line to hear it. */
export function Conjugator() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [verb, setVerb] = useState<string | null>(null);

  const list = useMemo(() => {
    const q = stripAccents(query.trim().toLowerCase());
    return VERBS.filter((v) => (filter === 'all' || v.source === (filter === 'book' ? 'book-er' : 'core')) && (!q || stripAccents(v.inf).includes(q) || v.en.toLowerCase().includes(q)));
  }, [query, filter]);

  if (verb) {
    const info = VERB_BY_INF[verb];
    return (
      <Page narrow className="conjugator">
        <div className="lesson-top">
          <button className="icon-btn icon-btn--solid" onClick={() => setVerb(null)} aria-label="Back to the verb list">
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
              <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
        <header className="lesson-head">
          <h1>
            {verb} <button className="icon-btn icon-btn--solid" onClick={() => void speak(verb)} aria-label="Hear the infinitive"><Emoji e="🔊" size={20} /></button>
          </h1>
          <div className="lesson-en">{info?.en}</div>
          <div className="row row--wrap" style={{ gap: 6, marginTop: 8 }}>
            <span className="badge">auxiliaire : {auxiliary(verb)}</span>
            <span className="badge">participe : {pastParticiple(verb)}</span>
            <span className="badge">{info?.source === 'book-er' ? 'Mon livre (-er)' : info?.group === 2 ? '-ir (finir)' : info?.group === 1 ? '-er' : 'irrégulier'}</span>
          </div>
        </header>
        <div className="conj-grid">
          {TENSES.map((t, i) => {
            const table = conjugationTable(verb, t.id);
            if (!table) return null;
            return (
              <motion.section key={t.id} className="panel conj-card" initial={{ y: 14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: Math.min(i * 0.03, 0.3) }}>
                <h3>
                  {t.fr} <small>{t.en}</small>
                </h3>
                <div className="conj-rows">
                  {PERSONS.filter((p) => table[p]).map((p) => (
                    <button key={p} className="conj-row" onClick={() => void speak(table[p]!)}>
                      <span>{table[p]}</span>
                    </button>
                  ))}
                </div>
              </motion.section>
            );
          })}
        </div>
        <p className="muted center" style={{ marginTop: 16 }}>
          {englishVerb(info?.en ?? '')} · tap any line to hear it
        </p>
      </Page>
    );
  }

  return (
    <Page narrow className="conjugator">
      <div className="lesson-top">
        <button className="icon-btn icon-btn--solid" onClick={() => navigate('/grammaire')} aria-label="Back to grammar">
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
            <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
      <h1 className="screen-title">Conjugueur</h1>
      <p className="screen-sub">{VERBS.length} verbs, every tense. Search in French or English.</p>
      <input className="input" placeholder="Chercher un verbe · Search a verb" value={query} onChange={(e) => setQuery(e.target.value)} autoCapitalize="off" spellCheck={false} />
      <div className="row row--wrap" style={{ gap: 6, margin: '12px 0' }}>
        {(
          [
            ['all', 'Tous'],
            ['book', 'Mon livre (-er)'],
            ['core', 'Irréguliers & co'],
          ] as [Filter, string][]
        ).map(([k, label]) => (
          <button key={k} className="chip" aria-pressed={filter === k} onClick={() => setFilter(k)}>
            {label}
          </button>
        ))}
      </div>
      <div className="verb-list">
        {list.slice(0, 120).map((v) => (
          <button
            key={v.inf}
            className="verb-item"
            onClick={() => {
              sfx.tap();
              setVerb(v.inf);
              window.scrollTo({ top: 0 });
            }}
          >
            <strong>{v.inf}</strong>
            <span>{v.en}</span>
          </button>
        ))}
        {list.length > 120 && <p className="muted center">Keep typing to narrow it down…</p>}
        {!list.length && <p className="muted center">No verb found.</p>}
      </div>
    </Page>
  );
}
