// Lessons 33–35: plus-que-parfait, futur antérieur and conditionnel passé.
import type { Lesson } from '../../../lib/grammar/types';

export const COMPOUND: Lesson[] = [
  {
    id: 'plus-que-parfait',
    unit: 'passe',
    title: 'Le plus-que-parfait',
    en: 'The pluperfect (had done)',
    level: 3,
    intro: 'The plus-que-parfait describes an action that happened **before** another past action: **Quand je suis arrivée, le film avait commencé.**',
    sections: [
      {
        heading: 'Formation',
        body: "It's the passé composé with the auxiliary in the **imparfait**: **j'avais mangé** (I had eaten), **j'étais parti(e)** (I had left). Same participles, same choice between avoir and être, same agreement.",
        table: {
          head: ['Pronoun', 'manger', 'partir'],
          rows: [
            ["j'", 'avais mangé', 'étais parti(e)'],
            ['tu', 'avais mangé', 'étais parti(e)'],
            ['il / elle', 'avait mangé', 'était parti / partie'],
            ['nous', 'avions mangé', 'étions parti(e)s'],
            ['vous', 'aviez mangé', 'étiez parti(e)(s)'],
            ['ils / elles', 'avaient mangé', 'étaient partis / parties'],
          ],
        },
      },
      {
        heading: 'Emplois',
        body: 'Use it to go one step further back in the past, often with **déjà** (already) or **ne … pas encore** (not yet).',
        examples: [
          { fr: 'Quand nous sommes arrivés, le train était déjà parti.', en: 'When we arrived, the train had already left.' },
          { fr: "Elle m'a dit qu'elle avait perdu ses clés.", en: 'She told me she had lost her keys.' },
          { fr: "Je n'avais pas encore fini quand il a appelé.", en: "I hadn't finished yet when he called." },
          { fr: "Il était fatigué parce qu'il avait mal dormi.", en: 'He was tired because he had slept badly.' },
        ],
      },
      {
        heading: 'Les regrets avec si',
        body: "**Si + plus-que-parfait** expresses a regret: **Si j'avais su !** (If only I'd known!) It is often followed by the conditionnel passé: **Si j'avais su, je serais venue.**",
        examples: [
          { fr: "Si j'avais su !", en: "If only I'd known!" },
          { fr: "Si tu m'avais écoutée…", en: 'If you had listened to me…' },
        ],
      },
    ],
    tips: [
      'Picture a timeline: plus-que-parfait (earlier) → passé composé / imparfait (later) → now.',
      "English often uses the simple past where French needs the plus-que-parfait: she said she had lost… = **elle a dit qu'elle avait perdu…**",
    ],
    practice: {
      kinds: ['conj', 'cloze', 'tense-id', 'transform', 'gtranslate', 'glisten'],
      tenses: ['plus_que_parfait'],
      verbs: ['manger', 'partir', 'finir', 'arriver', 'voir', 'faire', 'perdre', 'oublier'],
    },
  },
  {
    id: 'futur-anterieur',
    unit: 'futur',
    title: 'Le futur antérieur',
    en: 'The future perfect (will have done)',
    level: 3,
    intro: "The futur antérieur says what **will have happened** by a certain moment in the future: **D'ici demain, j'aurai fini.**",
    sections: [
      {
        heading: 'Formation',
        body: "Auxiliary in the **futur simple** + past participle: **j'aurai fini, tu seras parti(e), nous nous serons levé(e)s**.",
        table: {
          head: ['Pronoun', 'finir', 'arriver'],
          rows: [
            ["j'/je", 'aurai fini', 'serai arrivé(e)'],
            ['tu', 'auras fini', 'seras arrivé(e)'],
            ['il / elle', 'aura fini', 'sera arrivé / arrivée'],
            ['nous', 'aurons fini', 'serons arrivé(e)s'],
            ['vous', 'aurez fini', 'serez arrivé(e)(s)'],
            ['ils / elles', 'auront fini', 'seront arrivés / arrivées'],
          ],
        },
      },
      {
        heading: 'Emplois',
        body: 'Use it for an action that will be finished **before** another future moment or action — often after **quand, dès que, lorsque, une fois que**: **Quand tu auras fini, tu pourras sortir.**',
        examples: [
          { fr: "D'ici ce soir, j'aurai terminé le rapport.", en: "By this evening, I'll have finished the report." },
          { fr: 'Quand tu arriveras, nous serons déjà partis.', en: "When you arrive, we'll already have left." },
          { fr: "Dès que j'aurai reçu l'argent, je te paierai.", en: "As soon as I've received the money, I'll pay you." },
          { fr: 'Dans une heure, ils auront mangé.', en: "In an hour, they'll have eaten." },
        ],
      },
      {
        heading: 'Une supposition',
        body: "It can also guess what has probably happened: **Il n'est pas là ? Il aura oublié.** (He must have forgotten.)",
        examples: [
          { fr: 'Elle aura raté son train.', en: 'She must have missed her train.' },
          { fr: "J'aurai mal compris.", en: 'I must have misunderstood.' },
        ],
      },
    ],
    tips: [
      "After when / as soon as, English uses the present perfect: as soon as I've finished = **dès que j'aurai fini**.",
      'Same build as the passé composé, but with **aurai / serai** instead of ai / suis.',
    ],
    practice: {
      kinds: ['conj', 'cloze', 'tense-id', 'transform', 'gtranslate'],
      tenses: ['futur_anterieur'],
      verbs: ['finir', 'terminer', 'partir', 'arriver', 'manger', 'recevoir', 'faire', 'rentrer'],
    },
  },
  {
    id: 'conditionnel-passe',
    unit: 'conditionnel',
    title: 'Le conditionnel passé',
    en: 'The past conditional (would have)',
    level: 3,
    intro: "The conditionnel passé is the tense of regrets and of things that **would have** happened: **J'aurais aimé venir.**",
    sections: [
      {
        heading: 'Formation',
        body: "Auxiliary in the **conditionnel présent** + past participle: **j'aurais mangé, je serais venu(e), nous nous serions amusé(e)s**.",
        table: {
          head: ['Pronoun', 'aimer', 'venir'],
          rows: [
            ["j'/je", 'aurais aimé', 'serais venu(e)'],
            ['tu', 'aurais aimé', 'serais venu(e)'],
            ['il / elle', 'aurait aimé', 'serait venu / venue'],
            ['nous', 'aurions aimé', 'serions venu(e)s'],
            ['vous', 'auriez aimé', 'seriez venu(e)(s)'],
            ['ils / elles', 'auraient aimé', 'seraient venus / venues'],
          ],
        },
      },
      {
        heading: 'Regrets et reproches',
        body: "With **aimer, vouloir, préférer** it expresses regrets: **J'aurais aimé voir ça.** With **devoir** and **pouvoir** it means should have / could have: **Tu aurais dû me le dire ! Il aurait pu appeler.**",
        examples: [
          { fr: "J'aurais aimé être là.", en: 'I would have liked to be there.' },
          { fr: 'Tu aurais dû partir plus tôt.', en: 'You should have left earlier.' },
          { fr: 'On aurait pu gagner !', en: 'We could have won!' },
          { fr: 'Elle aurait préféré rester.', en: 'She would have preferred to stay.' },
        ],
      },
      {
        heading: 'Avec si + plus-que-parfait',
        body: "It gives the result of an imagined past condition: **Si j'avais su, je serais venue.** (If I'd known, I would have come.)",
        examples: [
          { fr: "Si tu m'avais appelée, je t'aurais aidé.", en: 'If you had called me, I would have helped you.' },
          { fr: "S'il avait fait beau, nous serions allés à la plage.", en: 'If the weather had been nice, we would have gone to the beach.' },
          { fr: "Sans toi, j'aurais raté le train.", en: 'Without you, I would have missed the train.' },
        ],
      },
    ],
    tips: [
      'Should have = **aurait dû**; could have = **aurait pu**: two phrases worth learning by heart.',
      "Never after si: **si j'avais su** (not 'si j'aurais su').",
    ],
    practice: {
      kinds: ['conj', 'cloze', 'tense-id', 'transform', 'gtranslate', 'glisten'],
      tenses: ['conditionnel_passe', 'plus_que_parfait'],
      verbs: ['aimer', 'vouloir', 'devoir', 'pouvoir', 'venir', 'partir', 'faire', 'aller'],
    },
  },
];
