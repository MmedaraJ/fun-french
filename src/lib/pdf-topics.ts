// What a textbook PDF teaches, topic by topic. Headings ("Unité 3", "Leçon 5", big titles) start
// topics; inside each topic, vocabulary lists, French example sentences, dialogue lines and key
// words become card candidates (through the parsers in ./parse), and the grammar it explains is
// mapped to the app's lessons. Pure: the lines come from ./pdf-layout (text layer) or OCR.
import { LESSONS } from '../data/grammar/lessons';
import { hasArticle, normalizeAnswer, splitArticle, stripAccents, wordCount } from './french';
import {
  contentWordIndices,
  isInfinitive,
  languageScore,
  looksSwapped,
  lowerHead,
  makeCandidate,
  pairsToCandidates,
  parseBilingual,
  parseList,
  segmentText,
  selectedPhrases,
  splitSentences,
  type Candidate,
  type ParsedPair,
} from './parse';
import { NEW_BLOCK, type PdfLine } from './pdf-layout';

export interface PdfPage {
  page: number;
  /** Height in the units of the line positions; 0 for scanned pages. */
  height: number;
  lines: PdfLine[];
  /** Read by OCR. */
  ocr?: boolean;
}

/** Where an item came from: a printed vocabulary list, the words of the text, or a sentence. */
export type ItemGroup = 'vocab' | 'words' | 'sentences';

export interface TopicItem extends Candidate {
  group: ItemGroup;
}

export interface Topic {
  title: string;
  from: number;
  to: number;
  emoji: string;
  items: TopicItem[];
  /** Lesson ids of the grammar this topic explains. */
  grammar: string[];
}

export interface Section {
  heading?: string;
  lines: PdfLine[];
}

export interface RawTopic {
  title: string;
  key: string;
  from: number;
  to: number;
  sections: Section[];
}

/** Key words taken from the running text of one topic, at most. */
export const MAX_KEY_WORDS = 40;

const words = (s: string) => wordCount(s.replace(/\s+[–—-]\s+/g, ' '));
const flat = (s: string) => s.replace(/\s+/g, ' ').trim();
const fold = (s: string) => stripAccents(s.toLowerCase()).replace(/[’`]/g, "'");

// ---------------------------------------------------------------- headings

const STRUCT_WORD = /^(unit[ée]s?|units?|le[cç]ons?|lessons?|chapitres?|chapters?|modules?|dossiers?|s[ée]quences?|[ée]tapes?|th[èe]mes?|parties|partie|parts?|[ée]pisodes?|fiches?)(?!\p{L})/iu;
// uppercase only for roman numerals: "Thème civil" is not "Thème C…"
const STRUCT_NUM = /^\s*(?:n[°o]\s*)?(\d{1,3}|[IVXLC]{1,6})(?![\p{L}\d])/u;

const SECTION =
  /^(?:\d{1,2}[.)]?\s*)?(vocabulaire|lexique|les mots|mots (?:utiles|nouveaux|cl[ée]s)|expressions?(?: utiles| cl[ée]s)?|phrases? utiles|grammaire|point grammaire|conjugaison|phon[ée]tique|prononciation|dialogues?|communication|culture|civilisation|compr[ée]hension(?: orale| [ée]crite)?|production(?: orale| [ée]crite)?|[àa] retenir|retenez|bilan|r[ée]visions?|exercices?|activit[ée]s?|entra[îi]nement|pratique|lecture|[ée]coute|[ée]criture|m[ée]mo|rappel|[àa] savoir|vocabulary|grammar|useful (?:words|phrases|expressions)|key (?:words|phrases|vocabulary)|word ?list|glossaire|glossary|sommaire|table des mati[èe]res|contents|index|corrig[ée]s?|solutions|answer key)(?!\p{L})/iu;

/** Sections with nothing to learn from: contents pages, answer keys. */
const SKIP_SECTION = /^(?:sommaire|table des mati[èe]res|contents|index|corrig[ée]s?|solutions|answer key)/i;

const VOCAB_SECTION = /^(?:\d{1,2}[.)]?\s*)?(vocabulaire|lexique|les mots|mots |expressions?|phrases? utiles|vocabulary|useful|key|word ?list|glossa)/i;

const ACCENTED_WORDS: Record<string, string> = { unite: 'Unité', unites: 'Unités', lecon: 'Leçon', lecons: 'Leçons', theme: 'Thème', sequence: 'Séquence', etape: 'Étape', episode: 'Épisode' };

function structure(text: string): { word: string; num: string; rest: string } | null {
  const t = flat(text);
  const w = STRUCT_WORD.exec(t);
  if (!w) return null;
  const n = STRUCT_NUM.exec(t.slice(w[0].length));
  if (!n) return null;
  return { word: w[1], num: n[1], rest: t.slice(w[0].length + n[0].length).trim() };
}

/** Trims separators and turns ALL CAPS into sentence case. */
function tidy(text: string): string {
  let s = flat(text).replace(/^[\s:.,;·|/•–—-]+|[\s:,;·|/•–—-]+$/g, '');
  if (s.length > 3 && s === s.toUpperCase() && /\p{Lu}{2}/u.test(s)) s = s[0] + s.slice(1).toLowerCase();
  return s;
}

function headWord(word: string): string {
  const w = word.toLowerCase();
  return ACCENTED_WORDS[stripAccents(w)] ?? w[0].toUpperCase() + w.slice(1);
}

/** "Unité 3", "LEÇON 5 – Au café", "Chapter IV: Shopping"; not contents lines ("Unité 3 ..... 34"). */
export function topicHeading(text: string): string | null {
  const s = structure(text);
  if (!s || words(text) > 12) return null;
  const rest = s.rest.replace(/^[\s:.,;·|/•–—-]+/, '').trim();
  if (/\.{3,}|…{2,}|(?:\s\.){3,}/.test(rest)) return null;
  if (/\p{L}/u.test(rest) && /\s\d{1,3}$/.test(rest)) return null;
  if (/[.!?]$/.test(rest) && words(rest) > 6) return null;
  const head = `${headWord(s.word)} ${s.num}`;
  return rest ? `${head} · ${tidy(rest)}` : head;
}

/** "Vocabulaire", "Grammaire : le passé composé", "Exercice 3". */
function sectionHeading(text: string): string | null {
  const t = flat(text);
  if (words(t) > 9 || !SECTION.test(t) || (/\.$/.test(t) && words(t) > 3)) return null;
  return tidy(t).slice(0, 80);
}

const isCaps = (t: string) => {
  const letters = t.replace(/[^\p{L}]/gu, '');
  return letters.length >= 4 && words(t) <= 8 && letters.replace(/[^\p{Lu}]/gu, '').length >= 0.85 * letters.length;
};

/** A line that looks like a title by its size or its capitals. */
function looksLikeHeading(line: PdfLine, body: number): boolean {
  const t = flat(line.text);
  if (words(t) > 12 || !/\p{L}{3}/u.test(t) || /[,;]$/.test(t) || !/^[\p{Lu}\d«"“]/u.test(t)) return false;
  if ((line.size > 0 && body > 0 && line.size >= 1.18 * body) || isCaps(t)) return !linePairs(t);
  return false;
}

/** The size from which a line is a topic title, when the PDF has no "Unité 3"-style headings. */
function titleSize(pages: PdfPage[], body: number): number {
  if (!body) return Infinity;
  const sizes: number[] = [];
  for (const p of pages) {
    for (const l of p.lines) {
      const t = flat(l.text);
      if (l.size >= 1.4 * body && words(t) <= 12 && /\p{L}{3}/u.test(t) && !SECTION.test(t) && !linePairs(t)) sizes.push(l.size);
    }
  }
  if (!sizes.length) return Infinity;
  const top = Math.max(...sizes) * 0.9;
  // big labels all over the pages (a picture dictionary) are not titles
  return sizes.filter((s) => s >= top).length > Math.max(6, pages.length * 1.5) ? Infinity : top;
}

/** The most common text size: the body text. */
function bodySize(pages: PdfPage[]): number {
  const counts = new Map<number, number>();
  for (const p of pages) for (const l of p.lines) if (l.size > 0) counts.set(Math.round(l.size * 2) / 2, (counts.get(Math.round(l.size * 2) / 2) ?? 0) + l.text.length);
  return [...counts].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 0;
}

// ---------------------------------------------------------------- page furniture

const COPYRIGHT = /©|\bcopyright\b|photocopie|reproduction (?:interdite|autoris)|tous droits r[ée]serv|all rights reserved|\bisbn\b|www\.|https?:\/\//i;
const PAGE_NUMBER = /^(?:p(?:age)?\.?\s*)?\d{1,4}(?:\s*(?:\/|sur|of)\s*\d{1,4})?$/i;
const furnitureKey = (t: string) => fold(t).replace(/\d+/g, '#').replace(/[^\p{L}#]+/gu, ' ').trim();
const withoutPageNumber = (t: string) => flat(t).replace(/^\d{1,4}\s*[|·•–—-]?\s*/, '').replace(/\s*[|·•–—-]?\s*\d{1,4}$/, '');

/**
 * Drops page numbers, copyright lines and running heads/feet (text repeated in the margins of
 * many pages). A running head that names a unit ("Unité 3 · Au restaurant") is kept per page:
 * it tells which topic a page belongs to when the page itself has no heading.
 */
export function stripFurniture(pages: PdfPage[]): { pages: PdfPage[]; running: Map<number, string> } {
  const inMargin = (p: PdfPage, l: PdfLine, i: number) => (p.height > 0 ? l.y < p.height * 0.085 || l.y > p.height * 0.915 : i < 2 || i >= p.lines.length - 2);
  const seen = new Map<string, Set<number>>();
  for (const p of pages) {
    p.lines.forEach((l, i) => {
      if (!inMargin(p, l, i)) return;
      const k = furnitureKey(l.text);
      if (k.replace(/[#\s]/g, '').length < 3) return;
      if (!seen.has(k)) seen.set(k, new Set());
      seen.get(k)!.add(p.page);
    });
  }
  const repeated = (k: string) => {
    const n = seen.get(k)?.size ?? 0;
    return pages.length >= 3 && n >= 3 && n >= 0.25 * pages.length;
  };
  const running = new Map<number, string>();
  const out = pages.map((p) => ({
    ...p,
    lines: p.lines.filter((l, i) => {
      const t = flat(l.text);
      if (!t || COPYRIGHT.test(t)) return false;
      if (!inMargin(p, l, i)) return true;
      if (PAGE_NUMBER.test(t)) return false;
      if (!repeated(furnitureKey(t))) return true;
      // "Unité 4" keeps its number; "34 | Unité 4 · En ville" loses the page number
      const title = topicHeading(t) ?? topicHeading(withoutPageNumber(t));
      if (title && !running.has(p.page)) running.set(p.page, title);
      return false;
    }),
  }));
  return { pages: out, running };
}

// ---------------------------------------------------------------- topics

/** Same unit, however it's printed: "UNITÉ 3", "Unité 3 · Au restaurant", "Unite 3". */
export function topicKey(title: string): string {
  const s = structure(title);
  if (s) return `${fold(s.word).replace(/s$/, '')} ${s.num.toLowerCase()}`;
  return fold(title).replace(/[^\p{L}\d]+/gu, ' ').trim();
}

/** A readable title from a file name: "unite_3-au-restaurant.pdf" -> "Unite 3 au restaurant". */
export function fileTitle(name: string): string {
  const t = flat(name.replace(/\.pdf$/i, '').replace(/[_-]+/g, ' '));
  return t ? t[0].toUpperCase() + t.slice(1) : 'Mon PDF';
}

/** The subtitle on the line after a bare "Unité 3" heading. */
function isSubtitle(next: PdfLine, heading: PdfLine, body: number): boolean {
  const t = flat(next.text);
  if (!t || words(t) > 8 || SECTION.test(t) || topicHeading(t) || linePairs(t) || /[.!?;,]$/.test(t) || !/^[\p{Lu}«"“]/u.test(t)) return false;
  if (next.size > 0 && heading.size > 0) return next.size >= 1.15 * body || (next.size >= 0.9 * heading.size && next.gap < 2.5);
  // scanned pages: no sizes, so only a short line without punctuation in the middle
  return words(t) <= 6 && !/[:;]/.test(t);
}

/** The first line of a document without headings, when it reads like a title ("Verbes en -er"). */
function openingTitle(pages: PdfPage[]): { title: string; line: PdfLine } | null {
  const line = pages.find((p) => p.lines.length)?.lines[0];
  if (!line) return null;
  const t = flat(line.text);
  const sc = languageScore(t);
  if (words(t) > 7 || (t.match(/\p{L}/gu) ?? []).length < 4 || /[.!?:;,]$/.test(t) || !/^\p{Lu}/u.test(t) || SECTION.test(t) || linePairs(t) || sc.en > sc.fr) return null;
  return { title: tidy(t), line };
}

/**
 * Splits the pages into topics. "Unité 3"-style headings start topics when the PDF has them;
 * otherwise the biggest titles do. Section headings ("Vocabulaire", "Grammaire") split a topic
 * into sections. Topics that come back later (a unit's exercises) are merged into one.
 */
export function splitTopics(input: PdfPage[], fallbackTitle: string): RawTopic[] {
  const { pages, running } = stripFurniture(input);
  const body = bodySize(pages);
  const hasStructure = pages.some((p) => p.lines.some((l) => topicHeading(l.text)));
  const bigTitle = hasStructure ? Infinity : titleSize(pages, body);
  const opening = !hasStructure && bigTitle === Infinity ? openingTitle(pages) : null;
  const topics: RawTopic[] = [];
  // (cast: `start` reassigns it, which control-flow narrowing can't see)
  let cur = null as RawTopic | null;

  const start = (title: string, page: number): RawTopic => {
    const key = topicKey(title);
    if (cur && cur.key === key) {
      if (title.length > cur.title.length) cur.title = title;
      return cur;
    }
    // nothing read under the previous title yet (a running head, then the page's own heading)
    if (cur && !cur.sections.some((s) => s.lines.length)) {
      cur.title = title;
      cur.key = key;
      cur.from = page;
      cur.to = page;
      return cur;
    }
    cur = { title, key, from: page, to: page, sections: [{ lines: [] }] };
    topics.push(cur);
    return cur;
  };

  for (const p of pages) {
    const run = running.get(p.page);
    const ownHeading = p.lines.some((l) => topicHeading(l.text) || l.size >= bigTitle);
    if (run && !ownHeading && (!cur || topicKey(run) !== cur.key)) start(run, p.page);
    for (let i = 0; i < p.lines.length; i++) {
      const line = p.lines[i];
      if (line === opening?.line) {
        start(opening.title, p.page);
        continue;
      }
      const text = flat(line.text);
      let title = topicHeading(text) ?? (line.size >= bigTitle && looksLikeHeading(line, body) ? tidy(text) : null);
      if (title) {
        const next = p.lines[i + 1];
        if (!title.includes('·') && next && isSubtitle(next, line, body)) {
          title = `${title} · ${tidy(next.text)}`;
          i++;
        }
        start(title.slice(0, 80), p.page);
        continue;
      }
      const topic: RawTopic = cur ?? start(run ?? fallbackTitle, p.page);
      topic.to = p.page;
      const section = sectionHeading(text) ?? (looksLikeHeading(line, body) ? tidy(text) : null);
      if (section) topic.sections.push({ heading: section, lines: [] });
      else topic.sections[topic.sections.length - 1].lines.push(line);
    }
  }

  const merged = new Map<string, RawTopic>();
  for (const t of topics) {
    const m = merged.get(t.key);
    if (!m) merged.set(t.key, t);
    else {
      m.sections.push(...t.sections);
      m.from = Math.min(m.from, t.from);
      m.to = Math.max(m.to, t.to);
      if (t.title.length > m.title.length) m.title = t.title;
    }
  }
  return [...merged.values()];
}

// ---------------------------------------------------------------- lines

type PairMode = 'anchored' | 'sep' | 'scored';

const BULLET = /^\s*(?:[-–—*•·▪◦►▸✓✔☐□❑]|\(?\d{1,3}[.)]|\(?[a-h][.)])\s+/i;
const SEPARATOR = /\t|=|[–—]| - | \| |:\s|;|->|=>|→/;
const BLANK = /_{2,}|…{2,}|\.{4,}|(?:\.\s){3,}|\(\s*\)|\[\s*\]|\(\s*\d{1,2}\s*\)|\[\s*\d{1,2}\s*\]|\s(?:\.{3}|…)\s+\p{Ll}/u;
const CHOICES = /\(\s*[\p{L}'’-]+(?:\s*\/\s*[\p{L}'’-]+)*\s*\)/u;
const LEVEL = /\b(?:niveaux?|levels?)\s*:?\s*[ABC][12]\b|\b(?:DELF|DALF|CECRL?|CEFR)\b/i;
const SPEAKER = /^([\p{Lu}][\p{L}'’.-]*(?:\s+[\p{L}'’.-]+){0,2})\s*:\s+(?=\S)/u;

// Exercise instructions: "Complétez…", "Associez…", "Écoutez et répétez." Only the vous-form of everyday
// verbs (a dialogue may say "Écoute !" or "Regarde !"), and the vocabulary itself can be an infinitive.
const EXERCISE_VERBS = 'compl[èée]t|associ|coch|soulign|entour|reli|conjugu|num[ée]rot|barr|transform|remplac|corrig|r[ée][ée]cout|recopi|retrouv|indiqu|ordonn|justifi|identifi|rel[èe]v|r[ée]dig|v[ée]rifi';
const FR_INSTRUCTION = new RegExp(
  `^(?:(?:${EXERCISE_VERBS})(?:ez|e)|(?:[ée]cout|regard|observ|imagin|pr[ée]sent|discut|devin|mim|compar|utilis|ajout|jou|parl|travaill|racont|pos|not|trouv|class|r[ée]p[ée]t)ez|lisez|relisez|[ée]crivez|r[ée]pondez|mettez|remettez|choisissez|d[ée]crivez|traduisez|dites|faites|prenez)(?!\\p{L})`,
  'iu',
);

const EN_INSTRUCTION = new Set(
  'complete write read listen match answer translate fill choose underline circle tick look find use ask say describe repeat work put give make change rewrite correct check compare talk discuss practise practice copy label draw number order cross join link add replace select study learn remember review revise try imagine think decide explain prepare present now then next first finally example exercise activity unit lesson page see note'.split(' '),
);

// grammar words: explanations, not sentences or words to learn
const META =
  /(?:^|[^\p{L}])(?:verbes?|sujets?|participes?|auxiliaires?|infinitifs?|conjugaisons?|conjugu\p{L}*|terminaisons?|pronoms?|masculins?|f[ée]minins?|singuliers?|pluriels?|accords?|n[ée]gations?|interrogati\p{L}+|imparfait|pass[ée] compos[ée]|plus-que-parfait|futur simple|futur proche|conditionnel|subjonctif|imp[ée]ratif|adjectifs?|adverbes?|pr[ée]positions?|compl[ée]ments?|COD|COI)(?!\p{L})/iu;

const SUBJECTS = new Set(["je", "j'", 'tu', 'il', 'elle', 'on', 'nous', 'vous', 'ils', 'elles', 'ne', "n'", 'me', "m'", 'te', "t'", 'se', "s'", 'y']);

const PRENOMINAL = new Set(
  'petit petite petits petites grand grande grands grandes bon bonne bons bonnes beau bel belle beaux joli jolie jeune jeunes vieux vieil vieille nouveau nouvel nouvelle gros grosse mauvais mauvaise premier première dernier dernière autre meilleur meilleure demi'.split(' '),
);

const firstWord = (t: string) => fold(t).match(/\p{L}+/u)?.[0] ?? '';
const isTerminal = (t: string) => /[.!?…](?:\s*["»”’)\]])*$/.test(t.trim());

type Entry = { pairs: ParsedPair[]; mode: PairMode };
const pairCache = new Map<string, Entry | null>();

function parseEntry(t: string): Entry | null {
  if (!/\p{L}{2}/u.test(t) || words(t) > 24) return null;
  const anchored = parseBilingual(t, 'anchored');
  if (anchored?.length) return { pairs: anchored, mode: 'anchored' };
  const pairs = parseList(t);
  return pairs?.length ? { pairs, mode: SEPARATOR.test(t) ? 'sep' : 'scored' } : null;
}

/**
 * A vocabulary entry on one line, by the list parsers: "le pain – bread", "Abaisser To lower",
 * "pomme   apple". Cells side by side ("le pain – bread   la pomme – apple") are read one by one.
 */
function linePairs(text: string, cells: string[] = []): Entry | null {
  const t = text.trim();
  const key = cells.length > 1 ? cells.join('\u0000') : t;
  if (pairCache.has(key)) return pairCache.get(key)!;
  let entry: Entry | null = null;
  if (cells.length > 1) {
    const each = cells.map((c) => parseEntry(c.replace(BULLET, '').trim()));
    if (each.every(Boolean)) {
      const modes = each.map((e) => e!.mode);
      entry = { pairs: each.flatMap((e) => e!.pairs), mode: modes.includes('scored') ? 'scored' : modes.every((m) => m === 'anchored') ? 'anchored' : 'sep' };
    }
  }
  entry ??= parseEntry(t);
  if (pairCache.size > 20_000) pairCache.clear();
  pairCache.set(key, entry);
  return entry;
}

/** French on one side, its English meaning on the other; not a sentence that happens to have a colon or a dash. */
function plausiblePair(fr: string, en: string, mode: PairMode, lenient: boolean): boolean {
  if (!/\p{L}{2}/u.test(fr) || !/\p{L}/u.test(en) || /\d/.test(fr)) return false;
  if (words(fr) > 8 || words(en) > 12 || fr.length > 70 || en.length > 90) return false;
  if (SECTION.test(fr) || structure(fr) || /^(?:ex(?:ercice)?|activit[ée]|page|p)\b\.?\s*\d/i.test(fr)) return false;
  if (EN_INSTRUCTION.has(firstWord(fr)) || BLANK.test(fr) || BLANK.test(en)) return false;
  // a sentence on one side only: prose with a colon in it ("Attention : on dit…")
  const endFr = isTerminal(fr);
  const endEn = isTerminal(en);
  if ((endEn && !endFr && words(en) > 3) || (endFr && !endEn && words(fr) > 6)) return false;
  const f = languageScore(fr);
  const e = languageScore(en);
  if (f.en > f.fr + 1) return false;
  // the meaning must not be French itself; English words can look a bit French ("croissant", "question")
  if (e.fr - e.en >= 3 || (e.fr >= 2 && e.en === 0 && words(en) > 1)) return false;
  if (mode === 'scored') {
    // no separator: the French side has to look French, unless it sits in a clear list
    const looksFrench = f.fr > f.en || isInfinitive(fr) || hasArticle(fr);
    const line = languageScore(`${fr} ${en}`);
    if (!looksFrench && (!lenient || line.en > line.fr + 2)) return false;
  }
  return true;
}

interface Prepared {
  line: PdfLine;
  text: string;
  entry: Entry | null;
  english: boolean;
}

function prepare(line: PdfLine): Prepared | null {
  const text = line.text.replace(BULLET, '').trim();
  const letters = (text.match(/\p{L}/gu) ?? []).length;
  if (letters < 2 || PAGE_NUMBER.test(text) || letters < 0.45 * text.replace(/\s/g, '').length) return null;
  // worksheet labels ("Fiche de vocabulaire – niveau A2") and contents lines ("Unité 2 Le week-end ........ 12")
  if (LEVEL.test(text)) return null;
  if (/\.{4,}|…{2,}|(?:\. ){3,}/.test(text) && /\d\s*$/.test(text)) return null;
  // "Paul : Oui !" is a dialogue line, not a word and its meaning
  const speaker = SPEAKER.exec(text);
  const dialogue = !!speaker && words(speaker[1]) <= 3 && isTerminal(text);
  const s = languageScore(text);
  return { line, text, entry: dialogue ? null : linePairs(text, line.cells), english: s.en > s.fr && s.en >= 3 };
}

/** A French sentence worth a card: complete, 3–22 words, no blanks to fill, not an instruction or a grammar rule. */
export function learnableSentence(s: string): boolean {
  const t = s.trim();
  const n = t.split(/\s+/).filter((w) => /\p{L}/u.test(w)).length;
  if (n < 3 || n > 22 || !isTerminal(t) || !/^[«"“(]?\s*\p{Lu}/u.test(t)) return false;
  if (BLANK.test(t) || CHOICES.test(t) || FR_INSTRUCTION.test(t.replace(/^[«"“(\s]+/, '')) || META.test(t) || COPYRIGHT.test(t) || /\d{3,}/.test(t)) return false;
  const sc = languageScore(t);
  return sc.fr > sc.en && sc.fr >= 2 && sc.en * 2 <= sc.fr;
}

/** An English line under a French sentence is its translation (not an instruction). */
function translationOf(fr: string, line: string): string | null {
  const en = flat(line).replace(/^[([«"“]+|[)\]»"”]+$/g, '').trim();
  if (wordCount(en) < 2 || EN_INSTRUCTION.has(firstWord(en))) return null;
  const s = languageScore(en);
  if (s.en <= s.fr) return null;
  const ratio = en.length / Math.max(1, fr.length);
  return ratio >= 0.4 && ratio <= 2.5 ? en : null;
}

/** "le lit", "la gare", "se lever": a picture label or a word on its own. */
function isLabel(t: string): boolean {
  const s = flat(t);
  if (words(s) > 4 || /[.!?:;,]$/.test(s) || /\d/.test(s) || SECTION.test(s)) return false;
  if (!(hasArticle(s) || isInfinitive(s))) return false;
  const sc = languageScore(s);
  return sc.fr >= sc.en;
}

// ---------------------------------------------------------------- key words

/** Content words of the running text, the way AddText pre-selects them, minus what makes a poor card. */
export function keyWords(sentences: string[], limit = MAX_KEY_WORDS): string[] {
  if (!sentences.length) return [];
  const { segments } = segmentText(sentences.join('\n'));
  const selected = contentWordIndices(segments);
  const ws = segments.filter((s) => s.type === 'word');
  ws.forEach((w, k) => {
    const prev = ws[k - 1]?.sentence === w.sentence ? ws[k - 1] : undefined;
    const lower = w.text.toLowerCase();
    const bare = lower.replace(/^\p{L}{1,2}'/u, '');
    const drop =
      (!!prev && /^\p{Lu}/u.test(w.text)) || // a name inside a sentence
      (!!prev && SUBJECTS.has(prev.text.toLowerCase())) || // a conjugated verb
      /^(?:j|n|m|t|qu)'/.test(lower) ||
      (/^s'/.test(lower) && !isInfinitive(lower)) ||
      bare.length < 3 ||
      META.test(lower) ||
      STRUCT_WORD.test(lower) ||
      languageScore(lower).en > languageScore(lower).fr;
    if (drop) selected.delete(w.wordIndex!);
  });
  const counts = new Map<string, { text: string; n: number; at: number }>();
  let at = 0;
  for (const phrase of selectedPhrases(segments, selected)) {
    // every word is pre-selected, so neighbours merge ("le serveur apporte"): split them again,
    // except an adjective that goes before its noun ("le petit déjeuner")
    const { article, noun } = splitArticle(phrase);
    const parts = noun.split(' ');
    const head = PRENOMINAL.has(parts[0].toLowerCase()) && parts.length > 1 ? 2 : 1;
    const first = parts.slice(0, head).join(' ');
    const pieces = [article ? (article.endsWith("'") ? article + first : `${article} ${first}`) : first, ...parts.slice(head)];
    for (const p of pieces) {
      if (p.length > 40 || /\d/.test(p)) continue;
      const k = normalizeAnswer(p);
      const c = counts.get(k);
      if (c) c.n++;
      else counts.set(k, { text: p, n: 1, at: at++ });
    }
  }
  // nouns with their article and infinitives make the best cards; a bare word must come back at least
  // twice (-re words are mostly nouns: "sucre", "livre", so only -er, -ir and -oir count as infinitives)
  const infinitive = (t: string) => isInfinitive(t) && !/re$/i.test(t);
  const score = (c: { text: string; n: number }) => c.n + (hasArticle(c.text) ? 2 : 0) + (infinitive(c.text) ? 1 : 0);
  return [...counts.values()]
    .filter((c) => hasArticle(c.text) || infinitive(c.text) || c.n >= 2)
    .sort((a, b) => score(b) - score(a) || a.at - b.at)
    .slice(0, limit)
    .map((c) => c.text);
}

// ---------------------------------------------------------------- extraction

function joinable(para: string, lastLine: string, next: Prepared): boolean {
  if (next.line.gap > 1.7 && next.line.gap !== NEW_BLOCK) return false;
  if (isTerminal(para) || /[:»"]$/.test(para.trim())) return false;
  const t = next.text;
  return /^[\p{Ll}(«"“]/u.test(t) || /[,;-]$/.test(para.trim()) || words(lastLine) >= 6;
}

/** Card candidates of one topic: its vocabulary lists, labels, sentences and key words. */
export function extractTopic(topic: RawTopic): { items: TopicItem[]; text: string } {
  const vocab: TopicItem[] = [];
  const labels: TopicItem[] = [];
  const sentences: TopicItem[] = [];
  const prose: string[] = [];
  const textParts = [topic.title];

  for (const section of topic.sections) {
    if (section.heading) textParts.push(section.heading);
    if (section.heading && SKIP_SECTION.test(section.heading)) continue;
    const lenientSection = !!section.heading && VOCAB_SECTION.test(section.heading);
    const lines = section.lines.map(prepare).filter((p): p is Prepared => !!p);
    textParts.push(...lines.map((l) => l.text));

    // 1. vocabulary: runs of entry lines, oriented together (French left or right)
    const isEntry = new Array<boolean>(lines.length).fill(false);
    for (let i = 0; i < lines.length; ) {
      if (!lines[i].entry) {
        i++;
        continue;
      }
      let j = i;
      while (j < lines.length && lines[j].entry) j++;
      const run = lines.slice(i, j);
      const lenient = lenientSection || run.length >= 2;
      const swap = looksSwapped(run.flatMap((l) => l.entry!.pairs));
      run.forEach((l, k) => {
        const { pairs, mode } = l.entry!;
        if (mode === 'scored' && !lenient) return;
        const ok = pairs.filter((p) => (swap ? plausiblePair(p.right, p.left, mode, lenient) : plausiblePair(p.left, p.right, mode, lenient)));
        if (!ok.length) return;
        isEntry[i + k] = true;
        for (const c of pairsToCandidates(ok, swap)) vocab.push({ ...c, group: c.kind === 'sentence' ? 'sentences' : 'vocab' });
      });
      i = j;
    }

    // 2. everything else: French prose (paragraphs -> sentences), labels, translations
    let para = '';
    let lastLine = '';
    let lastSentence: TopicItem | null = null;
    const flush = () => {
      if (!para) return;
      let prev: TopicItem | null = null;
      for (const raw of splitSentences(para)) {
        const s = raw.replace(BULLET, '').trim();
        const sc = languageScore(s);
        if (sc.en > sc.fr) {
          // "(I'd like a coffee.)" right after its French sentence
          const en = prev && !prev.en ? translationOf(prev.fr, s) : null;
          if (prev && en) prev.en = en;
          continue;
        }
        if (sc.fr > sc.en && !META.test(s)) prose.push(s);
        if (learnableSentence(s)) {
          prev = { ...makeCandidate(s), group: 'sentences' };
          sentences.push(prev);
        } else prev = null;
      }
      lastSentence = isTerminal(para) ? prev : null;
      para = '';
    };

    lines.forEach((l, i) => {
      if (isEntry[i]) {
        flush();
        lastSentence = null;
        return;
      }
      if (l.english) {
        flush();
        const en = lastSentence && !lastSentence.en ? translationOf(lastSentence.fr, l.text) : null;
        if (lastSentence && en) lastSentence.en = en;
        lastSentence = null;
        return;
      }
      // cells side by side: French | English sentence pairs, or several labels
      if (l.line.cells.length > 1) {
        flush();
        const cells = l.line.cells.map((c) => c.replace(BULLET, '').trim()).filter(Boolean);
        const en = cells.length === 2 && learnableSentence(cells[0]) ? translationOf(cells[0], cells[1]) : null;
        if (en) {
          sentences.push({ ...makeCandidate(cells[0], en), group: 'sentences' });
          prose.push(cells[0]);
          return;
        }
        for (const c of cells) {
          if (isLabel(c)) labels.push({ ...makeCandidate(lowerHead(c)), group: 'words' });
          else {
            para = c;
            flush();
          }
        }
        return;
      }
      let text = l.text;
      const speaker = SPEAKER.exec(text);
      if (speaker && words(speaker[1]) <= 3 && words(text.slice(speaker[0].length)) >= 2) text = text.slice(speaker[0].length);
      if (!para && isLabel(text)) {
        labels.push({ ...makeCandidate(lowerHead(text)), group: 'words' });
        return;
      }
      if (para && joinable(para, lastLine, { ...l, text })) {
        para = /\p{L}-$/u.test(para) && /^\p{Ll}/u.test(text) ? para.slice(0, -1) + text : `${para} ${text}`;
      } else {
        flush();
        para = text;
      }
      lastLine = text;
    });
    flush();
  }

  // 3. key words of the running text that the lists don't already give
  const known = new Set([...vocab, ...labels].flatMap((c) => [normalizeAnswer(c.fr), normalizeAnswer(splitArticle(c.fr).noun)]));
  const extra = keyWords(prose)
    .filter((w) => !known.has(normalizeAnswer(w)) && !known.has(normalizeAnswer(splitArticle(w).noun)))
    .map((w) => ({ ...makeCandidate(w), group: 'words' as const }));

  // one card per French text; a later copy can still bring the English meaning
  const out: TopicItem[] = [];
  const byKey = new Map<string, TopicItem>();
  for (const item of [...vocab, ...labels, ...extra, ...sentences]) {
    const k = normalizeAnswer(item.fr);
    if (!k) continue;
    const had = byKey.get(k);
    if (had) {
      if (!had.en && item.en) had.en = item.en;
      continue;
    }
    byKey.set(k, item);
    out.push(item);
  }
  return { items: out, text: textParts.join('\n') };
}

// ---------------------------------------------------------------- grammar

const GRAMMAR: [string, RegExp][] = [
  ['bases-pronoms', /pronoms? (?:personnels? )?sujets?|subject pronouns?/],
  ['bases-etre', /\bverbe etre\b|\bverb (?:etre|to be)\b|conjugaison (?:du verbe |de )?etre\b/],
  ['bases-avoir', /\bverbe avoir\b|\bverb (?:avoir|to have)\b|conjugaison (?:du verbe |d')?avoir\b|expressions? avec avoir/],
  ['bases-aller-faire', /\bverbes? (?:aller|faire)\b|\bverbs? (?:aller|faire)\b|\baller et faire\b/],
  ['present-er', /verbes? (?:en |du (?:1er|premier) groupe |reguliers en )-?er\b|-er verbs?|\bpremier groupe\b|present de l'indicatif|\ble present\b/],
  ['present-er-changes', /verbes? en -?(?:cer|ger|eler|eter|yer)\b|changements? orthographiques|spelling[- ]changes?/],
  ['present-ir', /verbes? (?:en |du (?:2e|deuxieme) groupe )-?ir\b|-ir verbs?|deuxieme groupe|verbes? comme finir/],
  ['present-re', /verbes? en -?re\b|-re verbs?|verbes? comme (?:attendre|vendre)/],
  ['present-irreguliers', /verbes? irreguliers|irregular verbs?/],
  ['present-pronominaux', /verbes? pronominaux|verbes? reflechis|reflexive verbs?|pronominal verbs?/],
  ['questions-trois-facons', /\binterrogation\b|forme interrogative|phrases? interrogatives?|poser (?:une|des) questions?|asking questions|question forms?/],
  ['questions-mots', /mots? interrogatifs|adverbes? interrogatifs|question words?|interrogative words?/],
  ['questions-inversion', /\binversion\b/],
  ['questions-quel-lequel', /\bquel\b.{0,12}\bquelle\b|adjectifs? interrogatifs?|\blequel\b.{0,12}\blaquelle\b/],
  ['questions-quest-ce', /qu'est-ce que.{0,40}qu'est-ce qui|qu'est-ce qui.{0,40}qu'est-ce que/],
  ['negation-ne-pas', /\bnegation\b|forme negative|phrases? negatives?|negative (?:form|sentences?)|\bne\s*(?:\.{2,}|…|\+\s*verbe\s*\+)\s*pas\b/],
  ['negation-jamais-plus', /\bne\s*(?:\.{2,}|…|\+\s*verbe\s*\+)\s*(?:jamais|plus|rien|personne)\b/],
  ['futur-proche', /futur proche|near future|aller \+ (?:l')?infinitif|aller \+ (?:the )?infinitive/],
  ['passe-recent', /passe recent|recent past|venir de \+ (?:l')?infinitif/],
  ['pc-avoir', /passe compose|perfect tense/],
  ['pc-etre', /passe compose avec etre|(?:auxiliaire|avec|with) etre\b.{0,40}passe compose|passe compose.{0,60}(?:auxiliaire|avec|with) etre\b|verbes? de (?:mouvement|deplacement)|vandertramp|maison d'etre/],
  ['pc-accord', /accord du participe|participe passe.{0,30}accord|past participle agreement/],
  ['pc-pronominaux', /passe compose.{0,60}pronominaux|pronominaux.{0,60}passe compose/],
  ['pc-negation-questions', /passe compose.{0,40}(?:negation|negative|interrogati)|(?:negation|negative|interrogati).{0,40}passe compose/],
  ['imparfait', /\bimparfait\b|\bimperfect\b/],
  ['pc-ou-imparfait', /passe compose.{0,60}imparfait|imparfait.{0,60}passe compose/],
  ['futur-simple', /futur simple|\bfutur\b(?! proche| anterieur)|future tense|simple future/],
  ['futur-simple-irreguliers', /futur.{0,40}irreguliers|radicaux irreguliers|irregular (?:future )?stems/],
  ['conditionnel-present', /\bconditionnel\b(?! passe)|\bconditional\b(?! perfect)/],
  ['si-imparfait', /si \+ (?:l')?imparfait|phrases? (?:avec si|conditionnelles)|hypothese|if[- ]clauses?/],
  ['imperatif', /\bimperatif\b|\bimperative\b/],
  ['imperatif-pronominal', /imperatif negatif|imperatif.{0,40}pronominaux|negative imperatives?/],
  ['plus-que-parfait', /plus[- ]que[- ]parfait|pluperfect/],
  ['futur-anterieur', /futur anterieur|future perfect/],
  ['conditionnel-passe', /conditionnel passe|past conditional|conditional perfect/],
  ['subjonctif-formation', /\bsubjonctif\b|\bsubjunctive\b/],
  ['subjonctif-irreguliers', /subjonctif.{0,40}irreguliers|irregular subjunctives?/],
  ['subjonctif-emplois', /(?:emplois?|utilisations?|quand (?:utiliser|employer)).{0,30}subjonctif|subjonctif.{0,30}(?:emplois?|apres)/],
  ['subjonctif-passe', /subjonctif passe|past subjunctive/],
  ['passe-simple', /passe simple|past historic/],
];

const LESSON_ORDER = new Map(LESSONS.map((l, i) => [l.id, i]));

/** Lesson ids for the grammar a text explains ("le passé composé", "ne… pas", "l'imparfait"…), in learning-path order. */
export function detectGrammar(text: string): string[] {
  const t = fold(text).replace(/\s+/g, ' ');
  return GRAMMAR.filter(([id, re]) => LESSON_ORDER.has(id) && re.test(t))
    .map(([id]) => id)
    .sort((a, b) => LESSON_ORDER.get(a)! - LESSON_ORDER.get(b)!);
}

// ---------------------------------------------------------------- all together

const TOPIC_EMOJI: [RegExp, string][] = [
  [/restaurant|cafe|menu|repas|cuisine|recette/, '🍽️'],
  [/aliment|nourriture|courses|marche|boulangerie|fruit|legume|manger/, '🥖'],
  [/famille|parents|enfants/, '👨‍👩‍👧'],
  [/maison|logement|appartement|chambre|meuble/, '🏠'],
  [/vetement|habit|s'habiller|mode\b/, '👗'],
  [/ville|quartier|\brue\b|directions?\b/, '🏙️'],
  [/voyage|vacances|transport|train|avion|gare/, '✈️'],
  [/ecole|classe|etudes|universite/, '🏫'],
  [/travail|metier|profession|bureau|emploi/, '💼'],
  [/sport|loisir|temps libre|week-?end/, '⚽'],
  [/corps|sante|medecin|malade/, '🩺'],
  [/meteo|saison|climat|il fait/, '🌦️'],
  [/animal|animaux/, '🐾'],
  [/couleur/, '🎨'],
  [/nombre|chiffre/, '🔢'],
  [/achat|magasin|shopping|boutique|prix/, '🛍️'],
  [/salutation|bonjour|se presenter|presentations?|rencontre/, '👋'],
  [/heure|jours?\b|date|calendrier|semaine|mois/, '📅'],
  [/routine|journee|quotidien/, '⏰'],
  [/fete|anniversaire|noel/, '🎉'],
  [/musique|cinema|culture|art\b/, '🎭'],
  [/nature|environnement|campagne|\bmer\b|montagne/, '🌳'],
  [/technologie|internet|ordinateur|telephone/, '💻'],
  [/sentiment|emotion|amour|amitie/, '💖'],
];

export function topicEmoji(title: string): string {
  const t = fold(title);
  return TOPIC_EMOJI.find(([re]) => re.test(t))?.[1] ?? '📗';
}

/** Everything a PDF (or a page range of it) teaches: its topics with their items, and its grammar. */
export function readTopics(pages: PdfPage[], fileName: string): { topics: Topic[]; grammar: string[] } {
  const grammar = new Set<string>();
  const topics: Topic[] = [];
  for (const raw of splitTopics(pages, fileTitle(fileName))) {
    const { items, text } = extractTopic(raw);
    const g = detectGrammar(text);
    g.forEach((id) => grammar.add(id));
    if (items.length) topics.push({ title: raw.title, from: raw.from, to: raw.to, emoji: topicEmoji(raw.title), items, grammar: g });
  }
  return { topics, grammar: [...grammar].sort((a, b) => LESSON_ORDER.get(a)! - LESSON_ORDER.get(b)!) };
}

/** Page text for Claude, with page furniture removed and headings marked "#" (topic) and "##" (section). */
export function pageTexts(pages: PdfPage[]): Map<number, string> {
  const { pages: clean } = stripFurniture(pages);
  const body = bodySize(clean);
  const out = new Map<number, string>();
  for (const p of clean) {
    const lines = p.lines.map((l) => {
      const t = flat(l.text) === l.text ? l.text : l.text.trim();
      const topic = topicHeading(t);
      if (topic) return `# ${topic}`;
      if (sectionHeading(t) || looksLikeHeading(l, body)) return `## ${tidy(t)}`;
      return t;
    });
    out.set(p.page, lines.join('\n'));
  }
  return out;
}
