// Question bank for the question-word drills: each item gives one question in up
// to three forms (intonation, est-ce que, inversion) plus a short answer.
// The items live in ./questions/*.ts, grouped by question word.
import type { QAItem } from '../../lib/grammar/types';
import { ADVANCED_QUESTIONS } from './questions/advanced';
import { HOW_WHY } from './questions/how-why';
import { PLACE_TIME } from './questions/place-time';
import { WHICH } from './questions/which';
import { WHO_WHAT } from './questions/who-what';

export const QUESTIONS: QAItem[] = [...WHO_WHAT, ...PLACE_TIME, ...HOW_WHY, ...WHICH, ...ADVANCED_QUESTIONS];
