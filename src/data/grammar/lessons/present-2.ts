// Lessons 8–10: -re verbs, the key irregular verbs and reflexive verbs in the present.
import type { Lesson } from '../../../lib/grammar/types';

export const PRESENT_2: Lesson[] = [
  {
    id: 'present-re',
    unit: 'present',
    title: 'Les verbes en -re comme attendre',
    en: '-re verbs like attendre',
    level: 1,
    intro: 'Verbs like **attendre**, **vendre**, **répondre** and **perdre** form a small regular family. Their il / elle form has no ending at all.',
    sections: [
      {
        heading: 'Les terminaisons',
        body: "Remove **-re** and add **-s, -s, (nothing), -ons, -ez, -ent**. The d is silent in the singular: **j'attends** sounds like 'j'atan'.",
        table: {
          head: ['Pronoun', 'Ending', 'attendre', 'répondre'],
          rows: [
            ["je / j'", '-s', 'attends', 'réponds'],
            ['tu', '-s', 'attends', 'réponds'],
            ['il / elle / on', '(nothing)', 'attend', 'répond'],
            ['nous', '-ons', 'attendons', 'répondons'],
            ['vous', '-ez', 'attendez', 'répondez'],
            ['ils / elles', '-ent', 'attendent', 'répondent'],
          ],
        },
        examples: [
          { fr: "J'attends le bus.", en: "I'm waiting for the bus." },
          { fr: 'Il vend sa voiture.', en: "He's selling his car." },
          { fr: 'Nous répondons aux messages.', en: "We're answering the messages." },
          { fr: 'Elles descendent à la cave.', en: "They're going down to the cellar." },
        ],
      },
      {
        heading: 'La même famille',
        body: 'Same pattern: **vendre** (sell), **rendre** (give back), **perdre** (lose), **entendre** (hear), **descendre** (go down), **répondre** (answer). In the plural you hear the d: **ils perdent**.',
        examples: [
          { fr: 'Tu entends ce bruit ?', en: 'Can you hear that noise?' },
          { fr: 'Je perds toujours mes clés !', en: 'I always lose my keys!' },
          { fr: 'Vous rendez les livres demain ?', en: 'Are you taking the books back tomorrow?' },
        ],
      },
      {
        heading: 'Attendre et répondre : attention aux prépositions',
        body: "**Attendre** = to wait FOR, with no preposition in French: **j'attends le train**. **Répondre** takes **à**: **je réponds à la question**.",
        examples: [
          { fr: 'Nous attendons nos amis.', en: "We're waiting for our friends." },
          { fr: 'Elle répond à sa mère.', en: 'She answers her mother.' },
          { fr: 'Il entend la musique des voisins.', en: "He can hear the neighbours' music." },
        ],
      },
    ],
    tips: [
      '**Prendre** and its family (apprendre, comprendre) also end in -re but are irregular: nous prenons, ils prennent.',
      "In inversion the d sounds like a t, so no extra -t- is needed: **répond-il ?** ('ré-pon-til').",
    ],
    practice: { kinds: ['conj', 'cloze', 'gtranslate'], tenses: ['present'], verbs: ['attendre', 'vendre', 'répondre', 'perdre', 'entendre', 'descendre', 'rendre'] },
  },
  {
    id: 'present-irreguliers',
    unit: 'present',
    title: 'Les grands verbes irréguliers',
    en: 'The key irregular verbs',
    level: 2,
    intro: 'A dozen irregular verbs make up a huge part of everyday French. Learn them in small families: the modal verbs, prendre and venir, and a few useful others.',
    sections: [
      {
        heading: 'Pouvoir, vouloir, devoir',
        body: 'These three are followed by an **infinitive**: je **peux** venir (I can come), je **veux** partir (I want to leave), je **dois** travailler (I have to work). Their stem changes in je, tu, il and ils.',
        table: {
          head: ['Pronoun', 'pouvoir', 'vouloir', 'devoir'],
          rows: [
            ['je', 'peux', 'veux', 'dois'],
            ['tu', 'peux', 'veux', 'dois'],
            ['il / elle / on', 'peut', 'veut', 'doit'],
            ['nous', 'pouvons', 'voulons', 'devons'],
            ['vous', 'pouvez', 'voulez', 'devez'],
            ['ils / elles', 'peuvent', 'veulent', 'doivent'],
          ],
        },
        examples: [
          { fr: "Tu peux m'aider ?", en: 'Can you help me?' },
          { fr: 'Je veux un café.', en: 'I want a coffee.' },
          { fr: 'Nous devons partir.', en: 'We have to leave.' },
        ],
      },
      {
        heading: 'Prendre, venir, savoir',
        body: '**Prendre** (take): prends, prends, prend, prenons, prenez, **prennent** — same for apprendre and comprendre.\n**Venir** (come): viens, viens, vient, venons, venez, **viennent** — same for revenir and devenir.\n**Savoir** (know a fact, know how to): sais, sais, sait, savons, savez, savent.',
        examples: [
          { fr: 'Ils prennent le métro.', en: 'They take the metro.' },
          { fr: "D'où viens-tu ?", en: 'Where do you come from?' },
          { fr: 'Je sais nager.', en: 'I can swim.' },
          { fr: 'Vous comprenez ?', en: 'Do you understand?' },
        ],
      },
      {
        heading: 'Mettre, dire, voir, lire, écrire, boire',
        body: '**mettre**: mets, met, mettons, mettent. **dire**: dis, dit, disons, **dites**, disent. **voir**: vois, voit, voyons, voient. **lire**: lis, lit, lisons, lisent. **écrire**: écris, écrit, écrivons, écrivent. **boire**: bois, boit, **buvons**, boivent.',
        examples: [
          { fr: "Qu'est-ce que tu dis ?", en: 'What are you saying?' },
          { fr: "On voit la mer d'ici.", en: 'You can see the sea from here.' },
          { fr: 'Elle écrit une lettre.', en: "She's writing a letter." },
          { fr: 'Nous buvons du thé.', en: 'We drink tea.' },
        ],
      },
      {
        heading: 'Connaître ou savoir ?',
        body: '**Connaître** + a person, a place or something you are familiar with: je **connais** Paul, je **connais** Paris.\n**Savoir** + a fact, a question word or an infinitive: je **sais** où il habite, je **sais** cuisiner.',
        examples: [
          { fr: 'Tu connais ce restaurant ?', en: 'Do you know this restaurant?' },
          { fr: 'Je ne sais pas pourquoi.', en: "I don't know why." },
          { fr: 'Elle connaît bien la ville.', en: 'She knows the town well.' },
        ],
      },
    ],
    tips: [
      'Ils peuvent, ils veulent, ils doivent, ils prennent, ils viennent: the ils form often looks different, so learn it on its own.',
      'In inversion, je peux becomes **puis-je**: Puis-je entrer ? (May I come in?)',
    ],
    practice: {
      kinds: ['conj', 'cloze', 'gtranslate', 'glisten'],
      tenses: ['present'],
      verbs: ['pouvoir', 'vouloir', 'devoir', 'savoir', 'prendre', 'venir', 'mettre', 'dire', 'voir', 'lire', 'écrire', 'boire', 'connaître', 'sortir', 'partir', 'dormir', 'recevoir', 'ouvrir'],
    },
  },
  {
    id: 'present-pronominaux',
    unit: 'present',
    title: 'Les verbes pronominaux',
    en: 'Reflexive verbs',
    level: 1,
    intro: 'Reflexive verbs have an extra pronoun (me, te, se…) that matches the subject. Many daily-routine verbs are reflexive: se lever, se doucher, s\'habiller.',
    sections: [
      {
        heading: 'Le pronom réfléchi',
        body: "The pronoun goes **before the verb** and matches the subject: **je me**, **tu te**, **il se**, **nous nous**, **vous vous**, **ils se**. Me, te and se become **m', t', s'** before a vowel: **je m'habille**, **il s'appelle**.",
        table: {
          head: ['Pronoun', 'se lever', "s'habiller"],
          rows: [
            ['je', 'me lève', "m'habille"],
            ['tu', 'te lèves', "t'habilles"],
            ['il / elle / on', 'se lève', "s'habille"],
            ['nous', 'nous levons', 'nous habillons'],
            ['vous', 'vous levez', 'vous habillez'],
            ['ils / elles', 'se lèvent', "s'habillent"],
          ],
        },
        examples: [
          { fr: 'Je me lève à sept heures.', en: 'I get up at seven.' },
          { fr: 'Tu te couches tard.', en: 'You go to bed late.' },
          { fr: 'Nous nous promenons au parc.', en: 'We go for a walk in the park.' },
          { fr: "Elles s'amusent bien.", en: "They're having a great time." },
        ],
      },
      {
        heading: 'Sur soi-même… ou sur quelqu\'un d\'autre',
        body: 'Many verbs exist in both forms: **je lave la voiture** (I wash the car) but **je me lave** (I wash myself); **je réveille les enfants** (I wake the children up) but **je me réveille** (I wake up).\nSome only exist as reflexives: **se souvenir** (remember), **se dépêcher** (hurry).',
        examples: [
          { fr: 'Elle couche le bébé, puis elle se couche.', en: 'She puts the baby to bed, then she goes to bed.' },
          { fr: 'Je me souviens de ce jour.', en: 'I remember that day.' },
          { fr: 'Dépêche-toi !', en: 'Hurry up!' },
        ],
      },
      {
        heading: 'Avec les parties du corps',
        body: "French uses a reflexive verb + **le / la / les** where English says 'my, your…': **je me brosse les dents** (I brush my teeth), **elle se lave les mains** (she washes her hands).",
        examples: [
          { fr: 'Je me brosse les dents.', en: 'I brush my teeth.' },
          { fr: 'Il se lave les mains.', en: 'He washes his hands.' },
          { fr: 'Tu te brosses les cheveux ?', en: 'Are you brushing your hair?' },
        ],
      },
    ],
    tips: [
      'In the negative, **ne** goes before the pronoun: je **ne** me lève **pas**.',
      'After another verb, the pronoun still matches the subject: je vais **me** coucher, nous allons **nous** promener.',
    ],
    practice: {
      kinds: ['conj', 'cloze', 'negate', 'gtranslate'],
      tenses: ['present'],
      verbs: ['se lever', 'se coucher', 'se réveiller', "s'habiller", 'se laver', 'se doucher', 'se promener', 'se dépêcher', "s'amuser", 'se reposer', 'se souvenir', "s'asseoir"],
      negations: ['pas'],
    },
  },
];
