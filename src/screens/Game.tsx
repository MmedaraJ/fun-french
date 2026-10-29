import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Emoji } from '../components/Emoji';
import { Loader } from '../components/Loader';
import { Sheet } from '../components/Sheet';
import { checkAchievements } from '../lib/achievements';
import { dayKey } from '../lib/date';
import { db } from '../lib/db';
import { MODE_BY_ID } from '../lib/engine/modes';
import { loadPool } from '../lib/engine/pool';
import { recordAnswer, saveSession } from '../lib/engine/record';
import { buildQuestions, deferIntroduced, INTRO_GAP, retryQuestion, type Pool, type Question, type RoundConfig } from '../lib/engine/round';
import { levelFromXp, multiplier, pointsFor, starsFor, XP } from '../lib/engine/scoring';
import { uid } from '../lib/ids';
import { computeStreak } from '../lib/stats';
import { inkOn, paletteColor, PALETTE_KEYS } from '../lib/palette';
import { settings as getSettings, useSettings } from '../lib/settings';
import { haptic, sfx } from '../lib/sound';
import { dropQueuedSpeech, speak } from '../lib/speech';
import type { Card, GameMode, GrammarType, PaletteKey, Session } from '../types';
import { FeedbackBar } from './game/FeedbackBar';
import { GameHeader } from './game/GameHeader';
import { IntroCard } from './game/IntroCard';
import { QuestionView } from './game/QuestionView';
import { TipBubble } from './game/TipBubble';
import type { AnswerInfo } from './game/types';
import './Game.css';

const HEARTS = 3;
const MAX_RETRIES = 3;

export interface QResult {
  key: string;
  cardId: string;
  type: Question['type'];
  correct: boolean;
  ms: number;
  points: number;
}

interface State {
  status: 'loading' | 'empty' | 'playing' | 'finishing';
  questions: Question[];
  index: number;
  phase: 'intro' | 'ask' | 'feedback';
  score: number;
  combo: number;
  maxCombo: number;
  hearts: number;
  results: QResult[];
  last?: QResult & AnswerInfo;
  retries: number;
  colors: PaletteKey[];
  gain: { id: number; points: number } | null;
}

type Action =
  | { type: 'loaded'; questions: Question[]; introduce: boolean; first: PaletteKey }
  | { type: 'empty' }
  | { type: 'begin'; introduce: boolean; key: string }
  | { type: 'answer'; result: QResult & AnswerInfo; retry: Question | null; survival: boolean }
  | { type: 'partial'; correct: boolean }
  | { type: 'next'; introduce: boolean; more?: Question[] }
  | { type: 'finishing' };

function colorsFor(n: number, from: PaletteKey[] = []): PaletteKey[] {
  const out = [...from];
  while (out.length < n) {
    const prev = out[out.length - 1];
    const pool = PALETTE_KEYS.filter((k) => k !== prev && k !== out[out.length - 2]);
    out.push(pool[Math.floor(Math.random() * pool.length)]);
  }
  return out;
}

/**
 * Flashcards and pairs already show the word, so they skip the "new word" card. The card's own
 * question comes INTRO_GAP questions later (so a card needs that many questions after it).
 */
function wantsIntro(introduce: boolean, questions: Question[], index: number): boolean {
  const q = questions[index];
  return !!q && introduce && q.isNew && !q.introduced && q.type !== 'flash' && q.type !== 'pairs' && questions.length - index - 1 >= INTRO_GAP;
}

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case 'loaded':
      return {
        ...s,
        status: 'playing',
        questions: a.questions,
        index: 0,
        phase: wantsIntro(a.introduce, a.questions, 0) ? 'intro' : 'ask',
        colors: colorsFor(a.questions.length + 4, [a.first]),
      };
    case 'empty':
      return { ...s, status: 'empty' };
    case 'begin': {
      // only the card on screen: a second tap on one that's fading out must not move another question
      if (s.phase !== 'intro' || s.questions[s.index]?.key !== a.key) return s;
      // the word was just shown: ask something else first, and this word a little later
      const questions = deferIntroduced(s.questions, s.index);
      return { ...s, questions, phase: wantsIntro(a.introduce, questions, s.index) ? 'intro' : 'ask' };
    }
    case 'partial': {
      const combo = a.correct ? s.combo + 1 : 0;
      return { ...s, combo, maxCombo: Math.max(s.maxCombo, combo) };
    }
    case 'answer': {
      const r = a.result;
      const isPairs = r.type === 'pairs';
      const combo = isPairs ? s.combo : r.correct ? s.combo + 1 : 0;
      let questions = s.questions;
      if (a.retry) {
        const at = Math.min(s.index + 3, questions.length);
        questions = [...questions.slice(0, at), a.retry, ...questions.slice(at)];
      }
      return {
        ...s,
        phase: 'feedback',
        questions,
        colors: colorsFor(questions.length + 4, s.colors),
        score: s.score + r.points,
        combo,
        maxCombo: Math.max(s.maxCombo, combo),
        hearts: a.survival && !r.correct ? s.hearts - 1 : s.hearts,
        results: [...s.results, r],
        last: r,
        retries: s.retries + (a.retry ? 1 : 0),
        gain: r.points ? { id: Date.now(), points: r.points } : s.gain,
      };
    }
    case 'next': {
      const questions = a.more ? [...s.questions, ...a.more] : s.questions;
      const index = s.index + 1;
      return {
        ...s,
        questions,
        colors: colorsFor(questions.length + 4, s.colors),
        index,
        phase: wantsIntro(a.introduce, questions, index) ? 'intro' : 'ask',
        last: undefined,
      };
    }
    case 'finishing':
      return { ...s, status: 'finishing' };
  }
}

const initial: State = {
  status: 'loading',
  questions: [],
  index: 0,
  phase: 'ask',
  score: 0,
  combo: 0,
  maxCombo: 0,
  hearts: HEARTS,
  results: [],
  retries: 0,
  colors: [],
  gain: null,
};

export default function Game() {
  const params = useParams();
  const mode = (params.mode as GameMode) in MODE_BY_ID ? (params.mode as GameMode) : 'mix';
  const info = MODE_BY_ID[mode];
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const { introduceNew, autoplay, newPerRound, roundLength, difficulty, minLevel } = useSettings();

  const survival = search.get('survival') === '1' && mode !== 'pairs' && mode !== 'flash';
  const cfg = useMemo<RoundConfig>(
    () => ({
      mode,
      survival,
      length: survival ? 10 : Number(search.get('len')) || roundLength,
      deckIds: search.get('decks')?.split(',').filter(Boolean),
      cardIds: search.get('cards')?.split(',').filter(Boolean),
      focusOnly: search.get('focus') === '1',
      newPerRound,
      difficulty,
      minLevel,
    }),
    // read once per mount; settings changes mid-round shouldn't rebuild the round
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const [s, dispatch] = useReducer(reducer, initial);
  const [quitOpen, setQuitOpen] = useState(false);
  const [tipOpen, setTipOpen] = useState(() => !getSettings().seenTips[mode]);
  const [mascotKey, setMascotKey] = useState(0);
  const poolRef = useRef<Pool | null>(null);
  const sessionId = useRef(uid());
  const startedAt = useRef(Date.now());
  const askedAt = useRef(Date.now());
  const lastActivity = useRef(Date.now());
  const saving = useRef<Promise<unknown>>(Promise.resolve());
  const newCards = useRef(new Set<string>());
  const learnedCards = useRef(new Set<string>());
  const askedIds = useRef<string[]>([]);
  const xpBefore = useRef(0);
  const xpEarned = useRef(0);
  const todayBefore = useRef({ xp: 0, practiced: false });
  const finished = useRef(false);

  const isGrammar = info.section === 'grammar';

  /** Grammar questions for this game (or a lesson's practice), generated on demand. */
  const grammarRound = useCallback(
    async (length: number, kindsOverride?: GrammarType[], fromBook = search.get('book') === '1'): Promise<Question[]> => {
      const [{ buildGrammarQuestions, mergePractice }, skillRows] = await Promise.all([import('../lib/grammar/exercises'), db.skills.toArray()]);
      const lessonId = search.get('lesson');
      let practice = lessonId ? (await import('../data/grammar/lessons')).LESSONS.find((l) => l.id === lessonId)?.practice : undefined;
      if (fromBook) {
        // the grammar her imported PDFs teach, all its lessons together
        const [{ LESSONS }, { getBookGrammar }] = await Promise.all([import('../data/grammar/lessons'), import('../lib/book')]);
        const { lessonIds } = await getBookGrammar();
        practice = mergePractice(LESSONS.filter((l) => lessonIds.includes(l.id)).map((l) => l.practice)) ?? practice;
      }
      const list = (k: string) => search.get(k)?.split(',').filter(Boolean);
      return buildGrammarQuestions({
        kinds: kindsOverride ?? practice?.kinds ?? (info.types as GrammarType[]),
        length,
        tenses: (practice?.tenses ?? list('tenses')) as never,
        verbs: practice?.verbs ?? list('verbs'),
        verbSet: (search.get('verbset') as 'book' | 'core' | 'all' | null) ?? undefined,
        negations: practice?.negations,
        qforms: practice?.qforms,
        qwords: practice?.qwords,
        skills: new Map(skillRows.map((p) => [p.cardId, p])),
        level: cfg.difficulty ?? 2,
        minLevel: cfg.minLevel,
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // Build the round.
  useEffect(() => {
    let alive = true;
    (async () => {
      const daily = await db.daily.toArray();
      xpBefore.current = daily.reduce((a, d) => a + d.xp, 0);
      const today = daily.find((d) => d.day === dayKey());
      todayBefore.current = { xp: today?.xp ?? 0, practiced: (today?.answers ?? 0) > 0 };
      let qs: Question[];
      if (isGrammar) {
        qs = await grammarRound(cfg.length);
      } else {
        const pool = await loadPool(cfg);
        poolRef.current = pool;
        qs = buildQuestions(cfg, pool);
        // Daily practice also works on grammar: about a third of the questions, mostly from
        // the grammar her book teaches once she has imported one.
        if (search.get('daily') === '1' && qs.length) {
          const n = Math.max(2, Math.round(cfg.length * 0.3));
          const { getBookGrammar } = await import('../lib/book');
          const fromBook = (await getBookGrammar()).lessonIds.length ? await grammarRound(Math.ceil(n * 0.6), undefined, true) : [];
          const extra = [
            ...fromBook,
            ...(await grammarRound(n - fromBook.length, ['cloze', 'conj', 'qword', 'tense-id', 'glisten', 'negate', 'gtranslate'], false)),
          ];
          const merged = [...qs.slice(0, Math.max(0, qs.length - extra.length))];
          extra.forEach((g, i) => merged.splice(Math.min(merged.length, 2 + i * 3), 0, g));
          qs = merged;
        }
      }
      if (!alive) return;
      if (!qs.length) dispatch({ type: 'empty' });
      else {
        startedAt.current = Date.now();
        lastActivity.current = Date.now();
        dispatch({ type: 'loaded', questions: qs, introduce: introduceNew, first: MODE_BY_ID[cfg.mode].color });
      }
    })();
    return () => {
      alive = false;
      // leaving the round (or reaching the results): the last word still finishes being said
      dropQueuedSpeech();
    };
  }, [cfg, introduceNew]);

  const q = s.questions[s.index];
  const bgKey = s.colors[s.index] ?? info.color;
  const bg = paletteColor(bgKey);
  const ink = inkOn(bgKey);

  useEffect(() => {
    if (s.phase === 'ask') askedAt.current = Date.now();
  }, [s.phase, s.index]);

  useEffect(() => {
    if (q) askedIds.current.push(q.card.id);
  }, [q]);

  const persist = useCallback((card: Card, type: Question['type'], correct: boolean, ms: number) => {
    const now = Date.now();
    const activeMs = Math.min(now - lastActivity.current, 60_000);
    lastActivity.current = now;
    xpEarned.current += correct ? XP.correct : XP.wrong;
    saving.current = saving.current.then(() =>
      recordAnswer({
        sessionId: sessionId.current,
        cardId: card.id,
        type,
        correct,
        ms,
        activeMs,
        ...(card.id.startsWith('g:') ? { label: card.fr, labelEn: card.en } : {}),
      }).then((o) => {
        if (o.wasNew) newCards.current.add(card.id);
        if (o.learnedNow && !card.id.startsWith('g:')) learnedCards.current.add(card.id);
      }),
    );
  }, []);

  const onAnswer = useCallback(
    (correct: boolean, extra: AnswerInfo = {}) => {
      if (!q || s.phase !== 'ask') return;
      const ms = Date.now() - askedAt.current;
      const combo = correct ? s.combo + 1 : 0;
      const points = extra.points ?? (q.type === 'pairs' ? 0 : pointsFor(q.type, correct, ms, combo));
      if (q.type !== 'pairs') persist(q.card, q.type, correct, ms);
      if (correct) {
        sfx.correct(q.type === 'pairs' ? 4 : combo);
        haptic(25);
        if (combo > 0 && combo % 5 === 0) setTimeout(() => sfx.coin(), 260);
      } else {
        sfx.wrong();
        haptic([60, 40, 60]);
        if (survival) setTimeout(() => sfx.heartLost(), 250);
      }
      setMascotKey((k) => k + 1);
      const retry = !correct && !survival && !q.retry && s.retries < MAX_RETRIES && poolRef.current ? retryQuestion(q, poolRef.current, Math.random, cfg.difficulty) : null;
      dispatch({
        type: 'answer',
        survival,
        retry,
        result: { key: q.key, cardId: q.card.id, type: q.type, correct, ms, points, ...extra },
      });
    },
    [q, s.phase, s.combo, s.retries, survival, persist],
  );

  const onPartial = useCallback(
    (card: Card, correct: boolean, ms: number) => {
      persist(card, 'pairs', correct, ms);
      dispatch({ type: 'partial', correct });
    },
    [persist],
  );

  const finish = useCallback(
    async (completed: boolean) => {
      if (finished.current) return;
      finished.current = true;
      dispatch({ type: 'finishing' });
      await saving.current;
      const results = s.results;
      const correct = results.filter((r) => r.correct).length;
      const total = results.length;
      const perfect = completed && total > 0 && correct === total;
      const xp = xpEarned.current + (completed ? XP.finish + (perfect ? XP.perfect : 0) : 0);
      const session: Session = {
        id: sessionId.current,
        mode,
        survival,
        startedAt: startedAt.current,
        endedAt: Date.now(),
        day: dayKey(startedAt.current),
        score: s.score,
        correct,
        total,
        maxCombo: s.maxCombo,
        xp,
        newCards: newCards.current.size,
        learned: learnedCards.current.size,
        deckIds: cfg.deckIds ?? [],
        missed: [...new Set(results.filter((r) => !r.correct).map((r) => r.cardId))],
        cardIds: [...new Set(askedIds.current)],
        ...(search.get('lesson') ? { lesson: search.get('lesson')! } : {}),
      };
      if (!completed && total === 0) {
        navigate('/');
        return;
      }
      await saveSession(session, completed);
      if (!completed) {
        navigate('/');
        return;
      }
      const prevBest = await db.sessions
        .where('mode')
        .equals(mode)
        .filter((x) => x.id !== session.id && x.survival === survival)
        .toArray()
        .then((rows) => rows.reduce((m, x) => Math.max(m, x.score), 0));
      const unlocked = await checkAchievements({ session });
      const daily = await db.daily.toArray();
      const xpAfter = daily.reduce((a, d) => a + d.xp, 0);
      const todayXp = daily.find((d) => d.day === dayKey())?.xp ?? 0;
      const goal = getSettings().dailyGoal;
      const streak = computeStreak(daily);
      navigate(`/results/${session.id}`, {
        replace: true,
        state: {
          stars: starsFor(correct, total, survival),
          levelBefore: levelFromXp(xpBefore.current).level,
          levelAfter: levelFromXp(xpAfter).level,
          newRecord: session.score > prevBest && prevBest > 0,
          // history state must be structured-cloneable: ids only, no functions
          unlocked: unlocked.map((a) => a.id),
          fresh: true,
          goalReached: todayBefore.current.xp < goal && todayXp >= goal,
          streakUp: !todayBefore.current.practiced && streak.practicedToday ? streak.current : 0,
        },
      });
    },
    [s.results, s.score, s.maxCombo, mode, survival, cfg.deckIds, navigate],
  );

  const next = useCallback(() => {
    if (s.phase !== 'feedback') return;
    // no stopSpeaking() here: the pronunciation she's hearing finishes even as the next question comes up
    if (survival && s.hearts <= 0) {
      void finish(true);
      return;
    }
    if (s.index + 1 >= s.questions.length) {
      if (survival && isGrammar) {
        void grammarRound(10).then((more) => {
          if (more.length) dispatch({ type: 'next', introduce: false, more });
          else void finish(true);
        });
        return;
      }
      if (survival && poolRef.current) {
        const recent = new Set(askedIds.current.slice(-6));
        const pool = poolRef.current;
        const more = buildQuestions({ ...cfg, length: 10 }, { ...pool, cards: pool.cards.filter((c) => !recent.has(c.id)).length >= 4 ? pool.cards.filter((c) => !recent.has(c.id)) : pool.cards })
          .map((x) => ({ ...x, isNew: x.isNew && !askedIds.current.includes(x.card.id) }));
        if (more.length) {
          dispatch({ type: 'next', introduce: introduceNew, more });
          return;
        }
      }
      void finish(true);
      return;
    }
    sfx.swish();
    dispatch({ type: 'next', introduce: introduceNew });
  }, [s.phase, s.hearts, s.index, s.questions.length, survival, cfg, introduceNew, finish, isGrammar, grammarRound]);

  // Auto-advance after a correct answer.
  useEffect(() => {
    if (s.phase !== 'feedback' || !s.last?.correct) return;
    const slow = s.last.note || ['build', 'type', 'spell', 'speak'].includes(s.last.type);
    const t = setTimeout(next, slow ? 1900 : 1250);
    return () => clearTimeout(t);
  }, [s.phase, s.last, next]);

  // After answering, let her hear the French (never before: that would give the answer away).
  // Games where the French was the question itself only repeat it after a mistake.
  useEffect(() => {
    if (s.phase !== 'feedback' || !s.last || !q || q.type === 'pairs' || !getSettings().autoplay) return;
    const heardAlready = ['listen', 'pick-image', 'dictation', 'flash', 'glisten'].includes(q.type);
    if (heardAlready && s.last.correct) return;
    const t = setTimeout(() => void speak(q.card.fr, { queue: true }), 350);
    return () => clearTimeout(t);
  }, [s.phase, s.last, q]);

  useEffect(() => {
    if (s.phase !== 'feedback') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        next();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [s.phase, next]);

  if (s.status === 'loading') {
    return (
      <div className="game" style={{ background: paletteColor(info.color), color: inkOn(info.color) }}>
        <Loader />
      </div>
    );
  }

  if (s.status === 'empty') {
    return <EmptyRound mode={mode} onBack={() => navigate('/')} onAdd={() => navigate('/add')} />;
  }

  const total = survival ? null : s.questions.length;
  const progress = survival ? 0 : (s.index + (s.phase === 'feedback' ? 1 : 0)) / Math.max(1, s.questions.length);

  return (
    <div className="game" style={{ background: bg, color: ink }} data-mode={mode}>
      <div className="game-blobs" aria-hidden>
        <span />
        <span />
        <span />
      </div>
      <GameHeader
        onQuit={() => {
          sfx.tap();
          if (s.results.length === 0) {
            navigate('/');
            return;
          }
          setQuitOpen(true);
        }}
        progress={progress}
        results={s.results}
        total={total}
        survival={survival}
        hearts={s.hearts}
        maxHearts={HEARTS}
        score={s.score}
        combo={s.combo}
        multiplier={multiplier(s.combo)}
        gain={s.gain}
        ink={ink}
      />

      <div className="game-stage">
        <AnimatePresence mode="wait">
          {q && s.phase === 'intro' ? (
            <IntroCard
              key={'intro-' + q.key}
              card={q.card}
              autoplay={autoplay}
              onDone={() => {
                sfx.pop();
                dispatch({ type: 'begin', introduce: introduceNew, key: q.key });
              }}
            />
          ) : q ? (
            <motion.div
              key={q.key}
              data-qtype={q.type}
              data-phase={s.phase}
              className="q-wrap"
              initial={{ opacity: 0, x: 70, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -70, scale: 0.96, transition: { duration: 0.18 } }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            >
              {q.retry && <div className="retry-tag">Encore une fois !</div>}
              <QuestionView
                q={q}
                phase={s.phase === 'feedback' ? 'feedback' : 'ask'}
                result={s.phase === 'feedback' && s.last?.key === q.key ? s.last : undefined}
                onAnswer={onAnswer}
                onPartial={onPartial}
                ink={ink}
                autoplay={autoplay}
              />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {s.phase === 'feedback' && s.last && q && (
          <FeedbackBar
            key={'fb-' + s.last.key}
            q={q}
            result={s.last}
            combo={s.combo}
            mascotKey={mascotKey}
            onNext={next}
            lastHeart={survival && s.hearts <= 0}
          />
        )}
      </AnimatePresence>

      {s.status === 'finishing' && (
        <div className="finishing">
          <Loader label="Calcul des points…" />
        </div>
      )}

      <AnimatePresence>
        {tipOpen && s.status === 'playing' && (
          <TipBubble
            mode={mode}
            onDone={() => {
              sfx.pop();
              setTipOpen(false);
              const st = getSettings();
              useSettings.getState().update({ seenTips: { ...st.seenTips, [mode]: true } });
            }}
          />
        )}
      </AnimatePresence>

      <Sheet open={quitOpen} onClose={() => setQuitOpen(false)} label="Quit round">
        <div className="center" style={{ padding: '10px 0 4px' }}>
          <Emoji e="🥺" size={64} />
          <h2 style={{ marginTop: 10 }}>Tu pars déjà ?</h2>
          <p className="muted" style={{ margin: '6px 0 20px' }}>
            Leaving already? Your answers so far are saved.
          </p>
          <div className="row" style={{ gap: 12 }}>
            <button className="btn btn--ghost grow" onClick={() => void finish(false)}>
              Quit
            </button>
            <button className="btn btn--ok grow" onClick={() => setQuitOpen(false)}>
              Keep playing
            </button>
          </div>
        </div>
      </Sheet>
    </div>
  );
}

function EmptyRound({ mode, onBack, onAdd }: { mode: GameMode; onBack: () => void; onAdd: () => void }) {
  const info = MODE_BY_ID[mode];
  const hint: Partial<Record<GameMode, string>> = {
    'pick-image': 'This game needs words with pictures.',
    gender: 'This game needs nouns with le/la.',
    build: 'This game needs phrases or sentences.',
    spell: 'This game needs single words to spell.',
  };
  return (
    <div className="game game--empty" style={{ background: paletteColor(info.color), color: inkOn(info.color) }}>
      <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring' }} className="empty-card">
        <Emoji e="🫙" size={84} />
        <h2>Rien à jouer ici… pour l’instant !</h2>
        <p>
          Nothing to play in these themes yet. {hint[mode] ?? ''} Pick other themes, or add some words of your own.
        </p>
        <div className="row" style={{ gap: 10, marginTop: 18, justifyContent: 'center' }}>
          <button className="btn btn--ghost" onClick={onBack}>
            Back
          </button>
          <button className="btn btn--ok" onClick={onAdd}>
            Add words
          </button>
        </div>
      </motion.div>
    </div>
  );
}
