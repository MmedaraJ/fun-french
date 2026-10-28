/**
 * Coco — Bonbon's mascot: a plump French macaron wearing a little beret.
 *
 * The artwork is described once, as a tiny tree of SVG nodes (see "Art").
 * <Mascot> renders those nodes inside framer-motion groups for the idle bob,
 * blinking and the per-mood reactions; mascotSvgMarkup() serialises the very
 * same nodes into a static SVG string for icons.
 *
 * Everything is drawn in a fixed 200 × 200 viewBox, flat colours, no filters.
 */
import {
  createElement,
  useEffect,
  useMemo,
  useRef,
  useState,
  type JSX,
  type FocusEvent,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from 'react';
import { motion, useAnimate, useReducedMotion, type Easing } from 'framer-motion';

export type MascotMood = 'idle' | 'happy' | 'sad' | 'excited' | 'thinking' | 'wow' | 'love' | 'sleepy';
export type MascotColor = 'pink' | 'pistachio' | 'lemon' | 'lavender' | 'caramel' | 'raspberry';

export interface MascotProps {
  mood?: MascotMood; // default 'idle'
  size?: number; // rendered width in px, default 120 (height follows the viewBox ratio)
  color?: MascotColor; // default 'pink'
  /** Change this number to replay the mood's one-shot reaction (e.g. on every correct answer). */
  reactKey?: number;
  className?: string;
  onClick?: () => void;
  title?: string; // accessible label, default "Coco"
}

export const MASCOT_MOODS: readonly MascotMood[] = ['idle', 'happy', 'excited', 'love', 'wow', 'thinking', 'sad', 'sleepy'];
export const MASCOT_COLORS: readonly MascotColor[] = ['pink', 'pistachio', 'lemon', 'lavender', 'caramel', 'raspberry'];

/* ───────────────────────────── Palette ───────────────────────────── */

const INK = '#2B2D42';
const WHITE = '#FFFFFF';
const TONGUE = '#FF7096';
const HEART = '#FF4D6D';
const TEAR = '#7CC8F8';
const SPARKLE_COLORS = ['#FFB703', '#4CC9F0', '#FF5E7E'];

interface Palette {
  shell: string; // the two shells
  shade: string; // shadow side of the shells
  foot: string; // the frilly "pied" at the base of each shell
  cream: string; // the filling: a light cream tint of the shell
  cheek: string; // blush
}

const safeMood = (mood: MascotMood | undefined): MascotMood =>
  mood && MASCOT_MOODS.includes(mood) ? mood : 'idle';

const PALETTES: Record<MascotColor, Palette> = {
  pink: { shell: '#FF8FB1', shade: '#F4739B', foot: '#F67FA4', cream: '#FFE6EE', cheek: '#FF4F84' },
  pistachio: { shell: '#A8DB8F', shade: '#8BC772', foot: '#97CF7D', cream: '#F1F9EA', cheek: '#FF7E93' },
  lemon: { shell: '#FFE066', shade: '#F7C944', foot: '#FAD24F', cream: '#FFF8DC', cheek: '#FF8A73' },
  lavender: { shell: '#C3A6FF', shade: '#A98AF3', foot: '#B597FA', cream: '#F3EDFF', cheek: '#FF7DB5' },
  caramel: { shell: '#F4B26B', shade: '#E2964F', foot: '#EBA35D', cream: '#FDEEDB', cheek: '#F06A5B' },
  raspberry: { shell: '#FF5E7E', shade: '#EC3F64', foot: '#F54C70', cream: '#FFE3E9', cheek: '#C9244C' },
};

const paletteFor = (color: MascotColor | undefined): Palette =>
  PALETTES[color && MASCOT_COLORS.includes(color) ? color : 'pink'];

/* ───────────────────────────── Geometry ──────────────────────────── */

const VB = 200;
const CX = 100; // the character's vertical axis
const GROUND_Y = 178; // bottom of the lower shell: squash & stretch pivot
const SHADOW_Y = 187;
const EYE_Y = 88;
const EYE_DX = 25;
const SHOULDER_DX = 76; // arms grow out of the ends of the filling
const SHOULDER_Y = 130;
const HAT = { x: 110, y: 49, tilt: 12 }; // beret placement on the top shell
const HAT_PIVOT = { x: 110, y: 60 }; // where the beret rests

const ARM_W = 5;
const HAND_R = 6.4;

/** Round to 2 decimals to keep path strings short. */
const n = (v: number) => Math.round(v * 100) / 100;

/* ─────────────────────────── Node tree ───────────────────────────── */

type Attrs = Record<string, string | number | undefined>;
interface SvgNode {
  tag: string;
  attrs: Attrs;
  children?: SvgNode[];
}

const el = (tag: string, attrs: Attrs, children?: SvgNode[]): SvgNode => ({ tag, attrs, children });

const stroke = (d: string, width = 3.6, color = INK): SvgNode =>
  el('path', { d, fill: 'none', stroke: color, strokeWidth: width, strokeLinecap: 'round', strokeLinejoin: 'round' });

function toReact(node: SvgNode, key: string | number): ReactNode {
  return createElement(node.tag, { key, ...node.attrs }, ...(node.children ?? []).map((c, i) => toReact(c, i)));
}

const kebab = (k: string) => k.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);

function toMarkup(node: SvgNode): string {
  const attrs = Object.entries(node.attrs)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => ` ${kebab(k)}="${typeof v === 'number' ? n(v) : v}"`)
    .join('');
  const inner = (node.children ?? []).map(toMarkup).join('');
  return inner ? `<${node.tag}${attrs}>${inner}</${node.tag}>` : `<${node.tag}${attrs}/>`;
}

/* ──────────────────────────── Shapes ─────────────────────────────── */

/** A band with one scalloped edge, like the frilly foot of a macaron shell. */
function ruffleBand(x0: number, x1: number, flatY: number, edgeY: number, bumps: number, depth: number): string {
  const w = (x1 - x0) / bumps;
  const sweep = edgeY > flatY ? 1 : 0;
  let d = `M${n(x0)} ${n(flatY)}H${n(x1)}V${n(edgeY)}`;
  for (let i = 0; i < bumps; i++) d += `a${n(w / 2)} ${n(depth)} 0 0 ${sweep} ${n(-w)} 0`;
  return `${d}Z`;
}

function heartPath(cx: number, cy: number, s: number): string {
  const p = (x: number, y: number) => `${n(cx + x * s)} ${n(cy + y * s)}`;
  return (
    `M${p(0, 0.9)}C${p(-0.25, 0.7)} ${p(-1, 0.25)} ${p(-1, -0.3)}` +
    `C${p(-1, -0.8)} ${p(-0.4, -1.05)} ${p(0, -0.55)}` +
    `C${p(0.4, -1.05)} ${p(1, -0.8)} ${p(1, -0.3)}` +
    `C${p(1, 0.25)} ${p(0.25, 0.7)} ${p(0, 0.9)}Z`
  );
}

function starPath(cx: number, cy: number, outer: number, inner: number): string {
  let d = '';
  for (let i = 0; i < 10; i++) {
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const r = i % 2 ? inner : outer;
    d += `${i ? 'L' : 'M'}${n(cx + r * Math.cos(a))} ${n(cy + r * Math.sin(a))}`;
  }
  return `${d}Z`;
}

/** Four-pointed twinkle. */
function sparklePath(cx: number, cy: number, r: number): string {
  const k = r * 0.2;
  return (
    `M${n(cx)} ${n(cy - r)}Q${n(cx + k)} ${n(cy - k)} ${n(cx + r)} ${n(cy)}` +
    `Q${n(cx + k)} ${n(cy + k)} ${n(cx)} ${n(cy + r)}` +
    `Q${n(cx - k)} ${n(cy + k)} ${n(cx - r)} ${n(cy)}` +
    `Q${n(cx - k)} ${n(cy - k)} ${n(cx)} ${n(cy - r)}Z`
  );
}

function dropPath(x: number, y: number, s = 1): string {
  const p = (dx: number, dy: number) => `${n(x + dx * s)} ${n(y + dy * s)}`;
  return `M${p(0, -7)}C${p(1.5, -4)} ${p(5, -0.5)} ${p(5, 2.5)}A${n(5 * s)} ${n(5 * s)} 0 0 1 ${p(-5, 2.5)}C${p(-5, -0.5)} ${p(-1.5, -4)} ${p(0, -7)}Z`;
}

const zPath = (x: number, y: number, s: number) => `M${n(x)} ${n(y)}h${n(s)}l${n(-s)} ${n(s)}h${n(s)}`;

/* ───────────────────────────── Art ───────────────────────────────── */

const DOME = 'M28 108C28 69 60 50 100 50C140 50 172 69 172 108V110Q172 117 165 117H35Q28 117 28 110Z';
const LOWER_SHELL = 'M28 145H172V150C172 167 142 178 100 178C58 178 28 167 28 150Z';
const LOWER_SHELL_LIT = 'M28 145H172V149C172 162 142 171 100 171C58 171 28 162 28 149Z';
const UPPER_FOOT = ruffleBand(29, 171, 110, 119, 20, 2.6);
const LOWER_FOOT = ruffleBand(29, 171, 147, 139, 20, 2.6);

function shadowNode(): SvgNode {
  return el('ellipse', { cx: CX, cy: SHADOW_Y, rx: 54, ry: 7, fill: INK, fillOpacity: 0.13 });
}

function bodyNodes(p: Palette): SvgNode[] {
  return [
    el('path', { d: LOWER_SHELL, fill: p.shade }),
    el('path', { d: LOWER_SHELL_LIT, fill: p.shell }),
    el('rect', { x: 23, y: 116, width: 154, height: 28, rx: 14, fill: p.cream }),
    el('path', { d: LOWER_FOOT, fill: p.foot }),
    el('path', { d: UPPER_FOOT, fill: p.foot }),
    el('path', { d: DOME, fill: p.shell }),
    // soft shade on the right of the dome
    el('path', {
      d: 'M172 104C172 82 160 64 138 55C152 67 161 84 161 104Q161 112 158 117H165Q172 117 172 110Z',
      fill: p.shade,
      fillOpacity: 0.55,
    }),
    // glossy highlight on the top shell
    el('path', { d: 'M42 97Q41 80 53 68', fill: 'none', stroke: WHITE, strokeOpacity: 0.6, strokeWidth: 5.5, strokeLinecap: 'round' }),
  ];
}

function beretNodes(): SvgNode[] {
  return [
    el('g', { transform: `translate(${HAT.x} ${HAT.y}) rotate(${HAT.tilt})` }, [
      el('path', {
        d: 'M-44 5C-46 -10 -24 -19 0 -19C25 -19 47 -11 45 4C44 10 26 12 0 12C-26 12 -43 11 -44 5Z',
        fill: INK,
      }),
      stroke('M-29 -7Q-17 -14 -2 -15', 3.4, '#53577A'),
      stroke('M-38 8.5C-18 11.5 18 11.5 39 6.5', 2.6, '#41445F'),
      stroke('M2 -18Q2 -25 7 -27.5', 4.6),
    ]),
  ];
}

interface FaceArt {
  eyes: SvgNode[];
  /** Eyes are open ovals that can blink. */
  blink: boolean;
  brows: SvgNode[];
  mouth: SvgNode[];
  cheeks: SvgNode[];
  tear: SvgNode[];
}

const EYE_L = CX - EYE_DX;
const EYE_R = CX + EYE_DX;

function ovalEye(x: number, y: number, rx: number, ry: number, shine = 1): SvgNode[] {
  return [
    el('ellipse', { cx: x, cy: y, rx, ry, fill: INK }),
    el('circle', { cx: x - rx * 0.3, cy: y - ry * 0.36, r: rx * 0.42 * shine, fill: WHITE }),
    el('circle', { cx: x + rx * 0.36, cy: y + ry * 0.38, r: rx * 0.18 * shine, fill: WHITE }),
  ];
}

/** Open "D" mouth with a tongue. */
function grin(cx: number, top: number, halfW: number, depth: number): SvgNode[] {
  const l = cx - halfW;
  const r = cx + halfW;
  const b = top + depth;
  const tw = halfW * 0.58;
  const ty = b - depth * 0.32;
  return [
    el('path', {
      d: `M${n(l)} ${n(top)}Q${n(cx)} ${n(top + 2)} ${n(r)} ${n(top)}Q${n(r - 1.5)} ${n(b)} ${n(cx)} ${n(b)}Q${n(l + 1.5)} ${n(b)} ${n(l)} ${n(top)}Z`,
      fill: INK,
      stroke: INK,
      strokeWidth: 2,
      strokeLinejoin: 'round',
    }),
    el('path', {
      d: `M${n(cx - tw)} ${n(ty)}Q${n(cx)} ${n(ty - depth * 0.38)} ${n(cx + tw)} ${n(ty)}Q${n(cx + tw * 0.6)} ${n(b - 0.4)} ${n(cx)} ${n(b - 0.4)}Q${n(cx - tw * 0.6)} ${n(b - 0.4)} ${n(cx - tw)} ${n(ty)}Z`,
      fill: TONGUE,
    }),
  ];
}

function faceArt(mood: MascotMood, p: Palette): FaceArt {
  const y = EYE_Y;
  const cheeks = (rx = 9, ry = 5.5, opacity = 0.5) =>
    [EYE_L - 20, EYE_R + 20].map((cx) => el('ellipse', { cx, cy: y + 12, rx, ry, fill: p.cheek, fillOpacity: opacity }));
  const base: FaceArt = { eyes: [], blink: false, brows: [], mouth: [], cheeks: cheeks(), tear: [] };

  switch (mood) {
    case 'happy':
      return {
        ...base,
        eyes: [EYE_L, EYE_R].map((x) => stroke(`M${x - 9} ${y + 4}Q${x} ${y - 9} ${x + 9} ${y + 4}`, 5)),
        mouth: grin(CX, y + 9, 11, 13),
        cheeks: cheeks(10, 6, 0.6),
      };
    case 'excited':
      return {
        ...base,
        eyes: [EYE_L, EYE_R].flatMap((x) => [
          el('path', { d: starPath(x, y - 1, 12, 5.6), fill: INK, stroke: INK, strokeWidth: 2.4, strokeLinejoin: 'round' }),
          el('circle', { cx: x - 2.6, cy: y - 3.6, r: 2.4, fill: WHITE }),
        ]),
        mouth: grin(CX, y + 8, 14, 17),
        cheeks: cheeks(10, 6, 0.6),
      };
    case 'sad':
      return {
        ...base,
        eyes: [...ovalEye(EYE_L, y + 1, 8.6, 10.8, 1.15), ...ovalEye(EYE_R, y + 1, 8.6, 10.8, 1.15)],
        blink: true,
        brows: [stroke(`M${EYE_L - 10} ${y - 13}L${EYE_L + 8} ${y - 18}`), stroke(`M${EYE_R - 8} ${y - 18}L${EYE_R + 10} ${y - 13}`)],
        mouth: [stroke(`M${CX - 7} ${y + 16}Q${CX} ${y + 10} ${CX + 7} ${y + 16}`)],
        cheeks: cheeks(8, 5, 0.35),
        tear: [
          el('path', { d: dropPath(EYE_R + 9, y + 15, 1.3), fill: TEAR }),
          el('circle', { cx: EYE_R + 7.2, cy: y + 17, r: 1.7, fill: WHITE }),
        ],
      };
    case 'wow':
      return {
        ...base,
        eyes: [...ovalEye(EYE_L, y - 1, 10.6, 13.6, 1.05), ...ovalEye(EYE_R, y - 1, 10.6, 13.6, 1.05)],
        blink: true,
        brows: [
          stroke(`M${EYE_L - 10} ${y - 20}Q${EYE_L} ${y - 27} ${EYE_L + 9} ${y - 22}`),
          stroke(`M${EYE_R - 9} ${y - 22}Q${EYE_R} ${y - 27} ${EYE_R + 10} ${y - 20}`),
        ],
        mouth: [
          el('ellipse', { cx: CX, cy: y + 17, rx: 5.6, ry: 7, fill: INK }),
          el('ellipse', { cx: CX, cy: y + 20.6, rx: 3.2, ry: 2.2, fill: TONGUE }),
        ],
      };
    case 'love':
      return {
        ...base,
        eyes: [EYE_L, EYE_R].flatMap((x) => [
          el('path', { d: heartPath(x, y + 1, 11), fill: HEART, stroke: INK, strokeWidth: 2.6, strokeLinejoin: 'round' }),
          el('circle', { cx: x - 5, cy: y - 3, r: 2.2, fill: WHITE }),
        ]),
        mouth: grin(CX, y + 11, 7, 8),
        cheeks: cheeks(11, 6.5, 0.75),
      };
    case 'thinking':
      return {
        ...base,
        eyes: [...ovalEye(EYE_L + 4, y - 3, 8.2, 10.8), ...ovalEye(EYE_R + 4, y - 3, 8.2, 10.8)],
        blink: true,
        brows: [
          stroke(`M${EYE_L - 6} ${y - 18}L${EYE_L + 12} ${y - 17}`),
          stroke(`M${EYE_R - 5} ${y - 21}Q${EYE_R + 4} ${y - 28} ${EYE_R + 13} ${y - 21}`),
        ],
        mouth: [stroke(`M${CX - 5} ${y + 15}Q${CX + 2} ${y + 15.5} ${CX + 8} ${y + 11.5}`)],
      };
    case 'sleepy':
      return {
        ...base,
        eyes: [EYE_L, EYE_R].map((x) => stroke(`M${x - 9} ${y + 1}Q${x} ${y + 8} ${x + 9} ${y + 1}`, 4.4)),
        mouth: [el('ellipse', { cx: CX, cy: y + 14, rx: 3.2, ry: 3.8, fill: INK })],
        cheeks: cheeks(9, 5.5, 0.4),
      };
    case 'idle':
    default:
      return {
        ...base,
        eyes: [...ovalEye(EYE_L, y, 9.2, 12), ...ovalEye(EYE_R, y, 9.2, 12)],
        blink: true,
        mouth: [stroke(`M${CX - 7} ${y + 11}Q${CX} ${y + 17.5} ${CX + 7} ${y + 11}`)],
      };
  }
}

/* Arms: a curved stick from the shoulder (the end of the filling) to a round hand. */

type Pt = readonly [number, number];
type ArmPose =
  /** A stick angled from the shoulder: degrees from horizontal-outward (positive raises the hand),
   * length, and a sideways bow (positive sags it downward). */
  | { a: number; len: number; bend: number }
  /** An explicit cubic curve from the shoulder, in viewBox coordinates. */
  | { c1: Pt; c2: Pt; hand: Pt };

const stick = (a: number, len: number, bend: number): ArmPose => ({ a, len, bend });
const both = (pose: ArmPose): [ArmPose, ArmPose] => [pose, pose];

const ARM_POSES: Record<MascotMood, [left: ArmPose, right: ArmPose]> = {
  idle: both(stick(-34, 19, -3)),
  happy: both(stick(38, 21, 4)),
  excited: both(stick(70, 23, 5)),
  sad: both(stick(-70, 18, -2)),
  wow: both(stick(22, 21, -5)),
  love: both(stick(52, 21, 6)),
  // left hand comes up to prop the chin
  thinking: [{ c1: [14, 112], c2: [38, 118], hand: [52, 110] }, stick(-34, 19, -3)],
  sleepy: both(stick(-62, 18, -2)),
};

/** Arm path as a cubic (all poses share one shape so framer-motion can morph between them). */
function armGeom(side: -1 | 1, pose: ArmPose) {
  const sx = CX + side * SHOULDER_DX;
  const sy = SHOULDER_Y;
  let c1: Pt;
  let c2: Pt;
  let h: Pt;
  if ('hand' in pose) {
    ({ c1, c2, hand: h } = pose);
  } else {
    const rad = (pose.a * Math.PI) / 180;
    const dx = side * Math.cos(rad);
    const dy = -Math.sin(rad);
    h = [sx + dx * pose.len, sy + dy * pose.len];
    // quadratic control point, raised to cubic
    const q: Pt = [(sx + h[0]) / 2 - dy * side * pose.bend, (sy + h[1]) / 2 + dx * side * pose.bend];
    c1 = [sx + ((q[0] - sx) * 2) / 3, sy + ((q[1] - sy) * 2) / 3];
    c2 = [h[0] + ((q[0] - h[0]) * 2) / 3, h[1] + ((q[1] - h[1]) * 2) / 3];
  }
  const pt = (p: Pt) => `${n(p[0])} ${n(p[1])}`;
  return { d: `M${pt([sx, sy])}C${pt(c1)} ${pt(c2)} ${pt(h)}`, hx: n(h[0]), hy: n(h[1]) };
}

function armNodes(side: -1 | 1, pose: ArmPose): SvgNode[] {
  const g = armGeom(side, pose);
  return [
    el('path', { d: g.d, fill: 'none', stroke: INK, strokeWidth: ARM_W, strokeLinecap: 'round' }),
    el('circle', { cx: g.hx, cy: g.hy, r: HAND_R, fill: INK }),
  ];
}

/* Beret pose per mood: it slips when sleepy, droops when sad. */
const HAT_POSES: Partial<Record<MascotMood, { x: number; y: number; rotate: number }>> = {
  sleepy: { x: 3, y: 4, rotate: 9 },
  sad: { x: 1, y: 2, rotate: 5 },
};
const NO_HAT_POSE = { x: 0, y: 0, rotate: 0 };

/* Effects around the character (static positions, shared by both renderers). */

const SPARKLES = [
  { x: 24, y: 72, r: 8 },
  { x: 178, y: 86, r: 7 },
  { x: 14, y: 116, r: 5.5 },
  { x: 188, y: 128, r: 6 },
  { x: 164, y: 24, r: 5.5 },
  { x: 40, y: 30, r: 5 },
];
const FLOAT_HEARTS = [
  { x: 40, y: 56, s: 7, drift: -6, delay: 0.15 },
  { x: 164, y: 50, s: 9, drift: 6, delay: 0.4 },
  { x: 132, y: 22, s: 6, drift: 4, delay: 0.7 },
];
const BUBBLE = { trail: [{ x: 158, y: 70, r: 3 }, { x: 166, y: 58, r: 4.6 }], x: 175, y: 36, rx: 21, ry: 14 };
const ZEDS = [
  { x: 166, y: 50, s: 7 },
  { x: 178, y: 30, s: 9 },
];
const WOW_LINES = ['M30 62L20 54', 'M23 80L10 78', 'M166 70L176 62', 'M175 88L188 86'];

function effectNodes(mood: MascotMood): SvgNode[] {
  switch (mood) {
    case 'excited':
      return SPARKLES.map((s, i) => el('path', { d: sparklePath(s.x, s.y, s.r), fill: SPARKLE_COLORS[i % 3] }));
    case 'love':
      return FLOAT_HEARTS.slice(0, 2).map((h) => el('path', { d: heartPath(h.x, h.y, h.s), fill: HEART }));
    case 'thinking':
      return bubbleNodes();
    case 'sleepy':
      return ZEDS.map((z) => stroke(zPath(z.x, z.y, z.s), 2.8));
    case 'wow':
      return WOW_LINES.map((d) => stroke(d, 3.4));
    default:
      return [];
  }
}

function bubbleNodes(dots = true): SvgNode[] {
  return [
    ...BUBBLE.trail.map((t) => el('circle', { cx: t.x, cy: t.y, r: t.r, fill: WHITE, stroke: INK, strokeWidth: 2.4 })),
    el('ellipse', { cx: BUBBLE.x, cy: BUBBLE.y, rx: BUBBLE.rx, ry: BUBBLE.ry, fill: WHITE, stroke: INK, strokeWidth: 2.6 }),
    ...(dots ? [-8, 0, 8].map((dx) => el('circle', { cx: BUBBLE.x + dx, cy: BUBBLE.y, r: 2.6, fill: INK })) : []),
  ];
}

/* ─────────────────────── Static markup (icons) ───────────────────── */

/**
 * Static SVG string of Coco (no animation), e.g. for icons. The ground shadow and the character
 * are wrapped in <g class="coco-shadow"> and <g class="coco-body"> so they can be styled apart.
 */
export function mascotSvgMarkup(opts: { color?: MascotColor; mood?: MascotMood } = {}): string {
  const mood = safeMood(opts.mood);
  const p = paletteFor(opts.color);
  const face = faceArt(mood, p);
  const [poseL, poseR] = ARM_POSES[mood];
  const hat = HAT_POSES[mood] ?? NO_HAT_POSE;
  const nodes: SvgNode[] = [
    el('g', { class: 'coco-shadow' }, [shadowNode()]),
    el('g', { class: 'coco-body' }, [
      ...bodyNodes(p),
      ...face.cheeks,
      ...face.eyes,
      ...face.brows,
      ...face.mouth,
      ...face.tear,
      ...armNodes(-1, poseL),
      ...armNodes(1, poseR),
      el('g', { transform: `translate(${hat.x} ${hat.y}) rotate(${hat.rotate} ${HAT_PIVOT.x} ${HAT_PIVOT.y})` }, beretNodes()),
    ]),
    ...effectNodes(mood),
  ];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VB} ${VB}" width="${VB}" height="${VB}">${nodes
    .map(toMarkup)
    .join('')}</svg>`;
}

/* ──────────────────────────── Motion ─────────────────────────────── */

/** Transform pivot in viewBox units (framer-motion defaults SVG to the element's own box). */
const pivot = (x: number, y: number) => ({ transformBox: 'view-box', originX: `${x}px`, originY: `${y}px` }) as const;

const BODY_PIVOT = pivot(CX, GROUND_Y);
const SHADOW_PIVOT = pivot(CX, SHADOW_Y);
const EYES_PIVOT = pivot(CX, EYE_Y);
const HAT_PIVOT_STYLE = pivot(HAT_PIVOT.x, HAT_PIVOT.y);
const ARM_L_PIVOT = pivot(CX - SHOULDER_DX, SHOULDER_Y);
const ARM_R_PIVOT = pivot(CX + SHOULDER_DX, SHOULDER_Y);

type Track = Record<string, number[]>;
interface Move {
  duration: number;
  times: number[];
  kf: Track;
  ease?: Easing | Easing[];
}
interface Reaction {
  body: Move;
  hat?: Move;
  armL?: Move;
  armR?: Move;
}

const BODY_PROPS = ['y', 'rotate', 'scaleX', 'scaleY'];
const HAT_PROPS = ['y', 'rotate'];
const ARM_PROPS = ['rotate'];
const SHADOW_PROPS = ['scale', 'opacity'];
const REST: Record<string, number> = { y: 0, rotate: 0, scale: 1, scaleX: 1, scaleY: 1, opacity: 1 };

const mirror = (m: Move): Move => ({ ...m, kf: { rotate: (m.kf.rotate ?? []).map((v) => -v) } });

const wave: Move = {
  duration: 1.5,
  times: [0, 0.18, 0.34, 0.5, 0.66, 0.82, 1],
  kf: { rotate: [0, -100, -74, -100, -74, -96, 0] },
};
const excitedArm: Move = {
  duration: 1.05,
  times: [0, 0.15, 0.3, 0.45, 0.6, 0.78, 1],
  kf: { rotate: [0, -16, 12, -16, 12, -8, 0] },
};

const REACTIONS: Record<MascotMood, Reaction> = {
  idle: {
    body: { duration: 1.5, times: [0, 0.2, 0.5, 0.8, 1], kf: { rotate: [0, -3, 2, -1, 0] } },
    armR: wave,
  },
  happy: {
    body: {
      duration: 0.75,
      times: [0, 0.16, 0.42, 0.66, 0.8, 1],
      kf: {
        y: [0, 0, -20, 0, 0, 0],
        scaleX: [1, 1.12, 0.93, 1.1, 0.97, 1],
        scaleY: [1, 0.86, 1.09, 0.88, 1.03, 1],
      },
    },
    hat: { duration: 0.75, times: [0, 0.2, 0.45, 0.7, 1], kf: { y: [0, 0, -3, 1.5, 0], rotate: [0, 0, -6, 3, 0] } },
    armR: { duration: 0.75, times: [0, 0.3, 0.55, 0.8, 1], kf: { rotate: [0, -18, 6, -10, 0] } },
    armL: { duration: 0.75, times: [0, 0.3, 0.55, 0.8, 1], kf: { rotate: [0, 18, -6, 10, 0] } },
  },
  excited: {
    body: {
      duration: 1.1,
      times: [0, 0.12, 0.34, 0.47, 0.6, 0.74, 0.86, 1],
      kf: {
        y: [0, 0, -32, -36, -30, 0, 0, 0],
        rotate: [0, 0, -10, 10, -7, 0, 0, 0],
        scaleX: [1, 1.16, 0.9, 1, 1, 1.12, 0.96, 1],
        scaleY: [1, 0.82, 1.12, 1, 1, 0.88, 1.04, 1],
      },
    },
    hat: {
      duration: 1.1,
      times: [0, 0.12, 0.34, 0.5, 0.76, 0.88, 1],
      kf: { y: [0, 0, 3, -12, -2, 2, 0], rotate: [0, 0, 6, -12, 4, -2, 0] },
    },
    armR: excitedArm,
    armL: mirror(excitedArm),
  },
  sad: {
    body: {
      duration: 1.3,
      times: [0, 0.22, 0.42, 0.6, 0.78, 1],
      kf: {
        rotate: [0, -4, 3.5, -2.5, 1.5, 0],
        scaleX: [1, 1.05, 1.04, 1.05, 1.03, 1],
        scaleY: [1, 0.92, 0.93, 0.92, 0.95, 1],
      },
    },
  },
  wow: {
    body: {
      duration: 0.55,
      times: [0, 0.3, 0.62, 1],
      kf: { y: [0, -7, 0, 0], scaleX: [1, 1.12, 0.97, 1], scaleY: [1, 1.12, 0.97, 1] },
    },
    hat: { duration: 0.8, times: [0, 0.3, 0.65, 1], kf: { y: [0, -16, 2, 0], rotate: [0, -12, 4, 0] } },
    armR: { duration: 0.6, times: [0, 0.3, 1], kf: { rotate: [0, -24, 0] } },
    armL: { duration: 0.6, times: [0, 0.3, 1], kf: { rotate: [0, 24, 0] } },
  },
  love: {
    body: {
      duration: 1.5,
      times: [0, 0.25, 0.5, 0.75, 1],
      kf: { y: [0, -6, 0, -4, 0], rotate: [0, -5, 5, -3, 0] },
    },
    armR: { duration: 1.5, times: [0, 0.25, 0.5, 0.75, 1], kf: { rotate: [0, -12, 4, -8, 0] } },
    armL: { duration: 1.5, times: [0, 0.25, 0.5, 0.75, 1], kf: { rotate: [0, 4, -12, 8, 0] } },
  },
  thinking: {
    body: { duration: 1.4, times: [0, 0.3, 0.7, 1], kf: { rotate: [0, -5, -5, 0] } },
  },
  sleepy: {
    body: {
      duration: 2,
      times: [0, 0.35, 0.7, 1],
      kf: { scaleY: [1, 1.06, 0.97, 1], scaleX: [1, 0.97, 1.02, 1] },
    },
  },
};

const SQUISH: Move = {
  duration: 0.45,
  times: [0, 0.25, 0.55, 0.8, 1],
  kf: { scaleX: [1, 1.16, 0.94, 1.03, 1], scaleY: [1, 0.82, 1.08, 0.98, 1] },
};

/** Keyframes that start from wherever the value is now (null) and fill unspecified props with rest. */
function keyframesFor(move: Move, props: string[]) {
  const len = move.times.length;
  const out: Record<string, (number | null)[]> = {};
  for (const prop of props) {
    const track = move.kf[prop] ?? new Array<number>(len).fill(REST[prop]);
    out[prop] = [null, ...track.slice(1)];
  }
  return out;
}

/** The ground shadow shrinks and fades while the body is in the air. */
function shadowMove(body: Move): Move {
  const y = body.kf.y ?? new Array<number>(body.times.length).fill(0);
  return { ...body, kf: { scale: y.map((v) => 1 + v / 90), opacity: y.map((v) => 1 + v / 60) } };
}

/** Random blinks every 3–5 s (sometimes a double blink). */
function useBlink(enabled: boolean): boolean {
  const [closed, setClosed] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    let timer = 0;
    const later = (fn: () => void, ms: number) => {
      timer = window.setTimeout(fn, ms);
    };
    const next = () => later(() => blink(Math.random() < 0.2), 3000 + Math.random() * 2000);
    const blink = (twice: boolean) => {
      setClosed(true);
      later(() => {
        setClosed(false);
        if (twice) later(() => blink(false), 160);
        else next();
      }, 120);
    };
    next();
    return () => {
      window.clearTimeout(timer);
      setClosed(false);
    };
  }, [enabled]);
  return enabled && closed;
}

const POSE_EASE: Easing = [0.34, 1.56, 0.64, 1];
const LOOP = { repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' } as const;
const BOB_SECONDS = 1.3;

/* ─────────────────────────── Component ───────────────────────────── */

export function Mascot({
  mood: moodProp,
  size = 120,
  color,
  reactKey = 0,
  className,
  onClick,
  title = 'Coco',
}: MascotProps): JSX.Element {
  const mood = safeMood(moodProp);
  const reduce = useReducedMotion() === true;
  const p = paletteFor(color);
  const face = useMemo(() => faceArt(mood, p), [mood, p]);
  const blinkClosed = useBlink(face.blink);

  const [scope, animate] = useAnimate<SVGSVGElement>();
  const bodyRef = useRef<SVGGElement>(null);
  const shadowRef = useRef<SVGGElement>(null);
  const hatRef = useRef<SVGGElement>(null);
  const armLRef = useRef<SVGGElement>(null);
  const armRRef = useRef<SVGGElement>(null);
  const squishRef = useRef<SVGGElement>(null);

  // One-shot reaction: replays whenever the mood or reactKey changes.
  useEffect(() => {
    const r = REACTIONS[mood];
    const parts: [RefObject<SVGGElement | null>, Move | undefined, string[]][] = [
      [bodyRef, r.body, BODY_PROPS],
      [shadowRef, shadowMove(r.body), SHADOW_PROPS],
      [hatRef, r.hat, HAT_PROPS],
      [armLRef, r.armL, ARM_PROPS],
      [armRRef, r.armR, ARM_PROPS],
    ];
    const running = parts.map(([ref, move, props]) => {
      const node = ref.current;
      if (!node) return undefined;
      if (reduce || !move) {
        const rest = Object.fromEntries(props.map((k) => [k, REST[k]]));
        return animate(node, rest, { duration: reduce ? 0 : 0.3 });
      }
      return animate(node, keyframesFor(move, props), { duration: move.duration, times: move.times, ease: move.ease ?? 'easeInOut' });
    });
    return () => running.forEach((a) => a?.stop());
  }, [mood, reactKey, reduce, animate]);

  const squish = () => {
    if (!reduce && squishRef.current) {
      animate(squishRef.current, keyframesFor(SQUISH, ['scaleX', 'scaleY']), {
        duration: SQUISH.duration,
        times: SQUISH.times,
        ease: 'easeOut',
      });
    }
    onClick?.();
  };
  const onKeyDown = (e: KeyboardEvent<SVGSVGElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      squish();
    }
  };
  // Chromium outlines focused SVGs even after a mouse click; only show a ring for keyboard focus.
  const [focusRing, setFocusRing] = useState(false);
  const onFocus = (e: FocusEvent<SVGSVGElement>) => {
    let visible = true;
    try {
      visible = e.currentTarget.matches(':focus-visible');
    } catch {
      /* :focus-visible unsupported: keep the ring */
    }
    setFocusRing(visible);
  };

  const [poseL, poseR] = ARM_POSES[mood];
  const armL = armGeom(-1, poseL);
  const armR = armGeom(1, poseR);
  const poseT = reduce ? { duration: 0 } : { duration: 0.4, ease: POSE_EASE };
  const hatPose = HAT_POSES[mood] ?? NO_HAT_POSE;
  const sleepy = mood === 'sleepy';
  const bob = !reduce && !sleepy;
  const breathe = !reduce && sleepy;
  const playKey = `${mood}-${reactKey}`;
  const interactive = Boolean(onClick);

  return (
    <svg
      ref={scope}
      viewBox={`0 0 ${VB} ${VB}`}
      width={size}
      height={size}
      className={className}
      role={interactive ? 'button' : 'img'}
      aria-label={title}
      tabIndex={interactive ? 0 : undefined}
      onClick={interactive ? squish : undefined}
      onKeyDown={interactive ? onKeyDown : undefined}
      onFocus={interactive ? onFocus : undefined}
      onBlur={interactive ? () => setFocusRing(false) : undefined}
      style={{
        overflow: 'visible',
        outline: focusRing ? `3px solid ${INK}` : 'none',
        outlineOffset: 4,
        borderRadius: 16,
        cursor: interactive ? 'pointer' : undefined,
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'manipulation',
      }}
    >
      {/* ground shadow */}
      <motion.g ref={shadowRef} style={SHADOW_PIVOT}>
        <motion.g
          style={SHADOW_PIVOT}
          animate={bob ? { scale: [1, 0.93] } : { scale: 1 }}
          transition={bob ? { ...LOOP, duration: BOB_SECONDS } : { duration: 0.3 }}
        >
          {toReact(shadowNode(), 'shadow')}
        </motion.g>
      </motion.g>

      <motion.g animate={bob ? { y: [0, -3.5] } : { y: 0 }} transition={bob ? { ...LOOP, duration: BOB_SECONDS } : { duration: 0.3 }}>
        <motion.g ref={bodyRef} style={BODY_PIVOT}>
          <motion.g ref={squishRef} style={BODY_PIVOT}>
            <motion.g
              style={BODY_PIVOT}
              animate={breathe ? { scaleY: [1, 1.035], scaleX: [1, 0.985] } : { scaleY: 1, scaleX: 1 }}
              transition={breathe ? { ...LOOP, duration: 2.2 } : { duration: 0.3 }}
            >
              {bodyNodes(p).map((node, i) => toReact(node, `b${i}`))}

              {/* face */}
              {face.cheeks.map((node, i) => toReact(node, `c${i}`))}
              <motion.g
                key={`eyes-${mood}`}
                style={EYES_PIVOT}
                initial={reduce ? false : { scale: mood === 'wow' ? 0.55 : 0.8 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: mood === 'wow' ? 11 : 18 }}
              >
                <motion.g
                  style={EYES_PIVOT}
                  animate={{ scaleY: blinkClosed ? 0.1 : 1 }}
                  transition={{ duration: 0.06 }}
                >
                  {mood === 'love' && !reduce ? (
                    <motion.g
                      style={EYES_PIVOT}
                      animate={{ scale: [1, 1.14, 1, 1.1, 1] }}
                      transition={{ duration: 1.1, repeat: Infinity, repeatDelay: 0.6 }}
                    >
                      {face.eyes.map((node, i) => toReact(node, `e${i}`))}
                    </motion.g>
                  ) : (
                    face.eyes.map((node, i) => toReact(node, `e${i}`))
                  )}
                </motion.g>
              </motion.g>
              {face.brows.map((node, i) => toReact(node, `w${i}`))}
              {face.mouth.map((node, i) => toReact(node, `m${i}`))}
              {face.tear.length > 0 && (
                <motion.g
                  key={`tear-${playKey}`}
                  initial={reduce ? false : { y: -7, opacity: 0, scale: 0.4 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6, delay: 0.35, ease: 'easeOut' }}
                >
                  {face.tear.map((node, i) => toReact(node, `t${i}`))}
                </motion.g>
              )}

              {/* arms */}
              <motion.g ref={armLRef} style={ARM_L_PIVOT}>
                <motion.path
                  initial={false}
                  animate={{ d: armL.d }}
                  transition={poseT}
                  fill="none"
                  stroke={INK}
                  strokeWidth={ARM_W}
                  strokeLinecap="round"
                />
                <motion.circle initial={false} animate={{ cx: armL.hx, cy: armL.hy }} transition={poseT} r={HAND_R} fill={INK} />
              </motion.g>
              <motion.g ref={armRRef} style={ARM_R_PIVOT}>
                <motion.path
                  initial={false}
                  animate={{ d: armR.d }}
                  transition={poseT}
                  fill="none"
                  stroke={INK}
                  strokeWidth={ARM_W}
                  strokeLinecap="round"
                />
                <motion.circle initial={false} animate={{ cx: armR.hx, cy: armR.hy }} transition={poseT} r={HAND_R} fill={INK} />
              </motion.g>

              {/* beret: mood pose › idle sway › one-shot pops */}
              <motion.g style={HAT_PIVOT_STYLE} initial={false} animate={hatPose} transition={poseT}>
                <motion.g
                  style={HAT_PIVOT_STYLE}
                  animate={reduce ? { rotate: 0 } : { rotate: [-2.5, 2.5] }}
                  transition={reduce ? { duration: 0 } : { ...LOOP, duration: 1.7 }}
                >
                  <motion.g ref={hatRef} style={HAT_PIVOT_STYLE}>
                    {beretNodes().map((node, i) => toReact(node, `h${i}`))}
                  </motion.g>
                </motion.g>
              </motion.g>
            </motion.g>
          </motion.g>
        </motion.g>

        <Effects key={playKey} mood={mood} animated={!reduce} />
      </motion.g>
    </svg>
  );
}

/* ─────────────────────────── Effects ─────────────────────────────── */

function Effects({ mood, animated }: { mood: MascotMood; animated: boolean }): JSX.Element | null {
  if (!animated) {
    const nodes = effectNodes(mood);
    return nodes.length ? <g>{nodes.map((node, i) => toReact(node, i))}</g> : null;
  }
  switch (mood) {
    case 'excited':
      return (
        <g>
          {SPARKLES.map((s, i) => (
            <motion.path
              key={i}
              d={sparklePath(s.x, s.y, s.r)}
              fill={SPARKLE_COLORS[i % 3]}
              initial={{ scale: 0, opacity: 0, rotate: 0 }}
              animate={{ scale: [0, 1.3, 1, 0], opacity: [0, 1, 1, 0], rotate: [0, 90] }}
              transition={{ duration: 1, delay: 0.3 + i * 0.07, ease: 'easeOut' }}
            />
          ))}
        </g>
      );
    case 'love':
      return (
        <g>
          {FLOAT_HEARTS.map((h, i) => (
            <motion.path
              key={i}
              d={heartPath(h.x, h.y, h.s)}
              fill={HEART}
              initial={{ opacity: 0, y: 10, x: 0, scale: 0.4 }}
              animate={{ opacity: [0, 1, 1, 0], y: [10, -34], x: [0, h.drift, 0], scale: [0.4, 1, 1, 0.8] }}
              transition={{ duration: 1.9, delay: h.delay, ease: 'easeOut' }}
            />
          ))}
        </g>
      );
    case 'thinking':
      return (
        <motion.g
          style={{ originX: 0, originY: 1 }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 380, damping: 16, delay: 0.3 }}
        >
          {bubbleNodes(false).map((node, i) => toReact(node, i))}
          {[-8, 0, 8].map((dx, i) => (
            <motion.circle
              key={`dot${i}`}
              cx={BUBBLE.x + dx}
              cy={BUBBLE.y}
              r={2.6}
              fill={INK}
              animate={{ opacity: [0.25, 1, 0.25], scale: [0.8, 1.15, 0.8] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2, ease: 'easeInOut' }}
            />
          ))}
        </motion.g>
      );
    case 'sleepy':
      return (
        <g>
          {ZEDS.map((z, i) => (
            <motion.path
              key={i}
              d={zPath(z.x, z.y, z.s)}
              fill="none"
              stroke={INK}
              strokeWidth={2.8}
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 1, 0], x: [-8, 0, 6], y: [12, 0, -12], scale: [0.6, 1, 1.1] }}
              transition={{ duration: 3, repeat: Infinity, delay: i * 1.5, ease: 'easeOut' }}
            />
          ))}
        </g>
      );
    case 'wow':
      return (
        <motion.g
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: [0, 1, 1, 0], scale: [0.6, 1.1, 1, 1] }}
          transition={{ duration: 1.1, times: [0, 0.2, 0.75, 1], delay: 0.12 }}
          style={pivot(CX, 80)}
        >
          {WOW_LINES.map((d, i) => toReact(stroke(d, 3.4), i))}
        </motion.g>
      );
    default:
      return null;
  }
}
