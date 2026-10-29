// Optional Claude helpers (translation, vocabulary extraction from text, photos and PDFs).
// The learner pastes their own API key in Settings; it stays in this browser and
// requests go straight from the device to the Claude API.
import type Anthropic from '@anthropic-ai/sdk';
import type { CardKind, Gender } from '../types';
import { isSingleEmoji } from './emoji';
import { fileToImage, renderImage, blobToDataUrl } from './images';
import { settings } from './settings';

export interface AiItem {
  fr: string;
  en: string;
  kind: CardKind;
  gender?: Gender;
  plural?: boolean;
  emoji?: string;
  note?: string;
  /** Photo extraction: the photo's main subject (a good card to attach the photo to). */
  main?: boolean;
}

export class AiError extends Error {}

/** Request the server-side refusal fallback; models without one simply ignore it. */
const FALLBACK_BETA = 'server-side-fallback-2026-07-01';

export function aiAvailable(): boolean {
  return !!settings().aiKey.trim();
}

async function client(key = settings().aiKey.trim()): Promise<Anthropic> {
  if (!key) throw new AiError('Add your Claude API key in Settings to use the magic helpers.');
  const { default: AnthropicClient } = await import('@anthropic-ai/sdk');
  // The key belongs to the learner and never leaves their device except to the API.
  return new AnthropicClient({ apiKey: key, dangerouslyAllowBrowser: true, maxRetries: 1, timeout: 90_000 });
}

function model(): string {
  return settings().aiModel || 'claude-opus-5-5';
}

/** Who the cards are for, from the level set in Réglages → Niveau. */
function learner(): string {
  const level = settings().minLevel;
  return level >= 3 ? 'an advanced (B2–C1) English-speaking learner' : level === 2 ? 'an English-speaking learner around A2–B1' : 'an English-speaking learner (beginner to intermediate)';
}

/** What to leave out when picking words for her: nothing she already knows at her level. */
function levelHint(): string {
  const level = settings().minLevel;
  if (level >= 3) return 'She is advanced: skip basic words any A2 learner knows (la maison, manger, bonjour, rouge…); prefer precise or less common vocabulary, idioms, linking words and sentences with advanced structures.';
  if (level === 2) return 'Skip the A1 basics (colours, numbers, greetings, family words).';
  return '';
}

/** Human-friendly message for any failure from the SDK. */
export async function friendlyAiError(e: unknown): Promise<string> {
  const { default: A } = await import('@anthropic-ai/sdk');
  if (e instanceof AiError) return e.message;
  if (e instanceof A.AuthenticationError) return 'That API key was refused. Check it in Settings.';
  if (e instanceof A.PermissionDeniedError) return 'This API key isn’t allowed to use that model.';
  if (e instanceof A.NotFoundError) return 'That model wasn’t found. Pick another one in Settings.';
  if (e instanceof A.RateLimitError) return 'Too many requests right now. Wait a moment and try again.';
  if (e instanceof A.APIConnectionTimeoutError) return 'Claude took too long to answer. Try again.';
  if (e instanceof A.APIConnectionError) return 'Couldn’t reach Claude. Are you online?';
  if (e instanceof A.BadRequestError) return 'Claude couldn’t handle that request. Try with less text or another photo.';
  if (e instanceof A.InternalServerError) return 'Claude is having a hiccup. Try again in a minute.';
  if (e instanceof A.APIError) return `Claude error (${e.status ?? '?'}). Try again.`;
  return 'Something went wrong with the AI helper.';
}

/** Checks a key (and model name) without spending tokens. */
export async function testAiKey(key: string, modelId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const c = await client(key.trim());
    await c.models.retrieve(modelId.trim() || 'claude-opus-5-5');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: await friendlyAiError(e) };
  }
}

// ---------------------------------------------------------------- schemas

async function schemas() {
  const { z } = await import('zod');
  const { betaZodOutputFormat } = await import('@anthropic-ai/sdk/helpers/beta/zod');
  const item = z.object({
    fr: z.string(),
    en: z.string(),
    kind: z.enum(['word', 'phrase', 'sentence']),
    gender: z.enum(['m', 'f', 'none']),
    plural: z.boolean(),
    emoji: z.string(),
    note: z.string(),
  });
  const photoItem = item.extend({ main: z.boolean() });
  const pdfTopic = z.object({ title: z.string(), titleEn: z.string(), emoji: z.string(), items: z.array(item) });
  return {
    translation: betaZodOutputFormat(z.object({ items: z.array(z.object({ index: z.number(), fr: z.string(), en: z.string() })) })),
    extraction: betaZodOutputFormat(z.object({ items: z.array(item) })),
    photo: betaZodOutputFormat(z.object({ items: z.array(photoItem) })),
    pdf: (lessonIds: [string, ...string[]]) => betaZodOutputFormat(z.object({ topics: z.array(pdfTopic), grammar: z.array(z.enum(lessonIds)) })),
  };
}

const RULES = `Rules for every item:
- "fr": correct French with accents. Nouns take their definite article (le, la, l', les): "la pomme", "l'arbre". Verbs in the infinitive. Adjectives in the masculine singular.
- "en": a short natural English meaning; no article for nouns ("apple"). When the source prints an English meaning, use it as printed.
- "kind": "word" for a single word (a noun with its article counts as a word), "phrase" for an expression of a few words, "sentence" for a full sentence.
- "gender": "m" or "f" for nouns, otherwise "none". "plural": true only for plural-only nouns such as "les lunettes".
- "emoji": exactly one emoji that clearly shows the meaning, or "" when none fits (abstract words, most sentences).
- "note": a very short hint if useful (feminine form "f: petite", "informal", "to a woman"...), else "".`;

function sanitize(raw: { fr: string; en: string; kind: string; gender: string; plural: boolean; emoji: string; note: string; main?: boolean }[]): AiItem[] {
  const seen = new Set<string>();
  const out: AiItem[] = [];
  for (const r of raw) {
    const fr = (r.fr ?? '').replace(/\s+/g, ' ').replace(/[’]/g, "'").trim().slice(0, 140);
    const en = (r.en ?? '').replace(/\s+/g, ' ').trim().slice(0, 180);
    if (!fr) continue;
    const key = fr.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const kind: CardKind = r.kind === 'phrase' || r.kind === 'sentence' ? r.kind : 'word';
    const emoji = r.emoji && isSingleEmoji(r.emoji) ? r.emoji.trim() : undefined;
    out.push({
      fr,
      en,
      kind,
      gender: kind === 'word' && (r.gender === 'm' || r.gender === 'f') ? r.gender : undefined,
      plural: kind === 'word' && r.plural ? true : undefined,
      emoji,
      note: r.note?.trim() ? r.note.trim().slice(0, 60) : undefined,
      main: r.main || undefined,
    });
  }
  return out;
}

function assertUsable(res: { stop_reason: string | null }) {
  if (res.stop_reason === 'refusal') throw new AiError('Claude declined this one. Try different text or another photo.');
  if (res.stop_reason === 'max_tokens') throw new AiError('That was too much at once. Try a shorter text.');
}

// ---------------------------------------------------------------- features

/** Fills the missing side of each pair, keeping the input order. */
export async function aiTranslate(items: { fr?: string; en?: string }[]): Promise<{ fr: string; en: string }[]> {
  if (!items.length) return [];
  try {
    const c = await client();
    const s = await schemas();
    const res = await c.beta.messages.parse({
      model: model(),
      max_tokens: 16000,
      betas: [FALLBACK_BETA],
      fallbacks: 'default',
      output_config: { effort: 'low', format: s.translation },
      system: 'You translate vocabulary for an English speaker learning French. Keep French nouns with their definite article when the English is a noun.',
      messages: [
        {
          role: 'user',
          content: `Fill in the missing side of each item (French "fr" or English "en"). Keep the given side unchanged and keep every index.\n\n${JSON.stringify(items.map((it, index) => ({ index, fr: it.fr ?? '', en: it.en ?? '' })))}`,
        },
      ],
    });
    assertUsable(res);
    const parsed = res.parsed_output;
    if (!parsed) throw new AiError('Claude’s answer couldn’t be read. Try again.');
    const byIndex = new Map(parsed.items.map((x) => [x.index, x]));
    return items.map((it, i) => {
      const r = byIndex.get(i);
      return { fr: (it.fr || r?.fr || '').trim(), en: (it.en || r?.en || '').trim() };
    });
  } catch (e) {
    throw new AiError(await friendlyAiError(e));
  }
}

/** Picks useful vocabulary, expressions and sentences out of a French text. */
export async function aiExtractFromText(text: string): Promise<AiItem[]> {
  const t = text.trim();
  if (!t) return [];
  try {
    const c = await client();
    const s = await schemas();
    const res = await c.beta.messages.parse({
      model: model(),
      max_tokens: 16000,
      betas: [FALLBACK_BETA],
      fallbacks: 'default',
      output_config: { effort: 'medium', format: s.extraction },
      system: `You help ${learner()} build French flashcards from material they are reading.`,
      messages: [
        {
          role: 'user',
          content: `From the text below, pick the most useful items to learn: nouns, verbs, adjectives and expressions, plus up to 8 short, useful sentences taken from it (fix obvious OCR mistakes). Skip names, numbers and very rare words. ${levelHint()} At most 30 items, most useful first. If the text is in English, give the French equivalents.\n\n${RULES}\n\n<text>\n${t.slice(0, 12000)}\n</text>`,
        },
      ],
    });
    assertUsable(res);
    if (!res.parsed_output) throw new AiError('Claude’s answer couldn’t be read. Try again.');
    return sanitize(res.parsed_output.items);
  } catch (e) {
    throw new AiError(await friendlyAiError(e));
  }
}

/**
 * Names what's in a photo, or transcribes a printed vocabulary list (keeping the
 * English meanings printed on the page), as flashcard items.
 */
export async function aiExtractFromImage(blob: Blob): Promise<AiItem[]> {
  try {
    const img = await fileToImage(blob);
    const jpeg = await renderImage(img, undefined, 1568, 0.88);
    const data = (await blobToDataUrl(jpeg)).replace(/^data:[^,]+,/, '');
    const c = await client();
    const s = await schemas();
    // A full textbook page can hold 90+ entries: stream so a long answer doesn't time out.
    const stream = c.beta.messages.stream({
      model: model(),
      max_tokens: 32000,
      betas: [FALLBACK_BETA],
      fallbacks: 'default',
      output_config: { effort: 'medium', format: s.photo },
      system: `You help ${learner()} build French flashcards from photos: things around them, and pages of their French books.`,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data } },
            {
              type: 'text',
              text: `If this photo shows a printed vocabulary list (French words with their English meanings, for example a textbook page of verbs), transcribe EVERY entry in reading order, column by column. Keep the English meaning exactly as printed on the page (several meanings joined with ", ", e.g. "to admit, to grant"); only fix obvious print or OCR slips. Verbs stay in the infinitive with gender "none". Skip page numbers, titles and footers. There is no limit on the number of entries; set "main" to false for all of them.

Otherwise, list the clearly visible things in the photo as French vocabulary (most prominent first, at most 15), plus any French text you can read in it as phrase or sentence items (menus, signs, labels). ${levelHint()} Mark exactly one item with "main": true for the photo's main subject; all others false.

${RULES}`,
            },
          ],
        },
      ],
    });
    const res = await stream.finalMessage();
    assertUsable(res);
    if (!res.parsed_output) throw new AiError('Claude’s answer couldn’t be read. Try again.');
    return sanitize(res.parsed_output.items);
  } catch (e) {
    throw new AiError(await friendlyAiError(e));
  }
}

// ---------------------------------------------------------------- PDFs

/** A PDF this small and short is sent whole (base64 adds a third; a request can carry 32 MB). */
const PDF_WHOLE_BYTES = 20 * 1024 * 1024;
const PDF_WHOLE_PAGES = 30;
/** Otherwise, page ranges: the text of pages that have one... */
const TEXT_PART_CHARS = 40_000;
const TEXT_PART_PAGES = 30;
/** ...and images of scanned pages. */
const SCAN_PART_PAGES = 8;

export interface AiPdfInput {
  name: string;
  file: Blob;
  pageCount: number;
  /** 1-based page range to read. */
  from: number;
  to: number;
  /** Text of each page that has a text layer (headings marked "#"); pages missing here are scans. */
  texts: Map<number, string>;
  /** Draws a scanned page as a JPEG. */
  renderPage: (page: number) => Promise<Blob>;
}

export interface AiPdfTopic {
  title: string;
  titleEn: string;
  emoji?: string;
  items: AiItem[];
}

export interface AiPdfResult {
  topics: AiPdfTopic[];
  /** Lesson ids from src/data/grammar/lessons.ts. */
  grammar: string[];
}

export type PdfPart =
  | { kind: 'pdf'; from: number; to: number }
  | { kind: 'text'; from: number; to: number; text: string }
  | { kind: 'scan'; from: number; to: number; pages: number[] };

/**
 * How a PDF goes to Claude: whole when it's small, otherwise in page ranges, as the extracted
 * text for pages that have one and as page images for scans.
 */
export function planPdfParts(input: Pick<AiPdfInput, 'file' | 'pageCount' | 'from' | 'to' | 'texts'>, whole = true): PdfPart[] {
  if (whole && input.from === 1 && input.to === input.pageCount && input.pageCount <= PDF_WHOLE_PAGES && input.file.size <= PDF_WHOLE_BYTES) {
    return [{ kind: 'pdf', from: 1, to: input.pageCount }];
  }
  const parts: PdfPart[] = [];
  for (let p = input.from; p <= input.to; p++) {
    const last = parts[parts.length - 1];
    const text = input.texts.get(p);
    if (text !== undefined) {
      const block = `<page number="${p}">\n${text}\n</page>\n`;
      if (last?.kind === 'text' && last.text.length + block.length <= TEXT_PART_CHARS && p - last.from < TEXT_PART_PAGES) {
        last.text += block;
        last.to = p;
      } else parts.push({ kind: 'text', from: p, to: p, text: block });
    } else if (last?.kind === 'scan' && last.pages.length < SCAN_PART_PAGES) {
      last.pages.push(p);
      last.to = p;
    } else parts.push({ kind: 'scan', from: p, to: p, pages: [p] });
  }
  return parts;
}

async function base64(blob: Blob): Promise<string> {
  return (await blobToDataUrl(blob)).replace(/^data:[^,]+,/, '');
}

async function partContent(part: PdfPart, input: AiPdfInput): Promise<Anthropic.Beta.BetaContentBlockParam[]> {
  if (part.kind === 'pdf') return [{ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: await base64(input.file) }, title: input.name }];
  if (part.kind === 'text') return [{ type: 'text', text: `<pages>\n${part.text}</pages>` }];
  const blocks: Anthropic.Beta.BetaContentBlockParam[] = [];
  for (const p of part.pages) {
    blocks.push({ type: 'text', text: `Page ${p}:` });
    blocks.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: await base64(await input.renderPage(p)) } });
  }
  return blocks;
}

function pdfPrompt(input: AiPdfInput, part: PdfPart, previous: string, lessons: string): string {
  const what = part.kind === 'pdf' ? `This is "${input.name}"` : `These are pages ${part.from}–${part.to} of "${input.name}"`;
  const before = previous ? ` The pages before ended in the topic "${previous}": if these pages continue it, use exactly that title.` : '';
  return `${what}, from a French textbook, workbook or handout that the learner is studying.${before}

Organise everything the pages teach by topic. A topic is a unit, lesson or chapter as printed, titled like the book (for example "Unité 3 · Au restaurant"); pages without a heading continue the current topic. For each topic, in page order, list:
- every vocabulary entry, with its English meaning exactly as printed (several meanings joined with ", ");
- the useful expressions it teaches;
- the French example sentences and dialogue lines worth learning, as complete sentences, with an English translation.
Skip exercise instructions and numbering, blanks such as ____ or (1), page numbers, headers and footers, and English that only explains. Fix obvious print or OCR slips, but add nothing that isn't on the pages.

"titleEn": the topic title in English. "emoji": one emoji for the topic, or "".
"grammar": the ids of the grammar points these pages explain or practise, from this list (empty if none):
${lessons}

${RULES}`;
}

const titleKey = (t: string) =>
  t
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/**
 * Lets Claude read a PDF (or a page range of it): topics as printed, each with its vocabulary,
 * expressions and sentences, plus the grammar lessons the pages teach. Big PDFs go in parts, one
 * request each; topics that continue from one part to the next are merged.
 */
export async function aiExtractFromPdf(
  input: AiPdfInput,
  opts: { signal?: AbortSignal; onProgress?: (done: number, total: number, part: PdfPart) => void } = {},
): Promise<AiPdfResult> {
  const { signal, onProgress } = opts;
  try {
    const { LESSONS } = await import('../data/grammar/lessons');
    const lessons = LESSONS.map((l) => `${l.id}: ${l.title} (${l.en})`).join('\n');
    const c = await client();
    const format = (await schemas()).pdf(LESSONS.map((l) => l.id) as [string, ...string[]]);
    const topics = new Map<string, AiPdfTopic>();
    const grammar = new Set<string>();
    let previous = '';
    let parts = planPdfParts(input);
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      onProgress?.(i, parts.length, part);
      // a long answer for a whole book chapter: stream it so the request doesn't time out
      const stream = c.beta.messages.stream(
        {
          model: model(),
          max_tokens: 64000,
          betas: [FALLBACK_BETA],
          fallbacks: 'default',
          output_config: { effort: 'medium', format },
          system: `You help ${learner()} turn the French textbook pages they are studying into flashcards, organised by the topics the pages teach.`,
          messages: [{ role: 'user', content: [...(await partContent(part, input)), { type: 'text', text: pdfPrompt(input, part, previous, lessons) }] }],
        },
        { signal },
      );
      const res = await stream.finalMessage();
      if (res.stop_reason === 'max_tokens' && part.kind === 'pdf') {
        // too much for one answer: start again, page range by page range
        parts = planPdfParts(input, false);
        i = -1;
        continue;
      }
      assertUsable(res);
      if (!res.parsed_output) throw new AiError('Claude’s answer couldn’t be read. Try again.');
      for (const t of res.parsed_output.topics) {
        const title = t.title.replace(/\s+/g, ' ').trim() || input.name;
        const items = sanitize(t.items);
        const had = topics.get(titleKey(title));
        if (had) {
          const known = new Set(had.items.map((x) => x.fr.toLowerCase()));
          had.items.push(...items.filter((x) => !known.has(x.fr.toLowerCase())));
        } else topics.set(titleKey(title), { title, titleEn: t.titleEn.trim(), emoji: isSingleEmoji(t.emoji) ? t.emoji.trim() : undefined, items });
        previous = title;
      }
      for (const g of res.parsed_output.grammar) grammar.add(g);
    }
    return { topics: [...topics.values()].filter((t) => t.items.length), grammar: [...grammar] };
  } catch (e) {
    if (signal?.aborted) throw new DOMException('Stopped.', 'AbortError');
    throw new AiError(await friendlyAiError(e));
  }
}
