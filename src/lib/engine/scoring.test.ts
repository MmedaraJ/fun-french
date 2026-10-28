import { describe, expect, it } from 'vitest';
import { levelFromXp, levelName, multiplier, pointsFor, sessionXp, starsFor, xpForLevel } from './scoring';

describe('scoring', () => {
  it('multiplies with the combo', () => {
    expect([1, 2, 3, 5, 6, 9, 10, 30].map(multiplier)).toEqual([1, 1, 2, 2, 3, 3, 4, 4]);
  });
  it('gives speed bonus and nothing for wrong answers', () => {
    expect(pointsFor('pick-image', false, 500, 1)).toBe(0);
    expect(pointsFor('pick-image', true, 500, 1)).toBe(150);
    expect(pointsFor('pick-image', true, 60_000, 1)).toBe(100);
    expect(pointsFor('pick-image', true, 500, 3)).toBe(300);
    expect(pointsFor('flash', true, 500, 1)).toBe(130);
  });
  it('computes session XP with completion and perfect bonuses', () => {
    expect(sessionXp(10, 0, true)).toBe(100 + 20 + 30);
    expect(sessionXp(8, 2, true)).toBe(80 + 4 + 20);
    expect(sessionXp(3, 1, false)).toBe(32);
  });
  it('awards stars by accuracy', () => {
    expect(starsFor(10, 10, false)).toBe(3);
    expect(starsFor(7, 10, false)).toBe(2);
    expect(starsFor(4, 10, false)).toBe(1);
    expect(starsFor(1, 10, false)).toBe(0);
    expect(starsFor(30, 33, true)).toBe(3);
  });
  it('maps XP to levels', () => {
    expect(xpForLevel(1)).toBe(0);
    expect(xpForLevel(2)).toBe(100);
    expect(levelFromXp(0).level).toBe(1);
    expect(levelFromXp(99).level).toBe(1);
    expect(levelFromXp(100).level).toBe(2);
    const l = levelFromXp(450);
    expect(l.level).toBe(3);
    expect(l.into).toBe(150);
    expect(l.span).toBe(300);
    expect(levelName(1, 'f')).toBe('Débutante');
    expect(levelName(1, 'm')).toBe('Débutant');
  });
});
