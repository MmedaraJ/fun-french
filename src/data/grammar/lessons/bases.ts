// Lessons 1–4: the foundations (pronouns, verb groups, être, avoir, aller, faire).
import type { Lesson } from '../../../lib/grammar/types';

export const BASES: Lesson[] = [
  {
    id: 'bases-pronoms',
    unit: 'bases',
    title: 'Les pronoms sujets et les groupes de verbes',
    en: 'Subject pronouns and verb groups',
    level: 1,
    intro: 'Every French verb needs a subject. Learn the subject pronouns and the three families of verbs, so you know which endings to expect.',
    sections: [
      {
        heading: 'Les pronoms sujets',
        body: "**je** (I), **tu** (you, to one friend), **il / elle** (he / she), **on** (we, informal), **nous** (we), **vous** (you: polite, or several people), **ils / elles** (they).\n\n**Je** becomes **j'** before a vowel or a silent h: **j'aime**, **j'habite**. Use **ils** for a mixed group, even if there is only one man in it.",
        table: {
          head: ['Pronoun', 'English', 'Example'],
          rows: [
            ["je / j'", 'I', "je parle, j'aime"],
            ['tu', 'you (friend, family)', 'tu parles'],
            ['il / elle / on', 'he / she / we (informal)', 'elle parle, on parle'],
            ['nous', 'we', 'nous parlons'],
            ['vous', 'you (polite or plural)', 'vous parlez'],
            ['ils / elles', 'they', 'ils parlent'],
          ],
        },
        examples: [
          { fr: 'Je parle français.', en: 'I speak French.' },
          { fr: 'Vous êtes Madame Martin ?', en: 'Are you Mrs Martin?' },
          { fr: 'On mange ensemble ?', en: 'Shall we eat together?' },
          { fr: 'Elles habitent à Nice.', en: 'They live in Nice.' },
        ],
      },
      {
        heading: 'Tu ou vous ?',
        body: 'Use **tu** with friends, family, children and pets. Use **vous** with strangers, shop staff, your boss and older people — and always when you talk to more than one person. If in doubt, start with **vous**: people will tell you when you can switch to tu.',
        examples: [
          { fr: 'Tu as faim, mon chéri ?', en: 'Are you hungry, darling?' },
          { fr: 'Vous désirez, madame ?', en: 'What would you like, madam?' },
          { fr: 'Vous venez, les enfants ?', en: 'Are you coming, children?' },
        ],
      },
      {
        heading: 'Les trois groupes de verbes',
        body: "French verbs come in three groups, named after their infinitive.\n**1st group: -er** (parler, aimer, travailler). Nine verbs out of ten, and very regular — except aller.\n**2nd group: -ir with -iss-** (finir → nous finissons): choisir, réussir, grandir…\n**3rd group: everything else**: -re verbs (attendre, prendre), -oir verbs (pouvoir, voir) and irregular -ir verbs (partir, venir). These are learnt one by one, but the most useful ones come back all the time.",
        table: {
          head: ['Group', 'Infinitive', 'nous form', 'Examples'],
          rows: [
            ['1st', '-er', 'nous parlons', 'parler, jouer, aimer'],
            ['2nd', '-ir', 'nous finissons', 'finir, choisir, réussir'],
            ['3rd', '-re, -oir, -ir', 'nous prenons, nous partons', 'prendre, pouvoir, partir'],
          ],
        },
      },
    ],
    tips: [
      '**On** is everywhere in spoken French and takes the il / elle form: **on parle**, **on mange**, **on y va ?** (shall we go?).',
      "Before a vowel, the -s of nous, vous, ils and elles is said like a z: **vous avez** sounds like 'vou-zavé'.",
    ],
    practice: { kinds: ['conj', 'cloze'], tenses: ['present'], verbs: ['parler', 'aimer', 'habiter', 'travailler', 'finir', 'choisir', 'prendre', 'attendre'] },
  },
  {
    id: 'bases-etre',
    unit: 'bases',
    title: 'Le verbe être',
    en: 'The verb être (to be)',
    level: 1,
    intro: '**Être** (to be) is the most important verb in French. It is completely irregular, so learn it by heart.',
    sections: [
      {
        heading: 'Être au présent',
        body: 'Learn the six forms like a little chant: **je suis, tu es, il est, nous sommes, vous êtes, ils sont**.',
        table: {
          head: ['Pronoun', 'être', 'English'],
          rows: [
            ['je', 'suis', 'I am'],
            ['tu', 'es', 'you are'],
            ['il / elle / on', 'est', 'he / she is, we are'],
            ['nous', 'sommes', 'we are'],
            ['vous', 'êtes', 'you are'],
            ['ils / elles', 'sont', 'they are'],
          ],
        },
        examples: [
          { fr: 'Je suis en retard !', en: "I'm late!" },
          { fr: 'Nous sommes à la maison.', en: "We're at home." },
          { fr: 'Vous êtes français ?', en: 'Are you French?' },
          { fr: 'Ils sont au cinéma.', en: "They're at the cinema." },
        ],
      },
      {
        heading: 'À quoi sert être ?',
        body: "Use être to say **who** someone is, **where** they are and **what they are like**:\n• job or nationality, with no article: **Elle est médecin. Il est anglais.**\n• place: **Je suis au bureau.**\n• description and feelings — the adjective agrees with the subject: **Il est content. Elle est contente.**",
        examples: [
          { fr: 'Elle est infirmière.', en: "She's a nurse." },
          { fr: 'Nous sommes en vacances !', en: "We're on holiday!" },
          { fr: 'Elles sont contentes.', en: "They're happy." },
          { fr: 'Tu es fatigué ?', en: 'Are you tired?' },
        ],
      },
      {
        heading: "C'est ou il est ?",
        body: "**C'est** + a noun with a little word in front (un, mon, le…) or a name: **C'est un ami. C'est Paul.**\n**Il est / elle est** + an adjective, or a job without article: **Il est sympa. Elle est prof.**",
        examples: [
          { fr: "C'est une bonne idée.", en: "That's a good idea." },
          { fr: 'Il est très gentil.', en: "He's very kind." },
          { fr: "C'est mon professeur.", en: "That's my teacher." },
          { fr: 'Elle est dentiste.', en: "She's a dentist." },
        ],
      },
    ],
    tips: [
      "'I am hungry / cold / twenty' is NOT être in French: **j'ai faim, j'ai froid, j'ai vingt ans** (with avoir).",
      'Only three present forms end in -tes: **vous êtes**, **vous faites**, **vous dites**.',
    ],
    practice: { kinds: ['conj', 'cloze', 'negate', 'gtranslate'], tenses: ['present'], verbs: ['être'], negations: ['pas'] },
  },
  {
    id: 'bases-avoir',
    unit: 'bases',
    title: 'Le verbe avoir',
    en: 'The verb avoir (to have)',
    level: 1,
    intro: '**Avoir** (to have) is the second key verb. You need it for things you own, for your age, for lots of everyday expressions — and later to build the passé composé.',
    sections: [
      {
        heading: 'Avoir au présent',
        body: "**Je** becomes **j'**: **j'ai**. Don't mix up **ils ont** (they have, said with a z) and **ils sont** (they are, said with an s).",
        table: {
          head: ['Pronoun', 'avoir', 'English'],
          rows: [
            ["j'", 'ai', 'I have'],
            ['tu', 'as', 'you have'],
            ['il / elle / on', 'a', 'he / she has'],
            ['nous', 'avons', 'we have'],
            ['vous', 'avez', 'you have'],
            ['ils / elles', 'ont', 'they have'],
          ],
        },
        examples: [
          { fr: "J'ai deux frères.", en: 'I have two brothers.' },
          { fr: 'Tu as un stylo ?', en: 'Have you got a pen?' },
          { fr: 'Nous avons une voiture rouge.', en: 'We have a red car.' },
          { fr: 'Elles ont un chien.', en: 'They have a dog.' },
        ],
      },
      {
        heading: 'Les expressions avec avoir',
        body: "Where English says **to be**, French often says **avoir**:\n**avoir faim / soif** (to be hungry / thirsty), **avoir chaud / froid** (to be hot / cold), **avoir peur** (to be afraid), **avoir raison / tort** (to be right / wrong), **avoir sommeil** (to be sleepy), **avoir … ans** (to be … years old).\nAlso: **avoir mal à** (to have a pain in), **avoir besoin de** (to need), **avoir envie de** (to feel like).",
        examples: [
          { fr: "J'ai trente ans.", en: "I'm thirty." },
          { fr: 'Tu as froid ?', en: 'Are you cold?' },
          { fr: 'Il a mal à la tête.', en: 'He has a headache.' },
          { fr: "Nous avons besoin d'aide.", en: 'We need help.' },
          { fr: "J'ai envie d'une glace.", en: 'I feel like an ice cream.' },
        ],
      },
      {
        heading: 'Il y a',
        body: "**Il y a** means **there is / there are**, for one thing or many: **Il y a un problème. Il y a des pommes.** Negative: **il n'y a pas de…**",
        examples: [
          { fr: "Il y a une pharmacie près d'ici ?", en: "Is there a chemist's near here?" },
          { fr: 'Il y a trois chambres.', en: 'There are three bedrooms.' },
          { fr: "Il n'y a pas de lait.", en: "There's no milk." },
        ],
      },
    ],
    tips: [
      "Age always takes avoir AND the word ans: **J'ai vingt-cinq ans** — never 'je suis vingt-cinq'.",
      "In the negative, un / une / des become **de**: J'ai un chat → Je n'ai pas **de** chat.",
    ],
    practice: { kinds: ['conj', 'cloze', 'negate', 'gtranslate'], tenses: ['present'], verbs: ['avoir'], negations: ['pas'] },
  },
  {
    id: 'bases-aller-faire',
    unit: 'bases',
    title: 'Aller et faire',
    en: 'Aller (to go) and faire (to do, to make)',
    level: 1,
    intro: "**Aller** and **faire** are irregular and incredibly common: you'll use them for travel, activities and the weather — and aller even builds the near future.",
    sections: [
      {
        heading: 'Aller',
        body: "**Aller à** + a place, with **à + le = au** and **à + les = aux**: je vais **au** cinéma, **à la** plage, **à l'**école, **aux** toilettes.\nCountries: **en** France, **au** Japon, **aux** États-Unis. Someone's place or shop: **chez** le médecin, **chez** moi.",
        table: {
          head: ['Pronoun', 'aller'],
          rows: [
            ['je', 'vais'],
            ['tu', 'vas'],
            ['il / elle / on', 'va'],
            ['nous', 'allons'],
            ['vous', 'allez'],
            ['ils / elles', 'vont'],
          ],
        },
        examples: [
          { fr: 'Je vais au marché.', en: "I'm going to the market." },
          { fr: 'On va à la piscine ?', en: 'Shall we go to the pool?' },
          { fr: 'Ils vont en Espagne.', en: "They're going to Spain." },
          { fr: 'Tu vas chez le coiffeur ?', en: "Are you going to the hairdresser's?" },
          { fr: 'Comment allez-vous ?', en: 'How are you?' },
        ],
      },
      {
        heading: 'Faire',
        body: "**Faire** = to do or to make. Note **nous faisons** (said 'fe-zon') and **vous faites**.\nUseful expressions: **faire les courses** (do the shopping), **faire la cuisine** (cook), **faire du sport** (do sport), **faire du vélo** (go cycling), **faire une promenade** (go for a walk), **faire attention** (be careful).",
        table: {
          head: ['Pronoun', 'faire'],
          rows: [
            ['je', 'fais'],
            ['tu', 'fais'],
            ['il / elle / on', 'fait'],
            ['nous', 'faisons'],
            ['vous', 'faites'],
            ['ils / elles', 'font'],
          ],
        },
        examples: [
          { fr: 'Je fais la vaisselle.', en: "I'm doing the dishes." },
          { fr: 'Vous faites du sport ?', en: 'Do you do any sport?' },
          { fr: 'Elle fait un gâteau.', en: "She's making a cake." },
          { fr: 'Nous faisons une promenade.', en: "We're going for a walk." },
        ],
      },
      {
        heading: 'Faire et la météo',
        body: "The weather uses **il fait**: **il fait beau** (it's nice), **il fait chaud / froid** (it's hot / cold), **il fait gris** (it's grey). But: **il pleut** (it's raining), **il neige** (it's snowing).",
        examples: [
          { fr: "Il fait beau aujourd'hui.", en: "It's nice today." },
          { fr: 'Il fait très froid ce matin.', en: "It's very cold this morning." },
          { fr: 'Quel temps fait-il ?', en: "What's the weather like?" },
        ],
      },
    ],
    tips: [
      '**Faire du / de la** + an activity: je fais **du** tennis, **de la** natation. In the negative it becomes **de**: je ne fais pas **de** sport.',
      'Aller is the only irregular -er verb: vais, vas, va, allons, allez, vont.',
    ],
    practice: { kinds: ['conj', 'cloze', 'gtranslate', 'glisten'], tenses: ['present'], verbs: ['aller', 'faire'] },
  },
];
