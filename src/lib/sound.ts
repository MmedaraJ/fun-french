// Every sound effect is synthesised with the Web Audio API: no audio files to
// load, and the "marimba + drum kit" palette stays consistent across the app.
import { settings } from './settings';

type AnyWindow = Window & { webkitAudioContext?: typeof AudioContext };

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;

function ac(): AudioContext | null {
  const s = settings();
  if (!s.sound) return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as AnyWindow).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 6;
    master.connect(comp).connect(ctx.destination);
  }
  if (ctx.state === 'suspended') void ctx.resume();
  master!.gain.value = Math.max(0, Math.min(1, s.volume)) * 0.7;
  return ctx;
}

/** Call from the first user gesture so iOS lets us play sound later. */
export function unlockAudio() {
  const c = ac();
  if (!c) return;
  const b = c.createBuffer(1, 1, 22050);
  const src = c.createBufferSource();
  src.buffer = b;
  src.connect(c.destination);
  src.start(0);
}

interface ToneOpts {
  freq: number;
  type?: OscillatorType;
  start?: number;
  dur?: number;
  vol?: number;
  attack?: number;
  slideTo?: number;
}

function tone({ freq, type = 'sine', start = 0, dur = 0.15, vol = 0.4, attack = 0.004, slideTo }: ToneOpts) {
  const c = ac();
  if (!c || !master) return;
  const t = c.currentTime + start;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.05);
}

function noise({
  start = 0,
  dur = 0.15,
  vol = 0.25,
  type = 'highpass',
  freq = 5000,
  freqTo,
  q = 0.8,
}: {
  start?: number;
  dur?: number;
  vol?: number;
  type?: BiquadFilterType;
  freq?: number;
  freqTo?: number;
  q?: number;
}) {
  const c = ac();
  if (!c || !master) return;
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, c.sampleRate * 1.5, c.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const t = c.currentTime + start;
  const src = c.createBufferSource();
  src.buffer = noiseBuf;
  const f = c.createBiquadFilter();
  f.type = type;
  f.frequency.setValueAtTime(freq, t);
  if (freqTo) f.frequency.exponentialRampToValueAtTime(freqTo, t + dur);
  f.Q.value = q;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(master);
  src.start(t);
  src.stop(t + dur + 0.05);
}

/** Soft marimba-like mallet: fundamental plus a short bright partial. */
function mallet(freq: number, start = 0, vol = 0.35, dur = 0.55) {
  tone({ freq, start, dur, vol });
  tone({ freq: freq * 4, start, dur: 0.07, vol: vol * 0.22 });
  tone({ freq: freq * 2, type: 'triangle', start, dur: dur * 0.4, vol: vol * 0.12 });
}

function tom(start: number, freq: number, vol = 0.55) {
  tone({ freq, slideTo: freq * 0.45, start, dur: 0.28, vol });
  noise({ start, dur: 0.05, vol: 0.12, type: 'lowpass', freq: 1800 });
}

function cymbal(start: number, dur = 0.9, vol = 0.22) {
  noise({ start, dur, vol, type: 'highpass', freq: 6500 });
  noise({ start, dur: dur * 0.5, vol: vol * 0.6, type: 'bandpass', freq: 9000, q: 1.5 });
}

// C major pentatonic, C5 upwards: every combination sounds happy.
const PENTA = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.51, 1567.98, 1760.0, 2093.0, 2349.32];

function sparkle(start = 0, count = 4) {
  for (let i = 0; i < count; i++) {
    tone({ freq: 2400 + Math.random() * 2400, start: start + i * 0.045, dur: 0.09, vol: 0.06 });
  }
}

export const sfx = {
  tap() {
    tone({ freq: 620, slideTo: 860, dur: 0.06, vol: 0.16 });
  },
  pop() {
    tone({ freq: 260, slideTo: 980, dur: 0.1, vol: 0.28 });
  },
  softPop() {
    tone({ freq: 420, slideTo: 720, dur: 0.07, vol: 0.14 });
  },
  /** Rising two-note ding; climbs the scale as the combo grows. */
  correct(combo = 1) {
    const i = Math.min(Math.max(combo - 1, 0), 7);
    mallet(PENTA[i], 0, 0.36);
    mallet(PENTA[i + 2], 0.085, 0.36);
    if (combo >= 3) sparkle(0.12, Math.min(combo, 8));
  },
  wrong() {
    tone({ freq: 210, slideTo: 105, type: 'triangle', dur: 0.34, vol: 0.38 });
    tone({ freq: 222, slideTo: 111, type: 'square', dur: 0.26, vol: 0.05 });
  },
  whoosh() {
    noise({ dur: 0.32, vol: 0.18, type: 'bandpass', freq: 350, freqTo: 3200, q: 1.2 });
  },
  swish() {
    noise({ dur: 0.18, vol: 0.12, type: 'bandpass', freq: 2600, freqTo: 900, q: 1.4 });
  },
  flip() {
    noise({ dur: 0.12, vol: 0.12, type: 'bandpass', freq: 1500, freqTo: 4000, q: 2 });
    tone({ freq: 500, slideTo: 760, dur: 0.08, vol: 0.08 });
  },
  letter(i = 0) {
    mallet(PENTA[i % PENTA.length], 0, 0.22, 0.3);
  },
  unletter() {
    tone({ freq: 420, slideTo: 240, dur: 0.09, vol: 0.14 });
  },
  star(i = 0) {
    mallet(PENTA[3 + i * 2], 0, 0.4, 0.7);
    sparkle(0.05, 5);
  },
  tick() {
    tone({ freq: 1500, type: 'square', dur: 0.018, vol: 0.035 });
  },
  match() {
    mallet(PENTA[4], 0, 0.3, 0.35);
    mallet(PENTA[7], 0.07, 0.3, 0.45);
  },
  coin() {
    tone({ freq: 988, type: 'square', dur: 0.08, vol: 0.07 });
    tone({ freq: 1319, type: 'square', start: 0.075, dur: 0.3, vol: 0.07 });
  },
  heartLost() {
    tone({ freq: 523, slideTo: 392, type: 'triangle', dur: 0.18, vol: 0.3 });
    tone({ freq: 392, slideTo: 262, type: 'triangle', start: 0.16, dur: 0.3, vol: 0.3 });
  },
  /** The "ba-dum-tss" rimshot. */
  rimshot() {
    tom(0, 200);
    tom(0.17, 140);
    cymbal(0.36);
  },
  fanfare() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((f, i) => mallet(f, i * 0.11, 0.38, 0.6));
    [1046.5, 1318.51, 1567.98].forEach((f) => mallet(f, 0.5, 0.26, 1.1));
    sparkle(0.55, 8);
  },
  levelUp() {
    [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98].forEach((f, i) => mallet(f, i * 0.07, 0.34, 0.5));
    cymbal(0.45, 1.2, 0.12);
    sparkle(0.45, 10);
  },
  achievement() {
    mallet(783.99, 0, 0.3, 0.5);
    mallet(1046.5, 0.1, 0.3, 0.5);
    mallet(1567.98, 0.2, 0.34, 0.9);
    sparkle(0.25, 8);
  },
  record() {
    tom(0, 220, 0.4);
    tom(0.09, 220, 0.4);
    [783.99, 987.77, 1174.66, 1567.98].forEach((f, i) => mallet(f, 0.2 + i * 0.09, 0.32, 0.6));
    cymbal(0.55, 1.1, 0.14);
  },
  mic() {
    tone({ freq: 880, dur: 0.07, vol: 0.12 });
    tone({ freq: 1320, start: 0.08, dur: 0.1, vol: 0.12 });
  },
};

export function haptic(pattern: number | number[]) {
  if (!settings().haptics) return;
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* unsupported */
  }
}
