// Thin wrapper around the browser's speech recognition (Chrome, Edge, Safari).
import { levenshtein, normalizeAnswer, splitArticle, stripAccents } from './french';

interface RecognitionAlternative {
  transcript: string;
}
interface RecognitionResult {
  isFinal: boolean;
  length: number;
  [i: number]: RecognitionAlternative;
}
interface RecognitionEvent {
  results: { length: number; [i: number]: RecognitionResult };
}
interface Recognition {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  onresult: ((e: RecognitionEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

type Ctor = new () => Recognition;

function ctor(): Ctor | null {
  const w = window as unknown as { SpeechRecognition?: Ctor; webkitSpeechRecognition?: Ctor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export class RecognitionError extends Error {
  constructor(public code: string) {
    super(code);
  }
}

/** Listen once in French. Resolves with candidate transcripts, best first. */
export function listenOnce(onInterim?: (text: string) => void): { result: Promise<string[]>; stop: () => void } {
  const C = ctor();
  if (!C) return { result: Promise.reject(new RecognitionError('unsupported')), stop: () => {} };
  const rec = new C();
  rec.lang = 'fr-FR';
  rec.interimResults = true;
  rec.maxAlternatives = 5;
  rec.continuous = false;
  let finals: string[] = [];
  let lastInterim = '';
  const result = new Promise<string[]>((resolve, reject) => {
    rec.onresult = (e) => {
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) {
          finals = [];
          for (let k = 0; k < r.length; k++) finals.push(r[k].transcript);
        } else {
          lastInterim = r[0].transcript;
          onInterim?.(lastInterim);
        }
      }
    };
    rec.onerror = (e) => {
      if (e.error === 'no-speech' || e.error === 'aborted') return;
      reject(new RecognitionError(e.error));
    };
    rec.onend = () => resolve(finals.length ? finals : lastInterim ? [lastInterim] : []);
  });
  try {
    rec.start();
  } catch (e) {
    return { result: Promise.reject(new RecognitionError(String(e))), stop: () => {} };
  }
  return { result, stop: () => rec.stop() };
}

const NUMBERS: Record<string, string> = {
  zero: '0', zéro: '0', un: '1', une: '1', deux: '2', trois: '3', quatre: '4', cinq: '5', six: '6', sept: '7', huit: '8',
  neuf: '9', dix: '10', onze: '11', douze: '12', treize: '13', quatorze: '14', quinze: '15', seize: '16',
  'dix-sept': '17', 'dix-huit': '18', 'dix-neuf': '19', vingt: '20', trente: '30', quarante: '40', cinquante: '50',
  soixante: '60', 'soixante-dix': '70', 'quatre-vingts': '80', 'quatre-vingt-dix': '90', cent: '100', mille: '1000',
};

/** Is any recognised transcript close enough to the target? Returns the best match. */
export function matchSpoken(candidates: string[], target: string): { ok: boolean; heard: string } {
  const t = stripAccents(normalizeAnswer(target));
  const noun = stripAccents(normalizeAnswer(splitArticle(target).noun));
  const digits = NUMBERS[normalizeAnswer(target)];
  const tolerance = Math.max(1, Math.round(t.length * 0.2));
  for (const c of candidates) {
    const h = stripAccents(normalizeAnswer(c));
    if (!h) continue;
    if (h === t || h === noun || (digits && h === digits)) return { ok: true, heard: c };
    if (levenshtein(h, t) <= tolerance) return { ok: true, heard: c };
    // the target said as whole words inside a longer transcript ("bonjour madame")
    const padded = ` ${h} `;
    if (padded.includes(` ${t} `) || (noun.length >= 3 && padded.includes(` ${noun} `))) return { ok: true, heard: c };
  }
  return { ok: false, heard: candidates[0] ?? '' };
}
