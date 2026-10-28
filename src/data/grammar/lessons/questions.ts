// Lessons 11–15: asking questions (three forms, question words, inversion, quel/lequel, qu'est-ce que/qui).
import type { Lesson } from '../../../lib/grammar/types';

export const QUESTION_LESSONS: Lesson[] = [
  {
    id: 'questions-trois-facons',
    unit: 'questions',
    title: 'Trois façons de poser une question',
    en: 'Three ways to ask a question',
    level: 1,
    intro: "French has three ways to ask the same yes/no question, from relaxed to formal. You'll hear all three, so it pays to recognise them.",
    sections: [
      {
        heading: "1. L'intonation",
        body: 'Say the statement and make your voice go **up** at the end. This is how most people talk: **Tu viens ? Vous êtes prêts ?**',
        examples: [
          { fr: 'Tu as faim ?', en: 'Are you hungry?' },
          { fr: 'Vous parlez anglais ?', en: 'Do you speak English?' },
          { fr: 'Il pleut ?', en: 'Is it raining?' },
        ],
      },
      {
        heading: '2. Est-ce que',
        body: "Put **est-ce que** in front of the statement — nothing else changes. Before a vowel it becomes **est-ce qu'**. It works everywhere, in speech and in writing.",
        examples: [
          { fr: 'Est-ce que tu as faim ?', en: 'Are you hungry?' },
          { fr: "Est-ce qu'elle travaille aujourd'hui ?", en: 'Is she working today?' },
          { fr: 'Est-ce que vous avez une chambre ?', en: 'Do you have a room?' },
        ],
      },
      {
        heading: "3. L'inversion",
        body: 'Swap the verb and the subject pronoun and join them with a hyphen: **As-tu faim ?** It sounds more formal and is common in writing. Between two vowels, add **-t-**: **Parle-t-il anglais ?**',
        table: {
          head: ['Intonation', 'Est-ce que', 'Inversion'],
          rows: [
            ['Tu viens ?', 'Est-ce que tu viens ?', 'Viens-tu ?'],
            ['Elle travaille ?', "Est-ce qu'elle travaille ?", 'Travaille-t-elle ?'],
            ['Vous avez faim ?', 'Est-ce que vous avez faim ?', 'Avez-vous faim ?'],
          ],
        },
        examples: [
          { fr: 'Parlez-vous anglais ?', en: 'Do you speak English?' },
          { fr: 'Aime-t-elle le chocolat ?', en: 'Does she like chocolate?' },
        ],
      },
      {
        heading: 'Répondre : oui, non… et si !',
        body: 'To answer **yes** to a negative question, say **si**: **Tu n\'as pas faim ? — Si !** (Aren\'t you hungry? — Yes, I am!)',
        examples: [
          { fr: "Tu ne viens pas ? — Si, j'arrive !", en: "Aren't you coming? — Yes, I'm on my way!" },
          { fr: "Vous n'avez pas de voiture ? — Non.", en: "Haven't you got a car? — No." },
        ],
      },
    ],
    tips: [
      "There is no 'do / does' in French: 'Do you like…?' is simply **Tu aimes… ?** or **Est-ce que tu aimes… ?**",
      'Avoid inversion with je (apart from fixed forms like **puis-je**): use est-ce que instead.',
    ],
    practice: { kinds: ['qform', 'qmatch', 'glisten'], tenses: ['present', 'passe_compose', 'futur_proche'], qforms: ['intonation', 'est-ce-que', 'inversion'] },
  },
  {
    id: 'questions-mots',
    unit: 'questions',
    title: 'Les mots interrogatifs',
    en: 'Question words',
    level: 1,
    intro: 'To ask for information you need a question word: où, quand, comment, pourquoi, combien… Each one works with all three question forms.',
    sections: [
      {
        heading: 'Les mots essentiels',
        body: "Here are the question words you'll use every day.",
        table: {
          head: ['French', 'English', 'Example'],
          rows: [
            ['où', 'where', 'Où habites-tu ?'],
            ["d'où", 'where … from', "D'où viens-tu ?"],
            ['quand', 'when', 'Quand pars-tu ?'],
            ['à quelle heure', 'what time', 'À quelle heure commence le film ?'],
            ['depuis quand', 'since when, how long', 'Depuis quand attends-tu ?'],
            ['comment', 'how', 'Comment vas-tu au travail ?'],
            ['pourquoi', 'why', 'Pourquoi pleures-tu ?'],
            ['combien (de)', 'how much, how many', 'Combien de frères as-tu ?'],
            ['qui', 'who', 'Qui attends-tu ?'],
            ['avec qui', 'who … with', 'Avec qui pars-tu ?'],
            ["que / qu'est-ce que", 'what', "Qu'est-ce que tu fais ?"],
          ],
        },
      },
      {
        heading: 'Où mettre le mot interrogatif ?',
        body: 'With intonation, the question word usually goes **at the end**: **Tu habites où ?** With est-ce que and with inversion, it goes **at the start**: **Où est-ce que tu habites ? Où habites-tu ?**',
        examples: [
          { fr: 'Tu pars quand ?', en: 'When are you leaving?' },
          { fr: 'Quand est-ce que tu pars ?', en: 'When are you leaving?' },
          { fr: 'Quand pars-tu ?', en: 'When are you leaving?' },
          { fr: 'Pourquoi tu ris ?', en: 'Why are you laughing?' },
        ],
      },
      {
        heading: 'Répondre',
        body: '**Pourquoi** → **parce que** (because) or **pour** + infinitive (to…). **Combien** → a number or an amount. **Depuis quand** → **depuis** + a starting point (depuis lundi). **Comment** → a manner (en bus, très bien…).',
        examples: [
          { fr: "Pourquoi tu apprends le français ? — Parce que j'aime la France.", en: 'Why are you learning French? — Because I love France.' },
          { fr: 'Combien ça coûte ? — Dix euros.', en: "How much is it? — Ten euros." },
          { fr: 'Depuis quand habites-tu ici ? — Depuis 2020.', en: 'How long have you lived here? — Since 2020.' },
        ],
      },
    ],
    tips: [
      'In casual speech **pourquoi** usually goes first anyway: **Pourquoi tu pleures ?**',
      '**Combien de** + noun, with no article: combien de pommes, combien d\'enfants.',
    ],
    practice: {
      kinds: ['qword', 'qmatch', 'qform', 'glisten'],
      tenses: ['present', 'passe_compose', 'futur_simple'],
      qforms: ['intonation', 'est-ce-que', 'inversion'],
      qwords: ['ou', 'd-ou', 'quand', 'a-quelle-heure', 'depuis-quand', 'comment', 'pourquoi', 'combien', 'qui', 'avec-qui'],
    },
  },
  {
    id: 'questions-inversion',
    unit: 'questions',
    title: "L'inversion et le -t-",
    en: 'Inversion and the extra -t-',
    level: 2,
    intro: "Inversion is the formal way to ask: the subject pronoun goes after the verb. It's what you'll read in books and hear in polite situations.",
    sections: [
      {
        heading: 'Verbe-pronom',
        body: 'Put the verb first, then the pronoun, with a hyphen: **Vous parlez → Parlez-vous ?** **Tu viens → Viens-tu ?** With a question word: **Où allez-vous ? Que fais-tu ?**',
        examples: [
          { fr: 'Parlez-vous français ?', en: 'Do you speak French?' },
          { fr: 'Où vas-tu ?', en: 'Where are you going?' },
          { fr: 'Que veulent-ils ?', en: 'What do they want?' },
        ],
      },
      {
        heading: 'Le -t- entre deux voyelles',
        body: 'When the verb ends in a vowel (**-e** or **-a**) and the pronoun starts with one (**il, elle, on**), add **-t-** to make it easier to say: **parle-t-il, a-t-elle, va-t-on**. No extra t when the verb already ends in -t or -d: **est-il, fait-elle, prend-il**.',
        table: {
          head: ['Statement', 'Inversion'],
          rows: [
            ['il parle', 'parle-t-il ?'],
            ['elle a', 'a-t-elle ?'],
            ['on va', 'va-t-on ?'],
            ['il mangera', 'mangera-t-il ?'],
            ['elle est', 'est-elle ?'],
            ['il prend', 'prend-il ?'],
          ],
        },
        examples: [
          { fr: 'Où travaille-t-elle ?', en: 'Where does she work?' },
          { fr: 'Quand arrivera-t-il ?', en: 'When will he arrive?' },
          { fr: "Comment s'appelle-t-il ?", en: "What's his name?" },
        ],
      },
      {
        heading: 'Avec un nom',
        body: 'With a noun subject, keep the noun and add a pronoun after the verb: **Marie part-elle ? Pourquoi tes parents vendent-ils la maison ?** With où, quand, comment and que you can also simply swap: **Où travaille Marie ?**',
        examples: [
          { fr: 'Paul vient-il ce soir ?', en: 'Is Paul coming tonight?' },
          { fr: 'Pourquoi les enfants pleurent-ils ?', en: 'Why are the children crying?' },
          { fr: 'Où habite ta sœur ?', en: 'Where does your sister live?' },
        ],
      },
      {
        heading: 'Aux temps composés',
        body: 'Only the auxiliary moves: **As-tu mangé ? Où êtes-vous allés ?** In the negative, ne … pas go around the auxiliary + pronoun: **Pourquoi n\'est-il pas venu ?**',
        examples: [
          { fr: 'Avez-vous bien dormi ?', en: 'Did you sleep well?' },
          { fr: "Qu'a-t-elle dit ?", en: 'What did she say?' },
          { fr: "N'as-tu pas faim ?", en: "Aren't you hungry?" },
        ],
      },
    ],
    tips: [
      'Reflexive verbs keep their pronoun in front: **Te lèves-tu tôt ? Comment vous appelez-vous ?**',
      "Don't invert with je in everyday French: say **Est-ce que je peux… ?** or the fixed **Puis-je… ?**",
    ],
    practice: { kinds: ['qform', 'qword', 'glisten'], tenses: ['present', 'passe_compose', 'futur_simple', 'imparfait'], qforms: ['inversion'] },
  },
  {
    id: 'questions-quel-lequel',
    unit: 'questions',
    title: 'Quel et lequel',
    en: 'Which: quel and lequel',
    level: 2,
    intro: '**Quel** (which, what) goes with a noun and agrees with it. **Lequel** (which one) replaces quel + noun when we already know what we are talking about.',
    sections: [
      {
        heading: 'Quel, quelle, quels, quelles',
        body: '**Quel** agrees with its noun: **Quel âge as-tu ? Quelle heure est-il ? Quels films aimes-tu ? Quelles langues parlez-vous ?** All four forms sound the same!',
        table: {
          head: ['', 'singular', 'plural'],
          rows: [
            ['masculine', 'quel', 'quels'],
            ['feminine', 'quelle', 'quelles'],
          ],
        },
        examples: [
          { fr: 'Quel temps fait-il ?', en: "What's the weather like?" },
          { fr: 'Quels pays as-tu visités ?', en: 'Which countries have you visited?' },
          { fr: 'Quelles chaussures vas-tu mettre ?', en: 'Which shoes are you going to wear?' },
        ],
      },
      {
        heading: 'Quel + être',
        body: "**Quel** can also come before **être**: **Quel est ton nom ? Quelle est ton adresse ?** Here French says quel where English says 'what'.",
        examples: [
          { fr: 'Quel est ton numéro ?', en: "What's your number?" },
          { fr: 'Quelle est la capitale du Canada ?', en: "What's the capital of Canada?" },
          { fr: 'Quelle est ta couleur préférée ?', en: "What's your favourite colour?" },
        ],
      },
      {
        heading: 'Lequel, laquelle, lesquels, lesquelles',
        body: '**Lequel** = le + quel. It means **which one(s)** and agrees with the noun it replaces: **J\'ai deux pulls. Lequel préfères-tu ?**',
        table: {
          head: ['', 'singular', 'plural'],
          rows: [
            ['masculine', 'lequel', 'lesquels'],
            ['feminine', 'laquelle', 'lesquelles'],
          ],
        },
        examples: [
          { fr: 'Tu préfères lequel, le rouge ou le bleu ?', en: 'Which one do you prefer, the red one or the blue one?' },
          { fr: 'Laquelle de ces robes est la moins chère ?', en: 'Which of these dresses is the cheapest?' },
          { fr: 'Lesquels de tes amis viennent ?', en: 'Which of your friends are coming?' },
        ],
      },
    ],
    tips: [
      'quel + noun (**quel livre ?**), lequel on its own (**lequel ?**).',
      'Exclamations use quel too: **Quelle belle journée !** (What a lovely day!)',
    ],
    practice: { kinds: ['qword', 'qmatch', 'qform'], tenses: ['present', 'passe_compose'], qforms: ['intonation', 'est-ce-que', 'inversion'], qwords: ['quel', 'lequel'] },
  },
  {
    id: 'questions-quest-ce',
    unit: 'questions',
    title: "Qu'est-ce que ou qu'est-ce qui ?",
    en: "What: qu'est-ce que or qu'est-ce qui?",
    level: 2,
    intro: "Both mean **what**, but **qu'est-ce que** asks about the object (what are you doing?) and **qu'est-ce qui** asks about the subject (what's happening?).",
    sections: [
      {
        heading: "Qu'est-ce que = what (object)",
        body: "Use **qu'est-ce que** when someone does something to the thing: **Qu'est-ce que tu manges ?** It becomes **qu'est-ce qu'** before a vowel. The formal version is **que** + inversion (**Que manges-tu ?**); the casual one puts **quoi** at the end (**Tu manges quoi ?**).",
        examples: [
          { fr: "Qu'est-ce que tu fais ?", en: 'What are you doing?' },
          { fr: "Qu'est-ce qu'il dit ?", en: 'What is he saying?' },
          { fr: 'Que voulez-vous ?', en: 'What do you want?' },
          { fr: 'Tu cherches quoi ?', en: 'What are you looking for?' },
        ],
      },
      {
        heading: "Qu'est-ce qui = what (subject)",
        body: "Use **qu'est-ce qui** when the thing itself does the action: **Qu'est-ce qui se passe ?** It is followed directly by a verb.",
        examples: [
          { fr: "Qu'est-ce qui se passe ?", en: "What's happening?" },
          { fr: "Qu'est-ce qui ne va pas ?", en: "What's wrong?" },
          { fr: "Qu'est-ce qui sent si bon ?", en: 'What smells so good?' },
          { fr: "Qu'est-ce qui t'intéresse ?", en: 'What are you interested in?' },
        ],
      },
      {
        heading: 'Et pour les personnes ?',
        body: 'For people, use **qui**: **Qui est-ce que tu vois ?** (object), **Qui vient ?** or **Qui est-ce qui vient ?** (subject). After a preposition, use **quoi** for things and **qui** for people: **À quoi penses-tu ? Avec qui pars-tu ?**',
        table: {
          head: ['', 'person', 'thing'],
          rows: [
            ['subject', 'Qui (est-ce qui) vient ?', "Qu'est-ce qui arrive ?"],
            ['object', 'Qui est-ce que tu vois ?', "Qu'est-ce que tu vois ?"],
            ['after a preposition', 'Avec qui… ?', 'Avec quoi… ?'],
          ],
        },
      },
    ],
    tips: [
      "Look at what comes next: a subject (tu, il, Marie…) → qu'est-ce que; a verb → qu'est-ce qui.",
      "**Qu'est-ce que c'est ?** = What is it? A very handy question in shops.",
    ],
    practice: { kinds: ['qword', 'qmatch', 'qform'], tenses: ['present', 'passe_compose'], qforms: ['intonation', 'est-ce-que', 'inversion'], qwords: ['que', 'quoi', 'qu-est-ce-qui', 'qui'] },
  },
];
