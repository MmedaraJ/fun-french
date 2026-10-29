// "Les temps des verbes": every tense and mood, chapter by chapter (./tNN-*.ts).
import type { Chapter } from '../../../lib/grammar/types';
import { T_PRESENT } from './t01-present';
import { T_PRONOMINAUX } from './t02-pronominaux';
import { T_PASSE_COMPOSE } from './t03-passe-compose';
import { T_IMPARFAIT } from './t04-imparfait';
import { T_PC_IMPARFAIT } from './t05-pc-imparfait';
import { T_PQP } from './t06-plus-que-parfait';
import { T_FUTUR } from './t07-futur';
import { T_FUTUR_ANTERIEUR } from './t08-futur-anterieur';
import { T_CONDITIONNEL } from './t09-conditionnel';
import { T_CONDITIONNEL_PASSE } from './t10-conditionnel-passe';
import { T_IMPERATIF } from './t11-imperatif';
import { T_SUBJONCTIF } from './t12-subjonctif';
import { T_SUBJONCTIF_EMPLOIS } from './t13-subjonctif-emplois';
import { T_SUBJONCTIF_PASSE } from './t14-subjonctif-passe';
import { T_PASSE_SIMPLE } from './t15-passe-simple';
import { T_PARTICIPE } from './t16-participe-gerondif';
import { T_PASSIF } from './t17-passif';
import { T_CONCORDANCE } from './t18-concordance';

export const TEMPS_CHAPTERS: Chapter[] = [T_PRESENT, T_PRONOMINAUX, T_PASSE_COMPOSE, T_IMPARFAIT, T_PC_IMPARFAIT, T_PQP, T_FUTUR, T_FUTUR_ANTERIEUR, T_CONDITIONNEL, T_CONDITIONNEL_PASSE, T_IMPERATIF, T_SUBJONCTIF, T_SUBJONCTIF_EMPLOIS, T_SUBJONCTIF_PASSE, T_PASSE_SIMPLE, T_PARTICIPE, T_PASSIF, T_CONCORDANCE];
