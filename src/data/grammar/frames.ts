// Sentence frames for the grammar drills: one verb + a complement that the
// renderer can put into any allowed tense, person, negation and question form.
// "Hier," + "j'ai mangé" + "une pomme" -> "Hier, j'ai mangé une pomme."
// The frames live in ./frames/<topic>.ts; ./frames/shared.ts explains the rules.
import type { Frame } from '../../lib/grammar/types';
import { FAMILY } from './frames/family';
import { FOOD } from './frames/food';
import { HEALTH } from './frames/health';
import { HOME } from './frames/home';
import { LEISURE } from './frames/leisure';
import { LOVE } from './frames/love';
import { NATURE } from './frames/nature';
import { ROUTINE } from './frames/routine';
import { SHOPPING } from './frames/shopping';
import { STORY_FRAMES } from './frames/story';
import { TECH } from './frames/tech';
import { TOWN } from './frames/town';
import { TRAVEL } from './frames/travel';
import { WORK } from './frames/work';

export { FRAME_TOPICS } from './frames/shared';

export const FRAMES: Frame[] = [
  ...ROUTINE,
  ...FOOD,
  ...HOME,
  ...WORK,
  ...TRAVEL,
  ...SHOPPING,
  ...LEISURE,
  ...FAMILY,
  ...LOVE,
  ...NATURE,
  ...HEALTH,
  ...TOWN,
  ...TECH,
  ...STORY_FRAMES,
];
