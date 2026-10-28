// Lessons 16–19: negation, the near future (aller + inf.) and the recent past (venir de + inf.).
import type { Lesson } from '../../../lib/grammar/types';

export const NEGATION_NEAR: Lesson[] = [
  {
    id: 'negation-ne-pas',
    unit: 'negation',
    title: 'Ne… pas et les articles',
    en: 'Ne… pas, and articles after a negative',
    level: 1,
    intro: 'To make a sentence negative, wrap the verb in **ne … pas**. Watch out for un, une, des and du: after a negative they usually become **de**.',
    sections: [
      {
        heading: 'Ne + verbe + pas',
        body: "**Ne** goes before the verb and **pas** after it: **Je ne parle pas allemand.** Ne becomes **n'** before a vowel: **Il n'aime pas le thé.** In casual speech the ne often disappears (**je sais pas**), but always write it.",
        examples: [
          { fr: 'Je ne fume pas.', en: "I don't smoke." },
          { fr: "Elle n'habite pas ici.", en: "She doesn't live here." },
          { fr: 'Nous ne sommes pas pressés.', en: "We're not in a hurry." },
          { fr: "Ce n'est pas grave.", en: "It doesn't matter." },
        ],
      },
      {
        heading: 'Un, une, des, du, de la → de',
        body: "After a negative, **un, une, des** and **du, de la, de l'** become **de** (**d'** before a vowel).",
        table: {
          head: ['Affirmative', 'Negative'],
          rows: [
            ["J'ai un chien.", "Je n'ai pas de chien."],
            ['Il y a des pommes.', "Il n'y a pas de pommes."],
            ["Je bois de l'eau.", "Je ne bois pas d'eau."],
            ['Elle fait du sport.', 'Elle ne fait pas de sport.'],
          ],
        },
      },
      {
        heading: 'Ce qui ne change pas',
        body: "**Le, la, les** don't change: **J'aime le café → Je n'aime pas le café.** After **être**, nothing changes either: **C'est un problème → Ce n'est pas un problème.**",
        examples: [
          { fr: 'Je ne regarde pas la télé.', en: "I don't watch TV." },
          { fr: "Ce n'est pas une bonne idée.", en: "It's not a good idea." },
          { fr: "Il n'aime pas les épinards.", en: "He doesn't like spinach." },
        ],
      },
      {
        heading: 'Avec un infinitif',
        body: 'With two verbs, ne … pas goes around the first one: **Je ne veux pas partir. Tu ne vas pas manger ?** To make the infinitive itself negative, put both words in front of it: **Je préfère ne pas savoir.**',
        examples: [
          { fr: 'Je ne peux pas venir.', en: "I can't come." },
          { fr: "Nous n'allons pas sortir.", en: "We're not going to go out." },
          { fr: 'Il essaie de ne pas rire.', en: "He's trying not to laugh." },
        ],
      },
    ],
    tips: [
      "Answer yes to a negative question with **si**: Tu n'aimes pas le chocolat ? — Si !",
      'With reflexive verbs, ne goes before the pronoun: **je ne me lève pas**.',
    ],
    practice: { kinds: ['negate', 'cloze', 'gtranslate'], tenses: ['present', 'futur_proche', 'imperatif'], negations: ['pas'] },
  },
  {
    id: 'negation-jamais-plus',
    unit: 'negation',
    title: 'Ne… jamais, plus, rien, personne',
    en: 'Never, no longer, nothing, nobody',
    level: 2,
    intro: 'Swap **pas** for another word to say never, not anymore, nothing or nobody. The structure stays the same: ne + verb + negative word.',
    sections: [
      {
        heading: 'Jamais, plus',
        body: '**ne … jamais** = never: **Je ne mange jamais de viande.** **ne … plus** = not anymore, no longer: **Il ne fume plus.** The articles change to de, just as with pas.',
        examples: [
          { fr: 'Je ne bois jamais de café le soir.', en: 'I never drink coffee in the evening.' },
          { fr: 'Elle ne travaille plus ici.', en: "She doesn't work here anymore." },
          { fr: "Nous n'avons plus de lait.", en: "We've run out of milk." },
          { fr: "Tu ne m'écoutes jamais !", en: 'You never listen to me!' },
        ],
      },
      {
        heading: 'Rien, personne',
        body: "**ne … rien** = nothing, not anything: **Je ne vois rien.** **ne … personne** = nobody, not anyone: **Je ne connais personne.** They replace the object, so there's no other article. Both can be the subject too: **Rien ne marche. Personne ne répond.**",
        examples: [
          { fr: 'Il ne dit rien.', en: "He doesn't say anything." },
          { fr: "Je n'entends rien.", en: "I can't hear anything." },
          { fr: 'Nous ne connaissons personne ici.', en: "We don't know anybody here." },
          { fr: "Personne n'est venu.", en: 'Nobody came.' },
        ],
      },
      {
        heading: 'Au passé composé',
        body: "**Pas, jamais, plus, rien** go **before** the participle: **Je n'ai rien mangé. Il n'est jamais venu.** But **personne** goes **after** it: **Je n'ai vu personne.**",
        table: {
          head: ['Negative', 'Present', 'Passé composé'],
          rows: [
            ['pas', 'Je ne mange pas.', "Je n'ai pas mangé."],
            ['jamais', 'Je ne mange jamais.', "Je n'ai jamais mangé."],
            ['plus', 'Je ne mange plus.', "Je n'ai plus mangé."],
            ['rien', 'Je ne mange rien.', "Je n'ai rien mangé."],
            ['personne', 'Je ne vois personne.', "Je n'ai vu personne."],
          ],
        },
      },
    ],
    tips: [
      "One negative word at a time: **je ne vois rien** (never 'je ne vois pas rien').",
      '**Jamais** on its own can answer a question: Tu fumes ? — Jamais !',
    ],
    practice: { kinds: ['negate', 'cloze', 'gtranslate', 'glisten'], tenses: ['present', 'passe_compose', 'futur_simple'], negations: ['jamais', 'plus', 'rien', 'personne'] },
  },
  {
    id: 'futur-proche',
    unit: 'futur',
    title: 'Le futur proche',
    en: 'The near future (going to)',
    level: 1,
    intro: "The futur proche is the easiest way to talk about the future: **aller** in the present + an **infinitive**, just like English 'going to'.",
    sections: [
      {
        heading: 'Aller + infinitif',
        body: 'Conjugate **aller** in the present and add the infinitive of the main verb: **je vais manger, tu vas partir, nous allons voir**.',
        table: {
          head: ['Pronoun', 'aller', '+ infinitive'],
          rows: [
            ['je', 'vais', 'manger'],
            ['tu', 'vas', 'partir'],
            ['il / elle / on', 'va', 'pleuvoir'],
            ['nous', 'allons', 'voyager'],
            ['vous', 'allez', 'voir'],
            ['ils / elles', 'vont', 'arriver'],
          ],
        },
        examples: [
          { fr: 'Je vais faire les courses.', en: "I'm going to do the shopping." },
          { fr: 'Il va pleuvoir.', en: "It's going to rain." },
          { fr: 'Nous allons déménager en mai.', en: "We're going to move in May." },
          { fr: 'Tu vas adorer ce film !', en: "You're going to love this film!" },
        ],
      },
      {
        heading: 'Négation et pronoms',
        body: '**Ne … pas** goes around **aller**: **Je ne vais pas sortir.** Object and reflexive pronouns go in front of the infinitive: **Je vais le faire. Nous allons nous coucher.**',
        examples: [
          { fr: 'Je ne vais pas travailler demain.', en: "I'm not going to work tomorrow." },
          { fr: 'Elle va se marier.', en: "She's going to get married." },
          { fr: "Tu vas l'appeler ?", en: 'Are you going to call him?' },
        ],
      },
      {
        heading: 'Futur proche ou futur simple ?',
        body: 'Use the **futur proche** for plans and for things about to happen. The **futur simple** (je mangerai) sounds a little more distant or formal and is used for predictions and promises. In conversation the futur proche is everywhere.',
        examples: [
          { fr: 'Attention, tu vas tomber !', en: "Careful, you're going to fall!" },
          { fr: 'Ce soir, on va regarder un film.', en: "Tonight, we're going to watch a film." },
        ],
      },
    ],
    tips: [
      "No extra word between the two verbs: **je vais manger** (not 'je vais à manger').",
      'Aller + aller is fine: **je vais aller à la plage** (I\'m going to go to the beach).',
    ],
    practice: {
      kinds: ['conj', 'cloze', 'transform', 'negate', 'gtranslate', 'glisten'],
      tenses: ['futur_proche'],
      verbs: ['aller', 'manger', 'partir', 'faire', 'voir', 'se coucher', 'pleuvoir', 'acheter'],
      negations: ['pas'],
    },
  },
  {
    id: 'passe-recent',
    unit: 'passe',
    title: 'Le passé récent',
    en: 'The recent past (have just)',
    level: 1,
    intro: 'To say you **have just** done something, use **venir de** + infinitive. It is the mirror image of the futur proche.',
    sections: [
      {
        heading: 'Venir de + infinitif',
        body: "Conjugate **venir** in the present, add **de** (**d'** before a vowel) and the infinitive: **Je viens de manger.** (I've just eaten.)",
        table: {
          head: ['Pronoun', 'venir', 'de + infinitive'],
          rows: [
            ['je', 'viens', 'de manger'],
            ['tu', 'viens', "d'arriver"],
            ['il / elle / on', 'vient', 'de partir'],
            ['nous', 'venons', 'de finir'],
            ['vous', 'venez', "d'acheter"],
            ['ils / elles', 'viennent', 'de sortir'],
          ],
        },
        examples: [
          { fr: 'Je viens de finir mes devoirs.', en: "I've just finished my homework." },
          { fr: 'Le train vient de partir.', en: 'The train has just left.' },
          { fr: "Nous venons d'arriver.", en: "We've just arrived." },
          { fr: 'Elle vient de se réveiller.', en: "She's just woken up." },
        ],
      },
      {
        heading: 'Attention au sens',
        body: '**Venir** + infinitive **without de** means to come and do something: **Viens manger !** (Come and eat!) With **de**, it is the recent past: **Je viens de manger** (I\'ve just eaten).',
        examples: [
          { fr: 'Viens voir !', en: 'Come and see!' },
          { fr: 'Je viens de voir Paul.', en: "I've just seen Paul." },
          { fr: "Tu viens d'appeler ?", en: 'Did you just call?' },
        ],
      },
    ],
    tips: [
      "French uses the PRESENT of venir where English uses 'have just' + past participle.",
      'In the imparfait it means had just: **je venais de partir** (I had just left).',
    ],
    practice: {
      kinds: ['conj', 'cloze', 'transform', 'tense-id', 'gtranslate'],
      tenses: ['passe_recent'],
      verbs: ['manger', 'arriver', 'partir', 'finir', 'sortir', 'acheter', 'se réveiller', 'appeler'],
    },
  },
];
