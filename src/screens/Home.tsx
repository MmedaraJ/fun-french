import { motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { wipeFrom } from '../components/ColorWipe';
import { Emoji } from '../components/Emoji';
import { GameSetup } from '../components/GameSetup';
import { Mascot } from '../components/Mascot';
import { Page } from '../components/Page';
import { ProgressRing } from '../components/ProgressRing';
import { Wordmark } from '../components/Wordmark';
import { chapterDone, chapterProgress, nextChapter, useCourseProgress } from '../lib/course';
import { MODES, recognitionSupported, type ModeInfo } from '../lib/engine/modes';
import type { Course } from '../lib/grammar/types';
import { levelName } from '../lib/engine/scoring';
import { useDeckSummaries, useOverview } from '../lib/hooks';
import { BANDS, modeShown } from '../lib/level';
import { inkOn, paletteColor } from '../lib/palette';
import { g, useSettings } from '../lib/settings';
import { sfx } from '../lib/sound';
import { speak } from '../lib/speech';
import './Home.css';

function greeting(): { fr: string; en: string } {
  const h = new Date().getHours();
  if (h < 5) return { fr: 'Bonne nuit', en: 'Good night' };
  if (h < 12) return { fr: 'Bonjour', en: 'Good morning' };
  if (h < 18) return { fr: 'Bon après-midi', en: 'Good afternoon' };
  return { fr: 'Bonsoir', en: 'Good evening' };
}

const PEP_TALKS = [
  () => `${g('Prêt', 'Prête')} pour une petite partie ?`,
  () => 'Un petit bonbon de français ?',
  () => 'On apprend quelques mots ?',
  () => `Tu es ${g('formidable', 'formidable')} aujourd'hui !`,
  () => 'Allez, on joue !',
];

/** The courses, shown before their content has loaded. */
const COURSE_CARDS = [
  { id: 'phrases', title: 'Construire des phrases', en: 'Sentence building', emoji: '🧱', color: 'grape' },
  { id: 'temps', title: 'Les temps des verbes', en: 'Verb tenses', emoji: '⏳', color: 'lagoon' },
] as const;

/** Where she is in each course; the course content loads after the home screen is up. */
function useCourseLines(): Record<string, { text: string; progress: number }> | undefined {
  const progress = useCourseProgress();
  const [courses, setCourses] = useState<Course[] | null>(null);
  useEffect(() => {
    let alive = true;
    void import('../data/course').then((m) => alive && setCourses(m.COURSES));
    return () => {
      alive = false;
    };
  }, []);
  if (!courses || !progress) return undefined;
  return Object.fromEntries(
    courses.map((c) => {
      const done = c.chapters.filter((ch) => chapterDone(ch, progress)).length;
      const next = nextChapter(c.chapters, progress);
      const share = c.chapters.length ? c.chapters.reduce((a, ch) => a + chapterProgress(ch, progress), 0) / c.chapters.length : 0;
      const text = `${done}/${c.chapters.length} chapitres${next ? ` · ${done ? 'Continuer' : 'Commencer'} : ${next.num}. ${next.title}` : ''}`;
      return [c.id, { text, progress: share }];
    }),
  );
}

export default function Home() {
  const navigate = useNavigate();
  const overview = useOverview();
  const decks = useDeckSummaries();
  const { name, dailyGoal, mascotColor, agreement, minLevel } = useSettings();
  const [setupMode, setSetupMode] = useState<ModeInfo | null>(null);
  const [mascotKey, setMascotKey] = useState(0);
  const ctaRef = useRef<HTMLButtonElement>(null);
  const hello = greeting();
  const pep = useMemo(() => PEP_TALKS[Math.floor(Math.random() * PEP_TALKS.length)](), []);
  const canSpeakIt = recognitionSupported();
  const courseLines = useCourseLines();
  // numbered as shown: from A2 on, the picture-tapping and flip-card games aren't there
  const modes = MODES.filter((m) => m.section === 'vocab' && (m.needs !== 'recognition' || canSpeakIt) && modeShown(m)).map((m, i) => ({ ...m, num: i + 1 }));
  const grammarModes = MODES.filter((m) => m.section === 'grammar').map((m, i) => ({ ...m, num: i + 1 }));

  const todayXp = overview?.today.xp ?? 0;
  const goalDone = todayXp >= dailyGoal;
  const activeDecks = decks?.filter((d) => d.active) ?? [];

  const startDaily = async () => {
    sfx.whoosh();
    await wipeFrom(ctaRef.current, paletteColor('berry'));
    navigate('/play/mix?daily=1');
  };

  const pokeMascot = () => {
    setMascotKey((k) => k + 1);
    sfx.rimshot();
    void speak(name ? `Bonjour ${name} !` : 'Bonjour !');
  };

  return (
    <Page className="home">
      <header className="home-top">
        <Wordmark />
        <div className="row" style={{ gap: 8 }}>
          {overview && (
            <motion.div
              className={'pill-stat streak' + (overview.streak.practicedToday ? ' is-lit' : '')}
              title={`${overview.streak.current}-day streak`}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.2 }}
            >
              <motion.span
                animate={overview.streak.practicedToday ? { rotate: [-6, 6, -6], scale: [1, 1.12, 1] } : {}}
                transition={{ duration: 1.4, repeat: Infinity }}
                style={{ display: 'grid' }}
              >
                <Emoji e="🔥" size={22} />
              </motion.span>
              {overview.streak.current}
            </motion.div>
          )}
          {overview && (
            <motion.button
              className="pill-stat level"
              onClick={() => navigate('/stats')}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.3 }}
              title={levelName(overview.level.level, agreement)}
            >
              <Emoji e="⭐" size={20} />
              {overview.level.level}
            </motion.button>
          )}
        </div>
      </header>

      <section className="hello panel">
        <div className="hello-mascot">
          <Mascot mood={goalDone ? 'love' : 'happy'} size={112} color={mascotColor} reactKey={mascotKey} onClick={pokeMascot} />
        </div>
        <div className="hello-text">
          <h1>
            {hello.fr}
            {name ? `, ${name}` : ''} !
          </h1>
          <p className="muted">{goalDone ? 'Objectif du jour atteint ! Bravo !' : pep}</p>
          <button className="level-chip" onClick={() => navigate('/settings')} aria-label={`Level: ${BANDS[minLevel].name}, ${BANDS[minLevel].range}. Change it in Réglages`}>
            <Emoji e={BANDS[minLevel].emoji} size={16} /> {BANDS[minLevel].name} · {BANDS[minLevel].range}
          </button>
        </div>
        <div className="hello-goal" title={`${todayXp} / ${dailyGoal} XP today`}>
          <ProgressRing value={todayXp / dailyGoal} size={74} stroke={9} color={goalDone ? 'var(--leaf)' : 'var(--berry)'}>
            <div className="goal-inner">
              {goalDone ? <Emoji e="🏆" size={30} /> : (
                <>
                  <strong>{todayXp}</strong>
                  <small>/{dailyGoal}</small>
                </>
              )}
            </div>
          </ProgressRing>
        </div>
      </section>

      <motion.button
        ref={ctaRef}
        className="daily-cta"
        onClick={startDaily}
        whileTap={{ scale: 0.97, y: 4 }}
        whileHover={{ y: -2 }}
      >
        <span className="daily-cta-icon">
          <motion.span animate={{ rotate: [0, -10, 10, 0] }} transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 1.5 }}>
            <Emoji e="🍬" size={46} />
          </motion.span>
        </span>
        <span className="daily-cta-text">
          <strong>Révision du jour</strong>
          <span>
            {overview && overview.due > 0
              ? `${overview.due} word${overview.due === 1 ? '' : 's'} to review + new ones`
              : 'Today’s practice: new words & a quick review'}
          </span>
        </span>
        <span className="daily-cta-go">
          <svg viewBox="0 0 24 24" width="30" height="30" aria-hidden>
            <path d="M8 5.5v13l10.5-6.5z" fill="currentColor" />
          </svg>
        </span>
      </motion.button>

      <h2 className="section-title">
        Mes cours <small>Chapter by chapter</small>
      </h2>
      <div className="course-cards">
        {COURSE_CARDS.map((c, i) => {
          const line = courseLines?.[c.id];
          return (
            <motion.button
              key={c.id}
              className="course-card"
              style={{ background: paletteColor(c.color), color: inkOn(c.color) }}
              onClick={() => {
                sfx.pop();
                navigate(`/cours/${c.id}`);
              }}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 22, delay: 0.05 + i * 0.06 }}
              whileTap={{ scale: 0.97 }}
              data-course={c.id}
            >
              <span className="course-card-art">
                <Emoji e={c.emoji} size={40} />
              </span>
              <span className="course-card-text">
                <strong>{c.title}</strong>
                <span>{c.en}</span>
                <small>{line?.text ?? ' '}</small>
                <span className="course-card-bar" aria-hidden>
                  <span style={{ width: `${Math.round((line?.progress ?? 0) * 100)}%` }} />
                </span>
              </span>
            </motion.button>
          );
        })}
      </div>

      <h2 className="section-title">
        Jeux <small>Pick a game</small>
      </h2>
      <div className="mode-grid">
        {modes.map((m, i) => (
          <motion.button
            key={m.id}
            className="mode-tile"
            style={{ background: paletteColor(m.color), color: inkOn(m.color) }}
            onClick={() => {
              sfx.pop();
              setSetupMode(m);
            }}
            initial={{ opacity: 0, y: 24, scale: 0.85 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.05 + i * 0.04 }}
            whileHover={{ y: -4, rotate: i % 2 ? 1.5 : -1.5 }}
            whileTap={{ scale: 0.93 }}
          >
            <span className="mode-num">{m.num}</span>
            <motion.span
              className="mode-art"
              whileHover={{ scale: 1.15, rotate: -8 }}
              transition={{ type: 'spring', stiffness: 400, damping: 10 }}
            >
              <Emoji e={m.emoji} size={52} />
            </motion.span>
            <span className="mode-name">{m.name}</span>
            <span className="mode-en">{m.en}</span>
          </motion.button>
        ))}
      </div>

      <h2 className="section-title">
        Grammaire <small>Every tense, questions & more</small>
      </h2>
      <div className="mode-grid mode-grid--grammar">
        {grammarModes.map((m, i) => (
          <motion.button
            key={m.id}
            className="mode-tile"
            style={{ background: paletteColor(m.color), color: inkOn(m.color) }}
            onClick={() => {
              sfx.pop();
              if (m.id === 'grammaire') navigate('/grammaire');
              else setSetupMode(m);
            }}
            initial={{ opacity: 0, y: 24, scale: 0.85 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 + i * 0.05 }}
            whileHover={{ y: -4, rotate: i % 2 ? 1.5 : -1.5 }}
            whileTap={{ scale: 0.93 }}
          >
            <span className="mode-num">G{m.num}</span>
            <span className="mode-art">
              <Emoji e={m.emoji} size={52} />
            </span>
            <span className="mode-name">{m.name}</span>
            <span className="mode-en">{m.en}</span>
          </motion.button>
        ))}
      </div>

      <h2 className="section-title">
        Mes thèmes <small>{activeDecks.length} active</small>
      </h2>
      <div className="hscroll deck-strip">
        {decks
          ?.filter((d) => d.total > 0)
          .sort((a, b) => Number(b.active) - Number(a.active) || a.order - b.order)
          .map((d) => {
            const learned = d.counts.learned + d.counts.mastered;
            const started = d.counts.learning;
            return (
              <motion.button
                key={d.id}
                className={'deck-card' + (d.active ? '' : ' is-off')}
                onClick={() => navigate(`/words?deck=${encodeURIComponent(d.id)}`)}
                whileTap={{ scale: 0.95 }}
                style={{ '--deck': paletteColor(d.color) } as React.CSSProperties}
              >
                <span className="deck-card-emoji">
                  <Emoji e={d.emoji} size={40} />
                </span>
                <strong>{d.name}</strong>
                <span className="deck-card-meta">
                  {learned}/{d.total} learned
                  {started > 0 && <span className="deck-card-started"> · {started} in progress</span>}
                </span>
                {/* learned in the deck colour, words in progress lighter behind them */}
                <span className="deck-bar">
                  <motion.span
                    className="deck-bar-started"
                    initial={{ width: 0 }}
                    animate={{ width: `${((learned + started) / Math.max(1, d.total)) * 100}%` }}
                    transition={{ type: 'spring', stiffness: 60, damping: 18, delay: 0.3 }}
                  />
                  <motion.span
                    initial={{ width: 0 }}
                    animate={{ width: `${(learned / Math.max(1, d.total)) * 100}%` }}
                    transition={{ type: 'spring', stiffness: 60, damping: 18, delay: 0.4 }}
                  />
                </span>
              </motion.button>
            );
          })}
      </div>

      <GameSetup mode={setupMode} onClose={() => setSetupMode(null)} />
    </Page>
  );
}
