// Lessons 5–7: the present of -er verbs (with spelling changes) and -ir verbs like finir.
import type { Lesson } from '../../../lib/grammar/types';

export const PRESENT_1: Lesson[] = [
  {
    id: 'present-er',
    unit: 'present',
    title: 'Le présent des verbes en -er',
    en: 'The present tense of -er verbs',
    level: 1,
    intro: 'Nine French verbs out of ten end in -er, and they all follow the same pattern. Learn it once and you can use hundreds of verbs, like the ones in your book.',
    sections: [
      {
        heading: 'Les terminaisons',
        body: 'Take the infinitive, remove **-er**, and add the ending: **-e, -es, -e, -ons, -ez, -ent**.\nThe endings -e, -es and -ent are silent: **je parle, tu parles, il parle, ils parlent** all sound the same! Only **nous parlons** and **vous parlez** sound different.',
        table: {
          head: ['Pronoun', 'Ending', 'parler', 'aimer'],
          rows: [
            ["je / j'", '-e', 'parle', "j'aime"],
            ['tu', '-es', 'parles', 'aimes'],
            ['il / elle / on', '-e', 'parle', 'aime'],
            ['nous', '-ons', 'parlons', 'aimons'],
            ['vous', '-ez', 'parlez', 'aimez'],
            ['ils / elles', '-ent', 'parlent', 'aiment'],
          ],
        },
      },
      {
        heading: "À l'oral",
        body: "Before a vowel or a silent h, **je** becomes **j'** (j'habite, j'écoute), and the -s of nous, vous, ils and elles is linked with a z sound: **nous habitons** sounds like 'nou-zabiton'.",
        examples: [
          { fr: "J'habite à Bordeaux.", en: 'I live in Bordeaux.' },
          { fr: 'Nous écoutons la radio.', en: "We're listening to the radio." },
          { fr: 'Ils aiment le chocolat.', en: 'They love chocolate.' },
          { fr: 'Vous travaillez le samedi ?', en: 'Do you work on Saturdays?' },
        ],
      },
      {
        heading: 'Un présent, trois traductions',
        body: "The French present covers **I speak**, **I'm speaking** and **I do speak**. Use it for habits, for what's happening now and for general truths. To insist on 'right now', use **être en train de**: je suis en train de cuisiner (I'm busy cooking).",
        examples: [
          { fr: 'Je regarde un film.', en: "I'm watching a film." },
          { fr: 'Elle chante très bien.', en: 'She sings very well.' },
          { fr: 'Le soir, nous dînons à huit heures.', en: 'In the evening, we have dinner at eight.' },
          { fr: 'Tu cherches tes clés ?', en: 'Are you looking for your keys?' },
        ],
      },
    ],
    tips: [
      'The -ent of **ils parlent** is never pronounced: it sounds exactly like il parle.',
      'The verbs from your book work just like parler: chanter, danser, écouter, gagner, oublier, pleurer, rêver, trouver…',
    ],
    practice: {
      kinds: ['conj', 'cloze', 'gtranslate', 'glisten'],
      tenses: ['present'],
      verbs: [
        'parler', 'aimer', 'habiter', 'travailler', 'écouter', 'regarder', 'chanter', 'danser', 'donner', 'trouver',
        'chercher', 'oublier', 'étudier', 'jouer', 'arriver', 'rester', 'penser', 'gagner', 'montrer', 'raconter',
        'téléphoner', 'visiter', 'marcher', 'cuisiner', 'dessiner', 'fermer', 'inviter', 'préparer', 'rêver', 'pleurer',
      ],
    },
  },
  {
    id: 'present-er-changes',
    unit: 'present',
    title: 'Les verbes en -er qui changent un peu',
    en: '-er verbs with spelling changes',
    level: 2,
    intro: 'Some -er verbs have the normal endings but change their spelling a little to keep the right sound. There are only four patterns to know.',
    sections: [
      {
        heading: 'Manger, commencer : nous mangeons, nous commençons',
        body: 'Verbs in **-ger** keep an e before -ons so the g stays soft: **nous mangeons, nous voyageons, nous nageons**. Verbs in **-cer** take a **ç** before -ons: **nous commençons, nous avançons**.',
        examples: [
          { fr: 'Nous mangeons à midi.', en: 'We eat at noon.' },
          { fr: 'Nous voyageons en train.', en: 'We travel by train.' },
          { fr: 'Nous commençons à huit heures.', en: 'We start at eight.' },
        ],
      },
      {
        heading: 'Acheter, préférer : un accent qui bouge',
        body: "**Acheter**, **lever** and **promener** take a grave accent when the ending is silent: **j'achète, tu achètes, ils achètent** — but **nous achetons, vous achetez**.\n**Préférer**, **espérer** and **répéter** change é to è in the same places: **je préfère, ils préfèrent** — but **nous préférons**.",
        table: {
          head: ['Pronoun', 'acheter', 'préférer'],
          rows: [
            ["je / j'", 'achète', 'préfère'],
            ['tu', 'achètes', 'préfères'],
            ['il / elle / on', 'achète', 'préfère'],
            ['nous', 'achetons', 'préférons'],
            ['vous', 'achetez', 'préférez'],
            ['ils / elles', 'achètent', 'préfèrent'],
          ],
        },
      },
      {
        heading: 'Appeler, jeter : deux consonnes',
        body: "**Appeler** and **jeter** double their consonant instead of taking an accent: **j'appelle, ils appellent; je jette, ils jettent** — but **nous appelons, vous jetez**.",
        examples: [
          { fr: "Je t'appelle ce soir.", en: "I'll call you tonight." },
          { fr: "Comment tu t'appelles ?", en: "What's your name?" },
          { fr: 'Ils jettent les vieux journaux.', en: 'They throw away the old newspapers.' },
        ],
      },
      {
        heading: 'Payer, envoyer : y devient i',
        body: 'Verbs in **-yer** change y to i before a silent ending: **je paie, tu envoies, ils nettoient** — but **nous payons, vous envoyez**. With -ayer both spellings are fine: je paie or je paye.',
        examples: [
          { fr: 'Je paie par carte.', en: 'I pay by card.' },
          { fr: 'Elle envoie un message.', en: "She's sending a message." },
          { fr: 'Nous nettoyons la cuisine.', en: "We're cleaning the kitchen." },
        ],
      },
    ],
    tips: [
      "The changes happen where the ending is silent — je, tu, il and ils (the 'boot' of the table). Nous and vous look like the infinitive.",
      'For -ger and -cer verbs, only nous changes: je mange, but nous mangeons.',
    ],
    practice: {
      kinds: ['conj', 'cloze', 'gtranslate'],
      tenses: ['present'],
      verbs: ['manger', 'voyager', 'nager', 'partager', 'commencer', 'avancer', 'acheter', 'promener', 'préférer', 'espérer', 'répéter', 'appeler', 'jeter', 'payer', 'envoyer', 'nettoyer', 'essayer'],
    },
  },
  {
    id: 'present-ir',
    unit: 'present',
    title: 'Les verbes en -ir comme finir',
    en: '-ir verbs like finir',
    level: 1,
    intro: 'The second group: verbs like **finir**, **choisir** and **réussir**. Their plural forms add **-iss-**, which makes them easy to spot.',
    sections: [
      {
        heading: 'Les terminaisons',
        body: 'Remove **-ir** and add **-is, -is, -it, -issons, -issez, -issent**.',
        table: {
          head: ['Pronoun', 'Ending', 'finir', 'choisir'],
          rows: [
            ['je', '-is', 'finis', 'choisis'],
            ['tu', '-is', 'finis', 'choisis'],
            ['il / elle / on', '-it', 'finit', 'choisit'],
            ['nous', '-issons', 'finissons', 'choisissons'],
            ['vous', '-issez', 'finissez', 'choisissez'],
            ['ils / elles', '-issent', 'finissent', 'choisissent'],
          ],
        },
        examples: [
          { fr: 'Je finis à cinq heures.', en: 'I finish at five.' },
          { fr: 'Vous choisissez le dessert ?', en: 'Are you choosing a dessert?' },
          { fr: 'Les enfants grandissent vite.', en: 'Children grow up fast.' },
          { fr: 'Nous réussissons toujours ce gâteau.', en: 'We always get this cake right.' },
        ],
      },
      {
        heading: "Beaucoup viennent d'adjectifs",
        body: "Many of these verbs mean 'to become …': **grand → grandir** (to grow up), **gros → grossir** (to put on weight), **maigre → maigrir** (to lose weight), **rouge → rougir** (to blush), **vieux → vieillir** (to grow old).",
        examples: [
          { fr: 'Il rougit quand elle parle.', en: 'He blushes when she talks.' },
          { fr: 'Tu maigris !', en: "You're losing weight!" },
          { fr: 'Nous vieillissons ensemble.', en: "We're growing old together." },
        ],
      },
      {
        heading: 'Attention aux faux amis',
        body: "Not every -ir verb is in this group. **Partir, sortir, dormir, venir, ouvrir** are irregular (3rd group): **nous partons**, not 'nous partissons'. If the nous form has no -iss-, it's a 3rd-group verb.",
        examples: [
          { fr: 'Nous partons demain.', en: "We're leaving tomorrow." },
          { fr: 'Ils dorment encore.', en: "They're still asleep." },
          { fr: 'Ils finissent leurs devoirs.', en: "They're finishing their homework." },
        ],
      },
    ],
    tips: [
      "The singular forms all sound the same: je finis, tu finis, il finit ('fini').",
      '**Réfléchir à** = to think about: je réfléchis à ta question.',
    ],
    practice: {
      kinds: ['conj', 'cloze', 'gtranslate'],
      tenses: ['present'],
      verbs: ['finir', 'choisir', 'réussir', 'grandir', 'grossir', 'maigrir', 'rougir', 'remplir', 'réfléchir', 'obéir', 'applaudir', 'nourrir', 'vieillir', 'ralentir'],
    },
  },
];
