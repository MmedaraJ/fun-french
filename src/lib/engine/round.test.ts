import { describe, expect, it } from 'vitest';
import type { Card, Progress } from '../../types';
import { DAY } from '../date';
import { buildQuestions, canAsk, chooseType, makeQuestion, pickCards, pickDistractors, type Pool } from './round';

let n = 0;
function card(fr: string, en: string, extra: Partial<Card> = {}): Card {
  n++;
  return {
    id: 'c' + n,
    deckId: extra.deckId ?? 'd1',
    kind: 'word',
    fr,
    en,
    source: 'starter',
    order: n,
    createdAt: 0,
    updatedAt: 0,
    ...extra,
  };
}

function seeded(seed = 42) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const animals = [
  card('le chat', 'cat', { gender: 'm', emoji: '🐈' }),
  card('le chien', 'dog', { gender: 'm', emoji: '🐕' }),
  card('la vache', 'cow', { gender: 'f', emoji: '🐄' }),
  card('le cheval', 'horse', { gender: 'm', emoji: '🐎' }),
  card("l'oiseau", 'bird', { gender: 'm', emoji: '🐦' }),
  card('la souris', 'mouse', { gender: 'f', emoji: '🐁' }),
  card('le lapin', 'rabbit', { gender: 'm', emoji: '🐇' }),
  card('le cochon', 'pig', { gender: 'm', emoji: '🐖' }),
];
const sentences = [
  card("Je m'appelle Marie.", 'My name is Marie.', { kind: 'sentence', deckId: 'd2' }),
  card("J'aime le chocolat.", 'I like chocolate.', { kind: 'sentence', deckId: 'd2' }),
  card('Il fait beau aujourd\'hui.', 'The weather is nice today.', { kind: 'sentence', deckId: 'd2' }),
  card('Où sont les toilettes ?', 'Where is the bathroom?', { kind: 'sentence', deckId: 'd2' }),
];
const all = [...animals, ...sentences];
const pool = (cards = all, progress = new Map<string, Progress>()): Pool => ({ cards, all, progress });

describe('canAsk', () => {
  it('matches question types to cards', () => {
    expect(canAsk('pick-image', animals[0])).toBe(true);
    expect(canAsk('pick-image', sentences[0])).toBe(false);
    expect(canAsk('gender', animals[4])).toBe(true);
    expect(canAsk('gender', card('les lunettes', 'glasses', { gender: 'f', plural: true }))).toBe(false);
    expect(canAsk('build', sentences[0])).toBe(true);
    expect(canAsk('build', animals[0])).toBe(false);
    expect(canAsk('spell', animals[0])).toBe(true);
  });
});

describe('pickDistractors', () => {
  it('returns distinct wrong answers with distinct pictures', () => {
    const d = pickDistractors(animals[0], all, 3, 'image', seeded());
    expect(d).toHaveLength(3);
    expect(d.map((c) => c.id)).not.toContain(animals[0].id);
    expect(new Set(d.map((c) => c.emoji)).size).toBe(3);
    expect(d.every((c) => c.emoji)).toBe(true);
  });
  it('never offers a wrong answer drawn with the same picture', () => {
    const bakery = card('la boulangerie', 'bakery', { emoji: '🥖', deckId: 'd1' });
    const bread = card('la baguette', 'baguette', { emoji: '🥖', deckId: 'd1' });
    for (let i = 1; i < 20; i++) {
      const d = pickDistractors(bread, [...all, bakery, bread], 7, 'fr', seeded(i));
      expect(d.map((c) => c.id)).not.toContain(bakery.id);
    }
  });
  it('never offers a card with the same meaning', () => {
    const twin = card('le minou', 'cat', { emoji: '🐱' });
    const d = pickDistractors(animals[0], [...all, twin], 7, 'fr', seeded());
    expect(d.map((c) => c.id)).not.toContain(twin.id);
  });
});

describe('makeQuestion', () => {
  it('builds a 4-option picture question containing the answer', () => {
    const q = makeQuestion('pick-image', animals[1], pool(), { isNew: false }, seeded())!;
    expect(q.options).toHaveLength(4);
    expect(q.options!.map((c) => c.id)).toContain(animals[1].id);
  });
  it('builds spelling slots without the article', () => {
    const q = makeQuestion('spell', animals[4], pool(), { isNew: false }, seeded())!;
    expect(q.article).toBe("l'");
    expect(q.slots!.map((s) => s.char).join('')).toBe('oiseau');
    // every letter of the word is in the pool, plus one decoy for a 6-letter word
    const rest = [...q.letters!];
    for (const ch of 'oiseau') rest.splice(rest.indexOf(ch), 1);
    expect(rest).toHaveLength(1);
    expect('oiseau').not.toContain(rest[0]);
    expect(q.letters!.join('')).not.toBe('oiseau');
  });
  it('builds sentence tiles that contain the answer plus decoys', () => {
    const q = makeQuestion('build', sentences[1], pool(), { isNew: false }, seeded())!;
    expect(q.answer).toEqual(["J'aime", 'le', 'chocolat']);
    for (const t of q.answer!) expect(q.tiles).toContain(t);
    expect(q.tiles!.length).toBeGreaterThanOrEqual(q.answer!.length);
  });
});

describe('pickCards', () => {
  it('puts overdue cards first and limits new cards when there is enough to review', () => {
    const now = 10 * DAY;
    const progress = new Map<string, Progress>();
    animals.slice(0, 6).forEach((c, i) =>
      progress.set(c.id, { cardId: c.id, box: 2, due: now - (i + 1) * DAY, seen: 3, correct: 3, wrong: 0, lapses: 0, streak: 3, firstSeen: 0, lastSeen: 0 }),
    );
    const picked = pickCards(animals, progress, 5, 1, now, seeded());
    expect(picked).toHaveLength(5);
    expect(picked.filter((p) => p.isNew)).toHaveLength(1);
    // most overdue (6 days) comes first
    expect(picked[0].card.id).toBe(animals[5].id);
  });
  it('fills a round for a brand new learner', () => {
    const picked = pickCards(animals, new Map(), 6, 3, Date.now(), seeded());
    expect(picked).toHaveLength(6);
    expect(new Set(picked.map((p) => p.card.id)).size).toBe(6);
  });
  it('prefers the learner\'s own new words', () => {
    const mine = card('la tasse', 'cup', { source: 'manual', emoji: '☕', createdAt: 5 });
    const picked = pickCards([...animals, mine], new Map(), 3, 1, Date.now(), seeded());
    expect(picked.find((p) => p.isNew)!.card.id).toBe(mine.id);
  });
});

describe('chooseType', () => {
  it('only returns usable types', () => {
    for (let i = 0; i < 30; i++) {
      const t = chooseType(sentences[0], ['pick-image', 'build', 'gender', 'spell'], 0, true, seeded(i + 1));
      expect(t).toBe('build');
    }
  });
});

describe('buildQuestions', () => {
  it('builds a full mixed round with no back-to-back repeats', () => {
    const qs = buildQuestions({ mode: 'mix', length: 10, newPerRound: 3 }, pool(), seeded(7));
    expect(qs).toHaveLength(10);
    for (let i = 1; i < qs.length; i++) expect(qs[i].card.id === qs[i - 1].card.id).toBe(false);
  });
  it('repeats cards when the deck is small', () => {
    const small = animals.slice(0, 4);
    const qs = buildQuestions({ mode: 'pick-image', length: 8, newPerRound: 3 }, pool(small), seeded(3));
    expect(qs).toHaveLength(8);
    expect(qs.filter((q) => q.isNew).length).toBeLessThanOrEqual(4);
  });
  it('returns nothing when no card fits the mode', () => {
    const qs = buildQuestions({ mode: 'build', length: 10, newPerRound: 3 }, pool(animals), seeded());
    expect(qs).toHaveLength(0);
  });
  it('makes pairs boards', () => {
    const qs = buildQuestions({ mode: 'pairs', length: 10, newPerRound: 3 }, pool(), seeded());
    expect(qs.length).toBeGreaterThan(0);
    expect(qs[0].pairs!.length).toBeGreaterThanOrEqual(3);
  });
});
