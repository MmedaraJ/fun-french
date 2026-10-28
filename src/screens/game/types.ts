import type { Question } from '../../lib/engine/round';
import type { Card } from '../../types';

export interface AnswerInfo {
  /** Id of the option the learner picked (multiple choice). */
  picked?: string;
  /** What the learner typed / said / built. */
  given?: string;
  /** Extra note for the feedback bar, e.g. "Watch the accents". */
  note?: string;
  /** Points computed by the question itself (pairs). */
  points?: number;
}

export interface QProps {
  q: Question;
  phase: 'ask' | 'feedback';
  /** Set once answered. */
  result?: { correct: boolean } & AnswerInfo;
  onAnswer: (correct: boolean, info?: AnswerInfo) => void;
  /** Multi-card questions (pairs) report each card separately. */
  onPartial?: (card: Card, correct: boolean, ms: number) => void;
  /** Text colour that reads on the current background. */
  ink: string;
  autoplay: boolean;
}
