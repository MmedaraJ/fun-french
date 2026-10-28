import { describe, expect, it } from 'vitest';
import { DAY, MINUTE } from './date';
import { applyAnswer, applySkillAnswer, INTERVALS, LEARNED_BOX, MASTERED_BOX, SKILL_STREAK, statusOf } from './srs';

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

  it('an early right answer keeps the due time, so a word practised every few minutes still gets learned', () => {
    const p1 = applyAnswer(undefined, 'c1', true, t0);
    const p2 = applyAnswer(p1, 'c1', true, t0 + 5 * MINUTE);
    const p3 = applyAnswer(p2, 'c1', true, t0 + 9 * MINUTE);
    expect(p3.due).toBe(p1.due);
    const p4 = applyAnswer(p3, 'c1', true, t0 + 11 * MINUTE);
    expect(p4.box).toBe(LEARNED_BOX);
    expect(statusOf(p4)).toBe('learned');
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

describe('applySkillAnswer', () => {
  const t0 = 1_700_000_000_000;

  it('a run of right answers in one round moves a grammar skill up', () => {
    let p = applySkillAnswer(undefined, 'g:tense:imparfait', true, t0);
    expect(p.box).toBe(1);
    for (let i = 1; i < SKILL_STREAK; i++) p = applySkillAnswer(p, 'g:tense:imparfait', true, t0 + i * 1000);
    expect(p.box).toBe(2);
    expect(statusOf(p)).toBe('learned');
  });

  it('a miss costs one box, never below 1', () => {
    let p = applySkillAnswer(undefined, 'g:neg:pas', true, t0);
    p = { ...p, box: 3 };
    p = applySkillAnswer(p, 'g:neg:pas', false, t0 + 1000);
    expect(p.box).toBe(2);
    expect(p.streak).toBe(0);
    p = applySkillAnswer({ ...p, box: 1 }, 'g:neg:pas', false, t0 + 2000);
    expect(p.box).toBe(1);
  });

  it('mastery needs a review on a later day, not just a long streak', () => {
    let p = applySkillAnswer(undefined, 'g:qf:inversion', true, t0);
    for (let i = 1; i < 40; i++) p = applySkillAnswer(p, 'g:qf:inversion', true, t0 + i * 1000);
    expect(p.box).toBe(MASTERED_BOX - 1);
    p = applySkillAnswer(p, 'g:qf:inversion', true, p.due + 1);
    expect(p.box).toBe(MASTERED_BOX);
  });
});
