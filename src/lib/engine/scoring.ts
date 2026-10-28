import type { QuestionType } from '../../types';

/** [fast, slow] response times in ms: full speed bonus under `fast`, none past `slow`. */
const SPEED: Record<QuestionType, [number, number]> = {
  'pick-image': [1800, 7000],
  'pick-word': [2000, 8000],
  listen: [2200, 8000],
  gender: [1200, 5000],
  spell: [4000, 16000],
  build: [5000, 22000],
  type: [5000, 22000],
  speak: [2500, 10000],
  flash: [0, 0],
  pairs: [0, 0],
};

export const BASE_POINTS = 100;
export const MAX_SPEED_BONUS = 50;

export function multiplier(combo: number): number {
  if (combo >= 10) return 4;
  if (combo >= 6) return 3;
  if (combo >= 3) return 2;
  return 1;
}

/** Points for an answer; `combo` already includes this answer. */
export function pointsFor(type: QuestionType, correct: boolean, ms: number, combo: number): number {
  if (!correct) return 0;
  const [fast, slow] = SPEED[type];
  const speed = slow > fast ? Math.max(0, Math.min(1, 1 - (ms - fast) / (slow - fast))) : 0.5;
  const raw = (BASE_POINTS + speed * MAX_SPEED_BONUS) * multiplier(combo);
  return Math.round(raw / 10) * 10;
}

export const XP = { correct: 10, wrong: 2, finish: 20, perfect: 30 };

export function sessionXp(correct: number, wrong: number, finished: boolean): number {
  const perfect = finished && wrong === 0 && correct > 0;
  return correct * XP.correct + wrong * XP.wrong + (finished ? XP.finish : 0) + (perfect ? XP.perfect : 0);
}

/** 0-3 stars for a finished round. */
export function starsFor(correct: number, total: number, survival: boolean): number {
  if (survival) return correct >= 25 ? 3 : correct >= 12 ? 2 : correct >= 4 ? 1 : 0;
  if (!total) return 0;
  const acc = correct / total;
  return acc >= 0.9 ? 3 : acc >= 0.7 ? 2 : acc >= 0.4 ? 1 : 0;
}

/** Total XP needed to reach a level (level 1 = 0 XP). */
export function xpForLevel(level: number): number {
  return 50 * level * (level - 1);
}

export function levelFromXp(xp: number): { level: number; into: number; span: number; progress: number } {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) level++;
  const start = xpForLevel(level);
  const span = xpForLevel(level + 1) - start;
  return { level, into: xp - start, span, progress: (xp - start) / span };
}

const LEVEL_NAMES = [
  'Débutant',
  'Curieux',
  'Apprenti',
  'Bavard',
  'Gourmet',
  'Flâneur',
  'Parisien',
  'Poète',
  'Virtuose',
  'Maestro',
  'Légende',
];
const LEVEL_NAMES_F = [
  'Débutante',
  'Curieuse',
  'Apprentie',
  'Bavarde',
  'Gourmette',
  'Flâneuse',
  'Parisienne',
  'Poétesse',
  'Virtuose',
  'Maestra',
  'Légende',
];

export function levelName(level: number, agreement: 'f' | 'm' = 'f'): string {
  const names = agreement === 'm' ? LEVEL_NAMES : LEVEL_NAMES_F;
  return names[Math.min(names.length - 1, Math.floor((level - 1) / 2))];
}
