// Turns pasted text into card candidates: either a vocabulary list
// ("le chat - cat" per line) or free French text (sentences + tappable words).
import type { CardKind, Gender } from '../types';
import { definiteArticle, detectGender, detectKind, normalizeAnswer, splitArticle } from './french';

export interface Candidate {
  fr: string;
  en: string;
  kind: CardKind;
  gender?: Gender;
  plural?: boolean;
  emoji?: string;
  note?: string;
}

export interface ParsedPair {
  left: string;
  right: string;
  /** Gender written next to the word, e.g. "chat (m)". */
  gender?: Gender;
}

// Ordered by how confidently they mean "this separates two columns".
const SEPARATORS: { name: string; split: (line: string) => string[] | null }[] = [
  { name: 'tab', split: (l) => splitOnce(l, /\t+/) },
  { name: '=', split: (l) => splitOnce(l, /\s+=\s+|\s*=\s*/) },
  { name: '–', split: (l) => splitOnce(l, /\s+[–—]\s+|\s*[–—]\s*/) },
  { name: '-', split: (l) => splitOnce(l, /\s+-\s+/) },
  { name: '|', split: (l) => splitOnce(l, /\s*\|\s*/) },
  { name: ':', split: (l) => splitOnce(l, /\s+:\s+|\s*:\s+/) },
  { name: ';', split: (l) => splitOnce(l, /\s*;\s*/) },
  { name: '>', split: (l) => splitOnce(l, /\s*(?:->|=>|→)\s*/) },
];

function splitOnce(line: string, re: RegExp): string[] | null {
  const global = new RegExp(re.source, 'g');
  const matches = line.match(global);
  if (!matches || matches.length !== 1) return null;
  const parts = line.split(re).map((p) => p.trim());
  return parts.length === 2 && parts[0] && parts[1] ? parts : null;
}

/** Two-column CSV line, honouring double quotes. */
export function splitCsv(line: string): string[] | null {
  const cells: string[] = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') {
      cells.push(cur.trim());
      cur = '';
    } else cur += ch;
  }
  cells.push(cur.trim());
  return cells.length === 2 && cells[0] && cells[1] ? cells : null;
}

const BULLET = /^\s*(?:[-*•·▪◦]|\d{1,3}[.)]|[a-z][.)])\s+/i;
const GENDER_TAG = /\s*[([]\s*(m|f|masc|fém|fem|nm|nf)\.?\s*[)\]]\s*$/i;

function cleanCell(s: string): { text: string; gender?: Gender } {
  let text = s.trim().replace(/^["“«]\s*|\s*["”»]$/g, '');
  let gender: Gender | undefined;
  const m = text.match(GENDER_TAG);
  if (m) {
    const t = m[1].toLowerCase();
    gender = t.startsWith('f') || t === 'nf' ? 'f' : 'm';
    text = text.replace(GENDER_TAG, '');
  }
  return { text: text.replace(/\s+/g, ' ').trim(), gender };
}

const wordsIn = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

function lines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.replace(BULLET, '').trim())
    .filter((l) => l.length > 0);
}

/**
 * Tries to read the text as a vocabulary list. Returns null when it looks like
 * ordinary prose instead.
 */
export function parseList(text: string): ParsedPair[] | null {
  const ls = lines(text);
  if (!ls.length) return null;
  const pairs: ParsedPair[] = [];
  let hits = 0;
  for (const line of ls) {
    let parts: string[] | null = null;
    for (const sep of SEPARATORS) {
      parts = sep.split(line);
      if (parts) break;
    }
    if (!parts && ls.length >= 2) parts = splitCsv(line);
    // Long sentences on either side are prose, not a list entry.
    if (parts && (wordsIn(parts[0]) > 9 || wordsIn(parts[1]) > 12)) parts = null;
    if (!parts) continue;
    const l = cleanCell(parts[0]);
    const r = cleanCell(parts[1]);
    if (!l.text || !r.text) continue;
    hits++;
    pairs.push({ left: l.text, right: r.text, gender: l.gender ?? r.gender });
  }
  const needed = ls.length === 1 ? 1 : Math.max(2, Math.ceil(ls.length * 0.6));
  return hits >= needed ? pairs : null;
}

const FRENCH_MARKERS = /[àâäçéèêëîïôöùûüÿœæ]|\b(le|la|les|un|une|des|du|je|tu|il|elle|nous|vous|ils|elles|est|et|pas|ne|c'est|qu'|l')\b/i;
const ENGLISH_MARKERS = /\b(the|a|an|to|is|are|and|of|my|your|it|i|you|he|she|we|they|this|that|with)\b/i;

/** True when the right-hand column looks more French than the left one. */
export function looksSwapped(pairs: ParsedPair[]): boolean {
  let left = 0;
  let right = 0;
  for (const p of pairs) {
    if (FRENCH_MARKERS.test(p.left)) left++;
    if (FRENCH_MARKERS.test(p.right)) right++;
    if (ENGLISH_MARKERS.test(p.left)) right += 0.5;
    if (ENGLISH_MARKERS.test(p.right)) left += 0.5;
  }
  return right > left;
}

/** Candidates from list pairs; `swap` means French is in the right column. */
export function pairsToCandidates(pairs: ParsedPair[], swap = false): Candidate[] {
  return pairs.map((p) => {
    const fr = swap ? p.right : p.left;
    const en = swap ? p.left : p.right;
    return makeCandidate(fr, en, p.gender);
  });
}

export function makeCandidate(fr: string, en = '', gender?: Gender): Candidate {
  const clean = fr.replace(/\s+/g, ' ').trim();
  const kind = detectKind(clean);
  const auto = detectGender(clean);
  return {
    fr: clean,
    en: en.replace(/\s+/g, ' ').trim(),
    kind,
    gender: gender ?? (kind === 'word' ? auto.gender : undefined),
    plural: kind === 'word' ? auto.plural : undefined,
  };
}

// ---------------------------------------------------------------- free text

const ABBREVIATIONS = new Set(['m', 'mm', 'mme', 'mmes', 'mlle', 'mlles', 'dr', 'pr', 'st', 'ste', 'etc', 'cf', 'ex', 'p', 'av', 'bd', 'env', 'vol', 'chap', 'no', 'n°', 'tél', 'tel', 'fig', 'éd', 'ed', 'vs', 'apr', 'j.-c']);

/** Splits French prose into sentences, keeping their final punctuation. */
export function splitSentences(text: string): string[] {
  const out: string[] = [];
  for (const para of text.replace(/\r/g, '').split(/\n+/)) {
    const p = para.replace(/\s+/g, ' ').trim();
    if (!p) continue;
    let start = 0;
    const re = /([.!?…]+)(["»”’)\]]*)(?=\s+|$)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(p))) {
      const end = m.index + m[0].length;
      const before = p.slice(start, m.index);
      const lastWord = (before.match(/([\p{L}.°-]+)$/u)?.[1] ?? '').toLowerCase();
      const isDot = m[1] === '.';
      // "M. Dupont", "etc. et", "J. Dupont", "3.5" -> not a sentence end
      if (isDot && (ABBREVIATIONS.has(lastWord) || /^\p{L}$/u.test(lastWord) || /^\p{Lu}$/u.test(lastWord))) continue;
      const next = p.slice(end).trimStart();
      if (isDot && next && /^\p{Ll}/u.test(next)) continue; // "etc. et puis" style
      const s = p.slice(start, end).trim();
      if (s) out.push(s);
      start = end;
    }
    const rest = p.slice(start).trim();
    if (rest) out.push(rest);
  }
  return out;
}

export interface Segment {
  /** Word segments are tappable; gaps are spaces and punctuation. */
  type: 'word' | 'gap';
  text: string;
  /** Global index among word segments (words only). */
  wordIndex?: number;
  sentence: number;
}

// A word starts with a letter and may contain apostrophes (l'arbre,
// aujourd'hui, qu'il) and hyphens (peut-être, grand-mère).
const WORD = /\p{L}[\p{L}\p{M}'’-]*\p{L}|\p{L}/gu;

/** Breaks text into tappable words and the gaps between them. */
export function segmentText(text: string): { sentences: string[]; segments: Segment[] } {
  const sentences = splitSentences(text);
  const segments: Segment[] = [];
  let wordIndex = 0;
  sentences.forEach((s, si) => {
    if (si > 0) segments.push({ type: 'gap', text: ' ', sentence: si });
    let last = 0;
    for (const m of s.matchAll(WORD)) {
      const at = m.index ?? 0;
      if (at > last) segments.push({ type: 'gap', text: s.slice(last, at), sentence: si });
      segments.push({ type: 'word', text: m[0].replace(/’/g, "'"), wordIndex: wordIndex++, sentence: si });
      last = at + m[0].length;
    }
    if (last < s.length) segments.push({ type: 'gap', text: s.slice(last), sentence: si });
  });
  return { sentences, segments };
}

/**
 * Turns selected word indices into phrases: neighbouring selected words in the
 * same sentence, separated only by spaces, become one phrase.
 */
export function selectedPhrases(segments: Segment[], selected: Set<number>): string[] {
  const phrases: string[] = [];
  let current: string[] = [];
  let currentStartsSentence = false;
  let prevWord: Segment | null = null;
  let gapSincePrev = '';
  const flush = () => {
    if (current.length) {
      let text = current.join('');
      // Sentence-initial capital is not part of the word ("Le chat" -> "le chat").
      if (currentStartsSentence && /^\p{Lu}(\p{Ll}|')/u.test(text)) text = text[0].toLowerCase() + text.slice(1);
      phrases.push(text.trim());
    }
    current = [];
  };
  const firstWordOfSentence = new Map<number, number>();
  for (const s of segments) if (s.type === 'word' && !firstWordOfSentence.has(s.sentence)) firstWordOfSentence.set(s.sentence, s.wordIndex!);

  for (const seg of segments) {
    if (seg.type === 'gap') {
      gapSincePrev += seg.text;
      continue;
    }
    const isSel = selected.has(seg.wordIndex!);
    const adjacent = prevWord && prevWord.sentence === seg.sentence && selected.has(prevWord.wordIndex!) && /^\s+$/.test(gapSincePrev);
    if (isSel) {
      if (current.length && adjacent) current.push(' ', seg.text);
      else {
        flush();
        current = [seg.text];
        currentStartsSentence = firstWordOfSentence.get(seg.sentence) === seg.wordIndex;
      }
    } else flush();
    prevWord = seg;
    gapSincePrev = '';
  }
  flush();
  return phrases;
}

/** Marks duplicates inside the list and against existing French texts. */
export function markDuplicates<T extends { fr: string }>(items: T[], existing: Iterable<string>): { item: T; duplicate: 'existing' | 'list' | null }[] {
  const known = new Set<string>();
  for (const e of existing) known.add(normalizeAnswer(e));
  const seen = new Set<string>();
  return items.map((item) => {
    const key = normalizeAnswer(item.fr);
    if (known.has(key)) return { item, duplicate: 'existing' as const };
    if (seen.has(key)) return { item, duplicate: 'list' as const };
    seen.add(key);
    return { item, duplicate: null };
  });
}

export type DetectedFormat = { type: 'empty' } | { type: 'list'; pairs: ParsedPair[]; swap: boolean } | { type: 'text' };

export function detectFormat(text: string): DetectedFormat {
  if (!text.trim()) return { type: 'empty' };
  const pairs = parseList(text);
  if (pairs?.length) return { type: 'list', pairs, swap: looksSwapped(pairs) };
  return { type: 'text' };
}

/**
 * Choosing le/la for a noun also writes the article: "marché" -> "le marché",
 * "la marché" -> "le marché", "un/une" swap, "l'" and "les" stay as they are.
 */
export function withArticle(fr: string, gender: Gender | undefined): string {
  const { article, noun } = splitArticle(fr);
  const a = article.toLowerCase();
  if (a === "l'" || a === 'les' || a === 'des') return fr;
  if (a === 'un' || a === 'une') return gender ? `${gender === 'm' ? 'un' : 'une'} ${noun}` : fr;
  if (!gender) return a === 'le' || a === 'la' ? noun : fr;
  const def = definiteArticle(gender, noun);
  return def === "l'" ? `l'${noun}` : `${def} ${noun}`;
}
