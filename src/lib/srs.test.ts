import { describe, expect, it } from 'vitest';
import { DAY, MINUTE } from './date';
import { applyAnswer, INTERVALS, LEARNED_BOX, MASTERED_BOX, statusOf } from './srs';

describe('applyAnswer', () => {
  const t0 = 1_700_000_000_000;

  it('moves a new card to box 1 and schedules it soon', () => {
    const p = applyAnswer(undefined, 'c1', true, t0);
    expect(p.box).toBe(1);
    expect(p.due).toBe(t0 + INTERVALS[1]);
    expect(statusOf(p)).toBe('learning');
  });

  it('does not promote a card answered again before it is due', () => {
    const p1 = applyAnswer(undefined, 'c1', true, t0);
    const p2 = applyAnswer(p1, 'c1', true, t0 + MINUTE);
    expect(p2.box).toBe(1);
    expect(p2.correct).toBe(2);
    expect(p2.streak).toBe(2);
  });

  it('climbs through the boxes when reviewed on time and marks learned/mastered', () => {
    let t = t0;
    let p = applyAnswer(undefined, 'c1', true, t);
    for (let i = 0; i < 6; i++) {
      t = p.due + 1;
      p = applyAnswer(p, 'c1', true, t);
    }
    expect(p.box).toBe(6);
    expect(p.learnedAt).toBeDefined();
    expect(p.masteredAt).toBeDefined();
    expect(statusOf(p)).toBe('mastered');
  });

  it('drops a known card back two boxes on a miss and counts a lapse', () => {
    let p = applyAnswer(undefined, 'c1', true, t0);
    p = { ...p, box: 4, due: t0 };
    const miss = applyAnswer(p, 'c1', false, t0 + DAY);
    expect(miss.box).toBe(2);
    expect(miss.lapses).toBe(1);
    expect(miss.streak).toBe(0);
    expect(miss.due).toBeLessThan(t0 + DAY + 10 * MINUTE);
  });

  it('never lets a missed card fall below box 1', () => {
    const p = applyAnswer(undefined, 'c1', false, t0);
    expect(p.box).toBe(1);
    expect(p.wrong).toBe(1);
  });

  it('exports sensible thresholds', () => {
    expect(LEARNED_BOX).toBeLessThan(MASTERED_BOX);
  });
});
