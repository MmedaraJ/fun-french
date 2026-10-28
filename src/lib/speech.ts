// French text-to-speech through the browser's built-in voices.
import { useEffect, useState } from 'react';
import { speakable } from './french';
import { settings } from './settings';

const PREFERRED = [
  /natural/i,
  /premium/i,
  /enhanced/i,
  /neural/i,
  /google.*fran/i,
  /am[ée]lie/i,
  /audrey/i,
  /aur[ée]lie/i,
  /thomas/i,
  /marie/i,
  /denise/i,
  /julie/i,
  /hortense/i,
  /virginie/i,
];

let frVoices: SpeechSynthesisVoice[] = [];
const listeners = new Set<() => void>();

export function speechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
}

function refreshVoices() {
  if (!speechSupported()) return;
  frVoices = window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().replace('_', '-').startsWith('fr'));
  listeners.forEach((fn) => fn());
}

if (speechSupported()) {
  refreshVoices();
  window.speechSynthesis.addEventListener?.('voiceschanged', refreshVoices);
}

function rank(v: SpeechSynthesisVoice): number {
  let score = 0;
  const lang = v.lang.toLowerCase().replace('_', '-');
  if (lang === 'fr-fr') score += 50;
  else if (lang.startsWith('fr')) score += 20;
  const idx = PREFERRED.findIndex((re) => re.test(v.name));
  if (idx >= 0) score += 40 - idx;
  if (v.localService) score += 3;
  return score;
}

export function frenchVoices(): SpeechSynthesisVoice[] {
  return [...frVoices].sort((a, b) => rank(b) - rank(a));
}

export function currentVoice(): SpeechSynthesisVoice | undefined {
  const uri = settings().voiceURI;
  const list = frenchVoices();
  return (uri && list.find((v) => v.voiceURI === uri)) || list[0];
}

export function useFrenchVoices(): SpeechSynthesisVoice[] {
  const [voices, setVoices] = useState(frenchVoices);
  useEffect(() => {
    const fn = () => setVoices(frenchVoices());
    listeners.add(fn);
    refreshVoices();
    return () => {
      listeners.delete(fn);
    };
  }, []);
  return voices;
}

let speechUnlocked = false;

/** iOS only lets pages speak after speech was started inside a tap; call this from the first tap. */
export function unlockSpeech() {
  if (speechUnlocked || !speechSupported()) return;
  speechUnlocked = true;
  try {
    const u = new SpeechSynthesisUtterance(' ');
    u.volume = 0;
    window.speechSynthesis.speak(u);
  } catch {
    /* ignore */
  }
}

let speakingId = 0;

interface SpeakOptions {
  slow?: boolean;
  rate?: number;
  /**
   * Wait for whatever is being said to finish instead of cutting it off. For speech the app
   * starts by itself (a new question, the answer after a question): hearing the whole
   * pronunciation matters more than starting the next one a second earlier.
   */
  queue?: boolean;
}

/** The utterance being spoken, and the one request waiting for it (only the newest waits). */
let current: SpeechSynthesisUtterance | null = null;
let waiting: { text: string; opts: SpeakOptions; resolve: () => void } | null = null;

function utter(text: string, opts: SpeakOptions, resolve: () => void) {
  const synth = window.speechSynthesis;
  const u = new SpeechSynthesisUtterance(speakable(text));
  u.lang = 'fr-FR';
  const v = currentVoice();
  if (v) u.voice = v;
  const base = opts.rate ?? settings().rate;
  u.rate = opts.slow ? Math.max(0.45, base * 0.62) : base;
  u.pitch = 1;
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    if (current === u) current = null;
    resolve();
    const next = waiting;
    waiting = null;
    if (next) utter(next.text, next.opts, next.resolve);
  };
  u.onend = finish;
  u.onerror = finish;
  // Some engines never fire onend; don't leave callers (or the queue) hanging.
  setTimeout(finish, 1200 + text.length * 140 * (opts.slow ? 1.7 : 1));
  current = u;
  synth.speak(u);
}

/** Speak French. Resolves when finished (or immediately if speech is unavailable). */
export function speak(text: string, opts: SpeakOptions = {}): Promise<void> {
  if (!speechSupported() || !text) return Promise.resolve();
  const synth = window.speechSynthesis;
  return new Promise((resolve) => {
    if (opts.queue) {
      if (!current && !synth.speaking && !synth.pending) {
        utter(text, opts, resolve);
      } else {
        // a newer request replaces an older one that hasn't started: no backlog of stale audio
        waiting?.resolve();
        waiting = { text, opts, resolve };
      }
      return;
    }
    // a tap on a speaker: say it now
    const dropped = waiting;
    waiting = null;
    dropped?.resolve();
    current = null;
    synth.cancel();
    const id = ++speakingId;
    // Chrome sometimes drops an utterance queued in the same tick as cancel().
    setTimeout(() => {
      if (id === speakingId) utter(text, opts, resolve);
      else resolve();
    }, 30);
  });
}

/** Forget speech that hasn't started yet, but let the current pronunciation finish. */
export function dropQueuedSpeech() {
  const dropped = waiting;
  waiting = null;
  dropped?.resolve();
}

export function stopSpeaking() {
  if (!speechSupported()) return;
  const dropped = waiting;
  waiting = null;
  dropped?.resolve();
  current = null;
  speakingId++;
  window.speechSynthesis.cancel();
}
