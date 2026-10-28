// Builds the list of questions for a round: which cards (spaced repetition
// priority), which question type for each, and the answer options.
import type { Card, GameMode, Progress, QuestionType } from '../../types';
import { hasPicture } from '../../components/CardImage';
import { decapitalize, hasArticle, isSpellable, sentenceTokens, spellSlots, splitArticle, wordCount } from '../french';
import type { GrammarPayload } from '../grammar/exercises';
import { overdueRatio } from '../srs';
import { MODE_BY_ID } from './modes';

export interface Question {
  key: string;
  type: QuestionType;
  card: Card;
  /** Multiple choice answers (target included), already shuffled. */
  options?: Card[];
  optionStyle?: 'image' | 'fr' | 'en';
  /** What the learner sees (or hears) as the cue. */
  prompt?: 'image' | 'en' | 'audio';
  /** Spell: the letter pool, scrambled. */
  letters?: string[];
  /** Spell: the word split into slots. */
  slots?: { char: string; fixed: boolean }[];
  /** Spell: article shown before the slots ("le", "l'"). */
  article?: string;
  /** Build: scrambled tiles (with decoys) and the correct order. */
  tiles?: string[];
  answer?: string[];
  /** Pairs: the cards on the board. */
  pairs?: Card[];
  /** Grammar questions carry their generated content here. */
  g?: GrammarPayload;
  isNew: boolean;
  retry?: boolean;
}

export interface RoundConfig {
  mode: GameMode;
  length: number;
  survival?: boolean;
  /** Decks to draw from; empty = all active decks (or all decks if none active). */
  deckIds?: string[];
  /** Explicit list of cards to practise (overrides decks). */
  cardIds?: string[];
  /** Only starred cards. */
  focusOnly?: boolean;
  newPerRound: number;
}

export interface Pool {
  /** Cards the round may ask about. */
  cards: Card[];
  /** Every usable card, for wrong-answer options. */
  all: Card[];
  progress: Map<string, Progress>;
}

let keySeq = 0;
const nextKey = () => `q${++keySeq}-${Date.now().toString(36)}`;

export function shuffle<T>(arr: readonly T[], rand = Math.random): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const sameText = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
const pictureKey = (c: Card) => c.imageId ?? c.emoji ?? '';

/** Can this card be asked with this question type at all? */
export function canAsk(type: QuestionType, card: Card): boolean {
  switch (type) {
    case 'pick-image':
      return hasPicture(card) && card.kind !== 'sentence';
    case 'pick-word':
    case 'listen':
    case 'flash':
      return true;
    case 'spell':
      return card.kind === 'word' && isSpellable(card.fr);
    case 'gender':
      return card.kind === 'word' && !!card.gender && !card.plural && hasArticle(card.fr) && !/^(les|des)\s/i.test(card.fr);
    case 'build': {
      const n = sentenceTokens(card.fr).length;
      return card.kind !== 'word' && n >= 3 && n <= 12;
    }
    case 'type':
    case 'dictation':
      return wordCount(card.fr) <= 7 && card.fr.length <= 48;
    case 'speak':
      return wordCount(card.fr) <= 8;
    case 'pairs':
      return card.fr.length <= 26;
    default:
      // grammar questions are generated from sentence frames, not word cards
      return false;
  }
}

/** Wrong answers for a multiple choice question. */
export function pickDistractors(target: Card, all: Card[], count: number, style: 'image' | 'fr' | 'en', rand = Math.random): Card[] {
  const ok = (c: Card) => {
    if (c.id === target.id) return false;
    if (sameText(c.fr, target.fr) || sameText(c.en, target.en)) return false;
    if (sameText(splitArticle(c.fr).noun, splitArticle(target.fr).noun)) return false;
    if (style === 'image' && !hasPicture(c)) return false;
    // A wrong answer drawn like the target would make the picture ambiguous (🥖 baguette / boulangerie).
    if (hasPicture(target) && hasPicture(c) && pictureKey(c) === pictureKey(target)) return false;
    return true;
  };
  const candidates = all.filter(ok);
  const score = (c: Card) => {
    let s = rand() * 3;
    if (c.deckId === target.deckId) s += 4;
    if (c.kind === target.kind) s += 3;
    if (target.kind !== 'word') s -= Math.abs(wordCount(c.fr) - wordCount(target.fr)) * 0.6;
    if (target.gender && c.gender === target.gender) s += 0.5;
    return s;
  };
  const ranked = candidates.map((c) => ({ c, s: score(c) })).sort((a, b) => b.s - a.s);
  const chosen: Card[] = [];
  for (const { c } of ranked) {
    if (chosen.length >= count) break;
    if (chosen.some((x) => sameText(x.fr, c.fr) || sameText(x.en, c.en) || (hasPicture(c) && pictureKey(x) === pictureKey(c)))) continue;
    chosen.push(c);
  }
  return chosen;
}

/** Choose a question type for a card; harder types as the card gets stronger. */
export function chooseType(card: Card, allowed: QuestionType[], box: number, pictureOptions: boolean, rand = Math.random): QuestionType | null {
  const usable = allowed.filter((t) => canAsk(t, card) && (t !== 'pick-image' || pictureOptions));
  if (!usable.length) return null;
  if (usable.length === 1) return usable[0];
  const W: Partial<Record<QuestionType, [number, number, number]>> = {
    // weights for [new/learning, learned, strong]; recall over recognition as words get stronger
    'pick-image': [3, 1, 0.5],
    'pick-word': [4, 3, 1],
    listen: [3, 2, 1],
    gender: [2, 3, 2],
    spell: [2, 4, 3],
    build: [3, 5, 5],
    type: [1, 3, 5],
    dictation: [1, 2, 2],
    speak: [1, 2, 3],
    flash: [1, 1, 1],
    pairs: [1, 1, 1],
  };
  const tier = box <= 1 ? 0 : box <= 3 ? 1 : 2;
  const weights = usable.map((t) => W[t]?.[tier] ?? 1);
  let r = rand() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < usable.length; i++) {
    r -= weights[i];
    if (r <= 0) return usable[i];
  }
  return usable[usable.length - 1];
}

const DECOY_LETTERS = 'eaisnrtulodcmpévbfgqhjxyz';

function scrambleDifferent<T>(items: T[], same: (a: T[], b: T[]) => boolean, rand = Math.random): T[] {
  if (items.length < 2) return [...items];
  for (let i = 0; i < 8; i++) {
    const s = shuffle(items, rand);
    if (!same(s, items)) return s;
  }
  return [...items.slice(1), items[0]];
}

/** Assemble the full question object. Returns null if the card can't support the type. */
export function makeQuestion(type: QuestionType, card: Card, pool: Pool, opts: { isNew: boolean; retry?: boolean; box?: number }, rand = Math.random): Question | null {
  const q: Question = { key: nextKey(), type, card, isNew: opts.isNew, retry: opts.retry };
  const box = opts.box ?? 0;
  switch (type) {
    case 'pick-image': {
      const d = pickDistractors(card, pool.all, 3, 'image', rand);
      if (d.length < 1) return null;
      q.options = shuffle([card, ...d], rand);
      q.optionStyle = 'image';
      return q;
    }
    case 'pick-word': {
      const d = pickDistractors(card, pool.all, 3, 'fr', rand);
      if (d.length < 1) return null;
      q.options = shuffle([card, ...d], rand);
      q.optionStyle = 'fr';
      q.prompt = hasPicture(card) && card.kind !== 'sentence' ? 'image' : 'en';
      return q;
    }
    case 'listen': {
      const asImages = hasPicture(card) && card.kind !== 'sentence';
      let d = asImages ? pickDistractors(card, pool.all, 3, 'image', rand) : [];
      let style: 'image' | 'en' = 'image';
      if (d.length < 3) {
        d = pickDistractors(card, pool.all, 3, 'en', rand);
        style = 'en';
      }
      if (d.length < 1) return null;
      q.options = shuffle([card, ...d], rand);
      q.optionStyle = style;
      return q;
    }
    case 'spell': {
      const { article, noun } = splitArticle(card.fr);
      q.article = article;
      q.slots = spellSlots(noun);
      const letters = q.slots.filter((s) => !s.fixed).map((s) => s.char);
      const decoys: string[] = [];
      const decoyCount = box >= 3 ? 3 : box >= 2 ? 2 : letters.length >= 6 ? 1 : 0;
      while (decoys.length < decoyCount) {
        const ch = DECOY_LETTERS[Math.floor(rand() * DECOY_LETTERS.length)];
        if (!letters.includes(ch) && !decoys.includes(ch)) decoys.push(ch);
      }
      q.letters = scrambleDifferent([...letters, ...decoys], (a, b) => a.join('') === b.join(''), rand);
      q.prompt = hasPicture(card) ? 'image' : 'en';
      return q;
    }
    case 'build': {
      const answer = sentenceTokens(card.fr);
      if (answer.length) answer[0] = decapitalize(answer[0]);
      const own = new Set(answer.map((t) => t.toLowerCase()));
      // A capitalised decoy would stand out mid-sentence, so first words lose their capital.
      const lowerFirst = (t: string, i: number) => (i === 0 && /^\p{Lu}\p{Ll}/u.test(t) ? t[0].toLowerCase() + t.slice(1) : t);
      const decoyPool = shuffle(
        pool.all.filter((c) => c.id !== card.id && c.kind !== 'word').flatMap((c) => sentenceTokens(c.fr).map(lowerFirst)),
        rand,
      ).filter((t) => !own.has(t.toLowerCase()) && t.length > 1);
      const decoyCount = answer.length >= 9 ? 1 : 2;
      const decoys = [...new Set(decoyPool)].slice(0, decoyCount);
      q.answer = answer;
      q.tiles = scrambleDifferent([...answer, ...decoys], (a, b) => a.join(' ') === b.join(' '), rand);
      return q;
    }
    case 'type':
    case 'speak':
    case 'flash':
      q.prompt = hasPicture(card) && card.kind !== 'sentence' ? 'image' : 'en';
      return q;
    case 'dictation':
      q.prompt = 'audio';
      return q;
    case 'gender':
      return q;
    case 'pairs':
      return null; // built by makePairsBoard
    default:
      return null; // grammar questions come from lib/grammar/exercises
  }
}

/** One board of the pairs game: 4-6 cards that are distinct enough to match. */
export function makePairsBoard(cards: Card[], size: number, rand = Math.random): Question | null {
  const chosen: Card[] = [];
  for (const c of cards) {
    if (chosen.length >= size) break;
    if (!canAsk('pairs', c)) continue;
    if (chosen.some((x) => sameText(x.fr, c.fr) || sameText(x.en, c.en) || (hasPicture(c) && pictureKey(x) === pictureKey(c)))) continue;
    chosen.push(c);
  }
  if (chosen.length < 3) return null;
  return { key: nextKey(), type: 'pairs', card: chosen[0], pairs: shuffle(chosen, rand), isNew: false };
}

function newCardRank(c: Card): number {
  // learner's own words first, then starred, then built-in order
  return (c.source === 'starter' ? 1_000_000 : 0) + (c.focus ? 0 : 500_000) + (c.source === 'starter' ? c.order : c.createdAt / 1e7);
}

/**
 * Picks which cards to ask, spaced-repetition first:
 * overdue cards, then a few new ones, then the weakest of the rest.
 */
export function pickCards(cards: Card[], progress: Map<string, Progress>, n: number, newLimit: number, now = Date.now(), rand = Math.random): { card: Card; isNew: boolean }[] {
  const due: Card[] = [];
  const fresh: Card[] = [];
  const rest: Card[] = [];
  for (const c of cards) {
    const p = progress.get(c.id);
    if (!p || p.seen === 0) fresh.push(c);
    else if (p.due <= now) due.push(c);
    else rest.push(c);
  }
  due.sort((a, b) => overdueRatio(progress.get(b.id)!, now) - overdueRatio(progress.get(a.id)!, now));
  fresh.sort((a, b) => newCardRank(a) - newCardRank(b));
  const weakness = (c: Card) => {
    const p = progress.get(c.id)!;
    const err = p.wrong / Math.max(1, p.seen);
    return (6 - p.box) * 2 + err * 6 + (c.focus ? 3 : 0) + rand() * 4;
  };
  rest.sort((a, b) => weakness(b) - weakness(a));

  const out: { card: Card; isNew: boolean }[] = [];
  const take = (c: Card, isNew: boolean) => out.push({ card: c, isNew });
  const newTarget = Math.min(newLimit, fresh.length);
  due.slice(0, Math.max(0, n - newTarget)).forEach((c) => take(c, false));
  fresh.slice(0, Math.min(newTarget, n - out.length)).forEach((c) => take(c, true));
  rest.slice(0, n - out.length).forEach((c) => take(c, false));
  // Small collections or brand-new learners: bring in more new words...
  let extra = Math.max(0, Math.min(fresh.length - newTarget, Math.ceil(n / 2) - newTarget, n - out.length));
  fresh.slice(newTarget, newTarget + extra).forEach((c) => take(c, true));
  extra = n - out.length;
  // ...then the remaining due cards, then anything left.
  if (extra > 0) {
    const used = new Set(out.map((o) => o.card.id));
    [...due, ...fresh, ...rest].filter((c) => !used.has(c.id)).slice(0, extra).forEach((c) => take(c, !progress.get(c.id)?.seen));
  }
  return out;
}

/** Spread repeats and new cards so the same card never appears twice in a row. */
export function arrange<T extends { card: Card }>(items: T[], rand = Math.random): T[] {
  const a = shuffle(items, rand);
  for (let i = 1; i < a.length; i++) {
    if (a[i].card.id === a[i - 1].card.id) {
      const j = a.findIndex((x, k) => k > i && x.card.id !== a[i].card.id && (k + 1 >= a.length || a[k + 1].card.id !== a[i].card.id));
      if (j > 0) [a[i], a[j]] = [a[j], a[i]];
    }
  }
  return a;
}

/** Build the questions for a round from an already loaded pool. Pure apart from randomness. */
export function buildQuestions(cfg: RoundConfig, pool: Pool, rand = Math.random, now = Date.now()): Question[] {
  const mode = MODE_BY_ID[cfg.mode];
  const types = mode.types;
  const pictureCount = pool.all.filter(hasPicture).length;
  const pictureOptions = pictureCount >= 2;

  if (cfg.mode === 'pairs') {
    const picked = pickCards(pool.cards.filter((c) => canAsk('pairs', c)), pool.progress, Math.max(6, cfg.length), Math.max(cfg.newPerRound, 2), now, rand);
    const ordered = picked.map((p) => p.card);
    const boards: Question[] = [];
    const per = 5;
    for (let i = 0; i < 3 && ordered.length; i++) {
      const board = makePairsBoard(ordered, per, rand);
      if (!board) break;
      boards.push(board);
      const used = new Set(board.pairs!.map((c) => c.id));
      for (let k = ordered.length - 1; k >= 0; k--) if (used.has(ordered[k].id)) ordered.splice(k, 1);
    }
    return boards;
  }

  const eligible = pool.cards.filter((c) => types.some((t) => canAsk(t, c) && (t !== 'pick-image' || pictureOptions)));
  if (!eligible.length) return [];

  const n = cfg.cardIds?.length ? Math.min(cfg.cardIds.length, Math.max(cfg.length, 4), 30) : cfg.length;
  let picked = pickCards(eligible, pool.progress, n, cfg.newPerRound, now, rand);

  // Not enough different cards: ask some twice (new words benefit most).
  if (picked.length < n && picked.length > 0) {
    const repeats = [...picked].sort((a, b) => Number(b.isNew) - Number(a.isNew));
    let i = 0;
    while (picked.length < n && i < n * 2) {
      const r = repeats[i % repeats.length];
      picked.push({ card: r.card, isNew: false });
      i++;
    }
  }

  const seenIds = new Set<string>();
  const questions: Question[] = [];
  for (const { card, isNew } of picked) {
    const p = pool.progress.get(card.id);
    const box = p?.box ?? 0;
    const first = !seenIds.has(card.id);
    seenIds.add(card.id);
    let type = chooseType(card, types, first ? box : box + 2, pictureOptions, rand);
    let q = type ? makeQuestion(type, card, pool, { isNew: isNew && first, box }, rand) : null;
    if (!q && types.length > 1) {
      for (const t of shuffle(types, rand)) {
        if (!canAsk(t, card)) continue;
        q = makeQuestion(t, card, pool, { isNew: isNew && first, box }, rand);
        if (q) break;
      }
    }
    if (q) questions.push(q);
  }
  // First occurrences keep the "new word" intro; arrange so intros come before repeats.
  const arranged = arrange(questions, rand);
  const introduced = new Set<string>();
  for (const q of arranged) {
    if (introduced.has(q.card.id)) q.isNew = false;
    else if (questions.some((x) => x.card.id === q.card.id && x.isNew)) {
      q.isNew = true;
      introduced.add(q.card.id);
    }
  }
  return arranged;
}

/** A follow-up question for a card that was just missed. */
export function retryQuestion(prev: Question, pool: Pool, rand = Math.random): Question | null {
  if (prev.type === 'pairs') return null;
  const mode = prev.type;
  const easier: QuestionType[] = mode === 'spell' || mode === 'type' ? [mode, 'pick-word'] : [mode];
  for (const t of easier) {
    if (!canAsk(t, prev.card)) continue;
    const q = makeQuestion(t, prev.card, pool, { isNew: false, retry: true, box: 0 }, rand);
    if (q) return q;
  }
  return null;
}
