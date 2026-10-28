// Every verb the grammar system supports. The conjugation engine must handle
// all of them; sentence frames may only use verbs from this list.
import { BOOK_ER_VERBS } from '../../data/grammar/book-er-verbs';
import type { VerbInfo } from './types';

/** Core verbs beyond the textbook list: irregulars, -ir/-re groups, spelling changes, reflexives. */
const CORE: [string, string, 1 | 2 | 3][] = [
  // the big irregulars
  ['être', 'to be', 3],
  ['avoir', 'to have', 3],
  ['aller', 'to go', 3],
  ['faire', 'to do, to make', 3],
  ['dire', 'to say, to tell', 3],
  ['pouvoir', 'can, to be able to', 3],
  ['vouloir', 'to want', 3],
  ['savoir', 'to know (a fact)', 3],
  ['voir', 'to see', 3],
  ['venir', 'to come', 3],
  ['devoir', 'must, to have to', 3],
  ['prendre', 'to take', 3],
  ['mettre', 'to put', 3],
  ['croire', 'to believe', 3],
  ['tenir', 'to hold', 3],
  ['connaître', 'to know (a person, a place)', 3],
  ['sortir', 'to go out', 3],
  ['partir', 'to leave', 3],
  ['dormir', 'to sleep', 3],
  ['sentir', 'to feel, to smell', 3],
  ['servir', 'to serve', 3],
  ['courir', 'to run', 3],
  ['mourir', 'to die', 3],
  ['naître', 'to be born', 3],
  ['lire', 'to read', 3],
  ['écrire', 'to write', 3],
  ['boire', 'to drink', 3],
  ['recevoir', 'to receive', 3],
  ['ouvrir', 'to open', 3],
  ['offrir', 'to offer, to give (a gift)', 3],
  ['découvrir', 'to discover', 3],
  ['souffrir', 'to suffer', 3],
  ['vivre', 'to live', 3],
  ['suivre', 'to follow', 3],
  ['rire', 'to laugh', 3],
  ['sourire', 'to smile', 3],
  ['plaire', 'to please', 3],
  ['conduire', 'to drive', 3],
  ['construire', 'to build', 3],
  ['traduire', 'to translate', 3],
  ['comprendre', 'to understand', 3],
  ['apprendre', 'to learn', 3],
  ['revenir', 'to come back', 3],
  ['devenir', 'to become', 3],
  ['obtenir', 'to get, to obtain', 3],
  ['permettre', 'to allow', 3],
  ['promettre', 'to promise', 3],
  ['attendre', 'to wait (for)', 3],
  ['entendre', 'to hear', 3],
  ['répondre', 'to answer', 3],
  ['vendre', 'to sell', 3],
  ['perdre', 'to lose', 3],
  ['descendre', 'to go down', 3],
  ['rendre', 'to give back', 3],
  ['peindre', 'to paint', 3],
  ['éteindre', 'to switch off', 3],
  ['falloir', 'to be necessary (il faut)', 3],
  ['pleuvoir', 'to rain', 3],
  ['envoyer', 'to send', 1],
  // -ir like finir
  ['finir', 'to finish', 2],
  ['choisir', 'to choose', 2],
  ['réussir', 'to succeed, to pass', 2],
  ['grandir', 'to grow up', 2],
  ['grossir', 'to put on weight', 2],
  ['maigrir', 'to lose weight', 2],
  ['rougir', 'to blush', 2],
  ['remplir', 'to fill', 2],
  ['réfléchir', 'to think (about), to reflect', 2],
  ['obéir', 'to obey', 2],
  ['punir', 'to punish', 2],
  ['applaudir', 'to applaud', 2],
  ['guérir', 'to cure, to heal', 2],
  ['nourrir', 'to feed', 2],
  ['vieillir', 'to grow old', 2],
  ['atterrir', 'to land', 2],
  ['agir', 'to act', 2],
  ['ralentir', 'to slow down', 2],
  // -er with spelling changes
  ['manger', 'to eat', 1],
  ['nager', 'to swim', 1],
  ['voyager', 'to travel', 1],
  ['changer', 'to change', 1],
  ['partager', 'to share', 1],
  ['bouger', 'to move', 1],
  ['ranger', 'to tidy (up)', 1],
  ['commencer', 'to begin, to start', 1],
  ['lancer', 'to throw', 1],
  ['avancer', 'to move forward', 1],
  ['prononcer', 'to pronounce', 1],
  ['acheter', 'to buy', 1],
  ['lever', 'to lift, to raise', 1],
  ['mener', 'to lead', 1],
  ['amener', 'to bring (someone)', 1],
  ['emmener', 'to take (someone)', 1],
  ['promener', 'to walk (a dog)', 1],
  ['appeler', 'to call', 1],
  ['rappeler', 'to call back, to remind', 1],
  ['jeter', 'to throw (away)', 1],
  ['préférer', 'to prefer', 1],
  ['espérer', 'to hope', 1],
  ['répéter', 'to repeat', 1],
  ['payer', 'to pay (for)', 1],
  ['essayer', 'to try (on)', 1],
  ['nettoyer', 'to clean', 1],
  ['employer', 'to employ, to use', 1],
  // regular -er not in the textbook list
  ['réserver', 'to book, to reserve', 1],
  ['garer', 'to park', 1],
  ['allumer', 'to switch on, to light', 1],
  ['fêter', 'to celebrate', 1],
  ['bronzer', 'to sunbathe, to tan', 1],
  ['télécharger', 'to download', 1],
  ['arroser', 'to water', 1],
  // reflexive verbs
  ['se lever', 'to get up', 1],
  ['se coucher', 'to go to bed', 1],
  ['se réveiller', 'to wake up', 1],
  ['s’habiller', 'to get dressed', 1],
  ['se laver', 'to wash (yourself)', 1],
  ['se brosser', 'to brush (your hair, teeth)', 1],
  ['se doucher', 'to have a shower', 1],
  ['se maquiller', 'to put on make-up', 1],
  ['se raser', 'to shave', 1],
  ['se reposer', 'to rest', 1],
  ['s’amuser', 'to have fun', 1],
  ['se promener', 'to go for a walk', 1],
  ['s’appeler', 'to be called', 1],
  ['se préparer', 'to get ready', 1],
  ['s’occuper', 'to take care (of)', 1],
  ['s’intéresser', 'to be interested (in)', 1],
  ['se marier', 'to get married', 1],
  ['se tromper', 'to make a mistake', 1],
  ['se disputer', 'to argue', 1],
  ['s’arrêter', 'to stop', 1],
  ['s’ennuyer', 'to be bored', 1],
  ['se souvenir', 'to remember', 3],
  ['se sentir', 'to feel', 3],
  ['s’asseoir', 'to sit down', 3],
  ['se perdre', 'to get lost', 3],
  ['se taire', 'to be quiet', 3],
];

/** Pronominal infinitives use a straight apostrophe internally: "s'appeler". */
export function normInf(inf: string): string {
  return inf.replace(/’/g, "'").trim();
}

function build(): VerbInfo[] {
  const seen = new Set<string>();
  const out: VerbInfo[] = [];
  for (const [inf, en] of BOOK_ER_VERBS) {
    const k = normInf(inf);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push({ inf: k, en, group: 1, source: 'book-er' });
  }
  for (const [inf, en, group] of CORE) {
    const k = normInf(inf);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push({ inf: k, en, group, source: 'core' });
  }
  return out;
}

export const VERBS: VerbInfo[] = build();
export const VERB_BY_INF: Record<string, VerbInfo> = Object.fromEntries(VERBS.map((v) => [v.inf, v]));

export function isPronominal(inf: string): boolean {
  return /^(se |s')/.test(normInf(inf));
}

/** "se lever" -> "lever", "s'appeler" -> "appeler". */
export function baseInf(inf: string): string {
  return normInf(inf).replace(/^(se |s')/, '');
}
