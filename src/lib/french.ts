import type { CardKind, Gender } from '../types';

const ARTICLE_WORD = /^(le|la|les|un|une|des)\s+(.+)$/i;
const ARTICLE_ELIDED = /^(l['’])\s*(.+)$/i;

export function splitArticle(fr: string): { article: string; noun: string } {
  const t = fr.trim();
  const m = t.match(ARTICLE_WORD) || t.match(ARTICLE_ELIDED);
  if (!m) return { article: '', noun: t };
  return { article: m[1].replace('’', "'"), noun: m[2] };
}

export function hasArticle(fr: string): boolean {
  return splitArticle(fr).article !== '';
}

/** Gender/number implied by the article, if any. */
export function detectGender(fr: string): { gender?: Gender; plural?: boolean } {
  const a = splitArticle(fr).article.toLowerCase();
  if (a === 'le' || a === 'un') return { gender: 'm' };
  if (a === 'la' || a === 'une') return { gender: 'f' };
  if (a === 'les' || a === 'des') return { plural: true };
  return {};
}

export function wordCount(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

export function detectKind(fr: string): CardKind {
  const t = fr.trim();
  const words = wordCount(t);
  if (hasArticle(t) && words <= 4 && !/[.!?]$/.test(t)) return 'word';
  if (/[.!?]$/.test(t) && words >= 3) return 'sentence';
  if (words <= 1) return 'word';
  return words >= 6 ? 'sentence' : 'phrase';
}

/**
 * Definite article for a bare noun. A leading "h" is treated as mute (l'homme, l'heure);
 * aspirated-h words (le héros) can't be told apart by spelling, so stored cards keep their own article.
 */
export function definiteArticle(gender: Gender, noun: string): string {
  if (/^[aeiouyhâàäéèêëîïôöûùüœ]/i.test(noun)) return "l'";
  return gender === 'm' ? 'le' : 'la';
}

export function stripAccents(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/œ/g, 'oe')
    .replace(/Œ/g, 'Oe')
    .replace(/æ/g, 'ae');
}

/** Lowercase, unify apostrophes, drop punctuation and extra spaces. */
export function normalizeAnswer(s: string): string {
  return s
    .normalize('NFC')
    .toLowerCase()
    .replace(/[’`´ʼ]/g, "'")
    .replace(/[«»"“”.,!?;:¡¿…()]/g, ' ')
    .replace(/\s*'\s*/g, "'")
    .replace(/\s*-\s*/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}

export type AnswerMatch = 'exact' | 'accents' | 'article' | 'typo' | 'wrong';

/** How close a typed answer is to the target. Everything but 'wrong' counts as correct. */
export function compareAnswer(input: string, target: string): AnswerMatch {
  const a = normalizeAnswer(input);
  const b = normalizeAnswer(target);
  if (!a) return 'wrong';
  if (a === b) return 'exact';
  const a0 = stripAccents(a);
  const b0 = stripAccents(b);
  if (a0 === b0) return 'accents';
  const noun = normalizeAnswer(splitArticle(target).noun);
  if (hasArticle(target) && (a === noun || a0 === stripAccents(noun))) return 'article';
  const allowed = b0.length <= 4 ? 0 : b0.length <= 10 ? 1 : 2;
  if (levenshtein(a0, b0) <= allowed) return 'typo';
  return 'wrong';
}

/**
 * Whether a typed answer counts, by difficulty: Facile forgives accents, a missing le/la and
 * a small typo; Normal only a small typo; Difficile wants it exact.
 */
export function typedAnswerCounts(match: AnswerMatch, difficulty: 1 | 2 | 3): boolean {
  if (match === 'exact') return true;
  if (match === 'typo') return difficulty <= 2;
  if (match === 'accents' || match === 'article') return difficulty <= 1;
  return false;
}

/** Word tiles for the sentence builder: punctuation stripped, elisions kept together. */
export function sentenceTokens(s: string): string[] {
  return s
    .replace(/[«»"“”]/g, ' ')
    .replace(/[’]/g, "'")
    .split(/\s+/)
    .map((t) => t.replace(/^[¡¿(]+/, '').replace(/[.,!?;:…)]+$/, ''))
    .filter((t) => t.length > 0 && !/^[-–—]$/.test(t));
}

// Names and places that keep their capital letter at the start of a sentence.
const PROPER_NOUNS = new Set([
  'Marie', 'Paul', 'Léa', 'Lucas', 'Sophie', 'Thomas', 'Julie', 'Pierre', 'Anne', 'Louis', 'Emma', 'Hugo', 'Chloé', 'Nicolas',
  'Paris', 'Lyon', 'Marseille', 'Nice', 'Bordeaux', 'France', 'Londres', 'Montréal', 'Québec', 'Bruxelles', 'Genève', 'Noël',
]);

/** First word tile without its capital, so the opening word isn't given away (names keep theirs). */
export function decapitalize(token: string): string {
  if (!token || PROPER_NOUNS.has(token) || (token.length > 1 && token === token.toUpperCase())) return token;
  return token[0].toLowerCase() + token.slice(1);
}

/** Non-breaking spaces where French typography puts a space ("Tu viens ?"), so "?" never wraps alone. */
export function frenchSpaces(s: string): string {
  return s.replace(/ ([?!:;»])/g, '\u00a0$1').replace(/« /g, '«\u00a0');
}

/** Final punctuation of a sentence ("?", "!", "."), for display after the tiles. */
export function finalPunctuation(s: string): string {
  const m = s.trim().match(/([.!?…]+)$/);
  return m ? m[1] : '';
}

/** Characters of a word split into letter slots; spaces, hyphens and apostrophes are fixed. */
export function spellSlots(word: string): { char: string; fixed: boolean }[] {
  return [...word.toLowerCase()].map((char) => ({ char, fixed: !/\p{L}/u.test(char) }));
}

export function isSpellable(fr: string): boolean {
  const { noun } = splitArticle(fr);
  const letters = [...noun].filter((c) => /\p{L}/u.test(c)).length;
  return letters >= 2 && letters <= 14 && wordCount(noun) <= 3 && !/[.!?,]/.test(noun);
}

export const ACCENT_KEYS = ['é', 'è', 'ê', 'à', 'â', 'ç', 'ô', 'î', 'ï', 'û', 'ù', 'ë', 'œ'];

/** Text to send to speech synthesis (strip notes in parentheses, slashes). */
export function speakable(fr: string): string {
  return fr.replace(/\(.*?\)/g, '').replace(/\s*\/\s*/g, ', ').trim();
}
