import confetti from 'canvas-confetti';

const COLORS = ['#ff5e7e', '#ff8a3d', '#ffc83d', '#2dbe6c', '#17b8c4', '#3d7bff', '#8c5cff', '#d45ab4'];

function reduced() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

type Shape = ReturnType<typeof confetti.shapeFromText>;
const shapeCache = new Map<string, Shape>();
function emojiShape(e: string): Shape | null {
  try {
    if (!shapeCache.has(e)) shapeCache.set(e, confetti.shapeFromText({ text: e, scalar: 2.2 }));
    return shapeCache.get(e)!;
  } catch {
    return null;
  }
}

/** Big two-cannon celebration (end of a great round, level up). */
export function celebrate(intensity = 1) {
  if (reduced()) return;
  const count = Math.round(90 * intensity);
  const base = { colors: COLORS, ticks: 260, gravity: 0.9, scalar: 1.1, zIndex: 1000 };
  confetti({ ...base, particleCount: count, angle: 60, spread: 70, origin: { x: 0, y: 0.75 }, startVelocity: 58 });
  confetti({ ...base, particleCount: count, angle: 120, spread: 70, origin: { x: 1, y: 0.75 }, startVelocity: 58 });
}

/** A puff of particles from a point on screen (0..1 coordinates). */
export function burst(x: number, y: number, opts: { count?: number; colors?: string[]; spread?: number } = {}) {
  if (reduced()) return;
  confetti({
    particleCount: opts.count ?? 26,
    spread: opts.spread ?? 80,
    startVelocity: 26,
    gravity: 1.1,
    ticks: 110,
    scalar: 0.8,
    origin: { x, y },
    colors: opts.colors ?? COLORS,
    zIndex: 1000,
  });
}

/** Burst from the centre of an element. */
export function burstFrom(el: Element | null, opts?: Parameters<typeof burst>[2]) {
  if (!el) return;
  const r = el.getBoundingClientRect();
  burst((r.left + r.width / 2) / window.innerWidth, (r.top + r.height / 2) / window.innerHeight, opts);
}

/** Rain of emoji (croissants, hearts, stars...). */
export function emojiRain(emojis: string[] = ['🥐', '⭐', '💖', '🎉'], count = 40) {
  if (reduced()) return;
  const shapes = emojis.map(emojiShape).filter(Boolean) as Shape[];
  if (!shapes.length) return;
  confetti({
    particleCount: count,
    spread: 160,
    startVelocity: 34,
    gravity: 0.7,
    ticks: 300,
    origin: { x: 0.5, y: 0.35 },
    shapes,
    scalar: 2.2,
    flat: true,
    zIndex: 1000,
  });
}

export function stars(x = 0.5, y = 0.4) {
  if (reduced()) return;
  confetti({
    particleCount: 30,
    spread: 360,
    startVelocity: 22,
    gravity: 0.4,
    decay: 0.92,
    ticks: 120,
    shapes: ['star'],
    colors: ['#ffcb2e', '#ffe58a', '#ffffff'],
    origin: { x, y },
    scalar: 1.2,
    zIndex: 1000,
  });
}
