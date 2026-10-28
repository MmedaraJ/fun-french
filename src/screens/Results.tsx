import { useLiveQuery } from 'dexie-react-hooks';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { AnimatedNumber } from '../components/AnimatedNumber';
import { CardImage, hasPicture } from '../components/CardImage';
import { Emoji } from '../components/Emoji';
import { Loader } from '../components/Loader';
import { Mascot } from '../components/Mascot';
import { SpeakButton } from '../components/SpeakButton';
import { ACHIEVEMENT_BY_ID } from '../lib/achievements';
import { celebrate, emojiRain, stars as starBurst } from '../lib/confetti';
import { formatDuration } from '../lib/date';
import { db } from '../lib/db';
import { MODE_BY_ID } from '../lib/engine/modes';
import { levelName, starsFor } from '../lib/engine/scoring';
import { inkOn, paletteColor } from '../lib/palette';
import { g, useSettings } from '../lib/settings';
import { sfx } from '../lib/sound';
import type { Card } from '../types';
import './Results.css';

interface ResultsState {
  stars: number;
  levelBefore: number;
  levelAfter: number;
  newRecord: boolean;
  /** Ids of badges unlocked by this round. */
  unlocked: string[];
  fresh: boolean;
  goalReached?: boolean;
  /** New streak length when this round was the first of the day. */
  streakUp?: number;
}

const TITLES = [
  { fr: 'Courage !', en: 'Keep going, every round helps.' },
  { fr: 'Pas mal !', en: 'Not bad at all!' },
  { fr: 'Bravo !', en: 'Great job!' },
  { fr: 'Parfait !', en: 'Absolutely brilliant!' },
];

export default function Results() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const st = (location.state ?? null) as ResultsState | null;
  const unlocked = (st?.unlocked ?? []).map((id) => ACHIEVEMENT_BY_ID[id]).filter(Boolean);
  const { mascotColor, agreement } = useSettings();
  const session = useLiveQuery(() => db.sessions.get(sessionId ?? ''), [sessionId]);
  const answers = useLiveQuery(async () => {
    if (!sessionId) return [];
    const evs = await db.events.where('sessionId').equals(sessionId).toArray();
    const cards = await db.cards.bulkGet([...new Set(evs.map((e) => e.cardId))]);
    const byId = new Map(cards.filter(Boolean).map((c) => [c!.id, c!]));
    const result = new Map<string, { card: Card; ok: boolean }>();
    for (const e of evs) {
      const card = byId.get(e.cardId);
      if (!card) continue;
      const prev = result.get(card.id);
      result.set(card.id, { card, ok: (prev?.ok ?? true) && e.correct });
    }
    return [...result.values()];
  }, [sessionId]);

  const [shownStars, setShownStars] = useState(0);
  const [scoreDone, setScoreDone] = useState(!st?.fresh);
  const played = useRef(false);

  const starsCount = st?.stars ?? (session ? starsFor(session.correct, session.total, session.survival) : 0);
  const fresh = !!st?.fresh;
  const leveledUp = !!st && st.levelAfter > st.levelBefore;

  // Celebration sequence: stars pop one by one, then score counts, then extras.
  useEffect(() => {
    if (!session || played.current) return;
    played.current = true;
    if (!fresh) {
      setShownStars(starsCount);
      return;
    }
    sfx.fanfare();
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 0; i < starsCount; i++) {
      timers.push(
        setTimeout(() => {
          setShownStars(i + 1);
          sfx.star(i);
          starBurst(0.35 + i * 0.15, 0.22);
        }, 600 + i * 420),
      );
    }
    const after = 700 + starsCount * 420;
    timers.push(setTimeout(() => setScoreDone(false), after));
    if (starsCount >= 2) timers.push(setTimeout(() => celebrate(starsCount === 3 ? 1.3 : 0.8), after + 200));
    if (st?.newRecord) timers.push(setTimeout(() => sfx.record(), after + 1400));
    if (leveledUp) {
      timers.push(
        setTimeout(() => {
          sfx.levelUp();
          emojiRain(['⭐', '🥐', '🎉', '💖'], 50);
        }, after + 2000),
      );
    }
    if (unlocked.length) timers.push(setTimeout(() => sfx.achievement(), after + (leveledUp ? 3200 : 2200)));
    return () => timers.forEach(clearTimeout);
  }, [session, fresh, starsCount, st, leveledUp]);

  const missed = useMemo(() => (answers ?? []).filter((a) => !a.ok).map((a) => a.card.id), [answers]);

  if (!session) return <Loader />;
  const info = MODE_BY_ID[session.mode];
  const bg = paletteColor(info.color);
  const ink = inkOn(info.color);
  const title = TITLES[starsCount];
  const acc = session.total ? Math.round((session.correct / session.total) * 100) : 0;

  const replay = () => {
    sfx.whoosh();
    const p = new URLSearchParams();
    if (session.deckIds.length) p.set('decks', session.deckIds.join(','));
    if (session.survival) p.set('survival', '1');
    else p.set('len', String(Math.max(10, Math.min(20, session.total))));
    navigate(`/play/${session.mode}?${p}`, { replace: true });
  };
  const reviewMissed = () => {
    sfx.whoosh();
    const mode = session.mode === 'pairs' || session.mode === 'speak' ? 'mix' : session.mode;
    navigate(`/play/${mode}?cards=${missed.join(',')}`, { replace: true });
  };

  return (
    <div className="results" style={{ background: bg, color: ink }}>
      <div className="game-blobs" aria-hidden>
        <span />
        <span />
        <span />
      </div>
      <div className="results-inner">
        <motion.div className="results-mascot" initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', delay: 0.15 }}>
          <Mascot mood={starsCount >= 2 ? 'excited' : starsCount === 1 ? 'happy' : 'sad'} size={128} color={mascotColor} reactKey={shownStars} onClick={() => sfx.rimshot()} />
        </motion.div>

        <motion.h1 className="results-title" initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 12, delay: 0.3 }}>
          {session.survival ? (session.correct >= 12 ? 'Incroyable !' : 'Bien tenté !') : title.fr}
        </motion.h1>
        <p className="results-sub">{session.survival ? `You survived ${session.correct} question${session.correct === 1 ? '' : 's'}!` : title.en}</p>

        <div className="results-stars" aria-label={`${starsCount} of 3 stars`}>
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className={'star' + (i < shownStars ? ' is-on' : '')}
              animate={i < shownStars ? { scale: [0, 1.5, 1], rotate: [-40, 15, 0] } : { scale: 1 }}
              transition={{ duration: 0.5 }}
              style={{ marginTop: i === 1 ? -18 : 0 }}
            >
              <Emoji e="⭐" size={i === 1 ? 74 : 58} />
            </motion.span>
          ))}
        </div>

        <div className="results-card">
          <div className="score-label">Score</div>
          <div className="score-big">
            {scoreDone ? (
              session.score.toLocaleString()
            ) : (
              <AnimatedNumber value={session.score} from={0} duration={1.3} onTick={() => sfx.tick()} />
            )}
          </div>
          <AnimatePresence>
            {st?.newRecord && (
              <motion.div className="record-ribbon" initial={{ scale: 0, rotate: -10 }} animate={{ scale: 1, rotate: -3 }} transition={{ delay: 2.2, type: 'spring', stiffness: 400, damping: 10 }}>
                <Emoji e="🏆" size={22} /> Nouveau record !
              </motion.div>
            )}
          </AnimatePresence>
          <div className="results-stats">
            <Stat emoji="🎯" value={`${acc}%`} label="accuracy" />
            <Stat emoji="🔥" value={String(session.maxCombo)} label="best streak" />
            <Stat emoji="✨" value={`+${session.xp}`} label="XP" />
            <Stat emoji="🌱" value={String(session.newCards)} label="new words" />
          </div>
          <div className="results-time">
            {session.correct}/{session.total} right · {formatDuration(session.endedAt - session.startedAt)}
          </div>
        </div>

        <AnimatePresence>
          {leveledUp && st && (
            <motion.div className="levelup" initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: fresh ? 2.6 : 0, type: 'spring', stiffness: 300, damping: 12 }}>
              <Emoji e="🎉" size={40} />
              <div>
                <strong>Niveau {st.levelAfter} !</strong>
                <span>Tu es maintenant « {levelName(st.levelAfter, agreement)} »</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="results-banners">
          {!!st?.streakUp && (
            <motion.div className="mini-banner streak-banner" initial={{ y: 20, opacity: 0, scale: 0.8 }} animate={{ y: 0, opacity: 1, scale: 1 }} transition={{ delay: fresh ? 1.9 : 0, type: 'spring', stiffness: 300, damping: 14 }}>
              <motion.span animate={{ scale: [1, 1.25, 1], rotate: [-8, 8, -8] }} transition={{ duration: 1.2, repeat: Infinity }}>
                <Emoji e="🔥" size={30} />
              </motion.span>
              <span>
                <strong>
                  {st.streakUp} jour{st.streakUp > 1 ? 's' : ''} d’affilée !
                </strong>
                <small>{st.streakUp > 1 ? 'Streak extended. Keep it going tomorrow!' : 'Day one of a new streak!'}</small>
              </span>
            </motion.div>
          )}
          {st?.goalReached && (
            <motion.div className="mini-banner goal-banner" initial={{ y: 20, opacity: 0, scale: 0.8 }} animate={{ y: 0, opacity: 1, scale: 1 }} transition={{ delay: fresh ? 2.1 : 0, type: 'spring', stiffness: 300, damping: 14 }}>
              <Emoji e="🎯" size={30} />
              <span>
                <strong>Objectif du jour atteint !</strong>
                <small>Daily goal reached. {g('Fier', 'Fière')} de toi !</small>
              </span>
            </motion.div>
          )}
        </div>

        {unlocked.map((a, i) => (
          <motion.div key={a.id} className="ach-pop" initial={{ x: -60, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: (fresh ? (leveledUp ? 3.2 : 2.4) : 0) + i * 0.25, type: 'spring' }}>
            <motion.span animate={{ rotate: [0, -12, 12, 0] }} transition={{ duration: 0.8, delay: 3 + i * 0.25 }}>
              <Emoji e={a.emoji} size={40} />
            </motion.span>
            <div>
              <small>Badge débloqué !</small>
              <strong>{a.title()}</strong>
              <span>{a.desc}</span>
            </div>
          </motion.div>
        ))}

        {answers && answers.length > 0 && (
          <div className="results-words">
            <h3>{missed.length ? `${g('Prêt', 'Prête')} à revoir ${missed.length === 1 ? 'ce mot' : 'ces mots'} ?` : 'Mots de la partie'}</h3>
            <ul>
              {[...answers]
                .sort((a, b) => Number(a.ok) - Number(b.ok))
                .map(({ card, ok }) => (
                  <li key={card.id} className={ok ? 'ok' : 'bad'}>
                    <span className="rw-mark">{ok ? '✓' : '✕'}</span>
                    {hasPicture(card) && card.kind !== 'sentence' && <CardImage card={card} size={34} fallback="none" rounded={8} />}
                    <span className="rw-text">
                      <strong>{card.fr}</strong>
                      <span>{card.en}</span>
                    </span>
                    <SpeakButton text={card.fr} size="sm" tone="solid" />
                  </li>
                ))}
            </ul>
          </div>
        )}

        <div className="results-actions">
          {missed.length > 0 && (
            <button className="btn btn--white btn--block btn--lg" onClick={reviewMissed}>
              <Emoji e="🔁" size={24} /> Revoir mes erreurs ({missed.length})
            </button>
          )}
          <div className="row" style={{ gap: 12 }}>
            <button className="btn btn--ghost grow" onClick={() => navigate('/', { replace: true })}>
              Accueil
            </button>
            <button className="btn btn--white grow" onClick={replay}>
              Rejouer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ emoji, value, label }: { emoji: string; value: string; label: string }) {
  return (
    <div className="rstat">
      <Emoji e={emoji} size={22} />
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}
