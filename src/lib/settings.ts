import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { GameMode } from '../types';

export type ThemePref = 'auto' | 'light' | 'dark';
/** 1 Facile, 2 Normal, 3 Difficile. */
export type Difficulty = 1 | 2 | 3;
export type MascotColorPref = 'pink' | 'pistachio' | 'lemon' | 'lavender' | 'caramel' | 'raspberry';

export interface ModeOptions {
  deckIds: string[];
  survival: boolean;
  length: number;
  /** Only starred words. */
  focus?: boolean;
  /** Grammar games: tenses to practise (empty = all). */
  tenses?: string[];
  /** Conjugation drills: which verbs. */
  verbSet?: 'book' | 'core' | 'all';
}

export interface Settings {
  onboarded: boolean;
  name: string;
  /** French agreement used when the app talks to the learner ("prête" vs "prêt"). */
  agreement: 'f' | 'm';
  dailyGoal: number;
  sound: boolean;
  volume: number;
  haptics: boolean;
  voiceURI: string | null;
  rate: number;
  autoplay: boolean;
  roundLength: number;
  newPerRound: number;
  introduceNew: boolean;
  /** How hard the games are: answer options, typing vs choosing, decoys, accents. */
  difficulty: Difficulty;
  theme: ThemePref;
  mascotColor: MascotColorPref;
  aiKey: string;
  aiModel: string;
  modeOptions: Partial<Record<GameMode, ModeOptions>>;
  /** Games whose "how to play" tip was already shown. */
  seenTips: Partial<Record<GameMode, boolean>>;
  lastBackupAt: number;
}

export const DEFAULT_SETTINGS: Settings = {
  onboarded: false,
  name: '',
  agreement: 'f',
  dailyGoal: 60,
  sound: true,
  volume: 0.8,
  haptics: true,
  voiceURI: null,
  rate: 0.95,
  autoplay: true,
  roundLength: 10,
  newPerRound: 3,
  // Showing a new word right before asking it gives the answer away; she learns from feedback instead.
  introduceNew: false,
  difficulty: 3,
  theme: 'auto',
  mascotColor: 'pink',
  aiKey: '',
  aiModel: 'claude-opus-5-5',
  modeOptions: {},
  seenTips: {},
  lastBackupAt: 0,
};

interface SettingsStore extends Settings {
  update: (patch: Partial<Settings>) => void;
  reset: () => void;
}

export const useSettings = create<SettingsStore>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      update: (patch) => set(patch),
      reset: () => set({ ...DEFAULT_SETTINGS }),
    }),
    {
      name: 'bonbon-settings',
      version: 3,
      migrate: (persisted, version) => {
        const st = (persisted ?? {}) as Partial<Settings>;
        if (version < 2) st.introduceNew = false;
        // "It's too easy": everyone starts on Difficile and can step down in Réglages
        if (version < 3) st.difficulty = 3;
        return st as SettingsStore;
      },
    },
  ),
);

/** Non-hook access for plain modules (sound, speech, engine). */
export function settings(): Settings {
  return useSettings.getState();
}

/** Pick the agreeing French form: g('prêt', 'prête'). */
export function g(masc: string, fem: string): string {
  return settings().agreement === 'm' ? masc : fem;
}

export function snapshotSettings(): Settings {
  const { update: _u, reset: _r, ...rest } = useSettings.getState();
  void _u;
  void _r;
  return rest;
}
