// Lessons 29–32: the conditionnel présent, si + imparfait, and the imperative.
import type { Lesson } from '../../../lib/grammar/types';

export const CONDITIONNEL_IMPERATIF: Lesson[] = [
  {
    id: 'conditionnel-present',
    unit: 'conditionnel',
    title: 'Le conditionnel présent',
    en: 'The present conditional (would)',
    level: 2,
    intro: 'The conditionnel means **would**. Use it to be polite, to talk about wishes and dreams, and to give advice.',
    sections: [
      {
        heading: 'Formation',
        body: "Take the **future stem** and add the **imparfait endings** **-ais, -ais, -ait, -ions, -iez, -aient**: parler → je parlerais; être → je serais; avoir → j'aurais; pouvoir → je pourrais.",
        table: {
          head: ['Pronoun', 'parler', 'être', 'pouvoir'],
          rows: [
            ["je / j'", 'parlerais', 'serais', 'pourrais'],
            ['tu', 'parlerais', 'serais', 'pourrais'],
            ['il / elle / on', 'parlerait', 'serait', 'pourrait'],
            ['nous', 'parlerions', 'serions', 'pourrions'],
            ['vous', 'parleriez', 'seriez', 'pourriez'],
            ['ils / elles', 'parleraient', 'seraient', 'pourraient'],
          ],
        },
      },
      {
        heading: 'La politesse',
        body: "The conditionnel makes requests softer: **je voudrais** (I would like) instead of je veux, **pourriez-vous** (could you) instead of pouvez-vous, **j'aimerais** (I'd like).",
        examples: [
          { fr: "Je voudrais un café, s'il vous plaît.", en: "I'd like a coffee, please." },
          { fr: "Pourriez-vous m'aider ?", en: 'Could you help me?' },
          { fr: 'Tu pourrais fermer la fenêtre ?', en: 'Could you close the window?' },
          { fr: 'Nous aimerions réserver une table.', en: "We'd like to book a table." },
        ],
      },
      {
        heading: 'Souhaits et conseils',
        body: "Dreams: **J'aimerais vivre au bord de la mer.** Advice with **devoir** (should) or **à ta place** (if I were you): **Tu devrais te reposer. À ta place, je partirais.**",
        examples: [
          { fr: "J'adorerais voir l'Islande.", en: "I'd love to see Iceland." },
          { fr: 'Tu devrais appeler le médecin.', en: 'You should call the doctor.' },
          { fr: 'À ta place, je dirais la vérité.', en: "If I were you, I'd tell the truth." },
          { fr: 'Ce serait génial !', en: 'That would be great!' },
        ],
      },
    ],
    tips: [
      "Future or conditional? **je parlerai** (I will speak) vs **je parlerais** (I would speak): the conditional ends in -s or -t and sounds 'è'.",
      '**Je voudrais** is the magic phrase for shops, cafés and restaurants.',
    ],
    practice: {
      kinds: ['conj', 'cloze', 'transform', 'tense-id', 'gtranslate', 'glisten'],
      tenses: ['conditionnel_present'],
      verbs: ['vouloir', 'pouvoir', 'aimer', 'devoir', 'être', 'avoir', 'aller', 'faire', 'préférer', 'adorer'],
    },
  },
  {
    id: 'si-imparfait',
    unit: 'conditionnel',
    title: 'Si + imparfait, conditionnel',
    en: 'If clauses: si + imperfect, conditional',
    level: 2,
    intro: "To imagine something that isn't true (or not yet), French uses **si + imparfait** for the condition and the **conditionnel** for the result.",
    sections: [
      {
        heading: 'La structure',
        body: "**Si** + imparfait, + conditionnel: **Si j'avais de l'argent, j'achèterais une maison.** (If I had money, I would buy a house.) The two halves can swap places: **J'achèterais une maison si j'avais de l'argent.**",
        examples: [
          { fr: "Si j'étais riche, je voyagerais.", en: "If I were rich, I'd travel." },
          { fr: 'Si tu venais, on serait contents.', en: "If you came, we'd be happy." },
          { fr: 'Si nous avions le temps, nous resterions.', en: "If we had time, we'd stay." },
          { fr: "Qu'est-ce que tu ferais si tu gagnais au loto ?", en: 'What would you do if you won the lottery?' },
        ],
      },
      {
        heading: 'Jamais de conditionnel après si',
        body: "Never put the conditional (or the future) straight after **si**: say **si j'avais**, not 'si j'aurais'. Si only shortens to **s'** before il and ils: **s'il faisait beau**.",
        examples: [
          { fr: "S'il faisait beau, on irait à la plage.", en: "If the weather were nice, we'd go to the beach." },
          { fr: 'Si elle parlait français, elle comprendrait.', en: "If she spoke French, she'd understand." },
        ],
      },
      {
        heading: 'Les trois types de si',
        body: "**Si + présent → futur**: a real possibility (S'il pleut, je prendrai un parapluie).\n**Si + imparfait → conditionnel présent**: imagined (S'il pleuvait, je prendrais un parapluie).\n**Si + plus-que-parfait → conditionnel passé**: imagined past, regrets (S'il avait plu, j'aurais pris un parapluie).",
        table: {
          head: ['Si…', 'Result', 'Meaning'],
          rows: [
            ['si + présent', 'futur', 'a real possibility'],
            ['si + imparfait', 'conditionnel présent', 'imagined, now or later'],
            ['si + plus-que-parfait', 'conditionnel passé', 'imagined past'],
          ],
        },
      },
    ],
    tips: [
      '**Si j\'étais toi…** (If I were you…) — even more French: **À ta place…**',
      '**Si on** + imparfait on its own is a suggestion: **Si on mangeait ?** (Shall we eat?)',
    ],
    practice: { kinds: ['cloze', 'tense-id', 'transform', 'gtranslate'], tenses: ['imparfait', 'conditionnel_present'] },
  },
  {
    id: 'imperatif',
    unit: 'imperatif',
    title: "L'impératif",
    en: 'The imperative',
    level: 1,
    intro: 'The imperative gives orders, advice and instructions: **Mange ! Venez ! Allons-y !** It has three forms and no subject pronoun.',
    sections: [
      {
        heading: 'Trois formes',
        body: 'Take the present tense of **tu, nous** and **vous** and drop the pronoun: **tu prends → Prends !**, **nous prenons → Prenons !** (Let\'s take), **vous prenez → Prenez !**\nFor **-er verbs** (and aller), the tu form loses its -s: **tu manges → Mange ! tu vas → Va !**',
        table: {
          head: ['', 'parler', 'finir', 'prendre', 'aller'],
          rows: [
            ['(tu)', 'parle', 'finis', 'prends', 'va'],
            ['(nous)', 'parlons', 'finissons', 'prenons', 'allons'],
            ['(vous)', 'parlez', 'finissez', 'prenez', 'allez'],
          ],
        },
        examples: [
          { fr: 'Ferme la porte !', en: 'Close the door!' },
          { fr: 'Finis ton assiette !', en: 'Finish your plate!' },
          { fr: 'Allons au parc !', en: "Let's go to the park!" },
          { fr: 'Prenez la deuxième rue à droite.', en: 'Take the second street on the right.' },
        ],
      },
      {
        heading: 'Quatre irréguliers',
        body: '**être**: sois, soyons, soyez. **avoir**: aie, ayons, ayez. **savoir**: sache, sachons, sachez. **vouloir**: veuillez (very polite: Veuillez patienter — please wait).',
        examples: [
          { fr: 'Sois sage !', en: 'Be good!' },
          { fr: "N'ayez pas peur !", en: "Don't be afraid!" },
          { fr: 'Soyons honnêtes.', en: "Let's be honest." },
          { fr: 'Veuillez vous asseoir.', en: 'Please take a seat.' },
        ],
      },
      {
        heading: 'Rester poli',
        body: "An imperative can sound bossy. Add **s'il te plaît / s'il vous plaît**, or ask a question instead: **Tu peux fermer la porte ?**",
        examples: [
          { fr: "Attends-moi, s'il te plaît !", en: 'Wait for me, please!' },
          { fr: 'Entrez, je vous en prie.', en: 'Do come in.' },
        ],
      },
    ],
    tips: [
      'Va keeps an s before y: **Vas-y !** (Go on!)',
      'Recipes and instructions often use the infinitive instead: Mélanger la farine et le sucre.',
    ],
    practice: {
      kinds: ['conj', 'cloze', 'gtranslate', 'glisten'],
      tenses: ['imperatif'],
      verbs: ['parler', 'manger', 'finir', 'prendre', 'aller', 'venir', 'faire', 'attendre', 'être', 'avoir', 'écouter', 'regarder'],
    },
  },
  {
    id: 'imperatif-pronominal',
    unit: 'imperatif',
    title: "L'impératif négatif et pronominal",
    en: 'Negative and reflexive imperatives',
    level: 2,
    intro: 'Telling someone **not** to do something is easy: wrap the verb in ne … pas. Reflexive verbs need a little more care: **Lève-toi !** but **Ne te lève pas !**',
    sections: [
      {
        heading: "Ne … pas à l'impératif",
        body: "Put **ne** before the verb and **pas** after it: **Ne touche pas ! Ne partez pas ! N'ayons pas peur.**",
        examples: [
          { fr: 'Ne mange pas trop vite !', en: "Don't eat too fast!" },
          { fr: 'Ne fumez pas ici.', en: "Don't smoke here." },
          { fr: "Ne t'inquiète pas !", en: "Don't worry!" },
          { fr: "N'oublie pas ton parapluie !", en: "Don't forget your umbrella!" },
        ],
      },
      {
        heading: 'Les verbes pronominaux',
        body: 'In the positive, the pronoun goes **after** the verb with a hyphen, and **te** becomes **toi**: **Lève-toi ! Levons-nous ! Levez-vous !** In the negative it goes back in front: **Ne te lève pas ! Ne nous levons pas ! Ne vous levez pas !**',
        table: {
          head: ['Positive', 'Negative'],
          rows: [
            ['Lève-toi !', 'Ne te lève pas !'],
            ['Dépêchons-nous !', 'Ne nous dépêchons pas !'],
            ['Asseyez-vous !', 'Ne vous asseyez pas !'],
            ['Amuse-toi bien !', "Ne t'amuse pas trop !"],
          ],
        },
      },
      {
        heading: "Avec d'autres pronoms",
        body: 'Object pronouns follow the same rule: **Regarde-moi !** but **Ne me regarde pas ! Fais-le !** but **Ne le fais pas !**',
        examples: [
          { fr: 'Écoute-moi !', en: 'Listen to me!' },
          { fr: 'Ne me dis pas ça !', en: "Don't tell me that!" },
          { fr: 'Appelle-la ce soir.', en: 'Call her tonight.' },
          { fr: "Ne l'oublie pas !", en: "Don't forget it!" },
        ],
      },
    ],
    tips: [
      'Me and te become **moi** and **toi** only after the verb: Assieds-toi ! Excuse-moi !',
      '**Calme-toi ! Tais-toi ! Dépêche-toi !** — three you will hear in every French family.',
    ],
    practice: {
      kinds: ['conj', 'negate', 'cloze', 'gtranslate'],
      tenses: ['imperatif'],
      verbs: ['se lever', 'se dépêcher', "s'asseoir", 'se coucher', 'se taire', "s'amuser", 'se reposer', 'se promener'],
      negations: ['pas', 'jamais'],
    },
  },
];
