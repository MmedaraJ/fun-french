// Advanced lessons: nuance and style.
import type { Lesson } from '../../../lib/grammar/types';

export const AVANCE_STYLE: Lesson[] = [
  {
    id: 'mise-en-relief',
    unit: 'style',
    title: 'La mise en relief',
    en: 'Emphasis: cleft sentences',
    level: 4,
    intro: "French rarely stresses a word with the voice alone: it rebuilds the sentence around it. **C'est Marie qui a raison. Ce qui me gêne, c'est son ton.**",
    sections: [
      {
        heading: "C'est… qui / c'est… que",
        body: "Put the element you want to stress between **c'est** and **qui** if it is the subject, or **que** for anything else. With a plural noun, careful French uses **ce sont**: **Ce sont mes parents qui m'ont appris ça** (c'est mes parents is common in speech). Pronouns take their stressed form: c'est **moi**, c'est **lui**, c'est **nous**.",
        examples: [
          { fr: "C'est Julie qui a eu l'idée.", en: 'Julie was the one who had the idea.' },
          { fr: 'C\'est cette décision que je regrette le plus.', en: "It's that decision I regret most." },
          { fr: 'Ce ne sont pas les moyens qui manquent, c\'est la volonté.', en: "It's not the means that are lacking, it's the will." },
        ],
      },
      {
        heading: 'La préposition reste devant',
        body: "When the stressed element has a preposition, the preposition stays in front and the link word is simply **que**: **C'est à toi que je pense. C'est de ce projet que je voulais parler.** Never double it ('c'est à toi à qui', 'c'est de ça dont'). Times and places work the same way: **c'est en 2008 que**, not où or quand.",
        examples: [
          { fr: "C'est à Lisbonne que nous nous sommes rencontrés.", en: 'It was in Lisbon that we met.' },
          { fr: "C'est pour cette raison que j'ai démissionné.", en: "That's the reason I resigned." },
          { fr: "C'est en 2008 qu'elle a fondé son entreprise.", en: 'It was in 2008 that she founded her company.' },
        ],
      },
      {
        heading: "Ce qui…, c'est / ce que…, c'est",
        body: 'To build up to the key point, start with a clause and reveal the point after **c\'est**. Choose the pronoun the verb needs, and repeat its preposition after c\'est.',
        table: {
          head: ['Structure', 'Used when the verb…', 'Example'],
          rows: [
            ["ce qui…, c'est", 'needs a subject', "Ce qui me gêne, c'est son ton."],
            ["ce que…, c'est", 'takes a direct object', "Ce que j'admire, c'est son courage."],
            ["ce dont…, c'est de", 'is built with de', "Ce dont j'ai besoin, c'est de repos."],
            ["ce à quoi…, c'est à", 'is built with à', "Ce à quoi je pense, c'est à l'avenir."],
          ],
        },
      },
      {
        heading: "L'accord du verbe après qui",
        body: "After **c'est… qui**, the verb agrees with the stressed word, not with c'est: **c'est moi qui suis, c'est toi qui as, c'est nous qui avons, c'est vous qui êtes, ce sont eux qui ont**. Two pronouns count as one plural: **c'est toi et moi qui allons décider** (= nous).",
        examples: [
          { fr: "C'est moi qui ai raison, pas toi.", en: "I'm the one who's right, not you." },
          { fr: "C'est nous qui avons organisé la soirée.", en: 'We were the ones who organised the party.' },
          { fr: "C'est vous qui êtes en retard, pas nous.", en: "You're the ones who are late, not us." },
          { fr: 'Ce sont mes collègues qui ont choisi la date.', en: 'My colleagues were the ones who chose the date.' },
        ],
      },
    ],
    tips: [
      "'C'est moi qui a raison' is a common slip, even among native speakers: the verb follows moi, so **ai**.",
      'Ce que j\'ai besoin is wrong: avoir besoin **de** → **ce dont** j\'ai besoin.',
    ],
    practice: { kinds: ['drill'], drills: ['mise-en-relief'] },
  },
  {
    id: 'place-adjectifs',
    unit: 'style',
    title: "La place de l'adjectif et son sens",
    en: 'Adjective position and meaning',
    level: 4,
    intro: "Most adjectives follow the noun, but some change meaning with their position: **mon ancien patron** (my former boss) but **une maison ancienne** (an old house).",
    sections: [
      {
        heading: 'Le principe',
        body: "After the noun, the adjective keeps its **literal**, objective meaning. Before the noun, it takes a **figurative** or subjective one: **un homme grand** is tall, **un grand homme** is great. Wherever it goes, the adjective agrees with the noun.",
        examples: [
          { fr: 'De Gaulle était un grand homme.', en: 'De Gaulle was a great man.' },
          { fr: 'Mon frère est un homme grand et mince.', en: 'My brother is a tall, slim man.' },
          { fr: "J'ai vu ça de mes propres yeux.", en: 'I saw it with my own eyes.' },
          { fr: 'Mets une chemise propre.', en: 'Put on a clean shirt.' },
        ],
      },
      {
        heading: 'Les adjectifs qui changent de sens',
        body: 'Learn them in pairs:',
        table: {
          head: ['Adjective', 'Before the noun', 'After the noun'],
          rows: [
            ['ancien', 'mon ancien patron (former)', 'une maison ancienne (old, historic)'],
            ['grand', 'un grand homme (great)', 'un homme grand (tall)'],
            ['cher', 'mon cher ami (dear)', 'une voiture chère (expensive)'],
            ['pauvre', 'la pauvre femme ! (poor thing)', 'une famille pauvre (not rich)'],
            ['propre', 'mes propres yeux (own)', 'une chemise propre (clean)'],
            ['seul', 'la seule personne (only)', 'une femme seule (alone, lonely)'],
            ['même', 'le même jour (same)', 'le jour même (that very day)'],
            ['certain', 'une certaine expérience (some)', 'un talent certain (undeniable)'],
            ['dernier', 'la dernière semaine (final)', 'la semaine dernière (last, just gone)'],
            ['prochain', 'le prochain train (next in a series)', 'la semaine prochaine (next, coming)'],
            ['curieux', 'un curieux personnage (odd)', 'une enfant curieuse (inquisitive)'],
            ['brave', 'un brave homme (decent)', 'un soldat brave (courageous)'],
            ['simple', 'une simple formalité (mere)', 'une question simple (easy)'],
            ['sale', 'un sale temps (lousy)', 'du linge sale (dirty)'],
            ['vrai', 'un vrai problème (real, genuine)', 'une histoire vraie (true)'],
            ['pur', 'une pure perte de temps (sheer)', "de l'air pur (pure, clean)"],
          ],
        },
      },
      {
        heading: 'Dernier et prochain avec le temps',
        body: "With time words, **dernier** and **prochain** go **after** the noun when they count from now: **la semaine dernière, l'an prochain, lundi prochain**. Before the noun they mean last or next in a series: **la dernière semaine des vacances, le prochain arrêt**.",
        examples: [
          { fr: "On s'est vus la semaine dernière.", en: 'We saw each other last week.' },
          { fr: "C'est la dernière semaine avant les vacances.", en: "It's the final week before the holidays." },
          { fr: 'Le prochain train part dans dix minutes.', en: 'The next train leaves in ten minutes.' },
        ],
      },
    ],
    tips: [
      '**Ancien** before the noun often comes with a possessive: mon ancien appartement = the flat I used to live in.',
      'English helps with two of them: "my own" (propre) and "the only" (seul) come first in both languages.',
    ],
    practice: { kinds: ['drill'], drills: ['place-adjectifs'] },
  },
  {
    id: 'prepositions-verbes',
    unit: 'style',
    title: 'Les verbes et leurs prépositions',
    en: 'Verbs and their prepositions',
    level: 4,
    intro: "Many verbs need a specific preposition, and it rarely matches English: **dépendre de** (depend on), **s'intéresser à** (be interested in). Learn each verb together with its preposition.",
    sections: [
      {
        heading: 'Verbes + à',
        body: "**tenir à** (to be keen to, to insist on), **s'intéresser à**, **renoncer à**, **s'attendre à**, **consister à** + infinitive, **réussir à**, **hésiter à**, **aider quelqu'un à**. Before le and les, à contracts to **au** and **aux**.",
        examples: [
          { fr: 'Je tiens à vous remercier pour votre accueil.', en: "I'd really like to thank you for your welcome." },
          { fr: "Elle s'intéresse à la politique internationale.", en: 'She is interested in international politics.' },
          { fr: "Il a renoncé au poste à l'étranger.", en: 'He gave up on the job abroad.' },
          { fr: "Je ne m'attendais pas à une telle réaction.", en: "I wasn't expecting such a reaction." },
          { fr: "N'hésitez pas à me contacter.", en: "Don't hesitate to contact me." },
        ],
      },
      {
        heading: 'Verbes + de',
        body: "**se souvenir de**, **se méfier de**, **dépendre de**, **s'occuper de**, **se moquer de**, **se passer de** (to do without), **demander à quelqu'un de** faire, **empêcher quelqu'un de** faire. Before le and les, de contracts to **du** and **des**.",
        examples: [
          { fr: 'Tout dépend du budget.', en: 'It all depends on the budget.' },
          { fr: 'Méfie-toi des promesses trop belles.', en: 'Beware of promises that sound too good.' },
          { fr: 'Je ne peux pas me passer de mon téléphone.', en: "I can't do without my phone." },
          { fr: "J'ai demandé au directeur de m'accorder un jour de congé.", en: 'I asked the manager to give me a day off.' },
          { fr: "Le bruit m'a empêché de dormir.", en: 'The noise kept me awake.' },
        ],
      },
      {
        heading: 'Une préposition, un sens',
        body: 'Some verbs change meaning with the preposition:',
        table: {
          head: ['Verb', 'Meaning', 'Example'],
          rows: [
            ['manquer à', 'to be missed by', 'Tu me manques. (I miss you.)'],
            ['manquer de', 'to lack', 'Cette soupe manque de sel.'],
            ['penser à', 'to think about', 'Je pense souvent à toi.'],
            ['penser de', 'to have an opinion of', 'Que penses-tu de ce film ?'],
            ['consister à', 'to consist in (+ infinitive)', 'Le travail consiste à analyser des données.'],
            ['consister en', 'to consist of (+ noun)', 'Le menu consiste en trois plats.'],
            ['jouer à', 'to play a game or sport', 'jouer aux cartes, au tennis'],
            ['jouer de', 'to play an instrument', 'jouer du piano, de la guitare'],
            ['commencer par / finir par', 'to start by / to end up doing', 'Il a fini par accepter.'],
          ],
        },
      },
    ],
    tips: [
      '**Manquer à** works backwards from English: the person you miss is the subject. Tu me manques = I miss you; je te manque = you miss me.',
      'Avoid the calques "dépendre sur" and "consister de": it is dépendre de and consister en.',
    ],
    practice: { kinds: ['drill'], drills: ['prepositions-verbes'] },
  },
  {
    id: 'negation-soutenue',
    unit: 'style',
    title: 'La négation soutenue',
    en: 'Formal and literary negation',
    level: 4,
    intro: "Beyond ne… pas, formal French has a range of negations, and even a **ne** that isn't negative at all. You need to recognise them to read well, and using them lifts your writing.",
    sections: [
      {
        heading: 'Remplacer pas',
        body: "These words take the place of pas (never add pas to them): **ne… guère** (hardly), **ne… point** (not, literary), **ne… nullement / aucunement** (not in the least), **ne… aucun(e)** (no, not a single; always singular, agreeing with the noun), **ne… nulle part** (nowhere), **ne… que** (only: a restriction, not a negation).",
        examples: [
          { fr: "Je n'ai guère le temps de lire ces jours-ci.", en: 'I hardly have time to read these days.' },
          { fr: "Il ne s'est nullement excusé.", en: "He didn't apologise in the slightest." },
          { fr: "Nous n'avons reçu aucune réponse.", en: 'We received no reply at all.' },
          { fr: 'Je ne les trouve nulle part.', en: "I can't find them anywhere." },
          { fr: "Il ne boit que de l'eau.", en: 'He drinks only water.' },
        ],
      },
      {
        heading: 'Ni… ni…, sans, aucun',
        body: "**ni… ni…** come with **ne** before the verb and no pas. **Sans** is negative already, so no ne after it: **sans rien dire, sans jamais se plaindre**. **Aucun** and **personne** used as subjects take ne but never pas.",
        examples: [
          { fr: "Je n'ai ni frères ni sœurs.", en: "I have no brothers or sisters." },
          { fr: 'Ni mon frère ni ma sœur ne sont venus.', en: 'Neither my brother nor my sister came.' },
          { fr: 'Elle est partie sans rien dire.', en: 'She left without saying anything.' },
          { fr: "Aucun candidat n'avait le niveau requis.", en: 'No candidate had the required level.' },
        ],
      },
      {
        heading: 'Le ne explétif',
        body: "Formal French adds a **ne** without pas after **avant que**, **à moins que**, **de peur que**, **craindre que** and after comparisons (**plus… que, moins… que**). It adds no negative meaning and can be left out: **avant qu'il ne pleuve** = before it rains.",
        examples: [
          { fr: "Partons avant qu'il ne commence à pleuvoir.", en: "Let's leave before it starts raining." },
          { fr: "Je viendrai, à moins qu'il n'y ait un imprévu.", en: "I'll come, unless something unexpected comes up." },
          { fr: "Le projet est plus complexe qu'on ne le pense.", en: 'The project is more complex than people think.' },
          { fr: "Je crains qu'il ne soit trop tard.", en: "I'm afraid it's too late." },
        ],
      },
      {
        heading: 'Ne seul',
        body: "With a few verbs, formal French drops pas and keeps **ne** alone, and the meaning stays negative: **je ne saurais** (I couldn't), **je n'ose** (I don't dare), **il ne cesse de** (he keeps on), **je ne peux** or **je ne puis** (I cannot).",
        examples: [
          { fr: 'Je ne saurais vous dire à quelle heure il rentrera.', en: "I couldn't tell you what time he'll be back." },
          { fr: "Elle n'ose lui avouer la vérité.", en: "She doesn't dare tell him the truth." },
          { fr: 'Il ne cesse de pleuvoir depuis lundi.', en: "It hasn't stopped raining since Monday." },
        ],
      },
    ],
    tips: [
      "**Ne… pas que** means 'not only': Il ne boit **pas que** de l'eau = he doesn't only drink water.",
      "Don't read the expletive ne as a negation: à moins qu'il **ne** pleuve = unless it rains.",
    ],
    practice: { kinds: ['drill'], drills: ['negation-soutenue'] },
  },
];
