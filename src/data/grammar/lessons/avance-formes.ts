// Advanced lessons: verb forms: passive, gerund, past infinitive, agreement.
import type { Lesson } from '../../../lib/grammar/types';

export const AVANCE_FORMES: Lesson[] = [
  {
    id: 'voix-passive',
    unit: 'formes',
    title: 'La voix passive',
    en: 'The passive voice',
    level: 3,
    intro: "The passive puts the person or thing that undergoes the action first: **Le pont a été construit en 1890.** It is built with **être** + past participle, and the participle agrees with the subject.",
    sections: [
      {
        heading: 'Être + participe passé',
        body: "**Être** carries the tense and the participle agrees with the subject like an adjective: **la loi est votée, la loi a été votée, la loi sera votée**. In compound tenses **été** itself never agrees: elles ont **été** invité**es**.",
        table: {
          head: ['Tense', 'Active', 'Passive'],
          rows: [
            ['présent', 'On construit la gare.', 'La gare est construite.'],
            ['passé composé', 'On a construit la gare.', 'La gare a été construite.'],
            ['imparfait', 'On construisait la gare.', 'La gare était construite.'],
            ['plus-que-parfait', 'On avait construit la gare.', 'La gare avait été construite.'],
            ['futur', 'On construira la gare.', 'La gare sera construite.'],
            ['subjonctif', "Il faut qu'on construise la gare.", 'Il faut que la gare soit construite.'],
          ],
        },
      },
      {
        heading: 'Par ou de ?',
        body: "The agent is normally introduced by **par**: **Le projet a été validé par la direction.** Verbs describing a state or a feeling take **de**: **couvert de neige, entouré d'arbres, rempli de touristes, composé de, accompagné de, aimé de tous, respecté de ses collègues**. After de, an indefinite article disappears: couvert **de** neige, entouré **d'**arbres.",
        examples: [
          { fr: 'Le contrat a été signé par les deux parties.', en: 'The contract was signed by both parties.' },
          { fr: 'Cette ministre est respectée de tous.', en: 'This minister is respected by everyone.' },
          { fr: 'Les sommets étaient couverts de neige.', en: 'The peaks were covered in snow.' },
          { fr: 'Le village est entouré de vignes.', en: 'The village is surrounded by vineyards.' },
        ],
      },
      {
        heading: 'Seulement avec un complément direct',
        body: "Only a verb with a **direct object** can become passive: on a volé ma voiture → **ma voiture a été volée**. With verbs built with à (demander à, dire à, proposer à, conseiller à), the person can't become the subject: English 'I was asked' is **on m'a demandé**, never 'j'ai été demandé'. Obéir and pardonner are the rare exceptions (vous serez pardonné).",
        examples: [
          { fr: "On m'a conseillé d'attendre.", en: 'I was advised to wait.' },
          { fr: 'On lui a proposé un poste à Lyon.', en: 'He was offered a job in Lyon.' },
          { fr: 'Ma voiture a été volée cette nuit.', en: 'My car was stolen last night.' },
        ],
      },
      {
        heading: 'Les autres tournures',
        body: "French uses the passive less than English. Three common alternatives: **on** (On a annulé le vol), **se faire + infinitive** for something that happens to someone (Il s'est fait voler son portefeuille), and the **pronominal passive** for habits, norms and general truths (Ce vin se boit frais. Ça ne se fait pas.).",
        examples: [
          { fr: 'On a reporté la réunion à jeudi.', en: 'The meeting has been postponed to Thursday.' },
          { fr: "Elle s'est fait licencier sans préavis.", en: 'She got fired without notice.' },
          { fr: 'Ce plat se mange froid.', en: 'This dish is eaten cold.' },
          { fr: 'Ce genre de remarque ne se fait pas en réunion.', en: "That kind of remark just isn't made in a meeting." },
        ],
      },
    ],
    tips: [
      "Don't mix up the passive with the passé composé of être verbs: **elle est partie** is active, **elle est invitée** is passive.",
      "In se faire + infinitive, **fait** never agrees: elle s'est **fait** voler son sac.",
    ],
    practice: { kinds: ['drill'], drills: ['voix-passive'] },
  },
  {
    id: 'gerondif-participe',
    unit: 'formes',
    title: 'Le gérondif et le participe présent',
    en: 'The gerund and the present participle',
    level: 3,
    intro: "Both are built on **-ant**. The gérondif (**en travaillant**) describes the circumstances of the main action; the participe présent (**travaillant**) belongs to written French and works like a relative clause or a cause.",
    sections: [
      {
        heading: 'La forme en -ant',
        body: "Take the **nous** form of the present, drop **-ons** and add **-ant**: nous finissons → **finissant**, nous prenons → **prenant**, nous faisons → **faisant**, nous mangeons → **mangeant**. Only three verbs are irregular: **ayant** (avoir), **étant** (être), **sachant** (savoir).",
      },
      {
        heading: 'Le gérondif : en + -ant',
        body: "The gérondif always has the **same subject** as the main verb. It expresses **simultaneity** (en sortant du bureau), **manner or means** (en tombant, en pratiquant) or a **condition** (en partant maintenant = si vous partez maintenant). **Tout en** + gérondif links two actions that contrast: Tout en reconnaissant ses qualités, je ne voterai pas pour lui.",
        examples: [
          { fr: "J'ai croisé Paul en sortant du bureau.", en: 'I ran into Paul as I was leaving the office.' },
          { fr: "Il s'est cassé le bras en tombant de vélo.", en: 'He broke his arm falling off his bike.' },
          { fr: "C'est en pratiquant qu'on progresse.", en: "It's by practising that you improve." },
          { fr: 'En partant maintenant, vous arriverez à l\'heure.', en: "If you leave now, you'll arrive on time." },
          { fr: "Elle a refusé l'offre, tout en remerciant le recruteur.", en: 'She turned down the offer, while thanking the recruiter.' },
        ],
      },
      {
        heading: 'Le participe présent',
        body: "Without en, the -ant form is mostly written. It can replace **qui** + verb (les candidats **ayant réussi** = qui ont réussi) or give a cause (**Étant malade**, il n'a pas pu venir). It **never agrees**. The compound form **ayant / étant + participle** marks an earlier action, and with étant the participle agrees: **Étant arrivée** en retard, elle a raté le début.",
        examples: [
          { fr: 'Les personnes sachant parler espagnol sont priées de se signaler.', en: 'Anyone who can speak Spanish is asked to come forward.' },
          { fr: "Étant malade, il n'a pas pu venir.", en: "Being ill, he couldn't come." },
          { fr: 'Ayant terminé son rapport, elle est rentrée chez elle.', en: 'Having finished her report, she went home.' },
        ],
      },
      {
        heading: 'Participe présent ou adjectif verbal ?',
        body: "Many -ant forms are also adjectives, and adjectives agree: **des résultats encourageants**. Some adjectives are spelled differently: the verb keeps **-quant / -guant**, the adjective has **-cant / -gant**, and a few adjectives end in **-ent**. Test: if an object or an adverb follows it (précédant **l'élection**), it's the participle.",
        table: {
          head: ['Participe présent (invariable)', 'Adjectif (agrees)'],
          rows: [
            ['fatiguant', 'fatigant(e)(s)'],
            ['convainquant', 'convaincant(e)(s)'],
            ['provoquant', 'provocant(e)(s)'],
            ['négligeant', 'négligent(e)(s)'],
            ['précédant', 'précédent(e)(s)'],
            ['différant', 'différent(e)(s)'],
          ],
        },
        examples: [
          { fr: 'Ce trajet quotidien est vraiment fatigant.', en: 'This daily commute is really tiring.' },
          { fr: 'Ses arguments étaient peu convaincants.', en: 'His arguments were hardly convincing.' },
          { fr: "Les jours précédant l'élection ont été tendus.", en: 'The days leading up to the election were tense.' },
          { fr: 'Nous avons des avis différents.', en: 'We have different opinions.' },
        ],
      },
    ],
    tips: [
      "The gérondif must share the main verb's subject: 'En entrant dans la salle, la lumière s'est éteinte' is a classic mistake (the light didn't walk in).",
      '**Sachant que** is very common in writing: Sachant qu\'il était pressé, je l\'ai laissé partir.',
    ],
    practice: { kinds: ['drill'], drills: ['gerondif-participe'] },
  },
  {
    id: 'infinitif-passe',
    unit: 'formes',
    title: "L'infinitif passé",
    en: 'The past infinitive',
    level: 4,
    intro: "The infinitif passé (**avoir fini, être parti**) expresses an action completed before another one. You need it after **après**, and after **sans** or **de** when the action is already done.",
    sections: [
      {
        heading: 'Formation',
        body: "**Avoir** or **être** in the infinitive + past participle, with the same auxiliary as in the passé composé. With être the participle agrees with the subject: après être **arrivée** (she), après être **partis** (they). Pronominal verbs keep a pronoun that matches the subject: après **m'être** levé(e), après **nous être** installés.",
        table: {
          head: ['Passé composé', 'Infinitif passé'],
          rows: [
            ["J'ai terminé.", 'avoir terminé'],
            ['Elle est rentrée.', 'être rentrée'],
            ['Ils se sont excusés.', "s'être excusés"],
            ['Nous nous sommes trompés.', 'nous être trompés'],
            ['Le pont a été construit.', 'avoir été construit'],
          ],
        },
      },
      {
        heading: 'Après, avant de, sans',
        body: "**Après** is followed by the **past** infinitive: **après avoir mangé** (après manger is only casual speech). **Avant de** normally takes the **present** infinitive: **avant de partir**. **Sans** + past infinitive means 'without having done'. All three need the same subject in both parts of the sentence.",
        examples: [
          { fr: "Après avoir lu le rapport, la directrice a convoqué l'équipe.", en: 'After reading the report, the director called in the team.' },
          { fr: 'Après être rentrés de vacances, ils ont déménagé.', en: 'After getting back from holiday, they moved house.' },
          { fr: 'Lisez attentivement les conditions avant de signer.', en: 'Read the terms carefully before signing.' },
          { fr: 'Elle est repartie sans avoir dit un mot.', en: 'She left without having said a word.' },
        ],
      },
      {
        heading: 'Regretter, remercier, être fier de…',
        body: "After verbs and adjectives followed by **de**, the past infinitive shows the action is finished: **Je regrette de vous avoir dérangé. Merci de m'avoir prévenue. Elle est fière d'avoir réussi.** Compare **Je suis content de partir** (now or soon) and **Je suis content d'être parti** (it's done). Negation goes in front of both words: **de ne pas avoir appelé** (formal: de n'avoir pas appelé).",
        examples: [
          { fr: 'Je vous remercie d\'avoir participé à notre enquête.', en: 'Thank you for taking part in our survey.' },
          { fr: "Je regrette d'avoir été si dur avec toi.", en: "I'm sorry I was so harsh with you." },
          { fr: "Il regrette de ne pas avoir accepté cette offre.", en: 'He regrets not accepting that offer.' },
          { fr: "Elle a été licenciée pour avoir divulgué des documents.", en: 'She was fired for leaking documents.' },
        ],
      },
    ],
    tips: [
      "**Pour** + past infinitive gives the reason for something past: Il a été condamné **pour avoir menti**.",
      "With être and pronominal verbs, check the subject before writing the participle: après s'être **levée** (Claire), après s'être **levés** (Paul et Claire).",
    ],
    practice: { kinds: ['drill'], drills: ['infinitif-passe'] },
  },
  {
    id: 'accord-pp-avance',
    unit: 'formes',
    title: "L'accord du participe passé : cas difficiles",
    en: 'Past participle agreement: the tricky cases',
    level: 4,
    intro: "With **avoir**, the participle agrees only with a direct object placed **before** it. Pronominal verbs follow the same logic, which explains **elle s'est lavée** but **elle s'est lavé les mains**.",
    sections: [
      {
        heading: 'Avoir : le COD placé avant',
        body: "No agreement when the direct object comes after the verb: **J'ai écrit une lettre.** Agreement when it comes before, which happens with **que**, an object pronoun (**le, la, l', les, me, te, nous, vous**) or **quel(le)s… / combien de…** in questions.",
        examples: [
          { fr: "La lettre que j'ai écrite est restée sans réponse.", en: 'The letter I wrote went unanswered.' },
          { fr: 'Tes photos ? Je les ai vues hier.', en: 'Your photos? I saw them yesterday.' },
          { fr: 'Quelles erreurs as-tu faites ?', en: 'What mistakes did you make?' },
          { fr: "Cette maison, ils l'ont vendue à perte.", en: 'They sold that house at a loss.' },
        ],
      },
      {
        heading: "Pas d'accord : COI, en, il impersonnel",
        body: "An indirect object never counts (**lui, leur**, or **me, te, nous, vous** meaning 'to me, to you…'): **Je leur ai parlé. Elle nous a téléphoné.** In standard usage **en** doesn't trigger agreement either: **Des erreurs, j'en ai fait.** Nor does the impersonal **il**: **les chaleurs qu'il a fait**.",
        examples: [
          { fr: 'Elle nous a téléphoné dès son arrivée.', en: 'She phoned us as soon as she arrived.' },
          { fr: 'La pièce ne leur a pas plu.', en: "They didn't like the play." },
          { fr: "Tu te souviens des chaleurs qu'il a fait l'été dernier ?", en: 'Do you remember the heatwave last summer?' },
        ],
      },
      {
        heading: 'Les verbes pronominaux',
        body: "Ask what **se** stands for. If se is the **direct object**, agree: **elle s'est lavée**. If the direct object comes after, don't: **elle s'est lavé les mains**. If se is **indirect** (parler à, téléphoner à, plaire à, succéder à, écrire à), never agree: **ils se sont parlé, elles se sont succédé**. **Se rendre compte** is fixed: **elle s'est rendu compte**. Verbs that only exist as pronominals agree with the subject: **elle s'est souvenue, elles se sont moquées de lui**.",
        table: {
          head: ['Sentence', 'What se is', 'Agreement'],
          rows: [
            ["Elle s'est coupée.", 'direct object', 'yes'],
            ["Elle s'est coupé le doigt.", 'indirect (le doigt is the object)', 'no'],
            ['Ils se sont rencontrés.', 'direct object (rencontrer qqn)', 'yes'],
            ['Ils se sont écrit.', 'indirect (écrire à qqn)', 'no'],
            ["Elle s'est rendu compte.", 'fixed expression', 'no'],
            ['Elles se sont souvenues.', 'pronominal-only verb', 'yes, with the subject'],
          ],
        },
      },
      {
        heading: 'Fait + infinitif',
        body: "**Fait** followed by an infinitive never agrees, with avoir or être: **Elle s'est fait couper les cheveux. La police les a fait évacuer.** Since the 1990 spelling reform, **laissé** + infinitive is invariable too (elle s'est laissé convaincre), though you will still see laissée in older texts.",
        examples: [
          { fr: "Elle s'est fait couper les cheveux très court.", en: 'She had her hair cut very short.' },
          { fr: 'Nous nous sommes fait rembourser nos billets.', en: 'We got our tickets refunded.' },
        ],
      },
    ],
    tips: [
      "For pronominal verbs, rebuild the sentence with avoir: elle a lavé **qui** ? elle-même → lavée; ils ont parlé **à qui** ? → parlé.",
      'Agreement is often silent but sometimes audible: la lettre que j\'ai écri**te**, les décisions qu\'elle a pri**ses**. Read it aloud to check.',
    ],
    practice: { kinds: ['drill'], drills: ['accord-pp-avance'] },
  },
];
