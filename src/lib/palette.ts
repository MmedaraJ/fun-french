import type { PaletteKey } from '../types';

export const PALETTE: Record<PaletteKey, string> = {
  berry: '#ff5e7e',
  tangerine: '#ff8a3d',
  sunshine: '#ffc83d',
  leaf: '#2dbe6c',
  lagoon: '#17b8c4',
  sky: '#3d7bff',
  grape: '#8c5cff',
  plum: '#d45ab4',
};

export const PALETTE_KEYS = Object.keys(PALETTE) as PaletteKey[];

/** Colours light enough that text on them should be dark. */
const LIGHT: PaletteKey[] = ['sunshine'];

export function paletteColor(key: PaletteKey | string | undefined): string {
  return (key && PALETTE[key as PaletteKey]) || PALETTE.berry;
}

export function inkOn(key: PaletteKey | string | undefined): string {
  return LIGHT.includes(key as PaletteKey) ? '#2b2d42' : '#ffffff';
}

/** Deterministic but varied colour for an index (question backgrounds, tiles). */
export function cycleColor(i: number, offset = 0): PaletteKey {
  return PALETTE_KEYS[(((i + offset) % PALETTE_KEYS.length) + PALETTE_KEYS.length) % PALETTE_KEYS.length];
}

/** Random palette key that differs from `not`. */
export function randomColor(not?: PaletteKey): PaletteKey {
  const pool = PALETTE_KEYS.filter((k) => k !== not);
  return pool[Math.floor(Math.random() * pool.length)];
}
