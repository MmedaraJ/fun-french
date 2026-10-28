// Lessons 20–24: the passé composé (avoir, être, agreement, reflexives, negatives and questions).
import type { Lesson } from '../../../lib/grammar/types';

export const PASSE_COMPOSE: Lesson[] = [
  {
    id: 'pc-avoir',
    unit: 'passe',
    title: 'Le passé composé avec avoir',
    en: 'The passé composé with avoir',
    level: 1,
    intro: 'The passé composé tells what happened: finished actions in the past. Most verbs build it with **avoir** in the present + a **past participle**.',
    sections: [
      {
        heading: 'Avoir + participe passé',
        body: '**J\'ai mangé** = I ate / I have eaten. Conjugate avoir in the present, then add the past participle of the verb.',
        table: {
          head: ['Pronoun', 'avoir', 'participle'],
          rows: [
            ["j'", 'ai', 'mangé'],
            ['tu', 'as', 'fini'],
            ['il / elle / on', 'a', 'attendu'],
            ['nous', 'avons', 'pris'],
            ['vous', 'avez', 'fait'],
            ['ils / elles', 'ont', 'vu'],
          ],
        },
        examples: [
          { fr: "J'ai mangé une pizza.", en: 'I ate a pizza.' },
          { fr: 'Tu as fini ton travail ?', en: 'Have you finished your work?' },
          { fr: 'Nous avons attendu le bus.', en: 'We waited for the bus.' },
          { fr: 'Ils ont regardé un film.', en: 'They watched a film.' },
        ],
      },
      {
        heading: 'Les participes réguliers',
        body: '**-er → -é**: parler → parlé, manger → mangé.\n**-ir → -i**: finir → fini, choisir → choisi (also dormir → dormi, partir → parti).\n**-re → -u**: attendre → attendu, vendre → vendu, répondre → répondu.',
        table: {
          head: ['Infinitive', 'Participle', 'Example'],
          rows: [
            ['parler', 'parlé', "J'ai parlé à Paul."],
            ['finir', 'fini', 'Elle a fini.'],
            ['attendre', 'attendu', 'Nous avons attendu.'],
          ],
        },
      },
      {
        heading: 'Les participes irréguliers',
        body: "Learn these by heart — they belong to the verbs you'll use most!",
        table: {
          head: ['Infinitive', 'Participle', 'Infinitive', 'Participle'],
          rows: [
            ['avoir', 'eu', 'être', 'été'],
            ['faire', 'fait', 'dire', 'dit'],
            ['prendre', 'pris', 'mettre', 'mis'],
            ['voir', 'vu', 'boire', 'bu'],
            ['lire', 'lu', 'pouvoir', 'pu'],
            ['vouloir', 'voulu', 'devoir', 'dû'],
            ['savoir', 'su', 'connaître', 'connu'],
            ['écrire', 'écrit', 'ouvrir', 'ouvert'],
            ['recevoir', 'reçu', 'vivre', 'vécu'],
          ],
        },
        examples: [
          { fr: "J'ai fait les courses.", en: 'I did the shopping.' },
          { fr: 'Elle a pris le train.', en: 'She took the train.' },
          { fr: 'Tu as vu ce film ?', en: 'Have you seen this film?' },
          { fr: 'Nous avons eu de la chance.', en: 'We were lucky.' },
        ],
      },
    ],
    tips: [
      "One French tense, three English ones: **j'ai mangé** = I ate, I have eaten, I did eat.",
      "Short adverbs go between avoir and the participle: **j'ai bien dormi**, **il a déjà mangé**, **nous avons beaucoup ri**.",
    ],
    practice: {
      kinds: ['conj', 'cloze', 'transform', 'tense-id', 'gtranslate', 'glisten'],
      tenses: ['passe_compose'],
      verbs: ['parler', 'manger', 'finir', 'choisir', 'attendre', 'vendre', 'faire', 'prendre', 'voir', 'boire', 'lire', 'écrire', 'mettre', 'avoir', 'être'],
    },
  },
  {
    id: 'pc-etre',
    unit: 'passe',
    title: 'Le passé composé avec être',
    en: 'The passé composé with être',
    level: 1,
    intro: 'About twenty verbs — mostly verbs of movement — and all reflexive verbs use **être** instead of avoir. Their participle agrees with the subject, like an adjective.',
    sections: [
      {
        heading: "Les verbes de la maison d'être",
        body: 'Picture a house: you **arrive** (arriver), **go in** (entrer), **go up** (monter), **stay** (rester), **go down** (descendre), **fall** (tomber), **go out** (sortir), **leave** (partir), **go** (aller), **come** (venir), **come back** (revenir, retourner, rentrer)… and at either end of life, **naître** (be born) and **mourir** (die).',
        table: {
          head: ['Infinitive', 'Participle', 'Infinitive', 'Participle'],
          rows: [
            ['aller', 'allé', 'venir', 'venu'],
            ['arriver', 'arrivé', 'partir', 'parti'],
            ['entrer', 'entré', 'sortir', 'sorti'],
            ['monter', 'monté', 'descendre', 'descendu'],
            ['rester', 'resté', 'tomber', 'tombé'],
            ['rentrer', 'rentré', 'retourner', 'retourné'],
            ['revenir', 'revenu', 'devenir', 'devenu'],
            ['naître', 'né', 'mourir', 'mort'],
          ],
        },
      },
      {
        heading: "L'accord avec le sujet",
        body: 'With être, the participle agrees with the subject: add **-e** for a feminine subject and **-s** for a plural one.',
        table: {
          head: ['Pronoun', 'aller'],
          rows: [
            ['je', 'suis allé(e)'],
            ['tu', 'es allé(e)'],
            ['il / elle', 'est allé / allée'],
            ['nous', 'sommes allé(e)s'],
            ['vous', 'êtes allé(e)(s)'],
            ['ils / elles', 'sont allés / allées'],
          ],
        },
        examples: [
          { fr: 'Je suis arrivée à huit heures.', en: 'I arrived at eight. (a woman speaking)' },
          { fr: 'Il est parti hier.', en: 'He left yesterday.' },
          { fr: 'Nous sommes allés au cinéma.', en: 'We went to the cinema.' },
          { fr: 'Elles sont restées à la maison.', en: 'They stayed at home.' },
        ],
      },
      {
        heading: 'Avec un complément d\'objet : avoir',
        body: "Monter, descendre, sortir, rentrer, retourner and passer take **avoir** when they have a direct object: **Je suis sorti** (I went out) but **J'ai sorti la poubelle** (I took the bin out).",
        examples: [
          { fr: 'Elle est montée au grenier.', en: 'She went up to the attic.' },
          { fr: 'Elle a monté les valises.', en: 'She carried the suitcases up.' },
          { fr: 'Nous sommes rentrés tard.', en: 'We got home late.' },
          { fr: 'Nous avons rentré le linge.', en: 'We brought the washing in.' },
        ],
      },
    ],
    tips: [
      'Memory trick: **DR & MRS VANDERTRAMP** — Devenir, Revenir, Monter, Rester, Sortir, Venir, Aller, Naître, Descendre, Entrer, Rentrer, Tomber, Retourner, Arriver, Mourir, Partir.',
      'The agreement is usually silent (allé, allée, allés sound the same) but you see it in writing — and you hear it in **mort / morte**.',
    ],
    practice: {
      kinds: ['conj', 'cloze', 'transform', 'gtranslate', 'glisten'],
      tenses: ['passe_compose'],
      verbs: ['aller', 'venir', 'arriver', 'partir', 'entrer', 'sortir', 'monter', 'descendre', 'rester', 'tomber', 'rentrer', 'naître'],
    },
  },
  {
    id: 'pc-accord',
    unit: 'passe',
    title: "L'accord du participe passé",
    en: 'Past participle agreement',
    level: 2,
    intro: 'When does the past participle take -e or -s? Three rules cover almost every case.',
    sections: [
      {
        heading: 'Avec être : accord avec le sujet',
        body: '**Elle est partie. Ils sont arrivés. Nous (Marie et moi) sommes sorties.** Treat the participle like an adjective after être.',
        examples: [
          { fr: 'Ma sœur est née en mai.', en: 'My sister was born in May.' },
          { fr: 'Les invités sont arrivés.', en: 'The guests have arrived.' },
          { fr: 'Vous êtes restées longtemps ?', en: 'Did you stay long? (to several women)' },
        ],
      },
      {
        heading: "Avec avoir : pas d'accord avec le sujet",
        body: 'With avoir, the participle normally **does not agree**: **Elle a mangé. Ils ont fini.** Even with a feminine or plural subject it stays -é, -i, -u.',
        examples: [
          { fr: 'Elle a mangé une pomme.', en: 'She ate an apple.' },
          { fr: 'Les enfants ont dormi.', en: 'The children slept.' },
          { fr: 'Nous avons acheté des fleurs.', en: 'We bought some flowers.' },
        ],
      },
      {
        heading: 'Le complément placé avant',
        body: "Exception: with avoir, the participle agrees with a **direct object placed before it** — usually a pronoun (la, les) or **que**: **Les clés ? Je les ai mises sur la table. La robe que j'ai achetée. Quelles chaussures as-tu choisies ?**",
        examples: [
          { fr: "Cette chanson, je l'ai entendue à la radio.", en: 'That song, I heard it on the radio.' },
          { fr: 'Les photos que tu as prises sont belles.', en: 'The photos you took are lovely.' },
          { fr: 'Quels pays avez-vous visités ?', en: 'Which countries have you visited?' },
        ],
      },
    ],
    tips: [
      'You can hear the agreement when the participle ends in a consonant: mis / mise, pris / prise, fait / faite, écrit / écrite.',
      'Quick check: être? Agree with the subject. Avoir? Only agree with a direct object that comes before.',
    ],
    practice: {
      kinds: ['conj', 'cloze', 'gtranslate'],
      tenses: ['passe_compose', 'plus_que_parfait'],
      verbs: ['aller', 'partir', 'arriver', 'naître', 'sortir', 'tomber', 'venir', 'rester'],
    },
  },
  {
    id: 'pc-pronominaux',
    unit: 'passe',
    title: 'Le passé composé des verbes pronominaux',
    en: 'Reflexive verbs in the passé composé',
    level: 2,
    intro: 'All reflexive verbs use **être** in the passé composé: **je me suis levé(e)**. The pronoun stays in front of the auxiliary.',
    sections: [
      {
        heading: 'Pronom + être + participe',
        body: "Keep the reflexive pronoun, then **être**, then the participle: **je me suis levé, tu t'es lavé, elle s'est habillée**. The participle usually agrees with the subject.",
        table: {
          head: ['Pronoun', 'se lever'],
          rows: [
            ['je', 'me suis levé(e)'],
            ['tu', "t'es levé(e)"],
            ['il / elle', "s'est levé / levée"],
            ['nous', 'nous sommes levé(e)s'],
            ['vous', 'vous êtes levé(e)(s)'],
            ['ils / elles', 'se sont levés / levées'],
          ],
        },
        examples: [
          { fr: 'Je me suis réveillée tôt.', en: 'I woke up early.' },
          { fr: "Il s'est rasé.", en: 'He shaved.' },
          { fr: 'Nous nous sommes bien amusés.', en: 'We had a great time.' },
          { fr: 'Elles se sont promenées au bord de la mer.', en: 'They went for a walk by the sea.' },
        ],
      },
      {
        heading: 'Négation et questions',
        body: '**Ne** goes before the pronoun and **pas** after the auxiliary: **Je ne me suis pas levé.** In inversion the pronoun stays in front (**T\'es-tu levé tôt ?**), but est-ce que is far more common: **Est-ce que tu t\'es levé tôt ?**',
        examples: [
          { fr: "Elle ne s'est pas maquillée.", en: "She didn't put on any make-up." },
          { fr: 'Vous vous êtes perdus ?', en: 'Did you get lost?' },
          { fr: 'À quelle heure vous êtes-vous couchés ?', en: 'What time did you go to bed?' },
        ],
      },
      {
        heading: "Pas d'accord avec une partie du corps",
        body: "When the verb has a direct object after it (often a body part), the participle does **not** agree: **Elle s'est lavée** (she washed) but **Elle s'est lavé les mains** (she washed her hands).",
        examples: [
          { fr: "Elle s'est brossé les dents.", en: 'She brushed her teeth.' },
          { fr: 'Ils se sont lavé les mains.', en: 'They washed their hands.' },
        ],
      },
    ],
    tips: [
      'In the futur proche the pronoun goes with the infinitive (**je vais me lever**); in the passé composé it goes before être (**je me suis levé**).',
      '**Se souvenir de**: je me suis souvenu de son nom (I remembered his name).',
    ],
    practice: {
      kinds: ['conj', 'cloze', 'negate', 'gtranslate'],
      tenses: ['passe_compose'],
      verbs: ['se lever', 'se coucher', 'se réveiller', "s'habiller", 'se laver', 'se promener', "s'amuser", 'se perdre', 'se tromper', 'se dépêcher'],
      negations: ['pas'],
    },
  },
  {
    id: 'pc-negation-questions',
    unit: 'passe',
    title: 'Négation et questions au passé composé',
    en: 'Negatives and questions in the passé composé',
    level: 2,
    intro: 'In compound tenses, the negative and the inversion work on the **auxiliary**, not on the participle.',
    sections: [
      {
        heading: 'La négation',
        body: "**Ne … pas** wraps around the auxiliary: **Je n'ai pas mangé. Elle n'est pas venue.** Jamais, plus and rien go in the same place: **Je n'ai jamais vu la mer. Il n'a rien dit.** Personne goes after the participle: **Je n'ai vu personne.**",
        examples: [
          { fr: "Je n'ai pas compris.", en: "I didn't understand." },
          { fr: 'Nous ne sommes jamais allés en Chine.', en: "We've never been to China." },
          { fr: "Il n'a rien acheté.", en: "He didn't buy anything." },
          { fr: "Tu n'as appelé personne ?", en: "Didn't you call anyone?" },
        ],
      },
      {
        heading: 'Les questions',
        body: 'Intonation and est-ce que are easy: **Tu as fini ? Est-ce que tu as fini ?** For inversion, swap the auxiliary and the pronoun: **As-tu fini ? Où êtes-vous allés ?** Add -t- after a: **A-t-il fini ?**',
        examples: [
          { fr: 'As-tu bien dormi ?', en: 'Did you sleep well?' },
          { fr: "Qu'avez-vous mangé ?", en: 'What did you eat?' },
          { fr: 'Quand est-elle partie ?', en: 'When did she leave?' },
          { fr: 'A-t-il appelé ?', en: 'Did he call?' },
        ],
      },
      {
        heading: 'Les deux ensemble',
        body: "In a negative inversion, ne … pas surround the whole auxiliary + pronoun block: **N'as-tu pas faim ? Pourquoi n'est-il pas venu ?**",
        examples: [
          { fr: "Pourquoi n'as-tu pas répondu ?", en: "Why didn't you answer?" },
          { fr: "N'avez-vous rien vu ?", en: "Didn't you see anything?" },
        ],
      },
    ],
    tips: [
      "Adverbs follow the same rule as pas: **je n'ai pas encore mangé**, **j'ai déjà mangé**.",
      'Est-ce que is the safest question form in the passé composé: **Est-ce que vous avez réservé ?**',
    ],
    practice: {
      kinds: ['negate', 'qform', 'transform', 'gtranslate', 'glisten'],
      tenses: ['passe_compose'],
      negations: ['pas', 'jamais', 'plus', 'rien', 'personne'],
      qforms: ['intonation', 'est-ce-que', 'inversion'],
    },
  },
];
