import type { GameMode, GrammarType, PaletteKey, QuestionType } from '../../types';

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
  /** Grammar games draw generated sentences instead of word cards. */
  section: 'vocab' | 'grammar';
}

export const MIX_TYPES: QuestionType[] = ['pick-image', 'pick-word', 'listen', 'spell', 'gender', 'build', 'type', 'dictation'];

export const GRAMMAR_TYPES: GrammarType[] = ['conj', 'cloze', 'tense-id', 'transform', 'negate', 'qform', 'qword', 'qmatch', 'gtranslate', 'glisten'];

export const MODES: ModeInfo[] = [
  { id: 'pick-image', num: 1, name: 'Images', en: 'Find the picture', blurb: 'Hear a French word and tap its picture.', emoji: '🖼️', color: 'berry', types: ['pick-image'], section: 'vocab' },
  { id: 'pick-word', num: 2, name: 'Mots', en: 'Find the word', blurb: 'See a picture, pick the right French word.', emoji: '🔤', color: 'sky', types: ['pick-word'], section: 'vocab' },
  { id: 'spell', num: 3, name: 'Épeler', en: 'Spell it', blurb: 'See the meaning, rebuild the French word letter by letter.', emoji: '✏️', color: 'sunshine', types: ['spell'], section: 'vocab' },
  { id: 'listen', num: 4, name: 'Écoute', en: 'Ears only', blurb: 'No words on screen. Listen, then tap.', emoji: '🎧', color: 'grape', types: ['listen'], section: 'vocab' },
  { id: 'mix', num: 5, name: 'Mélange', en: 'Shuffle', blurb: 'A surprise mix of every game, harder as you improve.', emoji: '🎲', color: 'tangerine', types: MIX_TYPES, section: 'vocab' },
  { id: 'gender', num: 6, name: 'Le ou la ?', en: 'Masculine or feminine', blurb: 'Swipe each noun to le or la. Quick!', emoji: '⚖️', color: 'lagoon', types: ['gender'], section: 'vocab' },
  { id: 'build', num: 7, name: 'Phrases', en: 'Build sentences', blurb: 'Read the English, put the French word tiles in order.', emoji: '🧩', color: 'leaf', types: ['build'], section: 'vocab' },
  { id: 'type', num: 8, name: 'Écris', en: 'Write it', blurb: 'See the meaning, type the French from memory.', emoji: '✍️', color: 'plum', types: ['type'], section: 'vocab' },
  { id: 'dictation', num: 9, name: 'Dictée', en: 'Dictation', blurb: 'Listen carefully and type exactly what you hear.', emoji: '⌨️', color: 'sky', types: ['dictation'], section: 'vocab' },
  { id: 'pairs', num: 10, name: 'Paires', en: 'Match pairs', blurb: 'Race the clock matching words to pictures.', emoji: '🃏', color: 'berry', types: ['pairs'], section: 'vocab' },
  { id: 'flash', num: 11, name: 'Cartes', en: 'Flashcards', blurb: 'Flip the card. Did you know it?', emoji: '🗂️', color: 'sunshine', types: ['flash'], section: 'vocab' },
  { id: 'speak', num: 12, name: 'Parle !', en: 'Say it', blurb: 'See the meaning, say the French out loud.', emoji: '🎤', color: 'tangerine', types: ['speak'], needs: 'recognition', section: 'vocab' },
  { id: 'conjugaison', num: 1, name: 'Conjugaison', en: 'Verb forms', blurb: 'Every tense, every person: type or pick the right form.', emoji: '🔁', color: 'sky', types: ['conj', 'cloze'], section: 'grammar' },
  { id: 'temps', num: 2, name: 'Les temps', en: 'Tenses in context', blurb: 'Past, present, future: spot, change and build the right tense.', emoji: '⏳', color: 'grape', types: ['cloze', 'tense-id', 'transform', 'negate', 'gtranslate', 'glisten'], section: 'grammar' },
  { id: 'questions', num: 3, name: 'Questions', en: 'Asking questions', blurb: 'Où, quand, pourquoi… and three ways to ask.', emoji: '❓', color: 'tangerine', types: ['qword', 'qform', 'qmatch'], section: 'grammar' },
  { id: 'grammaire', num: 4, name: 'Leçons', en: 'Grammar lessons', blurb: 'Short lessons with tables and examples, then practice.', emoji: '📘', color: 'leaf', types: GRAMMAR_TYPES, section: 'grammar' },
];

export const MODE_BY_ID = Object.fromEntries(MODES.map((m) => [m.id, m])) as Record<GameMode, ModeInfo>;

export const TYPE_LABEL: Record<QuestionType, string> = {
  'pick-image': 'Pictures',
  'pick-word': 'Words',
  spell: 'Spelling',
  listen: 'Listening',
  gender: 'Le / la',
  build: 'Sentences',
  type: 'Writing',
  dictation: 'Dictation',
  pairs: 'Pairs',
  flash: 'Flashcards',
  speak: 'Speaking',
  conj: 'Conjugation',
  cloze: 'Verb in context',
  'tense-id': 'Spot the tense',
  transform: 'Change the tense',
  negate: 'Negation',
  qform: 'Question forms',
  qword: 'Question words',
  qmatch: 'Question & answer',
  gtranslate: 'Translate',
  glisten: 'Listening (grammar)',
};

export function recognitionSupported(): boolean {
  if (typeof window === 'undefined') return false;
  const w = window as unknown as Record<string, unknown>;
  return !!(w.SpeechRecognition || w.webkitSpeechRecognition);
}
