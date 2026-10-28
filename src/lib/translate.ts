// Translation helpers: Claude when an API key is set, otherwise the free
// MyMemory service (best effort, rate limited, needs a connection).
import { aiAvailable, aiTranslate } from './ai';

export type Direction = 'fr-en' | 'en-fr';

const MYMEMORY = 'https://api.mymemory.translated.net/get';

function decodeEntities(s: string): string {
  if (typeof document === 'undefined') return s;
  const ta = document.createElement('textarea');
  ta.innerHTML = s;
  return ta.value;
}

/** Match the casing and end punctuation of the source text. */
export function tidyTranslation(source: string, out: string): string {
  let t = decodeEntities(out).replace(/\s+/g, ' ').trim();
  const src = source.trim();
  if (src && src[0] === src[0].toLowerCase() && /^\p{Lu}\p{Ll}/u.test(t)) t = t[0].toLowerCase() + t.slice(1);
  if (!/[.!?…]$/.test(src)) t = t.replace(/[.。]+$/, '');
  return t;
}

/** One translation through MyMemory. Throws a friendly Error on failure. */
export async function freeTranslate(text: string, dir: Direction, timeoutMs = 8000): Promise<string> {
  const q = text.trim();
  if (!q) return '';
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const url = `${MYMEMORY}?q=${encodeURIComponent(q.slice(0, 480))}&langpair=${dir === 'fr-en' ? 'fr|en' : 'en|fr'}`;
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`Translation service error (${res.status}).`);
    const data = (await res.json()) as { responseStatus?: number | string; responseData?: { translatedText?: string }; quotaFinished?: boolean };
    const out = data.responseData?.translatedText ?? '';
    if (data.quotaFinished || /MYMEMORY WARNING/i.test(out)) throw new Error('The free translator’s daily limit is used up. Try again tomorrow, or add an AI key in Settings.');
    if (String(data.responseStatus) !== '200' || !out) throw new Error('No translation found.');
    return tidyTranslation(q, out);
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw new Error('The translator took too long. Check your connection and try again.');
    if (e instanceof TypeError) throw new Error('Couldn’t reach the translator. Are you online?');
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

export interface Pair {
  fr: string;
  en: string;
}

/**
 * Fills in whichever side is empty for each pair. Uses one Claude request when
 * available, otherwise MyMemory one by one. Pairs that fail keep their blank.
 */
export async function fillMissing(pairs: Pair[], onProgress?: (done: number, total: number) => void): Promise<{ pairs: Pair[]; failed: number; error?: string }> {
  const todo = pairs.map((p, i) => ({ p, i })).filter(({ p }) => !!p.fr.trim() !== !!p.en.trim());
  const out = pairs.map((p) => ({ ...p }));
  if (!todo.length) return { pairs: out, failed: 0 };
  onProgress?.(0, todo.length);
  if (aiAvailable()) {
    const res = await aiTranslate(todo.map(({ p }) => ({ fr: p.fr.trim() || undefined, en: p.en.trim() || undefined })));
    todo.forEach(({ i }, k) => {
      const r = res[k];
      if (!r) return;
      if (!out[i].fr.trim()) out[i].fr = r.fr;
      if (!out[i].en.trim()) out[i].en = r.en;
    });
    onProgress?.(todo.length, todo.length);
    return { pairs: out, failed: todo.filter(({ i }) => !out[i].fr.trim() || !out[i].en.trim()).length };
  }
  let failed = 0;
  let error: string | undefined;
  for (let k = 0; k < todo.length; k++) {
    const { p, i } = todo[k];
    try {
      if (p.fr.trim()) out[i].en = await freeTranslate(p.fr, 'fr-en');
      else out[i].fr = await freeTranslate(p.en, 'en-fr');
    } catch (e) {
      failed++;
      error = (e as Error).message;
      // a quota or network problem won't fix itself for the next row
      if (/limit|online|connection/i.test(error)) {
        failed += todo.length - k - 1;
        break;
      }
    }
    onProgress?.(k + 1, todo.length);
  }
  return { pairs: out, failed, error };
}

/** Translate a single text in whichever direction is needed. */
export async function translateOne(pair: Pair): Promise<Pair> {
  const { pairs, error } = await fillMissing([pair]);
  const [p] = pairs;
  if ((!p.fr.trim() || !p.en.trim()) && error) throw new Error(error);
  if (!p.fr.trim() || !p.en.trim()) throw new Error('No translation found.');
  return p;
}
