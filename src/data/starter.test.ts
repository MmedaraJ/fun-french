import { describe, expect, it } from 'vitest';
// @types/node is not part of this project's tsconfig; vitest runs this file in Node, where these exist.
// @ts-ignore
import { existsSync } from 'node:fs';
import type { CardKind, PaletteKey, StarterCard, StarterDeck } from '../types';
import { STARTER_DECKS } from './starter';

declare const process: { cwd(): string };

const COLORS: PaletteKey[] = ['berry', 'tangerine', 'sunshine', 'leaf', 'lagoon', 'sky', 'grape', 'plum'];
const KINDS: CardKind[] = ['word', 'phrase', 'sentence'];
const TWEMOJI_DIR = `${process.cwd()}/node_modules/@twemoji/svg`;

const ZWJ = '‍';
const VS16 = /️/g;
const SKIN_TONE = /[\u{1F3FB}-\u{1F3FF}]/u;

function codepoints(s: string): string {
  return [...s].map((c) => c.codePointAt(0)!.toString(16)).join('-');
}

/** Twemoji file for an emoji: keep FE0F only inside ZWJ sequences, else try without any FE0F. */
function twemojiFile(emoji: string): string | null {
  const primary = codepoints(emoji.includes(ZWJ) ? emoji : emoji.replace(VS16, ''));
  if (existsSync(`${TWEMOJI_DIR}/${primary}.svg`)) return primary;
  const fallback = codepoints(emoji.replace(VS16, ''));
  if (existsSync(`${TWEMOJI_DIR}/${fallback}.svg`)) return fallback;
  return null;
}

function graphemes(s: string): number {
  return [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(s)].length;
}

const kindOf = (deck: StarterDeck, card: StarterCard): CardKind => card.kind ?? deck.kind;
const allCards = STARTER_DECKS.flatMap((deck) => deck.cards.map((card) => ({ deck, card })));
const label = (deck: StarterDeck, card: StarterCard) => `${deck.id}: "${card.fr}"`;

describe('starter decks', () => {
  it('have unique ids and valid metadata', () => {
    const ids = STARTER_DECKS.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const deck of STARTER_DECKS) {
      expect(deck.id, deck.id).toMatch(/^[a-z][a-z0-9-]*$/);
      expect(deck.name.trim(), deck.id).not.toBe('');
      expect(deck.nameEn.trim(), deck.id).not.toBe('');
      expect(COLORS, deck.id).toContain(deck.color);
      expect(Number.isInteger(deck.level) && deck.level >= 1 && deck.level <= 3, `${deck.id} level`).toBe(true);
      expect(KINDS, deck.id).toContain(deck.kind);
      expect(deck.cards.length, deck.id).toBeGreaterThanOrEqual(10);
    }
  });

  it('use a different colour from the neighbouring deck', () => {
    for (let i = 1; i < STARTER_DECKS.length; i++) {
      expect(STARTER_DECKS[i].color, STARTER_DECKS[i].id).not.toBe(STARTER_DECKS[i - 1].color);
    }
  });

  it('have deck emoji that Twemoji can draw', () => {
    for (const deck of STARTER_DECKS) {
      expect(graphemes(deck.emoji), deck.id).toBe(1);
      expect(SKIN_TONE.test(deck.emoji), deck.id).toBe(false);
      expect(twemojiFile(deck.emoji), `${deck.id} ${deck.emoji}`).not.toBeNull();
    }
  });

  it('contain at least 550 cards in total', () => {
    expect(allCards.length).toBeGreaterThanOrEqual(550);
  });
});

describe('starter cards: text', () => {
  const texts = (card: StarterCard) =>
    [
      ['fr', card.fr],
      ['en', card.en],
      ['note', card.note],
    ].filter((t): t is [string, string] => t[1] !== undefined);

  it('have clean, non-empty fr / en / note strings', () => {
    for (const { deck, card } of allCards) {
      for (const [field, text] of texts(card)) {
        const where = `${label(deck, card)} ${field}`;
        expect(text.length, where).toBeGreaterThan(0);
        expect(text, where).toBe(text.trim());
        expect(text, where).not.toMatch(/[‘’ʼ`´]/); // straight apostrophes only
        expect(text, where).not.toMatch(/ {2}/);
        expect(text, where).not.toMatch(/[\t\n  ]/);
      }
    }
  });

  it('only use valid kinds and gender values', () => {
    for (const { deck, card } of allCards) {
      if (card.kind !== undefined) expect(KINDS, label(deck, card)).toContain(card.kind);
      if (card.g !== undefined) expect(['m', 'f'], label(deck, card)).toContain(card.g);
      if (card.g !== undefined || card.pl) expect(kindOf(deck, card), label(deck, card)).toBe('word');
    }
  });

  it('follow French spacing: a space before ? and !, none before . or ,', () => {
    for (const { deck, card } of allCards) {
      expect(card.fr, label(deck, card)).not.toMatch(/[^ ][?!]/);
      expect(card.fr, label(deck, card)).not.toMatch(/ [.,]/);
      expect(card.fr, label(deck, card)).not.toMatch(/[?!](?! |$)/);
    }
  });

  it('end every sentence with . ? or !', () => {
    for (const { deck, card } of allCards) {
      if (kindOf(deck, card) === 'sentence') expect(card.fr, label(deck, card)).toMatch(/[.?!]$/);
    }
  });

  it('keep "Petites phrases" to 3-9 words for the sentence builder', () => {
    const deck = STARTER_DECKS.find((d) => d.id === 'sentences');
    expect(deck).toBeDefined();
    for (const card of deck!.cards) {
      const words = card.fr.split(' ').filter((w) => /\p{L}/u.test(w));
      expect(words.length, card.fr).toBeGreaterThanOrEqual(3);
      expect(words.length, card.fr).toBeLessThanOrEqual(9);
    }
  });

  it('have no duplicate French text within a deck', () => {
    for (const deck of STARTER_DECKS) {
      const seen = new Set<string>();
      for (const card of deck.cards) {
        const key = card.fr.toLowerCase();
        expect(seen.has(key), `${deck.id}: duplicate "${card.fr}"`).toBe(false);
        seen.add(key);
      }
    }
  });
});

describe('starter cards: nouns', () => {
  const nouns = allCards.filter(({ card }) => /^(le |la |les |l')/.test(card.fr));

  it('are recognised in the data set', () => {
    expect(nouns.length).toBeGreaterThan(300);
  });

  it('always carry a gender that matches the article', () => {
    for (const { deck, card } of nouns) {
      const where = label(deck, card);
      expect(card.g, where).toBeDefined();
      if (card.fr.startsWith('le ')) expect(card.g, where).toBe('m');
      if (card.fr.startsWith('la ')) expect(card.g, where).toBe('f');
      if (card.fr.startsWith('les ')) expect(card.pl, where).toBe(true);
    }
  });

  it('mark plural only on "les" nouns', () => {
    for (const { deck, card } of allCards) {
      if (card.pl) expect(card.fr.startsWith('les '), label(deck, card)).toBe(true);
    }
  });

  it('elide the article before a vowel', () => {
    // "le yoga", "le hibou" keep their article: y and aspirated h are not checked here.
    for (const { deck, card } of nouns) {
      if (/^l[ae] /.test(card.fr)) expect(card.fr, label(deck, card)).not.toMatch(/^l[ae] [aeiouâàéèêëîïôöûùüœ]/i);
    }
  });
});

describe('starter cards: emoji', () => {
  it('resolve to a Twemoji file and contain no skin tone', () => {
    for (const { deck, card } of allCards) {
      if (card.e === undefined) continue;
      const where = `${label(deck, card)} ${card.e}`;
      expect(graphemes(card.e), where).toBe(1);
      expect(SKIN_TONE.test(card.e), where).toBe(false);
      expect(twemojiFile(card.e), where).not.toBeNull();
    }
  });

  it('are never repeated within a deck', () => {
    for (const deck of STARTER_DECKS) {
      const seen = new Map<string, string>();
      for (const card of deck.cards) {
        if (card.e === undefined) continue;
        const file = twemojiFile(card.e) ?? card.e;
        expect(seen.get(file), `${deck.id}: "${card.fr}" reuses the emoji of "${seen.get(file)}"`).toBeUndefined();
        seen.set(file, card.fr);
      }
    }
  });
});
