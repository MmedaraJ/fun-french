// Lessons 25–28: the imparfait, passé composé vs imparfait, and the futur simple.
import type { Lesson } from '../../../lib/grammar/types';

export const IMPARFAIT_FUTUR: Lesson[] = [
  {
    id: 'imparfait',
    unit: 'passe',
    title: "L'imparfait",
    en: 'The imperfect',
    level: 2,
    intro: 'The imparfait describes the past: what things were like, what used to happen, and what was going on when something else happened.',
    sections: [
      {
        heading: 'Formation',
        body: "Take the **nous** form of the present, remove **-ons**, and add **-ais, -ais, -ait, -ions, -iez, -aient**: nous **parl**ons → je parlais; nous **finiss**ons → je finissais; nous **pren**ons → je prenais. Only **être** is irregular: **j'étais**.",
        table: {
          head: ['Pronoun', 'Ending', 'parler', 'finir', 'être'],
          rows: [
            ["je / j'", '-ais', 'parlais', 'finissais', 'étais'],
            ['tu', '-ais', 'parlais', 'finissais', 'étais'],
            ['il / elle / on', '-ait', 'parlait', 'finissait', 'était'],
            ['nous', '-ions', 'parlions', 'finissions', 'étions'],
            ['vous', '-iez', 'parliez', 'finissiez', 'étiez'],
            ['ils / elles', '-aient', 'parlaient', 'finissaient', 'étaient'],
          ],
        },
      },
      {
        heading: 'Les emplois',
        body: "Use the imparfait for:\n**descriptions** in the past: Il faisait beau. La maison était grande.\n**habits**: Quand j'étais petite, je jouais au tennis (I used to play).\n**actions in progress**: Je lisais quand tu as appelé (I was reading).\n**feelings and states**: J'avais faim. Elle était contente.",
        examples: [
          { fr: 'Il faisait froid et il pleuvait.', en: 'It was cold and it was raining.' },
          { fr: "Quand j'étais enfant, j'habitais à la campagne.", en: 'When I was a child, I lived in the country.' },
          { fr: 'Nous allions à la plage tous les étés.', en: 'We used to go to the beach every summer.' },
          { fr: 'Je dormais quand le téléphone a sonné.', en: 'I was sleeping when the phone rang.' },
        ],
      },
      {
        heading: 'Petites particularités',
        body: '-ger and -cer verbs keep their soft sound: **je mangeais, il commençait** (but nous mangions, nous commencions). Verbs in -ier have a double i in nous and vous: **nous étudiions, vous oubliiez**.',
        examples: [
          { fr: 'Je mangeais une pomme.', en: 'I was eating an apple.' },
          { fr: 'Le film commençait.', en: 'The film was starting.' },
          { fr: 'Nous étudiions ensemble.', en: 'We used to study together.' },
        ],
      },
    ],
    tips: [
      "-ais, -ait and -aient all sound the same ('è'): je parlais, il parlait, ils parlaient.",
      '**Si on** + imparfait makes a suggestion: **Si on allait au cinéma ?** (How about going to the cinema?)',
    ],
    practice: {
      kinds: ['conj', 'cloze', 'transform', 'tense-id', 'gtranslate', 'glisten'],
      tenses: ['imparfait'],
      verbs: ['parler', 'finir', 'être', 'avoir', 'faire', 'aller', 'prendre', 'manger', 'commencer', 'habiter', 'jouer', 'étudier'],
    },
  },
  {
    id: 'pc-ou-imparfait',
    unit: 'passe',
    title: 'Passé composé ou imparfait ?',
    en: 'Passé composé or imperfect?',
    level: 2,
    intro: 'Most stories about the past mix both tenses. The passé composé moves the story forward; the imparfait sets the scene.',
    sections: [
      {
        heading: 'Deux rôles différents',
        body: "**Passé composé**: a finished action, an event, something that happened once or a set number of times: **Hier, j'ai visité le musée.**\n**Imparfait**: the background — description, habit, action in progress, feelings: **Il faisait beau, il y avait beaucoup de monde.**",
        table: {
          head: ['Passé composé', 'Imparfait'],
          rows: [
            ['events: what happened', 'background: what it was like'],
            ["J'ai vu un accident.", 'Il pleuvait.'],
            ['Elle est tombée.', 'Elle courait.'],
            ['Nous sommes allés trois fois à Rome.', 'Nous allions souvent à Rome.'],
          ],
        },
      },
      {
        heading: "L'action interrompue",
        body: 'An action in progress (imparfait) is interrupted by an event (passé composé): **Je prenais ma douche quand le téléphone a sonné.**',
        examples: [
          { fr: 'Je dormais quand tu es arrivé.', en: 'I was asleep when you arrived.' },
          { fr: 'Nous dînions quand il a commencé à neiger.', en: 'We were having dinner when it started to snow.' },
          { fr: 'Elle traversait la rue quand elle a vu Paul.', en: 'She was crossing the road when she saw Paul.' },
        ],
      },
      {
        heading: 'Les mots qui aident',
        body: "**Hier, soudain, tout à coup, un jour, deux fois** usually call for the passé composé. **Souvent, toujours, d'habitude, tous les jours, autrefois, quand j'étais petit** usually call for the imparfait.",
        examples: [
          { fr: "Tout à coup, la lumière s'est éteinte.", en: 'Suddenly, the light went out.' },
          { fr: "D'habitude, je prenais le bus.", en: 'I usually took the bus.' },
          { fr: 'Un jour, il a décidé de partir.', en: 'One day, he decided to leave.' },
        ],
      },
    ],
    tips: [
      "Ask yourself: is it the film's action (passé composé) or the scenery (imparfait)?",
      "Être and avoir are very often in the imparfait: **j'étais fatigué, j'avais froid, c'était super**.",
    ],
    practice: { kinds: ['tense-id', 'cloze', 'transform', 'gtranslate', 'glisten'], tenses: ['passe_compose', 'imparfait'] },
  },
  {
    id: 'futur-simple',
    unit: 'futur',
    title: 'Le futur simple',
    en: 'The future tense (will)',
    level: 2,
    intro: 'The futur simple says what **will** happen: predictions, promises, plans further ahead. For regular verbs it is the infinitive + endings that look like avoir.',
    sections: [
      {
        heading: 'Infinitif + terminaisons',
        body: 'Keep the **infinitive** and add **-ai, -as, -a, -ons, -ez, -ont**. For -re verbs, drop the final e first: **prendre → je prendrai**.',
        table: {
          head: ['Pronoun', 'Ending', 'parler', 'finir', 'attendre'],
          rows: [
            ["je / j'", '-ai', 'parlerai', 'finirai', 'attendrai'],
            ['tu', '-as', 'parleras', 'finiras', 'attendras'],
            ['il / elle / on', '-a', 'parlera', 'finira', 'attendra'],
            ['nous', '-ons', 'parlerons', 'finirons', 'attendrons'],
            ['vous', '-ez', 'parlerez', 'finirez', 'attendrez'],
            ['ils / elles', '-ont', 'parleront', 'finiront', 'attendront'],
          ],
        },
        examples: [
          { fr: "Je t'appellerai demain.", en: "I'll call you tomorrow." },
          { fr: 'Nous partirons à huit heures.', en: "We'll leave at eight." },
          { fr: 'Il fera beau ce week-end.', en: 'It will be nice this weekend.' },
          { fr: "Tu réussiras, j'en suis sûre.", en: "You'll succeed, I'm sure of it." },
        ],
      },
      {
        heading: 'Les verbes en -er qui changent',
        body: "Verbs that change in the present keep the change all through the future: **j'achèterai, j'appellerai, je jetterai, je paierai, j'essaierai**. Préférer keeps its é: **je préférerai**.",
        examples: [
          { fr: "J'achèterai le pain.", en: "I'll buy the bread." },
          { fr: 'Ils paieront par carte.', en: "They'll pay by card." },
          { fr: 'Elle se lèvera tôt.', en: "She'll get up early." },
        ],
      },
      {
        heading: 'Quand + futur',
        body: "After **quand**, **dès que** (as soon as) and **lorsque**, French uses the future where English uses the present: **Quand je serai grande, je serai pilote.** (When I grow up…)",
        examples: [
          { fr: "Je te téléphonerai quand j'arriverai.", en: "I'll phone you when I arrive." },
          { fr: "Dès qu'il aura le temps, il viendra.", en: "As soon as he has time, he'll come." },
        ],
      },
    ],
    tips: [
      'The future always has an **r** before the ending: parlerai, finirai, prendrai, serai.',
      "**Si + present → futur**: S'il pleut, je resterai à la maison.",
    ],
    practice: {
      kinds: ['conj', 'cloze', 'transform', 'tense-id', 'gtranslate', 'glisten'],
      tenses: ['futur_simple'],
      verbs: ['parler', 'finir', 'attendre', 'prendre', 'manger', 'acheter', 'appeler', 'payer', 'choisir', 'vendre'],
    },
  },
  {
    id: 'futur-simple-irreguliers',
    unit: 'futur',
    title: 'Le futur simple : les radicaux irréguliers',
    en: 'The future tense: irregular stems',
    level: 2,
    intro: 'About fifteen common verbs have an irregular future stem. The endings never change, so you only need to learn the stem.',
    sections: [
      {
        heading: 'Les radicaux à connaître',
        body: "Learn them in pairs: **être → je serai, avoir → j'aurai, aller → j'irai, faire → je ferai**.",
        table: {
          head: ['Infinitive', 'Stem', 'Future'],
          rows: [
            ['être', 'ser-', 'je serai'],
            ['avoir', 'aur-', "j'aurai"],
            ['aller', 'ir-', "j'irai"],
            ['faire', 'fer-', 'je ferai'],
            ['venir', 'viendr-', 'je viendrai'],
            ['voir', 'verr-', 'je verrai'],
            ['pouvoir', 'pourr-', 'je pourrai'],
            ['vouloir', 'voudr-', 'je voudrai'],
            ['devoir', 'devr-', 'je devrai'],
            ['savoir', 'saur-', 'je saurai'],
            ['envoyer', 'enverr-', "j'enverrai"],
            ['recevoir', 'recevr-', 'je recevrai'],
            ['courir', 'courr-', 'je courrai'],
            ['falloir', 'faudr-', 'il faudra'],
            ['pleuvoir', 'pleuvr-', 'il pleuvra'],
          ],
        },
      },
      {
        heading: 'En contexte',
        body: 'These verbs come up in almost every conversation about the future.',
        examples: [
          { fr: "L'année prochaine, j'irai au Japon.", en: "Next year, I'll go to Japan." },
          { fr: 'Nous serons en retard !', en: "We'll be late!" },
          { fr: 'Tu auras le temps ?', en: 'Will you have time?' },
          { fr: 'Ils viendront avec leurs enfants.', en: "They'll come with their children." },
          { fr: 'Il faudra partir tôt.', en: "We'll have to leave early." },
          { fr: 'On verra !', en: "We'll see!" },
        ],
      },
      {
        heading: 'Les doubles r',
        body: 'Some stems have **rr**, and you hear a longer r: **je verrai, je pourrai, j\'enverrai, je courrai**. Compare with the imparfait: **je courais** (I was running) / **je courrai** (I will run).',
        examples: [
          { fr: "Je pourrai t'aider demain.", en: "I'll be able to help you tomorrow." },
          { fr: 'Elle enverra la lettre lundi.', en: "She'll send the letter on Monday." },
        ],
      },
    ],
    tips: [
      "The conditionnel uses exactly the same stems: je serais, j'aurais, j'irais, je ferais.",
      '**On verra !** (We\'ll see!) is a very French way to avoid a decision.',
    ],
    practice: {
      kinds: ['conj', 'cloze', 'transform', 'gtranslate', 'glisten'],
      tenses: ['futur_simple'],
      verbs: ['être', 'avoir', 'aller', 'faire', 'venir', 'voir', 'pouvoir', 'vouloir', 'devoir', 'savoir', 'envoyer', 'recevoir', 'courir'],
    },
  },
];
