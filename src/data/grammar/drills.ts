// Hand-written gap sentences for the advanced structures (see DrillItem in
// lib/grammar/types). The sets live in ./drills/*.ts; each advanced lesson
// practises one or more of them, and the "Structures" game mixes them all.
import type { DrillSet } from '../../lib/grammar/types';
import { DISCOURS_DRILLS } from './drills/discours';
import { FORMES_DRILLS } from './drills/formes';
import { PRONOMS_DRILLS } from './drills/pronoms';
import { RELATIONS_DRILLS } from './drills/relations';
import { STYLE_DRILLS } from './drills/style';
import { SUBORDONNEES_DRILLS } from './drills/subordonnees';

export const DRILL_SETS: DrillSet[] = [...PRONOMS_DRILLS, ...SUBORDONNEES_DRILLS, ...DISCOURS_DRILLS, ...FORMES_DRILLS, ...RELATIONS_DRILLS, ...STYLE_DRILLS];

export const DRILL_BY_ID: Record<string, DrillSet> = Object.fromEntries(DRILL_SETS.map((d) => [d.id, d]));
