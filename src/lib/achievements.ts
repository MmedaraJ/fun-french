import type { Card, DailyStat, Progress, Session } from '../types';
import { dayKey } from './date';
import { db } from './db';
import { MODES } from './engine/modes';
import { modeShown } from './level';
import { LEARNED_BOX, MASTERED_BOX } from './srs';
import { g, settings } from './settings';
import { computeStreak, sumXp } from './stats';

export interface AchCtx {
  session?: Session;
  sessions: Session[];
  daily: DailyStat[];
  progress: Progress[];
  cards: Card[];
  /** Grammar skills. */
  skills: Progress[];
}

export interface AchievementDef {
  id: string;
  emoji: string;
  title: () => string;
  desc: string;
  /** Hidden until unlocked. */
  secret?: boolean;
  test: (c: AchCtx) => boolean;
}

const learned = (c: AchCtx) => c.progress.filter((p) => p.box >= LEARNED_BOX || p.learnedAt).length;
const mastered = (c: AchCtx) => c.progress.filter((p) => p.box >= MASTERED_BOX || p.masteredAt).length;
const own = (c: AchCtx) => c.cards.filter((x) => x.source !== 'starter').length;
const streakBest = (c: AchCtx) => computeStreak(c.daily).best;
const perfect = (s?: Session, min = 5) => !!s && !s.survival && s.total >= min && s.correct === s.total;
const hourOf = (s?: Session) => (s ? new Date(s.endedAt).getHours() : -1);
const GRAMMAR_MODES = ['conjugaison', 'temps', 'questions', 'grammaire'];
const rightIn = (c: AchCtx, mode: string) => c.sessions.filter((s) => s.mode === mode).reduce((a, s) => a + s.correct, 0);
const tenseDone = (c: AchCtx, t: string) => c.skills.some((p) => p.correct > 0 && (p.cardId === `g:conj:${t}` || p.cardId === `g:tense:${t}` || p.cardId === `g:id:${t}` || p.cardId === `g:listen:${t}`));
const ALL_TENSES = ['present', 'passe_compose', 'imparfait', 'plus_que_parfait', 'passe_simple', 'futur_simple', 'futur_anterieur', 'futur_proche', 'passe_recent', 'conditionnel_present', 'conditionnel_passe', 'subjonctif_present', 'subjonctif_passe', 'imperatif'];

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first-round', emoji: '👣', title: () => 'Premier pas', desc: 'Finish your first round.', test: (c) => c.sessions.length >= 1 },
  { id: 'perfect', emoji: '💯', title: () => 'Sans faute', desc: 'A perfect round, every answer right.', test: (c) => perfect(c.session) },
  { id: 'combo-10', emoji: '🔥', title: () => 'En feu', desc: '10 right answers in a row.', test: (c) => c.sessions.some((s) => s.maxCombo >= 10) },
  { id: 'combo-25', emoji: '🚀', title: () => g('Inarrêtable', 'Inarrêtable'), desc: '25 right answers in a row.', test: (c) => c.sessions.some((s) => s.maxCombo >= 25) },
  { id: 'streak-3', emoji: '📅', title: () => 'Bonne habitude', desc: 'Practise 3 days in a row.', test: (c) => streakBest(c) >= 3 },
  { id: 'streak-7', emoji: '🗓️', title: () => 'Une semaine !', desc: 'Practise 7 days in a row.', test: (c) => streakBest(c) >= 7 },
  { id: 'streak-30', emoji: '🏅', title: () => 'Un mois entier', desc: 'Practise 30 days in a row.', test: (c) => streakBest(c) >= 30 },
  { id: 'learned-10', emoji: '🌱', title: () => 'Dix mots', desc: 'Learn 10 words.', test: (c) => learned(c) >= 10 },
  { id: 'learned-50', emoji: '🌿', title: () => 'Cinquante !', desc: 'Learn 50 words.', test: (c) => learned(c) >= 50 },
  { id: 'learned-150', emoji: '🌳', title: () => 'Vocabulaire', desc: 'Learn 150 words.', test: (c) => learned(c) >= 150 },
  { id: 'learned-400', emoji: '📚', title: () => 'Dictionnaire vivant', desc: 'Learn 400 words.', test: (c) => learned(c) >= 400 },
  { id: 'mastered-25', emoji: '🎓', title: () => 'Maîtrise', desc: 'Master 25 words (long-term memory!).', test: (c) => mastered(c) >= 25 },
  { id: 'mastered-100', emoji: '🧠', title: () => 'Mémoire d’éléphant', desc: 'Master 100 words.', test: (c) => mastered(c) >= 100 },
  { id: 'own-1', emoji: '✍️', title: () => 'Mon premier mot', desc: 'Add a word of your own.', test: (c) => own(c) >= 1 },
  { id: 'own-25', emoji: '🧺', title: () => g('Collectionneur', 'Collectionneuse'), desc: 'Add 25 words or phrases of your own.', test: (c) => own(c) >= 25 },
  { id: 'own-100', emoji: '🏛️', title: () => 'Musée des mots', desc: 'Add 100 words or phrases of your own.', test: (c) => own(c) >= 100 },
  { id: 'photo-1', emoji: '📸', title: () => g('Photographe', 'Photographe'), desc: 'Turn one of your photos into a card.', test: (c) => c.cards.some((x) => !!x.imageId) },
  { id: 'all-modes', emoji: '🎪', title: () => 'Touche-à-tout', desc: 'Play every game at least once.', test: (c) => MODES.filter((m) => m.needs !== 'recognition' && modeShown(m, settings().minLevel)).every((m) => c.sessions.some((s) => s.mode === m.id)) },
  { id: 'survival-20', emoji: '❤️‍🔥', title: () => g('Survivant', 'Survivante'), desc: 'Get 20 right in a Survie round.', test: (c) => c.sessions.some((s) => s.survival && s.correct >= 20) },
  { id: 'score-3000', emoji: '🏆', title: () => 'Grand score', desc: 'Score 3,000 points in one round.', test: (c) => c.sessions.some((s) => s.score >= 3000) },
  { id: 'gender-perfect', emoji: '👑', title: () => g('Le roi du le/la', 'La reine du le/la'), desc: 'A perfect “Le ou la ?” round.', test: (c) => c.session?.mode === 'gender' && perfect(c.session) },
  { id: 'spell-perfect', emoji: '✏️', title: () => 'Orthographe parfaite', desc: 'A perfect spelling round.', test: (c) => c.session?.mode === 'spell' && perfect(c.session) },
  { id: 'listen-perfect', emoji: '👂', title: () => 'Oreille d’or', desc: 'A perfect listening round.', test: (c) => c.session?.mode === 'listen' && perfect(c.session) },
  { id: 'speak-10', emoji: '🗣️', title: () => g('Bavard', 'Bavarde'), desc: 'Say 10 words right in “Parle !”.', test: (c) => c.sessions.filter((s) => s.mode === 'speak').reduce((a, s) => a + s.correct, 0) >= 10 },
  { id: 'grammar-first', emoji: '📘', title: () => 'Première leçon', desc: 'Finish your first grammar round.', test: (c) => c.sessions.some((s) => GRAMMAR_MODES.includes(s.mode)) },
  { id: 'conj-50', emoji: '🔁', title: () => g('Conjugueur', 'Conjugueuse'), desc: 'Get 50 right in “Conjugaison”.', test: (c) => rightIn(c, 'conjugaison') >= 50 },
  { id: 'questions-30', emoji: '❓', title: () => g('Curieux', 'Curieuse'), desc: 'Get 30 right in “Questions”.', test: (c) => rightIn(c, 'questions') >= 30 },
  { id: 'lessons-5', emoji: '🎓', title: () => g('Bon élève', 'Bonne élève'), desc: 'Practise 5 different grammar lessons.', test: (c) => new Set(c.sessions.map((s) => s.lesson).filter(Boolean)).size >= 5 },
  { id: 'all-tenses', emoji: '⏳', title: () => g('Maître du temps', 'Maîtresse du temps'), desc: 'Get every one of the 14 tenses right at least once.', test: (c) => ALL_TENSES.every((t) => tenseDone(c, t)) },
  { id: 'marathon', emoji: '🏃', title: () => 'Marathon', desc: 'Finish 5 rounds in one day.', test: (c) => c.daily.some((d) => d.sessions >= 5) },
  { id: 'xp-1000', emoji: '💎', title: () => 'Mille XP', desc: 'Earn 1,000 XP in total.', test: (c) => sumXp(c.daily) >= 1000 },
  { id: 'xp-10000', emoji: '👸', title: () => g('Grand maître', 'Grande maîtresse'), desc: 'Earn 10,000 XP in total.', test: (c) => sumXp(c.daily) >= 10000 },
  { id: 'night-owl', emoji: '🦉', title: () => 'Oiseau de nuit', desc: 'Finish a round after 10 pm.', secret: true, test: (c) => hourOf(c.session) >= 22 || (hourOf(c.session) >= 0 && hourOf(c.session) < 4) },
  { id: 'early-bird', emoji: '🐓', title: () => g('Lève-tôt', 'Lève-tôt'), desc: 'Finish a round before 7 am.', secret: true, test: (c) => hourOf(c.session) >= 4 && hourOf(c.session) < 7 },
  {
    id: 'comeback',
    emoji: '🌈',
    title: () => 'Le grand retour',
    desc: 'Come back after a week away.',
    secret: true,
    test: (c) => {
      if (!c.session) return false;
      const days = [...new Set(c.daily.filter((d) => d.answers > 0).map((d) => d.day))].sort();
      const today = dayKey(c.session.endedAt);
      const before = days.filter((d) => d < today);
      if (!before.length) return false;
      const last = new Date(before[before.length - 1]).getTime();
      return new Date(today).getTime() - last >= 7 * 86400000;
    },
  },
];

export const ACHIEVEMENT_BY_ID = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));

async function loadCtx(session?: Session): Promise<AchCtx> {
  const [sessions, daily, progress, cards, skills] = await Promise.all([db.sessions.toArray(), db.daily.toArray(), db.progress.toArray(), db.cards.toArray(), db.skills.toArray()]);
  return { session, sessions: sessions.filter((s) => s.total > 0), daily, progress, cards, skills };
}

/** Tests every locked achievement; stores and returns the newly unlocked ones. */
export async function checkAchievements(opts: { session?: Session } = {}): Promise<AchievementDef[]> {
  const ctx = await loadCtx(opts.session);
  const unlocked = new Set((await db.unlocked.toArray()).map((u) => u.id));
  const fresh = ACHIEVEMENTS.filter((a) => !unlocked.has(a.id)).filter((a) => {
    try {
      return a.test(ctx);
    } catch {
      return false;
    }
  });
  if (fresh.length) {
    const now = Date.now();
    await db.unlocked.bulkPut(fresh.map((a) => ({ id: a.id, unlockedAt: now })));
  }
  return fresh;
}
