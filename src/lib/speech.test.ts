import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// A fake speech engine: utterances wait in a queue until the test ends them.
class FakeUtterance {
  text: string;
  lang = '';
  rate = 1;
  pitch = 1;
  voice: unknown = null;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(text: string) {
    this.text = text;
  }
}

const engine = {
  spoken: [] as string[],
  queue: [] as FakeUtterance[],
  cancels: 0,
  get speaking() {
    return this.queue.length > 0;
  },
  get pending() {
    return this.queue.length > 1;
  },
  started: new Set<FakeUtterance>(),
  /** Records the utterance at the head of the queue as it starts being said. */
  startNext() {
    const u = this.queue[0];
    if (u && !this.started.has(u)) {
      this.started.add(u);
      this.spoken.push(u.text);
    }
  },
  speak(u: FakeUtterance) {
    this.queue.push(u);
    this.startNext();
  },
  /** The current utterance ends; the engine moves on to the next one in its own queue. */
  end() {
    const u = this.queue.shift();
    u?.onend?.();
    this.startNext();
  },
  cancel() {
    this.cancels++;
    const q = this.queue;
    this.queue = [];
    q.forEach((u) => u.onerror?.());
  },
  getVoices: () => [],
  addEventListener: () => {},
};

let speech: typeof import('./speech');

beforeAll(async () => {
  Object.assign(window, { speechSynthesis: engine, SpeechSynthesisUtterance: FakeUtterance });
  speech = await import('./speech');
});

beforeEach(() => {
  speech.stopSpeaking();
  engine.spoken = [];
  engine.queue = [];
  engine.cancels = 0;
});

describe('speak', () => {
  it('automatic speech waits for the current pronunciation instead of cutting it off', async () => {
    void speech.speak('la pomme', { queue: true });
    void speech.speak('le chat', { queue: true });
    expect(engine.spoken).toEqual(['la pomme']);
    expect(engine.cancels).toBe(0);
    engine.end();
    expect(engine.spoken).toEqual(['la pomme', 'le chat']);
  });

  it('only the newest waiting request plays next, so no stale backlog builds up', async () => {
    const first = speech.speak('un', { queue: true });
    const stale = speech.speak('deux', { queue: true });
    void speech.speak('trois', { queue: true });
    await stale; // dropped requests resolve straight away
    engine.end();
    await first;
    expect(engine.spoken).toEqual(['un', 'trois']);
  });

  it('a tap on a speaker says it now', async () => {
    vi.useFakeTimers();
    void speech.speak('la maison', { queue: true });
    void speech.speak('le jardin');
    expect(engine.cancels).toBe(1);
    await vi.advanceTimersByTimeAsync(40);
    expect(engine.spoken).toEqual(['la maison', 'le jardin']);
    vi.useRealTimers();
  });

  it('leaving a round drops what is waiting but lets the current word finish', () => {
    void speech.speak('bonjour', { queue: true });
    void speech.speak('au revoir', { queue: true });
    speech.dropQueuedSpeech();
    expect(engine.cancels).toBe(0);
    engine.end();
    expect(engine.spoken).toEqual(['bonjour']);
  });
});
