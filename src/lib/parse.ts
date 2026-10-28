// Turns pasted text into card candidates: either a vocabulary list
// ("le chat - cat" per line) or free French text (sentences + tappable words).
import type { CardKind, Gender } from '../types';
import { definiteArticle, detectGender, detectKind, levenshtein, normalizeAnswer, splitArticle, stripAccents } from './french';

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
 * ordinary prose instead. Textbook lists without separators ("Abaisser To lower")
 * are recognised too, including two columns that OCR merged into one line.
 */
export function parseList(text: string): ParsedPair[] | null {
  return parseBilingual(text, 'anchored') ?? parseSeparated(text) ?? parseBilingual(text, 'scored');
}

function parseSeparated(text: string): ParsedPair[] | null {
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
    return makeCandidate(lowerHead(fr), lowerGloss(en), p.gender);
  });
}

/** "abaisser", "se lever", "s'amuser", "finir", "prendre", "s'asseoir". */
export function isInfinitive(fr: string): boolean {
  return /^(?:se\s+|s['’])?\p{L}[\p{L}-]*(?:er|ir|ïr|re|oir)$/iu.test(fr.trim());
}

/** List headwords are often capitalised ("Abaisser", "Le chat"); cards use lowercase. */
export function lowerHead(fr: string): string {
  const t = fr.trim();
  if (t.length > 1 && t === t.toUpperCase() && /\p{Lu}{2}/u.test(t)) return t.toLowerCase();
  if (/^\p{Lu}(?:\p{Ll}|['’])/u.test(t) && (isInfinitive(t) || /^(le|la|les|un|une|des)\s|^l['’]/i.test(t))) return t[0].toLowerCase() + t.slice(1);
  return t;
}

/** "To lower" -> "to lower", "Apple" -> "apple" (but keep "I" and proper names inside). */
export function lowerGloss(en: string): string {
  const t = en.trim();
  if (/^To\s/.test(t)) return 'to' + t.slice(2);
  if (/^\p{Lu}\p{Ll}+$/u.test(t)) return t.toLowerCase();
  return t;
}

export function makeCandidate(fr: string, en = '', gender?: Gender): Candidate {
  const clean = fr.replace(/\s+/g, ' ').trim();
  const verb = isInfinitive(clean);
  const kind = verb ? 'word' : detectKind(clean);
  const auto = verb ? {} : detectGender(clean);
  return {
    fr: clean,
    en: en.replace(/\s+/g, ' ').trim(),
    kind,
    gender: verb ? undefined : (gender ?? (kind === 'word' ? auto.gender : undefined)),
    plural: kind === 'word' && !verb ? auto.plural : undefined,
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
 * same sentence, separated only by spaces, become one phrase. A determiner just
 * before a phrase gives it its article ("des fraises" -> "les fraises").
 */
export function selectedPhrases(segments: Segment[], selected: Set<number>): string[] {
  const phrases: string[] = [];
  let current: string[] = [];
  let currentStartsSentence = false;
  let determiner: string | null = null;
  let prevWord: Segment | null = null;
  let gapSincePrev = '';
  const flush = () => {
    if (current.length) {
      let text = current.join('').trim();
      // Sentence-initial capital is not part of the word ("Le chat" -> "le chat").
      if (currentStartsSentence && /^\p{Lu}(\p{Ll}|')/u.test(text)) text = text[0].toLowerCase() + text.slice(1);
      if (determiner && !/^l'/i.test(text)) text = articleFor(determiner, text) ?? text;
      phrases.push(text);
    }
    current = [];
    determiner = null;
  };
  const firstWordOfSentence = new Map<number, number>();
  for (const s of segments) if (s.type === 'word' && !firstWordOfSentence.has(s.sentence)) firstWordOfSentence.set(s.sentence, s.wordIndex!);

  for (const seg of segments) {
    if (seg.type === 'gap') {
      gapSincePrev += seg.text;
      continue;
    }
    const isSel = selected.has(seg.wordIndex!);
    const touching = !!prevWord && prevWord.sentence === seg.sentence && /^\s+$/.test(gapSincePrev);
    const adjacent = touching && selected.has(prevWord!.wordIndex!);
    if (isSel) {
      if (current.length && adjacent) current.push(' ', seg.text);
      else {
        flush();
        current = [seg.text];
        currentStartsSentence = firstWordOfSentence.get(seg.sentence) === seg.wordIndex;
        determiner = touching && !selected.has(prevWord!.wordIndex!) && /^\p{Ll}/u.test(seg.text) ? prevWord!.text : null;
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
  const bilingual = parseBilingual(text, 'anchored');
  if (bilingual) return { type: 'list', pairs: bilingual, swap: false };
  const pairs = parseSeparated(text) ?? parseBilingual(text, 'scored');
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

// ------------------------------------------- bilingual lists without separators

const DASH_TOKEN = /^[–—\-/]$/;
const PARTICLES = new Set(['up', 'out', 'down', 'off', 'in', 'on', 'away', 'back', 'over', 'through', 'around', 'about', 'along', 'across', 'apart', 'aside', 'forward', 'together']);

const FR_FUNCTION = new Set(
  "le la les l' un une des du de d' au aux à a en et ou se s' ne pas pour par avec sans dans sur sous chez vers je tu il elle on nous vous ils elles mon ma mes ton ta tes son sa ses ce cet cette ces qui que qu' est sont très".split(' '),
);
const EN_FUNCTION = new Set(
  "to the a an of for with at by from into onto up out down off in on away back over something someone somebody one oneself one's sb sth be get make have do go take give put set and or it its his her their your my about is are".split(' '),
);
const FR_ACCENT = /[àâäçéèêëîïôöùûüÿœæ]/i;
const FR_ENDING = /(?:er|ir|oir|eau|eaux|eux|euse|ette|ille|aine|ière|ier|ée|ais|ait|ons|ez|oux|ique|esse|ance|ence|eur)$/i;
const EN_ENDING = /(?:ing|ly|ness|ful|less|ship|ght|ck|ow|aw|ew|wn|ed|ey|ay|oy|y)$/i;
const EN_LETTERS = /(?:w|k|th|sh|wh|ee|oo)/i;

function tokenScore(t: string): { fr: number; en: number } {
  const w = t.toLowerCase().replace(/[’]/g, "'").replace(/^[("«]+|[)",.;:!?»]+$/g, '');
  let fr = 0;
  let en = 0;
  if (!w) return { fr, en };
  if (FR_ACCENT.test(w)) fr += 3;
  if (FR_FUNCTION.has(w) || /^(?:l|d|s|qu|j|n|c)'/.test(w)) fr += 3;
  if (FR_ENDING.test(w)) fr += 1;
  if (/(?:qu|eau|oi|ç|gn)/.test(w)) fr += 1;
  if (EN_FUNCTION.has(w)) en += 3;
  if (EN_ENDING.test(w)) en += 1;
  if (EN_LETTERS.test(w)) en += /[wk]/.test(w) ? 2 : 1;
  return { fr, en };
}

/** How French and how English a phrase looks: the per-word scores used by the list parser, summed. */
export function languageScore(text: string): { fr: number; en: number } {
  let fr = 0;
  let en = 0;
  for (const t of text.split(/\s+/)) {
    const s = tokenScore(t);
    fr += s.fr;
    en += s.en;
  }
  return { fr, en };
}

/** Is this token a plausible piece of a French headword? */
const HEAD_TOKEN = /^\(?[\p{L}][\p{L}'’-]*\)?$/u;

/** OCR sometimes reads the capital "To" of a gloss as "T0" or "Tô". */
const isAnchorTo = (t: string) => /^(?:To|T0|Tô|TO)$/.test(t);
const isContinuation = (prev: string | undefined) => !!prev && (DASH_TOKEN.test(prev) || /^(?:or|ou)$/i.test(prev) || /[,;]$/.test(prev));
const capitalised = (t: string) => /^\(?\p{Lu}/u.test(t);

/**
 * "To admit – To grant" -> "to admit, to grant"; "To pull up – out" ->
 * "to pull up, to pull out"; "To look for – search" -> "to look for, to search".
 */
export function normalizeGloss(raw: string): string {
  const cleaned = raw
    .replace(/[|_~^©®•]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[,;:.\-–—\s]+|[,;:.\-–—\s]+$/g, '')
    // a capital "To" in the middle starts another meaning even if the dash was lost
    .replace(/(\S)\s+(?=(?:To|T0|Tô|TO)\s)/g, '$1 – ');
  const parts = cleaned
    .split(/\s*[–—]\s*|\s+-\s+|\s*\/\s*|\s*;\s*|,\s*(?=to\s)/i)
    .map((p) => p.trim())
    .filter(Boolean);
  const out: string[] = [];
  for (const part of parts) {
    let g = part.replace(/^(?:To|T0|Tô|TO)\b/, 'to');
    const prev = out[out.length - 1];
    if (prev && !/^to\s/i.test(g) && /^to\s/i.test(prev)) {
      const words = g.split(' ');
      const prevWords = prev.split(' ');
      if (words.length === 1 && PARTICLES.has(words[0].toLowerCase()) && PARTICLES.has(prevWords[prevWords.length - 1].toLowerCase())) {
        g = [...prevWords.slice(0, -1), words[0]].join(' ');
      } else {
        g = `to ${g}`;
      }
    }
    out.push(g);
  }
  return [...new Set(out)].join(', ');
}

/** "Abaisser" -> "abaisser", "Lever (se)" -> "se lever", "S'amuser" -> "s'amuser". */
export function normalizeHead(raw: string): string {
  const lower = (w: string) => {
    if (w.length > 1 && w === w.toUpperCase() && /\p{Lu}{2}/u.test(w)) return w.toLowerCase();
    return /^\p{Lu}(?:\p{Ll}|')/u.test(w) ? w[0].toLowerCase() + w.slice(1) : w;
  };
  let t = raw.replace(/[’]/g, "'").replace(/\s+/g, ' ').trim();
  const reflexive = t.match(/^(.+?)\s*\((?:se|s')\)$/i);
  if (reflexive) t = `se ${lower(reflexive[1].trim())}`;
  return lower(t).replace(/^se ([aeiouyhâàéèêëîïôœ])/i, "s'$1");
}

// Real English words that start with "To" and must not be split into "To" + word.
const TO_WORDS = new Set(
  'today tomorrow tonight together toward towards top total touch tour town toy toast toe toilet tomato ton tone tongue tool tooth topic torch tower toss tough towel tomb ticket'.split(' '),
);

/** OCR often glues the gloss's "To" to the next word: "Tocry", "Tospeak-Totalk". */
function unglue(token: string): string[] {
  if (!/^(?:To|T0)[a-z]/.test(token)) return [token];
  return token
    .split(/-(?=(?:To|T0)[a-z])/)
    .flatMap((part, i) => {
      const m = part.match(/^(?:To|T0)([a-z][a-z'()]*)$/);
      const piece = m && !TO_WORDS.has(('to' + m[1]).toLowerCase()) ? ['To', m[1]] : [part];
      return i > 0 ? ['–', ...piece] : piece;
    });
}

function tokenize(segment: string): string[] {
  return segment
    .replace(/\s*([–—])\s*/g, ' $1 ')
    .replace(/[|_~^©®•]+/g, ' ')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t && !/^[.,;:'"`]+$/.test(t))
    .flatMap(unglue);
}

interface RawEntry {
  fr: string;
  en: string;
}

function validEntry(frTokens: string[], glossTokens: string[]): RawEntry | null {
  if (!frTokens.length || frTokens.length > 4 || !glossTokens.length) return null;
  if (!frTokens.every((t) => HEAD_TOKEN.test(t))) return null;
  if (frTokens.length === 1 && EN_FUNCTION.has(frTokens[0].toLowerCase())) return null;
  // Title-case footers ("Remember To Download The Audio") are not glosses.
  const capitals = glossTokens.filter((t, i) => i > 0 && capitalised(t) && !isAnchorTo(t) && t !== 'I').length;
  if (capitals >= 2) return null;
  const en = normalizeGloss(glossTokens.join(' '));
  if (!en || en.split(/\s+/).length > 14 || !/\p{L}{2}/u.test(en)) return null;
  const fr = normalizeHead(frTokens.join(' '));
  if (!/\p{L}{2}/u.test(fr)) return null;
  return { fr, en };
}

/** A French-looking headword: an infinitive, or more French than English. */
function frenchLooking(t: string): boolean {
  const w = t.replace(/^\(|\)$/g, '');
  if (isInfinitive(w)) return true;
  const sc = tokenScore(w);
  return sc.fr > sc.en;
}

/** Entries in one line segment using "To" glosses as anchors. */
function parseAnchoredSegment(tokens: string[]): RawEntry[] {
  const anchors: { at: number; lower: boolean }[] = [];
  tokens.forEach((t, i) => {
    if (i === 0 || isContinuation(tokens[i - 1])) return;
    const capital = isAnchorTo(t);
    // OCR sometimes loses the capital: "Abaisser to lower" still counts after a French headword.
    const lower = !capital && t === 'to' && capitalised(tokens[i - 1]) && HEAD_TOKEN.test(tokens[i - 1]) && frenchLooking(tokens[i - 1]);
    if (!capital && !lower) return;
    // Every new entry starts with a capitalised headword; without one this "To"
    // just continues the previous gloss (OCR dropped the dash in "To admit – To grant").
    const prev = anchors[anchors.length - 1];
    if (prev && !tokens.slice(prev.at + 1, i).some((x) => capitalised(x) && HEAD_TOKEN.test(x) && !isAnchorTo(x))) return;
    anchors.push({ at: i, lower });
  });
  if (!anchors.length) return [];
  // Where does each French headword start? The headword is the last capitalised
  // run before its "To" (gloss words are lowercase), or else the last token.
  const starts = anchors.map(({ at }, j) => {
    const from = j === 0 ? 0 : anchors[j - 1].at + 1;
    let start = -1;
    for (let i = at - 1; i >= from; i--) {
      if (capitalised(tokens[i]) && HEAD_TOKEN.test(tokens[i])) {
        start = i;
        break;
      }
    }
    if (start < 0) {
      start = at - 1;
      if (start - 1 >= from && /^(?:se|s')$/i.test(tokens[start - 1])) start -= 1;
    }
    if (j === 0) {
      // drop junk before the first headword (page numbers, stray marks)
      while (start < at - 1 && !HEAD_TOKEN.test(tokens[start])) start++;
    }
    return Math.max(start, from);
  });
  const out: RawEntry[] = [];
  anchors.forEach(({ at, lower }, j) => {
    const end = j + 1 < anchors.length ? starts[j + 1] : tokens.length;
    const gloss = tokens.slice(at, end);
    // Glosses are short; a long sentence after "to" is a footer ("Remember to download the audio…").
    const words = gloss.filter((t) => !DASH_TOKEN.test(t)).length;
    if (words > (lower ? 5 : 9)) return;
    if (/[.!?…]$/.test(gloss[gloss.length - 1] ?? '') && words > 4) return;
    const e = validEntry(tokens.slice(starts[j], at), gloss);
    if (e) out.push(e);
  });
  return out;
}

/** Best single French/English split of a short line by French-ness vs English-ness. */
function parseScoredSegment(tokens: string[]): RawEntry[] {
  if (tokens.length < 2 || tokens.length > 9) return [];
  const scores = tokens.map(tokenScore);
  let best: { k: number; score: number } | null = null;
  for (let k = 1; k <= Math.min(tokens.length - 1, 4); k++) {
    let score = 0;
    for (let i = 0; i < tokens.length; i++) {
      const d = scores[i].fr - scores[i].en;
      score += i < k ? d : -d;
    }
    // an article or preposition can't end the French part ("la | pomme apple")
    if (FR_FUNCTION.has(tokens[k - 1].toLowerCase())) score -= 6;
    if (!best || score > best.score) best = { k, score };
  }
  if (!best) return [];
  const sum = (from: number, to: number, key: 'fr' | 'en') => scores.slice(from, to).reduce((a, x) => a + x[key], 0);
  const leftFr = sum(0, best.k, 'fr');
  const leftEn = sum(0, best.k, 'en');
  const rightFr = sum(best.k, tokens.length, 'fr');
  const rightEn = sum(best.k, tokens.length, 'en');
  const n = tokens.length;
  // Need English-looking words on the right and nothing English on the left;
  // very short lines ("pomme apple", "la pomme apple") only need no contradiction.
  const clear = best.score >= 2 && rightEn > rightFr && leftFr >= leftEn;
  const short =
    (n === 2 && best.score >= 0 && leftEn <= leftFr && rightFr <= rightEn) ||
    (n === 3 && n - best.k === 1 && rightFr === 0 && leftFr > leftEn);
  if (!clear && !short) return [];
  const e = validEntry(tokens.slice(0, best.k), tokens.slice(best.k));
  return e ? [e] : [];
}

/** A French segment and an English segment printed side by side ("pomme   apple"). */
function scoredPair(frSeg: string, enSeg: string): RawEntry | null {
  const fr = tokenize(frSeg);
  const en = tokenize(enSeg);
  if (!fr.length || !en.length || fr.length > 4) return null;
  const total = (ts: string[], key: 'fr' | 'en') => ts.reduce((a, t) => a + tokenScore(t)[key], 0);
  if (total(fr, 'en') > total(fr, 'fr') || total(en, 'fr') > total(en, 'en')) return null;
  return validEntry(fr, en);
}

/**
 * Scored mode for one line: wide gaps (3+ spaces, tabs) usually alternate
 * French, English, French, English…; otherwise weigh each segment, then the line.
 */
function parseScoredLine(line: string): RawEntry[] {
  const segs = line
    .split(/\s{3,}|\t+/)
    .map((x) => x.trim())
    .filter(Boolean);
  if (segs.length >= 2 && segs.length % 2 === 0) {
    const paired: RawEntry[] = [];
    for (let k = 0; k < segs.length; k += 2) {
      const e = scoredPair(segs[k], segs[k + 1]);
      if (!e) break;
      paired.push(e);
    }
    if (paired.length === segs.length / 2) return paired;
  }
  if (segs.length > 1) {
    const each = segs.flatMap((x) => parseScoredSegment(tokenize(x)));
    if (each.length) return each;
  }
  return parseScoredSegment(tokenize(line));
}

const NOISE_LINE = /^(?:\W*\d{1,4}\W*|page\s+\d+.*|p\.\s*\d+)$/i;

/**
 * Lists without a separator character: "Abaisser To lower", "chercher to look
 * for", "pomme apple". 'anchored' only trusts capital "To" glosses (textbooks);
 * 'scored' falls back to weighing French-looking against English-looking words.
 */
export function parseBilingual(text: string, mode: 'anchored' | 'scored'): ParsedPair[] | null {
  const pairs: ParsedPair[] = [];
  let candidateLines = 0;
  let hitLines = 0;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(BULLET, '').trim();
    if (!line || NOISE_LINE.test(line)) continue;
    candidateLines++;
    // Anchored lists don't need the wide gaps: the "To" glosses mark every entry,
    // even when OCR put two printed columns (or a wide French–English gap) on one line.
    const entries = mode === 'anchored' ? parseAnchoredSegment(tokenize(line.replace(/\s{3,}|\t+/g, ' '))) : parseScoredLine(line);
    for (const e of entries) pairs.push({ left: e.fr, right: e.en });
    if (entries.length) hitLines++;
  }
  if (pairs.length < (candidateLines <= 1 ? 1 : 2)) return null;
  // Most lines must be entries; headers, footers and page numbers are the exception.
  const needed = mode === 'anchored' ? 0.4 : 0.7;
  return hitLines / Math.max(1, candidateLines) >= needed ? pairs : null;
}

// ------------------------------------------------ free text: words to pre-select

const FR_STOPWORDS = new Set(
  (
    "le la les l' un une des du de d' au aux à a en dans sur sous avec sans pour par chez vers entre contre depuis pendant avant après devant derrière près selon malgré " +
    "je j' tu il elle on nous vous ils elles me m' te t' se s' lui leur leurs y moi toi soi eux ce c' ça cela ceci celui celle ceux celles qui que qu' quoi dont où " +
    'mon ma mes ton ta tes son sa ses notre nos votre vos ce cet cette ces quel quelle quels quelles ' +
    'et ou mais donc or ni car si comme quand lorsque puisque parce alors puis aussi ensuite ' +
    "ne n' pas plus jamais rien très bien trop peu beaucoup tout tous toute toutes déjà encore ici là oui non " +
    'est es suis sont sommes êtes étais était étaient été être ai as avons avez ont avait avaient avoir eu ' +
    "c'est j'ai n'est n'a qu'il qu'elle qu'on s'il c'était il y voici voilà"
  ).split(' '),
);

const NUMBER_WORDS = new Set(
  'zéro un deux trois quatre cinq six sept huit neuf dix onze douze treize quatorze quinze seize vingt trente quarante cinquante soixante cent cents mille premier première deuxième troisième'.split(
    ' ',
  ),
);

/** Content words worth learning (not articles, prepositions, pronouns, conjunctions or numbers). */
export function isContentWord(token: string): boolean {
  const t = token.toLowerCase().replace(/’/g, "'");
  if (t.length < 2 || FR_STOPWORDS.has(t) || NUMBER_WORDS.has(t)) return false;
  const elided = t.match(/^(?:jusqu|lorsqu|puisqu|qu|c|n|j|s|d|m|t|l)'(.+)$/);
  if (elided) return isContentWord(elided[1]);
  return true;
}

/** Word indices to pre-select so nobody has to tap every word. */
export function contentWordIndices(segments: Segment[]): Set<number> {
  const out = new Set<number>();
  for (const s of segments) if (s.type === 'word' && isContentWord(s.text)) out.add(s.wordIndex!);
  return out;
}

// Determiner right before a noun -> the definite article the card should show.
const DETERMINER_ARTICLE: Record<string, 'le' | 'la' | 'les' | 'le?'> = {
  le: 'le', la: 'la', les: 'les', un: 'le', une: 'la', des: 'les', du: 'le', au: 'le', aux: 'les',
  mon: 'le?', ton: 'le?', son: 'le?', ma: 'la', ta: 'la', sa: 'la', mes: 'les', tes: 'les', ses: 'les',
  ce: 'le', cet: 'le?', cette: 'la', ces: 'les', nos: 'les', vos: 'les', leurs: 'les',
};
const VOWEL_START = /^[aeiouyhâàäéèêëîïôöûùüœæ]/i;

/** "des" + "fraises" -> "les fraises", "au" + "marché" -> "le marché", "mon" + "amie" -> "l'amie". */
export function articleFor(determiner: string, phrase: string): string | null {
  const a = DETERMINER_ARTICLE[determiner.toLowerCase()];
  if (!a) return null;
  if (a === 'les') return `les ${phrase}`;
  if (VOWEL_START.test(phrase)) return `l'${phrase}`;
  return `${a === 'le?' ? 'le' : a} ${phrase}`;
}

// ------------------------------------------- fixing OCR slips with known words

const meanings = (en: string) =>
  en
    .toLowerCase()
    .split(/\s*[,;/–—]\s*/)
    .map((m) => m.replace(/[.!?()"]/g, '').replace(/^to\s+/, '').replace(/\s+/g, ' ').trim())
    .filter(Boolean);

function glossesAgree(a: string, b: string): boolean {
  const ma = meanings(a);
  const mb = meanings(b);
  if (!ma.length || !mb.length) return false;
  if (ma[0] === mb[0]) return true;
  const shared = ma.filter((m) => mb.includes(m)).length;
  return shared / Math.min(ma.length, mb.length) >= 0.5;
}

/**
 * OCR misreads a letter or drops an accent ("Parier" for "Parler", "Ecouter"
 * for "Écouter"). When a word isn't known but a known card is one slip away and
 * means the same thing, use the known spelling.
 */
export function correctAgainstKnown<T extends { fr: string; en: string }>(cands: T[], known: { fr: string; en: string }[]): T[] {
  const knownSet = new Set(known.map((k) => normalizeAnswer(k.fr)));
  const plain = known.map((k) => ({ ...k, key: stripAccents(normalizeAnswer(k.fr)) }));
  return cands.map((c) => {
    const key = normalizeAnswer(c.fr);
    if (!key || knownSet.has(key)) return c;
    const bare = stripAccents(key);
    const limit = bare.length >= 8 ? 2 : 1;
    let best: { fr: string; d: number } | null = null;
    let tie = false;
    for (const k of plain) {
      if (Math.abs(k.key.length - bare.length) > limit) continue;
      const d = levenshtein(k.key, bare);
      if (d > limit || !glossesAgree(c.en, k.en)) continue;
      if (!best || d < best.d) {
        best = { fr: k.fr, d };
        tie = false;
      } else if (d === best.d && k.fr !== best.fr) tie = true;
    }
    return best && !tie ? { ...c, fr: best.fr } : c;
  });
}
