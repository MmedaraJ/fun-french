// Core data model shared by the database, the game engine and the UI.

export type CardKind = 'word' | 'phrase' | 'sentence';
export type Gender = 'm' | 'f';
export type CardSource = 'starter' | 'manual' | 'text' | 'photo' | 'ai' | 'import';

/** Palette keys; the actual colours live in src/styles/tokens.css and src/lib/palette.ts. */
export type PaletteKey =
  | 'berry'
  | 'tangerine'
  | 'sunshine'
  | 'leaf'
  | 'lagoon'
  | 'sky'
  | 'grape'
  | 'plum';

export interface Deck {
  id: string;
  /** French name, e.g. "Les animaux". */
  name: string;
  /** English name, e.g. "Animals". */
  nameEn: string;
  emoji: string;
  color: PaletteKey;
  builtin: boolean;
  /** Active decks feed new words into daily practice. */
  active: boolean;
  /** 1 = A1, 2 = A2, 3 = B1, 4 = B2 and up. */
  level: number;
  order: number;
  createdAt: number;
}

export interface Card {
  id: string;
  deckId: string;
  kind: CardKind;
  /** French text. Nouns carry their article: "le chat", "l'arbre", "les lunettes". */
  fr: string;
  /** English meaning, without article for nouns: "cat". */
  en: string;
  gender?: Gender;
  /** Plural-only nouns such as "les lunettes". */
  plural?: boolean;
  emoji?: string;
  /** Id of a user photo in the images table; wins over emoji when present. */
  imageId?: string;
  /** Short usage note, e.g. "informal" or "feminine: chaude". */
  note?: string;
  source: CardSource;
  /** Starred by the learner to practise more. */
  focus?: boolean;
  archived?: boolean;
  /** Usefulness order inside the deck (lower = taught first). */
  order: number;
  createdAt: number;
  updatedAt: number;
}

/** Spaced-repetition memory for one card. Missing row = never seen. */
export interface Progress {
  cardId: string;
  /** Leitner-style box, 0 (new) .. 6 (rock solid). */
  box: number;
  /** Timestamp (ms) when the card is next due. */
  due: number;
  seen: number;
  correct: number;
  wrong: number;
  /** Times the card dropped back after being known. */
  lapses: number;
  /** Current run of correct answers. */
  streak: number;
  firstSeen: number;
  lastSeen: number;
  /** When the card first reached the "learned" threshold. */
  learnedAt?: number;
  /** When the card first reached the "mastered" threshold. */
  masteredAt?: number;
}

/** Vocabulary question types; each also has its own game on the home screen. */
export type VocabType =
  | 'pick-image'
  | 'pick-word'
  | 'spell'
  | 'listen'
  | 'gender'
  | 'build'
  | 'type'
  | 'dictation'
  | 'pairs'
  | 'flash'
  | 'speak';

/** Grammar question types (same values as ExerciseKind in lib/grammar/types). */
export type GrammarType =
  | 'conj'
  | 'cloze'
  | 'tense-id'
  | 'transform'
  | 'negate'
  | 'qform'
  | 'qword'
  | 'qmatch'
  | 'gtranslate'
  | 'glisten'
  | 'drill';

/** A question type is what a single question actually asks. */
export type QuestionType = VocabType | GrammarType;

/** A game: one vocabulary type, the vocabulary mix, or a grammar game. */
export type GameMode = VocabType | 'mix' | 'conjugaison' | 'temps' | 'questions' | 'structures' | 'grammaire';

/** One answered question, stored for statistics. */
export interface AnswerEvent {
  id?: number;
  sessionId: string;
  cardId: string;
  type: QuestionType;
  correct: boolean;
  /** Milliseconds from question shown to answer. */
  ms: number;
  ts: number;
  /** Local calendar day, "YYYY-MM-DD". */
  day: string;
  /** Grammar answers: the sentence and its translation (there's no word card to look up). */
  label?: string;
  labelEn?: string;
}

export interface Session {
  id: string;
  mode: GameMode;
  survival: boolean;
  startedAt: number;
  endedAt: number;
  day: string;
  score: number;
  correct: number;
  total: number;
  maxCombo: number;
  xp: number;
  newCards: number;
  deckIds: string[];
  /** Card ids answered wrong at least once. */
  missed: string[];
  /** Card ids in the order they were asked. */
  cardIds: string[];
  /** Grammar lesson this round practised, if any. */
  lesson?: string;
  /** Words that reached "learned" during this round. */
  learned?: number;
}

export interface DailyStat {
  /** "YYYY-MM-DD", local time. */
  day: string;
  xp: number;
  answers: number;
  correct: number;
  ms: number;
  sessions: number;
  newCards: number;
}

export interface StoredImage {
  id: string;
  blob: Blob;
  createdAt: number;
}

export interface Unlocked {
  id: string;
  unlockedAt: number;
}

/** Shape of the built-in content in src/data/starter.ts (expanded into Deck + Card rows on first run). */
export interface StarterCard {
  fr: string;
  en: string;
  /** Defaults to the deck's `kind`. */
  kind?: CardKind;
  g?: Gender;
  pl?: true;
  e?: string;
  note?: string;
}

export interface StarterDeck {
  id: string;
  name: string;
  nameEn: string;
  emoji: string;
  color: PaletteKey;
  level: number;
  /** Default kind for the cards in this deck. */
  kind: CardKind;
  /** Switched on straight away when the deck first appears in an app that is already set up. */
  activeByDefault?: boolean;
  cards: StarterCard[];
}
