// Optional Claude helpers (translation, vocabulary extraction from text and photos).
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
  return {
    translation: betaZodOutputFormat(z.object({ items: z.array(z.object({ index: z.number(), fr: z.string(), en: z.string() })) })),
    extraction: betaZodOutputFormat(z.object({ items: z.array(item) })),
    photo: betaZodOutputFormat(z.object({ items: z.array(photoItem) })),
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
      system: 'You help an English-speaking learner (beginner to intermediate) build French flashcards from material they are reading.',
      messages: [
        {
          role: 'user',
          content: `From the text below, pick the most useful items to learn: everyday nouns, verbs, adjectives and expressions, plus up to 8 short, useful sentences taken from it (fix obvious OCR mistakes). Skip names, numbers and very rare words. At most 30 items, most useful first. If the text is in English, give the French equivalents.\n\n${RULES}\n\n<text>\n${t.slice(0, 12000)}\n</text>`,
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
      system: 'You help an English-speaking learner (beginner to intermediate) build French flashcards from photos: things around them, and pages of their French books.',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data } },
            {
              type: 'text',
              text: `If this photo shows a printed vocabulary list (French words with their English meanings, for example a textbook page of verbs), transcribe EVERY entry in reading order, column by column. Keep the English meaning exactly as printed on the page (several meanings joined with ", ", e.g. "to admit, to grant"); only fix obvious print or OCR slips. Verbs stay in the infinitive with gender "none". Skip page numbers, titles and footers. There is no limit on the number of entries; set "main" to false for all of them.

Otherwise, list the clearly visible things in the photo as French vocabulary (most prominent first, at most 15), plus any French text you can read in it as phrase or sentence items (menus, signs, labels). Mark exactly one item with "main": true for the photo's main subject; all others false.

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
