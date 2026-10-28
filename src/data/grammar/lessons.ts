// Grammar lessons, in learning-path order: bases → présent → questions → négation →
// futur proche / passé récent → passé composé → imparfait → futur simple →
// conditionnel → impératif → plus-que-parfait, futur antérieur, conditionnel passé →
// subjonctif → passé simple. The lessons live in ./lessons/*.ts.
import type { Lesson } from '../../lib/grammar/types';
import { BASES } from './lessons/bases';
import { COMPOUND } from './lessons/compound';
import { CONDITIONNEL_IMPERATIF } from './lessons/conditionnel-imperatif';
import { IMPARFAIT_FUTUR } from './lessons/imparfait-futur';
import { NEGATION_NEAR } from './lessons/negation-near';
import { PASSE_COMPOSE } from './lessons/passe-compose';
import { PRESENT_1 } from './lessons/present-1';
import { PRESENT_2 } from './lessons/present-2';
import { QUESTION_LESSONS } from './lessons/questions';
import { SUBJONCTIF } from './lessons/subjonctif';

export const LESSONS: Lesson[] = [
  ...BASES,
  ...PRESENT_1,
  ...PRESENT_2,
  ...QUESTION_LESSONS,
  ...NEGATION_NEAR,
  ...PASSE_COMPOSE,
  ...IMPARFAIT_FUTUR,
  ...CONDITIONNEL_IMPERATIF,
  ...COMPOUND,
  ...SUBJONCTIF,
];
