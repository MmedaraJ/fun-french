import { useLiveQuery } from 'dexie-react-hooks';
import { motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatedNumber } from '../components/AnimatedNumber';
import { CardImage, hasPicture } from '../components/CardImage';
import { ChartCard } from '../components/charts/ChartCard';
import { ColumnChart, type ColumnDatum } from '../components/charts/ColumnChart';
import { HBarChart } from '../components/charts/HBarChart';
import { heatBin, Heatmap } from '../components/charts/Heatmap';
import { LineChart, type LinePoint } from '../components/charts/LineChart';
import { Meter } from '../components/charts/Meter';
import { StackedBar } from '../components/charts/StackedBar';
import { Emoji } from '../components/Emoji';
import { Mascot } from '../components/Mascot';
import { Page } from '../components/Page';
import { ProgressRing } from '../components/ProgressRing';
import { Sheet } from '../components/Sheet';
import { SpeakButton } from '../components/SpeakButton';
import { ACHIEVEMENTS, type AchievementDef } from '../lib/achievements';
import { dayKey, formatDuration, prettyDay, timeOfDay, weekdayShort } from '../lib/date';
import { db } from '../lib/db';
import { MODE_BY_ID, MODES, TYPE_LABEL } from '../lib/engine/modes';
import { levelFromXp, levelName } from '../lib/engine/scoring';
import { useDeckSummaries } from '../lib/hooks';
import { paletteColor } from '../lib/palette';
import { useSettings } from '../lib/settings';
import { sfx } from '../lib/sound';
import { computeStreak, lastNDays, pct, statusCounts, sumXp } from '../lib/stats';
import type { CardSource, DailyStat, QuestionType } from '../types';
import './Stats.css';

const DAY_FR = (key: string) => {
  const d = new Date(key + 'T12:00:00');
  return `${d.getDate()} ${['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'][d.getMonth()]}`;
};

const SOURCES: { key: Exclude<CardSource, 'starter'>; emoji: string; label: string }[] = [
  { key: 'manual', emoji: '✍️', label: 'typed in' },
  { key: 'text', emoji: '📝', label: 'from text' },
  { key: 'photo', emoji: '📸', label: 'from photos' },
  { key: 'ai', emoji: '✨', label: 'with AI' },
  { key: 'import', emoji: '📦', label: 'imported' },
];

const NAV = [
  { id: 'st-week', label: 'Semaine' },
  { id: 'st-activity', label: 'Activité' },
  { id: 'st-words', label: 'Mots' },
  { id: 'st-accuracy', label: 'Précision' },
  { id: 'st-bests', label: 'Records' },
  { id: 'st-tricky', label: 'Difficiles' },
  { id: 'st-rounds', label: 'Parties' },
  { id: 'st-badges', label: 'Badges' },
  { id: 'st-totals', label: 'Totaux' },
];

async function loadStats() {
  const [daily, sessions, cards, progressRows, unlockedRows] = await Promise.all([
    db.daily.toArray(),
    db.sessions.toArray(),
    db.cards.toArray(),
    db.progress.toArray(),
    db.unlocked.toArray(),
  ]);
  const byType = new Map<QuestionType, { correct: number; total: number }>();
  await db.events.each((e) => {
    const a = byType.get(e.type) ?? { correct: 0, total: 0 };
    a.total++;
    if (e.correct) a.correct++;
    byType.set(e.type, a);
  });
  return {
    daily,
    sessions: sessions.filter((s) => s.total > 0).sort((a, b) => b.endedAt - a.endedAt),
    cards: cards.filter((c) => !c.archived),
    progress: new Map(progressRows.map((p) => [p.cardId, p])),
    unlocked: new Map(unlockedRows.map((u) => [u.id, u.unlockedAt])),
    byType,
  };
}

const minutes = (ms: number) => Math.round(ms / 60000);

export default function Stats() {
  const navigate = useNavigate();
  const { dailyGoal, agreement, mascotColor } = useSettings();
  const data = useLiveQuery(loadStats, []);
  const decks = useDeckSummaries();
  const [selectedDay, setSelectedDay] = useState(dayKey());
  const [badge, setBadge] = useState<AchievementDef | null>(null);
  const [allDecks, setAllDecks] = useState(false);

  const view = useMemo(() => {
    if (!data) return null;
    const { daily, sessions, cards, progress, byType } = data;
    const today = dayKey();
    const xp = sumXp(daily);
    const level = levelFromXp(xp);
    const streak = computeStreak(daily, today);
    const todayStat = daily.find((d) => d.day === today);
    const week = lastNDays(daily, 7, today);
    const month = lastNDays(daily, 30, today);
    const fortnight = lastNDays(daily, 14, today);
    const counts = statusCounts(
      cards.map((c) => c.id),
      progress,
    );
    const totals = daily.reduce((a, d) => ({ answers: a.answers + d.answers, correct: a.correct + d.correct, ms: a.ms + d.ms, sessions: a.sessions + d.sessions }), { answers: 0, correct: 0, ms: 0, sessions: 0 });
    const bySource = new Map<CardSource, number>();
    for (const c of cards) bySource.set(c.source, (bySource.get(c.source) ?? 0) + 1);
    const tricky = [...progress.values()]
      .filter((p) => p.seen >= 3 && p.wrong > 0)
      .map((p) => ({ p, rate: p.wrong / p.seen }))
      .sort((a, b) => b.rate - a.rate || b.p.lapses - a.p.lapses || b.p.wrong - a.p.wrong)
      .map(({ p, rate }) => ({ p, rate, card: cards.find((c) => c.id === p.cardId) }))
      .filter((x) => x.card)
      .slice(0, 8);
    const bests = MODES.map((m) => {
      const mine = sessions.filter((s) => s.mode === m.id);
      const classic = mine.filter((s) => !s.survival);
      const survival = mine.filter((s) => s.survival);
      return {
        mode: m,
        plays: mine.length,
        bestScore: classic.reduce((a, s) => Math.max(a, s.score), 0),
        bestSurvival: survival.reduce((a, s) => Math.max(a, s.correct), 0),
        bestAcc: classic.reduce((a, s) => Math.max(a, s.total ? s.correct / s.total : 0), 0),
      };
    });
    const typeRows = [...byType.entries()]
      .filter(([, v]) => v.total > 0)
      .map(([type, v]) => ({ type, ...v, acc: v.correct / v.total }))
      .sort((a, b) => b.acc - a.acc);
    return {
      today,
      xp,
      level,
      streak,
      todayStat,
      week,
      month,
      fortnight,
      counts,
      totals,
      bySource,
      tricky,
      bests,
      typeRows,
      recent: sessions.slice(0, 8),
      hasData: daily.some((d) => d.answers > 0) || sessions.length > 0,
    };
  }, [data]);

  if (!data || !view) {
    return (
      <Page>
        <h1 className="screen-title">Mes progrès</h1>
      </Page>
    );
  }

  const { level } = view;
  const todayXp = view.todayStat?.xp ?? 0;

  const weekData: ColumnDatum[] = view.week.map((d) => ({
    key: d.day,
    label: weekdayShort(d.day, 'fr'),
    value: d.xp,
    highlight: d.day === view.today,
    tip: [`${d.xp} XP`, prettyDay(d.day), d.answers ? `${d.answers} answers · ${pct(d.correct / d.answers)} right` : 'No practice'],
  }));
  const weekMax = weekData.reduce((m, d, i) => (d.value > weekData[m].value ? i : m), 0);
  const weekTotal = view.week.reduce((a, d) => a + d.xp, 0);
  const goalDays = view.week.filter((d) => d.xp >= dailyGoal).length;

  const accPoints: LinePoint[] = view.month.map((d) => ({
    key: d.day,
    label: d.day === view.today ? 'auj.' : DAY_FR(d.day),
    value: d.answers ? (d.correct / d.answers) * 100 : null,
    tip: [d.answers ? pct(d.correct / d.answers) : '—', prettyDay(d.day), `${d.correct}/${d.answers} right`],
  }));
  const monthAnswers = view.month.reduce((a, d) => a + d.answers, 0);
  const monthCorrect = view.month.reduce((a, d) => a + d.correct, 0);

  const minuteData: ColumnDatum[] = view.fortnight.map((d) => ({
    key: d.day,
    label: d.day === view.today ? 'auj.' : String(Number(d.day.slice(8))),
    value: Math.round((d.ms / 60000) * 10) / 10,
    highlight: false,
    tip: [formatDuration(d.ms), prettyDay(d.day), `${d.sessions} round${d.sessions === 1 ? '' : 's'}`],
  }));
  const minuteMax = minuteData.reduce((m, d, i) => (d.value > minuteData[m].value ? i : m), 0);
  const fortnightMs = view.fortnight.reduce((a, d) => a + d.ms, 0);

  const selectedStat = data.daily.find((d) => d.day === selectedDay);
  const describeDay = (day: string, s: DailyStat | undefined) =>
    s && s.answers ? [`${s.xp} XP`, prettyDay(day), `${s.answers} answers · ${pct(s.correct / s.answers)}`] : ['No practice', prettyDay(day)];

  const learnedTotal = view.counts.learned + view.counts.mastered;
  const deckRows = (decks ?? []).filter((d) => d.total > 0).sort((a, b) => Number(b.active) - Number(a.active) || (b.counts.learned + b.counts.mastered) / b.total - (a.counts.learned + a.counts.mastered) / a.total);
  const anyActive = deckRows.some((d) => d.active);
  const ownTotal = SOURCES.reduce((a, s) => a + (view.bySource.get(s.key) ?? 0), 0);
  const unlockedCount = ACHIEVEMENTS.filter((a) => data.unlocked.has(a.id)).length;

  const jump = (id: string) => {
    sfx.tap();
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const badges = (
    <section id="st-badges" className="st-section">
      <h2 className="section-title">
        Badges <small>{unlockedCount}/{ACHIEVEMENTS.length}</small>
      </h2>
      <div className="badge-grid">
        {ACHIEVEMENTS.map((a, i) => {
          const at = data.unlocked.get(a.id);
          const hidden = !at && a.secret;
          return (
            <motion.button
              key={a.id}
              className={'badge-tile' + (at ? ' is-on' : '')}
              onClick={() => {
                sfx.softPop();
                setBadge(a);
              }}
              initial={{ opacity: 0, scale: 0.7 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ type: 'spring', stiffness: 380, damping: 20, delay: (i % 12) * 0.03 }}
              whileTap={{ scale: 0.92 }}
            >
              <span className="badge-art">{hidden ? <span className="badge-q">?</span> : <Emoji e={a.emoji} size={38} />}</span>
              <span className="badge-name">{hidden ? '???' : a.title()}</span>
              {at && <span className="badge-date">{DAY_FR(dayKey(at))}</span>}
            </motion.button>
          );
        })}
      </div>
    </section>
  );

  return (
    <Page className="stats">
      <h1 className="screen-title">Mes progrès</h1>
      <p className="screen-sub">Your French journey, day by day.</p>

      {!view.hasData ? (
        <>
          <motion.section className="panel st-empty" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring' }}>
            <Mascot mood="sleepy" size={120} color={mascotColor} />
            <h2>Joue une partie pour voir tes progrès fleurir !</h2>
            <p className="muted">Play a round and your streak, words and charts will appear here.</p>
            <button
              className="btn btn--lg"
              onClick={() => {
                sfx.whoosh();
                navigate('/play/mix?daily=1');
              }}
            >
              <Emoji e="🍬" size={26} /> Jouer
            </button>
          </motion.section>
          {badges}
        </>
      ) : (
        <>
          {/* Hero */}
          <motion.section className="st-hero" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 220, damping: 22 }}>
            <div className="st-level">
              <motion.div className="st-level-badge" initial={{ rotate: -30, scale: 0 }} animate={{ rotate: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 12, delay: 0.1 }}>
                <Emoji e="⭐" size={78} />
                <span>{level.level}</span>
              </motion.div>
              <div className="st-level-text">
                <div className="st-kicker">Niveau {level.level}</div>
                <div className="st-level-name">{levelName(level.level, agreement)}</div>
                <Meter value={level.progress} color="#ffffff" track="rgba(255,255,255,0.28)" height={12} label="Progress to next level" delay={0.3} />
                <div className="st-level-sub">
                  {level.into} / {level.span} XP → niveau {level.level + 1}
                </div>
              </div>
            </div>
            <div className="st-hero-figs">
              <div className="st-fig st-fig--xp">
                <strong>
                  <AnimatedNumber value={view.xp} from={0} duration={1.2} />
                </strong>
                <span>XP au total</span>
              </div>
              <div className="st-fig">
                <strong className="st-flame">
                  <motion.span animate={view.streak.practicedToday ? { scale: [1, 1.18, 1], rotate: [-6, 6, -6] } : {}} transition={{ duration: 1.4, repeat: Infinity }}>
                    <Emoji e="🔥" size={30} />
                  </motion.span>
                  {view.streak.current}
                </strong>
                <span>jour{view.streak.current === 1 ? '' : 's'} d’affilée</span>
                <span className="st-fig-small">record : {view.streak.best}</span>
              </div>
              <div className="st-fig st-fig--goal">
                <ProgressRing value={todayXp / dailyGoal} size={62} stroke={8} color="#ffffff" track="rgba(255,255,255,0.28)">
                  {todayXp >= dailyGoal ? <Emoji e="🏆" size={26} /> : <span className="st-ring-num">{Math.round((todayXp / dailyGoal) * 100)}%</span>}
                </ProgressRing>
                <span>
                  Aujourd’hui
                  <br />
                  {todayXp} / {dailyGoal} XP
                </span>
              </div>
            </div>
            {view.streak.atRisk && <div className="st-risk">Joue aujourd’hui pour garder ta série de {view.streak.current} jours ! 🔥</div>}
          </motion.section>

          <nav className="hscroll st-nav" aria-label="Sections">
            {NAV.map((n) => (
              <button key={n.id} className="chip" onClick={() => jump(n.id)}>
                {n.label}
              </button>
            ))}
          </nav>

          <div className="st-grid">
            <section id="st-week" className="st-section">
              <ChartCard
                title="Cette semaine"
                subtitle={`${weekTotal} XP · objectif atteint ${goalDays}/7 jours`}
                table={{ columns: ['Day', 'XP', 'Answers', 'Accuracy'], rows: view.week.map((d) => [prettyDay(d.day), d.xp, d.answers, d.answers ? pct(d.correct / d.answers) : '—']) }}
              >
                <ColumnChart
                  data={weekData}
                  color="var(--viz-xp)"
                  softColor="var(--viz-xp-soft)"
                  refLine={{ value: dailyGoal, label: `objectif ${dailyGoal}` }}
                  labelIndices={[6, weekMax]}
                  ariaLabel={`XP per day for the last 7 days. Total ${weekTotal} XP.`}
                />
              </ChartCard>
            </section>

            <section id="st-activity" className="st-section">
              <ChartCard
                title="Activité"
                subtitle="Les 20 dernières semaines · tap a day"
                table={{
                  columns: ['Day', 'XP', 'Answers', 'Accuracy', 'Minutes'],
                  rows: [...data.daily].filter((d) => d.answers > 0).sort((a, b) => (a.day < b.day ? 1 : -1)).map((d) => [prettyDay(d.day), d.xp, d.answers, pct(d.correct / d.answers), minutes(d.ms)]),
                }}
              >
                <Heatmap daily={data.daily} goal={dailyGoal} selected={selectedDay} onSelect={setSelectedDay} describe={describeDay} />
                <div className="heat-legend" aria-label="Colour scale">
                  <span>
                    <i className="heat-legend-0" style={{ background: 'var(--viz-heat-0)' }} />0
                  </span>
                  <span>
                    <i style={{ background: 'var(--viz-heat-1)' }} />
                    &lt;{Math.round(dailyGoal / 2)}
                  </span>
                  <span>
                    <i style={{ background: 'var(--viz-heat-2)' }} />
                    {Math.round(dailyGoal / 2)}+
                  </span>
                  <span>
                    <i style={{ background: 'var(--viz-heat-3)' }} />
                    {dailyGoal}+ (goal)
                  </span>
                  <span>
                    <i style={{ background: 'var(--viz-heat-4)' }} />
                    {dailyGoal * 2}+ XP
                  </span>
                </div>
                <motion.div key={selectedDay} className="day-detail" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                  <div className="day-detail-head">
                    <span className={`day-dot heat-bg-${heatBin(selectedStat?.xp ?? 0, dailyGoal)}`} />
                    <strong>{prettyDay(selectedDay)}</strong>
                  </div>
                  {selectedStat && selectedStat.answers > 0 ? (
                    <div className="day-detail-stats">
                      <span>
                        <b>{selectedStat.xp}</b> XP
                      </span>
                      <span>
                        <b>{selectedStat.answers}</b> answers
                      </span>
                      <span>
                        <b>{pct(selectedStat.correct / selectedStat.answers)}</b> right
                      </span>
                      <span>
                        <b>{formatDuration(selectedStat.ms)}</b>
                      </span>
                      <span>
                        <b>{selectedStat.sessions}</b> round{selectedStat.sessions === 1 ? '' : 's'}
                      </span>
                    </div>
                  ) : (
                    <div className="muted day-detail-empty">{selectedDay === view.today ? 'Pas encore joué aujourd’hui.' : 'Pas de pratique ce jour-là.'}</div>
                  )}
                </motion.div>
              </ChartCard>
            </section>

            <section id="st-words" className="st-section">
              <ChartCard
                title="Mes mots"
                subtitle={`${learnedTotal} appris sur ${data.cards.length} · ${view.counts.mastered} maîtrisés`}
                table={{
                  columns: ['Theme', 'New', 'Learning', 'Learned', 'Mastered', 'Total'],
                  rows: deckRows.map((d) => [d.name, d.counts.new, d.counts.learning, d.counts.learned, d.counts.mastered, d.total]),
                }}
              >
                <StackedBar
                  ariaLabel={`Words: ${view.counts.new} new, ${view.counts.learning} learning, ${view.counts.learned} learned, ${view.counts.mastered} mastered`}
                  segments={[
                    { key: 'mastered', label: 'Maîtrisés', value: view.counts.mastered, color: 'var(--viz-m-mastered)', ink: 'var(--viz-m-mastered-ink)' },
                    { key: 'learned', label: 'Appris', value: view.counts.learned, color: 'var(--viz-m-learned)', ink: 'var(--viz-m-learned-ink)' },
                    { key: 'learning', label: 'En cours', value: view.counts.learning, color: 'var(--viz-m-learning)', ink: 'var(--viz-m-learning-ink)' },
                    { key: 'new', label: 'Nouveaux', value: view.counts.new, color: 'var(--viz-m-new)', ink: 'var(--viz-m-new-ink)' },
                  ]}
                />
                <p className="st-note">
                  <b>Appris</b>: right again after a break. <b>Maîtrisé</b>: remembered across weeks.
                </p>
                <ul className="deck-meters">
                  {(allDecks ? deckRows : deckRows.slice(0, 6)).map((d, i) => {
                    const learned = d.counts.learned + d.counts.mastered;
                    return (
                      <li key={d.id} className={d.active || !anyActive ? '' : 'is-off'}>
                        <Emoji e={d.emoji} size={26} />
                        <div className="deck-meter-body">
                          <div className="deck-meter-top">
                            <span>{d.name}</span>
                            <b>
                              {learned}/{d.total}
                            </b>
                          </div>
                          <Meter value={learned / d.total} color={paletteColor(d.color)} height={10} label={`${d.name}: ${learned} of ${d.total} learned`} delay={0.05 * i} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
                {deckRows.length > 6 && (
                  <button className="btn btn--sm btn--ghost st-more" onClick={() => setAllDecks((v) => !v)}>
                    {allDecks ? 'Moins' : `Tous les thèmes (${deckRows.length})`}
                  </button>
                )}
              </ChartCard>
            </section>

            <section id="st-accuracy" className="st-section st-flow">
              <ChartCard
                title="Précision par jeu"
                subtitle="Share of right answers in each kind of question"
                table={{ columns: ['Game', 'Right', 'Answers', 'Accuracy'], rows: view.typeRows.map((r) => [TYPE_LABEL[r.type], r.correct, r.total, pct(r.acc)]) }}
              >
                {view.typeRows.length ? (
                  <HBarChart
                    max={1}
                    color="var(--viz-acc)"
                    ariaLabel="Accuracy by question type"
                    data={view.typeRows.map((r) => ({
                      key: r.type,
                      label: TYPE_LABEL[r.type],
                      emoji: MODE_BY_ID[r.type as keyof typeof MODE_BY_ID]?.emoji,
                      value: r.acc,
                      display: pct(r.acc),
                      sub: `${r.total} answer${r.total === 1 ? '' : 's'}`,
                    }))}
                  />
                ) : (
                  <p className="muted">No answers yet.</p>
                )}
              </ChartCard>
              <ChartCard
                title="Précision sur 30 jours"
                subtitle={monthAnswers ? `${pct(monthCorrect / monthAnswers)} right over ${monthAnswers} answers` : 'No answers in the last 30 days'}
                table={{ columns: ['Day', 'Right', 'Answers', 'Accuracy'], rows: view.month.filter((d) => d.answers).map((d) => [prettyDay(d.day), d.correct, d.answers, pct(d.correct / d.answers)]) }}
              >
                <LineChart
                  points={accPoints}
                  color="var(--viz-acc)"
                  yMax={100}
                  yTicks={[0, 50, 100]}
                  format={(v) => `${Math.round(v)}%`}
                  ariaLabel="Daily accuracy over the last 30 days"
                />
              </ChartCard>
              <ChartCard
                title="Temps de pratique"
                subtitle={`${formatDuration(fortnightMs)} over the last 14 days`}
                table={{ columns: ['Day', 'Minutes', 'Rounds'], rows: view.fortnight.map((d) => [prettyDay(d.day), minutes(d.ms), d.sessions]) }}
              >
                <ColumnChart
                  data={minuteData}
                  color="var(--viz-time)"
                  labelIndices={[13, minuteMax]}
                  format={(v) => (v < 10 && v % 1 ? v.toFixed(1) : String(Math.round(v)))}
                  ariaLabel="Minutes practised per day for the last 14 days"
                />
              </ChartCard>
            </section>
          </div>

          <section id="st-bests" className="st-section">
            <h2 className="section-title">
              Records <small>Personal bests</small>
            </h2>
            <div className="best-grid">
              {view.bests.map(({ mode, plays, bestScore, bestSurvival }, i) => (
                <motion.div
                  key={mode.id}
                  className={'best-tile' + (plays ? '' : ' is-empty')}
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.04 }}
                >
                  <span className="best-art" style={{ background: paletteColor(mode.color) }}>
                    <Emoji e={mode.emoji} size={28} />
                  </span>
                  <span className="best-body">
                    <strong>{mode.name}</strong>
                    {plays ? (
                      <>
                        <span>{bestScore ? `${bestScore.toLocaleString()} pts` : 'Survie only'}</span>
                        {bestSurvival > 0 && (
                          <span className="best-surv">
                            <Emoji e="❤️" size={12} /> {bestSurvival} en survie
                          </span>
                        )}
                      </>
                    ) : (
                      <span>Pas encore joué</span>
                    )}
                  </span>
                  {plays > 0 && <span className="best-plays">×{plays}</span>}
                </motion.div>
              ))}
            </div>
          </section>

          <section id="st-tricky" className="st-section">
            <h2 className="section-title">
              Mots difficiles <small>Trickiest words</small>
            </h2>
            {view.tricky.length ? (
              <div className="panel tricky">
                <ul>
                  {view.tricky.map(({ card, p }) => (
                    <li key={card!.id}>
                      {hasPicture(card!) && card!.kind !== 'sentence' ? (
                        <CardImage card={card!} size={38} fallback="none" rounded={10} />
                      ) : (
                        <span className="tricky-nopic">
                          <Emoji e="💬" size={26} />
                        </span>
                      )}
                      <span className="tricky-text">
                        <strong>{card!.fr}</strong>
                        <span>{card!.en}</span>
                      </span>
                      <span className="tricky-rate" title={`Missed ${p.wrong} of ${p.seen} times`}>
                        ✕ {p.wrong}/{p.seen}
                      </span>
                      <SpeakButton text={card!.fr} size="sm" tone="solid" />
                    </li>
                  ))}
                </ul>
                <button
                  className="btn btn--block"
                  onClick={() => {
                    sfx.whoosh();
                    navigate(`/play/mix?cards=${view.tricky.map((t) => t.card!.id).join(',')}`);
                  }}
                >
                  <Emoji e="🎯" size={22} /> Réviser ces mots
                </button>
              </div>
            ) : (
              <p className="panel panel--flat muted st-quiet">Nothing tricky yet. Words you miss often will show up here.</p>
            )}
          </section>

          <section id="st-rounds" className="st-section">
            <h2 className="section-title">
              Parties récentes <small>Recent rounds</small>
            </h2>
            <div className="panel rounds">
              {view.recent.map((s) => {
                const m = MODE_BY_ID[s.mode];
                return (
                  <motion.button key={s.id} className="round-row" onClick={() => navigate(`/results/${s.id}`)} whileTap={{ scale: 0.98 }}>
                    <span className="round-art" style={{ background: paletteColor(m.color) }}>
                      <Emoji e={m.emoji} size={24} />
                    </span>
                    <span className="round-main">
                      <strong>
                        {m.name}
                        {s.survival ? ' · Survie' : ''}
                      </strong>
                      <span>
                        {prettyDay(s.day)} · {timeOfDay(s.endedAt)} · {formatDuration(s.endedAt - s.startedAt)}
                      </span>
                    </span>
                    <span className="round-score">
                      <strong>{s.score.toLocaleString()}</strong>
                      <span>{s.total ? pct(s.correct / s.total) : '—'}</span>
                    </span>
                  </motion.button>
                );
              })}
              {!view.recent.length && <p className="muted">No finished rounds yet.</p>}
            </div>
          </section>

          {badges}

          <section id="st-totals" className="st-section">
            <h2 className="section-title">
              Depuis le début <small>Lifetime</small>
            </h2>
            <div className="kpi-grid">
              <Kpi emoji="✅" value={view.totals.answers.toLocaleString()} label="answers" />
              <Kpi emoji="🎯" value={view.totals.answers ? pct(view.totals.correct / view.totals.answers) : '—'} label="accuracy" />
              <Kpi emoji="🎮" value={view.totals.sessions.toLocaleString()} label="rounds" />
              <Kpi emoji="⏱️" value={formatDuration(view.totals.ms)} label="practised" />
              <Kpi emoji="🌱" value={String(learnedTotal)} label="words learned" />
              <Kpi emoji="🎓" value={String(view.counts.mastered)} label="mastered" />
            </div>
            <div className="panel own-words">
              <div className="own-head">
                <Emoji e="🧺" size={28} />
                <div>
                  <strong>{ownTotal} mots ajoutés par toi</strong>
                  <span className="muted">Words and phrases you added yourself</span>
                </div>
              </div>
              <div className="own-chips">
                {SOURCES.map((s) => (
                  <span key={s.key} className={'own-chip' + ((view.bySource.get(s.key) ?? 0) ? '' : ' is-zero')}>
                    <Emoji e={s.emoji} size={18} />
                    <b>{view.bySource.get(s.key) ?? 0}</b> {s.label}
                  </span>
                ))}
              </div>
            </div>
          </section>
        </>
      )}

      <Sheet open={!!badge} onClose={() => setBadge(null)} label="Badge">
        {badge && <BadgeDetail badge={badge} at={data.unlocked.get(badge.id)} />}
      </Sheet>
    </Page>
  );
}

function Kpi({ emoji, value, label }: { emoji: string; value: string; label: string }) {
  return (
    <motion.div className="kpi" initial={{ opacity: 0, scale: 0.85 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
      <Emoji e={emoji} size={24} />
      <strong>{value}</strong>
      <span>{label}</span>
    </motion.div>
  );
}

function BadgeDetail({ badge, at }: { badge: AchievementDef; at?: number }) {
  const hidden = !at && badge.secret;
  return (
    <div className="badge-detail">
      <motion.div
        className={'badge-detail-art' + (at ? ' is-on' : '')}
        initial={{ scale: 0.3, rotate: -25 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 12 }}
      >
        {hidden ? <span className="badge-q">?</span> : <Emoji e={badge.emoji} size={84} />}
      </motion.div>
      <h2>{hidden ? 'Badge secret' : badge.title()}</h2>
      <p className="muted">{hidden ? 'Keep playing to discover this one…' : badge.desc}</p>
      <div className={'badge-detail-state' + (at ? ' is-on' : '')}>{at ? `Débloqué le ${DAY_FR(dayKey(at))}` : 'Pas encore débloqué'}</div>
    </div>
  );
}
