import { describe, expect, it } from 'vitest';
import { computeStreak, lastNDays } from './stats';

const d = (day: string, answers = 5) => ({ day, answers });

describe('computeStreak', () => {
  it('counts consecutive days ending today', () => {
    const s = computeStreak([d('2026-03-01'), d('2026-03-02'), d('2026-03-03')], '2026-03-03');
    expect(s).toEqual({ current: 3, best: 3, practicedToday: true, atRisk: false });
  });
  it('keeps yesterday\'s streak alive but at risk', () => {
    const s = computeStreak([d('2026-03-01'), d('2026-03-02')], '2026-03-03');
    expect(s.current).toBe(2);
    expect(s.atRisk).toBe(true);
  });
  it('resets after a missed day and remembers the best run', () => {
    const s = computeStreak([d('2026-02-01'), d('2026-02-02'), d('2026-02-03'), d('2026-02-04'), d('2026-03-03')], '2026-03-03');
    expect(s.current).toBe(1);
    expect(s.best).toBe(4);
  });
  it('ignores days without answers and crosses month ends', () => {
    const s = computeStreak([d('2026-02-27'), d('2026-02-28'), d('2026-03-01'), d('2026-03-02', 0)], '2026-03-02');
    expect(s.current).toBe(3);
    expect(s.practicedToday).toBe(false);
  });
});

describe('lastNDays', () => {
  it('fills gaps', () => {
    const out = lastNDays([{ day: '2026-03-02', xp: 40, answers: 4, correct: 3, ms: 0, sessions: 1, newCards: 1 }], 3, '2026-03-03');
    expect(out.map((x) => x.day)).toEqual(['2026-03-01', '2026-03-02', '2026-03-03']);
    expect(out.map((x) => x.xp)).toEqual([0, 40, 0]);
  });
});
