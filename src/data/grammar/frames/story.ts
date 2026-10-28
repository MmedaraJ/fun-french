// Narration frames for written stories: 3rd person only, and they allow the passé simple
// ("Il ouvrit la porte du château."). They work in the everyday tenses too.
import type { Frame } from '../../../lib/grammar/types';
import { LASTING, P3, STORY, STORY_ACT, group, type Draft } from './shared';

const tale = (topic: string, drafts: Draft[]): Frame[] =>
  group(topic, drafts.map((d) => ({ persons: P3, tenses: STORY, level: 2 as const, ...d })));

export const STORY_FRAMES: Frame[] = [
  ...tale('leisure', [
    { id: 'story-ouvrir-porte-chateau', verb: 'ouvrir', fr: 'la porte du château', en: 'the castle door' },
    { id: 'story-arriver-chateau', verb: 'arriver', fr: 'au château', en: 'at the castle' },
    { id: 'story-attaquer-chateau', verb: 'attaquer', fr: 'le château', en: 'the castle', enVerb: 'attack' },
    { id: 'story-sauver-princesse', verb: 'sauver', fr: 'la princesse', en: 'the princess', enVerb: 'rescue' },
    { id: 'story-tuer-dragon', verb: 'tuer', fr: 'le dragon', en: 'the dragon', enVerb: 'kill' },
    { id: 'story-voler-couronne', verb: 'voler', fr: 'la couronne', en: 'the crown', enVerb: 'steal' },
    { id: 'story-devenir-roi', verb: 'devenir', fr: '{roi|reine|rois|reines}', en: '{king|queen|kings|queens}', enVerb: 'become' },
    { id: 'story-decouvrir-tresor', verb: 'découvrir', fr: 'un trésor', frNeg: 'de trésor', en: 'a treasure', enVerb: 'find', object: 'thing' },
    { id: 'story-enterrer-tresor', verb: 'enterrer', fr: 'le trésor sous un arbre', en: 'the treasure under a tree', enVerb: 'bury' },
    { id: 'story-accuser-majordome', verb: 'accuser', fr: 'le majordome', en: 'the butler', enVerb: 'accuse' },
    { id: 'story-nier-faits', verb: 'nier', fr: 'les faits', en: 'the facts', enVerb: 'deny', level: 3 },
    { id: 'story-jurer-verite', verb: 'jurer', fr: 'de dire la vérité', en: 'to tell the truth', enVerb: 'swear', level: 3 },
    { id: 'story-pousser-cri', verb: 'pousser', fr: 'un cri', frNeg: 'de cri', en: 'a scream', enVerb: 'let out', level: 3 },
    { id: 'story-prendre-fuite', verb: 'prendre', fr: 'la fuite', en: '', enVerb: 'run away', level: 3 },
  ]),
  ...tale('nature', [
    { id: 'story-traverser-foret', verb: 'traverser', fr: 'la forêt', en: 'the forest', enVerb: 'go through' },
    { id: 'story-echapper-loup', verb: 'échapper', fr: 'au loup', en: 'the wolf', enVerb: 'escape' },
    { id: 'story-explorer-grotte', verb: 'explorer', fr: 'la grotte', en: 'the cave' },
    { id: 'story-suivre-chemin', verb: 'suivre', fr: 'le chemin', en: 'the path', enVerb: 'follow', tenses: STORY_ACT },
    { id: 'story-courir-riviere', verb: 'courir', fr: "jusqu'à la rivière", en: 'to the river' },
    { id: 'story-tomber-puits', verb: 'tomber', fr: 'dans le puits', en: 'into the well', enVerb: 'fall' },
    { id: 'story-partir-aube', verb: 'partir', fr: "à l'aube", en: 'at dawn' },
  ]),
  ...tale('home', [
    { id: 'story-entrer-salon', verb: 'entrer', fr: 'dans le salon', en: 'the living room', enVerb: 'go into' },
    { id: 'story-frapper-trois-fois', verb: 'frapper', fr: 'trois fois à la porte', en: 'on the door three times', enVerb: 'knock' },
    { id: 'story-regarder-fenetre', verb: 'regarder', fr: 'par la fenêtre', en: 'out of the window', enVerb: 'look', tenses: STORY_ACT },
    { id: 'story-eteindre-bougie', verb: 'éteindre', fr: 'la bougie', en: 'the candle', enVerb: 'put out' },
    { id: 'story-vendre-maison', verb: 'vendre', fr: 'la maison', en: 'the house' },
  ]),
  ...tale('love', [
    { id: 'story-briser-silence', verb: 'briser', fr: 'le silence', en: 'the silence', enVerb: 'break', level: 3 },
    { id: 'story-cesser-parler', verb: 'cesser', fr: 'de parler', en: 'talking', enVerb: 'stop', level: 3 },
    { id: 'story-chuchoter-secret', verb: 'chuchoter', fr: 'un secret à la reine', frNeg: 'de secret à la reine', en: 'a secret to the queen', enVerb: 'whisper' },
    { id: 'story-ecrire-longue-lettre', verb: 'écrire', fr: 'une longue lettre', frNeg: 'de longue lettre', en: 'a long letter' },
    { id: 'story-lire-lettre', verb: 'lire', fr: 'la lettre en silence', en: 'the letter in silence' },
    { id: 'story-sourire-tristement', verb: 'sourire', fr: 'tristement', en: 'sadly', enVerb: 'smile', tenses: STORY_ACT },
    { id: 'story-attendre-longtemps', verb: 'attendre', fr: 'longtemps', en: 'for a long time', enVerb: 'wait', tenses: STORY_ACT },
  ]),
  ...tale('travel', [
    { id: 'story-quitter-pays', verb: 'quitter', fr: 'le pays', en: 'the country', enVerb: 'leave' },
    { id: 'story-descendre-village', verb: 'descendre', fr: 'au village', en: 'to the village' },
    { id: 'story-revenir-village', verb: 'revenir', fr: 'au village', en: 'to the village', enVerb: 'come back' },
  ]),
  ...tale('town', [
    { id: 'story-fonder-ville', verb: 'fonder', fr: 'une ville', frNeg: 'de ville', en: 'a city', enVerb: 'found', level: 3 },
    { id: 'story-construire-pont', verb: 'construire', fr: 'un pont', frNeg: 'de pont', en: 'a bridge' },
  ]),
  ...tale('family', [
    { id: 'story-naitre-village', verb: 'naître', fr: 'dans un petit village', en: 'in a small village', enVerb: 'be born', tenses: ['passe_compose', 'passe_simple'] },
    { id: 'story-vivre-campagne', verb: 'vivre', fr: 'à la campagne', en: 'in the country', stative: true, tenses: [...LASTING, 'passe_simple'] },
  ]),
  ...tale('work', [
    { id: 'story-dechirer-contrat', verb: 'déchirer', fr: 'le contrat', en: 'the contract', enVerb: 'tear up' },
    { id: 'story-decouvrir-verite', verb: 'découvrir', fr: 'la vérité', en: 'the truth' },
  ]),
];
