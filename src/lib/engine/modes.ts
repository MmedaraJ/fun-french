import type { GameMode, PaletteKey, QuestionType } from '../../types';

export interface ModeInfo {
  id: GameMode;
  num: number;
  name: string;
  en: string;
  blurb: string;
  emoji: string;
  color: PaletteKey;
  types: QuestionType[];
  needs?: 'recognition';
}

export const MIX_TYPES: QuestionType[] = ['pick-image', 'pick-word', 'listen', 'spell', 'gender', 'build', 'type'];

export const MODES: ModeInfo[] = [
  { id: 'pick-image', num: 1, name: 'Images', en: 'Find the picture', blurb: 'Hear a French word and tap its picture.', emoji: '🖼️', color: 'berry', types: ['pick-image'] },
  { id: 'pick-word', num: 2, name: 'Mots', en: 'Find the word', blurb: 'See a picture, pick the right French word.', emoji: '🔤', color: 'sky', types: ['pick-word'] },
  { id: 'spell', num: 3, name: 'Épeler', en: 'Spell it', blurb: 'Rebuild the word one letter tile at a time.', emoji: '✏️', color: 'sunshine', types: ['spell'] },
  { id: 'listen', num: 4, name: 'Écoute', en: 'Ears only', blurb: 'No words on screen. Listen, then tap.', emoji: '🎧', color: 'grape', types: ['listen'] },
  { id: 'mix', num: 5, name: 'Mélange', en: 'Shuffle', blurb: 'A surprise mix of every game, harder as you improve.', emoji: '🎲', color: 'tangerine', types: MIX_TYPES },
  { id: 'gender', num: 6, name: 'Le ou la ?', en: 'Masculine or feminine', blurb: 'Swipe each noun to le or la. Quick!', emoji: '⚖️', color: 'lagoon', types: ['gender'] },
  { id: 'build', num: 7, name: 'Phrases', en: 'Build sentences', blurb: 'Put the word tiles in the right order.', emoji: '🧩', color: 'leaf', types: ['build'] },
  { id: 'type', num: 8, name: 'Dictée', en: 'Dictation', blurb: 'Listen and type what you hear.', emoji: '⌨️', color: 'plum', types: ['type'] },
  { id: 'pairs', num: 9, name: 'Paires', en: 'Match pairs', blurb: 'Race the clock matching words to pictures.', emoji: '🃏', color: 'berry', types: ['pairs'] },
  { id: 'flash', num: 10, name: 'Cartes', en: 'Flashcards', blurb: 'Flip the card. Did you know it?', emoji: '🗂️', color: 'sky', types: ['flash'] },
  { id: 'speak', num: 11, name: 'Parle !', en: 'Say it', blurb: 'Say the word out loud and Coco listens.', emoji: '🎤', color: 'tangerine', types: ['speak'], needs: 'recognition' },
];

export const MODE_BY_ID = Object.fromEntries(MODES.map((m) => [m.id, m])) as Record<GameMode, ModeInfo>;

export const TYPE_LABEL: Record<QuestionType, string> = {
  'pick-image': 'Pictures',
  'pick-word': 'Words',
  spell: 'Spelling',
  listen: 'Listening',
  gender: 'Le / la',
  build: 'Sentences',
  type: 'Dictation',
  pairs: 'Pairs',
  flash: 'Flashcards',
  speak: 'Speaking',
};

export function recognitionSupported(): boolean {
  if (typeof window === 'undefined') return false;
  const w = window as unknown as Record<string, unknown>;
  return !!(w.SpeechRecognition || w.webkitSpeechRecognition);
}
