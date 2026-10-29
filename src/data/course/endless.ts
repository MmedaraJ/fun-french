// Endless practice for the verb chapters the sentence generator covers: new sentences in the
// chapter's tense, as many rounds as she likes. These rounds don't count towards finishing the
// chapter (its own exercises do).
import type { Tense } from '../../lib/grammar/types';
import type { GrammarType } from '../../types';

export interface Endless {
  tenses: Tense[];
  kinds: GrammarType[];
}

/** Conjugate, fill the gap, change the tense, make it negative, translate. */
const FORMS: GrammarType[] = ['conj', 'cloze', 'transform', 'negate', 'gtranslate'];

/** By chapter id in "Les temps des verbes". */
export const ENDLESS: Record<string, Endless> = {
  present: { tenses: ['present'], kinds: FORMS },
  'passe-compose': { tenses: ['passe_compose'], kinds: FORMS },
  imparfait: { tenses: ['imparfait'], kinds: FORMS },
  // which of the two: spot it, choose it in context
  'pc-imparfait': { tenses: ['passe_compose', 'imparfait'], kinds: ['cloze', 'tense-id', 'gtranslate'] },
  'plus-que-parfait': { tenses: ['plus_que_parfait'], kinds: FORMS },
  futur: { tenses: ['futur_simple', 'futur_proche'], kinds: FORMS },
  'futur-anterieur': { tenses: ['futur_anterieur'], kinds: FORMS },
  conditionnel: { tenses: ['conditionnel_present'], kinds: FORMS },
  'conditionnel-passe': { tenses: ['conditionnel_passe'], kinds: FORMS },
  imperatif: { tenses: ['imperatif'], kinds: ['conj', 'cloze', 'negate'] },
  subjonctif: { tenses: ['subjonctif_present'], kinds: ['conj', 'cloze', 'transform'] },
  'subjonctif-passe': { tenses: ['subjonctif_passe'], kinds: ['conj', 'cloze', 'transform'] },
  'passe-simple': { tenses: ['passe_simple'], kinds: ['conj', 'cloze', 'tense-id'] },
};

/** The link that plays a round of a chapter's endless practice. */
export function endlessLink(chapterId: string, len = 20): string {
  return `/play/temps?endless=${chapterId}&len=${len}`;
}
