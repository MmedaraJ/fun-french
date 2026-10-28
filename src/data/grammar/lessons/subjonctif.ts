// Lessons 36–40: the subjunctive (formation, irregulars, triggers, past) and the passé simple.
import type { Lesson } from '../../../lib/grammar/types';

export const SUBJONCTIF: Lesson[] = [
  {
    id: 'subjonctif-formation',
    unit: 'subjonctif',
    title: 'Le subjonctif présent : formation',
    en: 'The present subjunctive: how to form it',
    level: 3,
    intro: 'The subjunctive is a mood used after expressions of necessity, wishes, feelings and doubt: **Il faut que tu viennes.** For most verbs it is easy to form.',
    sections: [
      {
        heading: 'La règle des « ils »',
        body: 'Take the **ils** form of the present, remove **-ent**, and add **-e, -es, -e, -ions, -iez, -ent**. It always comes after **que**.',
        table: {
          head: ['', 'parler', 'finir', 'attendre'],
          rows: [
            ['ils (present)', 'parlent', 'finissent', 'attendent'],
            ['que je', 'parle', 'finisse', 'attende'],
            ['que tu', 'parles', 'finisses', 'attendes'],
            ["qu'il / elle", 'parle', 'finisse', 'attende'],
            ['que nous', 'parlions', 'finissions', 'attendions'],
            ['que vous', 'parliez', 'finissiez', 'attendiez'],
            ["qu'ils / elles", 'parlent', 'finissent', 'attendent'],
          ],
        },
      },
      {
        heading: 'Deux radicaux',
        body: 'Verbs with two stems in the present keep them: nous and vous take the **nous** stem. **Prendre**: que je prenne, que nous prenions. **Venir**: que je vienne, que nous venions. **Boire**: que je boive, que nous buvions.',
        examples: [
          { fr: 'Il faut que je prenne le train.', en: 'I have to take the train.' },
          { fr: 'Je veux que tu viennes.', en: 'I want you to come.' },
          { fr: "Il faut que nous buvions de l'eau.", en: 'We have to drink some water.' },
        ],
      },
      {
        heading: 'Ça ressemble au présent',
        body: 'For -er verbs, je, tu, il and ils sound just like the present: **que je parle**. Nous and vous look like the imparfait: **que nous parlions, que vous parliez**.',
        examples: [
          { fr: 'Ma mère veut que je range ma chambre.', en: 'My mother wants me to tidy my room.' },
          { fr: 'Il faut que vous parliez au directeur.', en: 'You need to speak to the manager.' },
          { fr: 'Le professeur veut que nous finissions le livre.', en: 'The teacher wants us to finish the book.' },
        ],
      },
    ],
    tips: [
      "The subjunctive almost always follows **que**: no que, no subjunctive.",
      'Nous and vous: add an i to the present ending: nous parlons → que nous parl**i**ons.',
    ],
    practice: {
      kinds: ['conj', 'cloze', 'tense-id', 'gtranslate'],
      tenses: ['subjonctif_present'],
      verbs: ['parler', 'finir', 'attendre', 'prendre', 'venir', 'boire', 'manger', 'choisir', 'partir', 'dormir'],
    },
  },
  {
    id: 'subjonctif-irreguliers',
    unit: 'subjonctif',
    title: 'Le subjonctif : les verbes irréguliers',
    en: 'Irregular subjunctives',
    level: 3,
    intro: "A handful of very common verbs have their own subjunctive stems. They're worth learning because they come up all the time: **que je sois, que j'aie, que j'aille, que je fasse**.",
    sections: [
      {
        heading: 'Être et avoir',
        body: 'The two most irregular ones:',
        table: {
          head: ['', 'être', 'avoir'],
          rows: [
            ["que je / j'", 'sois', 'aie'],
            ['que tu', 'sois', 'aies'],
            ["qu'il / elle", 'soit', 'ait'],
            ['que nous', 'soyons', 'ayons'],
            ['que vous', 'soyez', 'ayez'],
            ["qu'ils / elles", 'soient', 'aient'],
          ],
        },
        examples: [
          { fr: 'Il faut que tu sois patient.', en: 'You have to be patient.' },
          { fr: 'Je suis contente que tu sois là.', en: "I'm glad you're here." },
          { fr: "Il faut qu'on ait le temps.", en: 'We need to have time.' },
        ],
      },
      {
        heading: 'Aller, faire, pouvoir, savoir, vouloir',
        body: "**aller**: que j'aille, que nous allions. **faire**: que je fasse. **pouvoir**: que je puisse. **savoir**: que je sache. **vouloir**: que je veuille, que nous voulions. And the weather: **qu'il pleuve**, **qu'il faille**.",
        table: {
          head: ['Infinitive', 'que je…', 'que nous…'],
          rows: [
            ['aller', "que j'aille", 'que nous allions'],
            ['faire', 'que je fasse', 'que nous fassions'],
            ['pouvoir', 'que je puisse', 'que nous puissions'],
            ['savoir', 'que je sache', 'que nous sachions'],
            ['vouloir', 'que je veuille', 'que nous voulions'],
          ],
        },
        examples: [
          { fr: "Il faut que j'aille à la banque.", en: 'I have to go to the bank.' },
          { fr: 'Mes parents veulent que je fasse du sport.', en: 'My parents want me to do some sport.' },
          { fr: "J'ai peur qu'il ne puisse pas venir.", en: "I'm afraid he won't be able to come." },
          { fr: 'Il faut que tu saches la vérité.', en: 'You need to know the truth.' },
        ],
      },
    ],
    tips: [
      'Fasse, puisse, sache: these three stems stay the same for every person.',
      "Aller and vouloir have two stems, like in the present: que j'aille / que nous allions.",
    ],
    practice: {
      kinds: ['conj', 'cloze', 'gtranslate'],
      tenses: ['subjonctif_present'],
      verbs: ['être', 'avoir', 'aller', 'faire', 'pouvoir', 'savoir', 'vouloir', 'venir', 'prendre', 'devoir'],
    },
  },
  {
    id: 'subjonctif-emplois',
    unit: 'subjonctif',
    title: 'Quand employer le subjonctif ?',
    en: 'When to use the subjunctive',
    level: 3,
    intro: 'The subjunctive comes after certain triggers: necessity, wishes, feelings, doubt and a few conjunctions. Learn the triggers and the rest follows.',
    sections: [
      {
        heading: 'Nécessité et volonté',
        body: '**Il faut que** (it is necessary that), **je veux que** (I want), **je voudrais que** (I would like), **j\'aimerais que**, **je préfère que**.',
        examples: [
          { fr: 'Il faut que tu dormes.', en: 'You need to sleep.' },
          { fr: "Je voudrais que vous m'aidiez.", en: "I'd like you to help me." },
          { fr: "Ma mère veut que je l'appelle.", en: 'My mother wants me to call her.' },
          { fr: 'Je préfère que tu restes ici.', en: "I'd rather you stayed here." },
        ],
      },
      {
        heading: 'Sentiments et doutes',
        body: "After feelings: **je suis content(e) que, j'ai peur que, c'est dommage que, je regrette que**. After doubt: **je doute que, je ne pense pas que**.",
        examples: [
          { fr: 'Je suis contente que tu sois là.', en: "I'm glad you're here." },
          { fr: "C'est dommage qu'il pleuve.", en: "It's a shame it's raining." },
          { fr: "Je ne pense pas qu'il vienne.", en: "I don't think he's coming." },
        ],
      },
      {
        heading: 'Les conjonctions',
        body: '**pour que** (so that), **avant que** (before), **bien que** (although), **à condition que** (provided that), **sans que** (without).',
        examples: [
          { fr: "Je t'explique pour que tu comprennes.", en: "I'm explaining so that you understand." },
          { fr: "Rentre avant qu'il fasse nuit.", en: 'Come home before it gets dark.' },
          { fr: "Bien qu'il soit malade, il travaille.", en: "Although he's ill, he's working." },
        ],
      },
      {
        heading: "Même sujet ? L'infinitif !",
        body: "If both halves have the same subject, use an infinitive instead: **Je veux partir** (I want to leave), never 'je veux que je parte'. **Je suis content de te voir.**",
        examples: [
          { fr: 'Je veux venir.', en: 'I want to come.' },
          { fr: 'Je veux que tu viennes.', en: 'I want you to come.' },
        ],
      },
    ],
    tips: [
      "After **espérer** and a positive **penser**, use the indicative: J'espère qu'il viendra. Je pense qu'il a raison.",
      '**Avant que** takes the subjunctive, but **après que** takes the indicative.',
    ],
    practice: { kinds: ['cloze', 'tense-id', 'gtranslate'], tenses: ['subjonctif_present', 'present'] },
  },
  {
    id: 'subjonctif-passe',
    unit: 'subjonctif',
    title: 'Le subjonctif passé',
    en: 'The past subjunctive',
    level: 3,
    intro: 'The subjonctif passé follows the same triggers as the subjonctif présent, but for an action that is **finished**: **Je suis content que tu sois venu.**',
    sections: [
      {
        heading: 'Formation',
        body: "**Avoir** or **être** in the subjunctive + past participle: **que j'aie fini, que tu sois parti(e)**.",
        table: {
          head: ['', 'finir', 'partir'],
          rows: [
            ["que j'/je", 'aie fini', 'sois parti(e)'],
            ['que tu', 'aies fini', 'sois parti(e)'],
            ["qu'il / elle", 'ait fini', 'soit parti / partie'],
            ['que nous', 'ayons fini', 'soyons parti(e)s'],
            ['que vous', 'ayez fini', 'soyez parti(e)(s)'],
            ["qu'ils / elles", 'aient fini', 'soient partis / parties'],
          ],
        },
      },
      {
        heading: 'Emplois',
        body: 'Use it for an action completed before the moment you are talking about.',
        examples: [
          { fr: 'Je suis contente que tu aies réussi ton examen.', en: "I'm happy you passed your exam." },
          { fr: "C'est dommage qu'il soit parti si tôt.", en: "It's a shame he left so early." },
          { fr: 'Il faut que tu aies fini avant midi.', en: 'You need to have finished before noon.' },
          { fr: "Il est possible qu'elle ait oublié.", en: "It's possible she forgot." },
        ],
      },
      {
        heading: 'Présent ou passé ?',
        body: '**Je suis content que tu viennes** — you are coming (now or later). **Je suis content que tu sois venu** — you came, it is done.',
        examples: [
          { fr: "Je doute qu'il comprenne.", en: 'I doubt he understands.' },
          { fr: "Je doute qu'il ait compris.", en: 'I doubt he understood.' },
        ],
      },
    ],
    tips: [
      "It's the passé composé with the auxiliary in the subjunctive: j'ai fini → que j'aie fini.",
      '**Bien que** + subjonctif passé is common in writing: Bien qu\'il ait plu, nous sommes sortis.',
    ],
    practice: {
      kinds: ['conj', 'cloze', 'tense-id', 'gtranslate'],
      tenses: ['subjonctif_passe', 'subjonctif_present'],
      verbs: ['finir', 'partir', 'venir', 'réussir', 'oublier', 'arriver', 'faire', 'comprendre'],
    },
  },
  {
    id: 'passe-simple',
    unit: 'passe',
    title: 'Le passé simple (à reconnaître)',
    en: 'The passé simple (recognise it)',
    level: 3,
    intro: "The passé simple is the past tense of novels, fairy tales and history books. You don't need to use it, but you'll want to recognise it when you read.",
    sections: [
      {
        heading: 'Où le trouver ?',
        body: 'In written stories it takes the place of the passé composé: **Il ouvrit la porte et entra.** (He opened the door and went in.) You will almost always see it in the **il / elle** and **ils / elles** forms.',
        examples: [
          { fr: 'Il était une fois une princesse qui vivait dans un château.', en: 'Once upon a time there was a princess who lived in a castle.' },
          { fr: 'Le prince arriva et frappa à la porte.', en: 'The prince arrived and knocked on the door.' },
          { fr: 'Ils vécurent heureux.', en: 'They lived happily ever after.' },
        ],
      },
      {
        heading: 'Les terminaisons',
        body: '-er verbs: **il parla, ils parlèrent**. -ir and most -re verbs: **il finit, ils finirent; il attendit, ils attendirent**. Many irregular verbs use **-u-**: **il fut** (être), **il eut** (avoir), **il put, il voulut, il lut, ils burent**.',
        table: {
          head: ['Infinitive', 'il / elle', 'ils / elles'],
          rows: [
            ['parler', 'parla', 'parlèrent'],
            ['finir', 'finit', 'finirent'],
            ['attendre', 'attendit', 'attendirent'],
            ['être', 'fut', 'furent'],
            ['avoir', 'eut', 'eurent'],
            ['faire', 'fit', 'firent'],
            ['venir', 'vint', 'vinrent'],
            ['prendre', 'prit', 'prirent'],
            ['voir', 'vit', 'virent'],
          ],
        },
      },
      {
        heading: 'Comment le reconnaître',
        body: 'Look for **-a / -èrent** (-er verbs), **-it / -irent**, **-ut / -urent**, and the special **vint / vinrent** (venir). When you spot one, read it as a simple past: **il parla** = he spoke.',
        examples: [
          { fr: 'Elle prit son manteau et sortit.', en: 'She took her coat and went out.' },
          { fr: 'Ils firent un long voyage.', en: 'They went on a long journey.' },
          { fr: 'Le roi fut très surpris.', en: 'The king was very surprised.' },
        ],
      },
    ],
    tips: [
      "**Il finit** can be present or passé simple — the context tells you. **Il finissait** is the imparfait.",
      'Stories mix the passé simple (events) with the imparfait (descriptions), just as speech mixes the passé composé and the imparfait.',
    ],
    practice: { kinds: ['tense-id'], tenses: ['passe_simple', 'passe_compose', 'imparfait'] },
  },
];
