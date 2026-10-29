// Advanced lessons: the pronouns.
import type { Lesson } from '../../../lib/grammar/types';

export const AVANCE_PRONOMS: Lesson[] = [
  {
    id: 'relatifs-dont-ou',
    unit: 'pronoms',
    title: 'Dont, où, ce qui, ce que, ce dont',
    en: 'Relative pronouns: dont, où and ce qui / ce que / ce dont',
    level: 3,
    intro:
      "**Qui** and **que** only cover subjects and direct objects. For a complement with **de**, French uses **dont**; for a place or a moment, **où**; and when there is no noun to refer back to, it adds **ce**: **ce qui, ce que, ce dont**.",
    sections: [
      {
        heading: 'Qui ou que ?',
        body: "**Qui** is the subject of the relative clause, so its verb follows: **la collègue qui me remplace**. **Que** is the direct object, so a subject follows it: **la collègue que tu as rencontrée**. Que becomes **qu'** before a vowel; qui never does: **l'ami qui arrive**, **l'ami qu'on attend**.\nIn a compound tense, the past participle agrees with the noun que stands for: **les décisions qu'il a prises**.",
        examples: [
          { fr: 'Le stagiaire qui a préparé ce dossier est très efficace.', en: 'The intern who prepared this file is very efficient.' },
          { fr: "Le stagiaire que tu m'as présenté commence lundi.", en: 'The intern you introduced me to starts on Monday.' },
          { fr: 'Les mesures que le gouvernement a annoncées sont contestées.', en: 'The measures the government announced are being challenged.' },
        ],
      },
      {
        heading: 'Dont : un complément avec de',
        body: "**Dont** replaces **de + noun** after a verb, an adjective or a noun built with de: **parler de, avoir besoin de, se souvenir de, être fier de, avoir peur de, s'occuper de, se servir de, se plaindre de**. Rebuild the sentence to check: **je parle de ce film** → **le film dont je parle**.",
        table: {
          head: ['Construction', 'Exemple'],
          rows: [
            ['parler de', "le livre dont je t'ai parlé"],
            ['avoir besoin de', "l'outil dont j'ai besoin"],
            ['se souvenir de', 'une soirée dont je me souviens encore'],
            ['être fier de', 'le travail dont elle est fière'],
            ["s'occuper de", "les clients dont il s'occupe"],
          ],
        },
        examples: [
          { fr: "C'est une période dont je garde un excellent souvenir.", en: 'It was a time I have very fond memories of.' },
          { fr: 'Le quartier dont elle rêvait était hors de prix.', en: 'The neighbourhood she dreamed of was far too expensive.' },
        ],
      },
      {
        heading: 'Dont et la possession',
        body: "**Dont** also means **whose**: it stands for **de + the owner**. After dont, keep the normal order (subject, verb, object) and never add a possessive: **l'écrivain dont j'ai lu tous les romans**, not 'dont j'ai lu ses romans'.\nAfter a number or a group, dont means **including**: **dix blessés, dont deux graves**.",
        examples: [
          { fr: "C'est une entreprise dont le siège est à Lyon.", en: "It's a company whose head office is in Lyon." },
          { fr: "C'est un pays dont j'adore la cuisine.", en: "It's a country whose food I love." },
          { fr: "Le festival a attiré cinquante mille visiteurs, dont un tiers d'étrangers.", en: 'The festival drew fifty thousand visitors, a third of them from abroad.' },
        ],
      },
      {
        heading: 'Où : le lieu et le moment',
        body: "**Où** replaces a place (**la ville où nous vivons**), including a figurative one (**la situation où nous sommes**), and a moment: **le jour où, l'année où, au moment où, à l'époque où**. After a noun of time, never use quand: **le jour où je l'ai rencontrée**, not 'le jour quand'. **D'où** and **par où** add the idea of from and through.",
        examples: [
          { fr: "Je pense souvent à l'époque où nous vivions à Marseille.", en: 'I often think about the time when we lived in Marseille.' },
          { fr: "Il est arrivé au moment où on ne l'attendait plus.", en: "He turned up just when we'd stopped expecting him." },
          { fr: "C'est le village d'où vient toute sa famille.", en: "That's the village his whole family comes from." },
          { fr: 'Voilà le chemin par où nous sommes passés.', en: "That's the path we came along." },
        ],
      },
      {
        heading: 'Ce qui, ce que, ce dont',
        body: "When there is no noun before the relative, add **ce** (= the thing that, what): **ce qui** (subject), **ce que** (direct object), **ce dont** (de + …). **Tout ce qui / tout ce que** means everything that. **Ce qui** can also sum up a whole clause: **Il a démissionné, ce qui a surpris tout le monde.**",
        table: {
          head: ['Rôle', 'Relatif', 'Exemple'],
          rows: [
            ['sujet', 'ce qui', "Ce qui m'inquiète, c'est le calendrier."],
            ['objet direct', 'ce que', 'Je ne comprends pas ce que tu veux dire.'],
            ['de + …', 'ce dont', "Ce dont j'ai besoin, c'est de calme."],
          ],
        },
        examples: [
          { fr: 'Prends tout ce dont tu as besoin.', en: 'Take everything you need.' },
          { fr: 'Fais ce que tu veux, mais préviens-moi.', en: 'Do what you like, but let me know.' },
        ],
      },
    ],
    tips: [
      'To choose, rebuild the clause with the noun: je vois **le film** → le film **que** je vois; je parle **du film** → le film **dont** je parle; je vis **dans cette ville** → la ville **où** je vis.',
      "When a sentence is split with c'est, keep the de after **ce dont**: **Ce dont il a peur, c'est de l'échec.**",
    ],
    practice: { kinds: ['drill'], drills: ['relatifs-dont-ou'] },
  },
  {
    id: 'relatifs-composes',
    unit: 'pronoms',
    title: 'Lequel, auquel, duquel : les relatifs composés',
    en: 'Compound relatives: lequel, auquel, duquel',
    level: 4,
    intro:
      'After a preposition, French uses **lequel**, which agrees with the noun it replaces and merges with **à** and **de**: **la raison pour laquelle**, **le projet auquel je pense**, **le lac autour duquel nous avons marché**.',
    sections: [
      {
        heading: 'Préposition + lequel',
        body: "After **avec, pour, sans, sur, dans, par, sous, vers, parmi, entre**…, use the form of lequel that matches the noun in gender and number. For things, never qui: **l'outil avec lequel je travaille**, not 'avec qui'.",
        table: {
          head: ['', 'singulier', 'pluriel'],
          rows: [
            ['masculin', 'lequel', 'lesquels'],
            ['féminin', 'laquelle', 'lesquelles'],
          ],
        },
        examples: [
          { fr: "Je ne comprends pas la raison pour laquelle il s'énerve.", en: "I don't understand why he's getting so worked up." },
          { fr: 'Le dossier sur lequel elle travaille est confidentiel.', en: "The case she's working on is confidential." },
          { fr: 'Ce sont des valeurs sans lesquelles rien ne tient.', en: 'These are values without which nothing holds together.' },
        ],
      },
      {
        heading: 'À + lequel = auquel',
        body: "With à, lequel contracts like the article: **auquel, auxquels, auxquelles** (but **à laquelle**). Typical verbs: **penser à, s'intéresser à, participer à, assister à, faire allusion à, tenir à, répondre à, s'opposer à, faire face à**. **Grâce à** contracts too: **les dons grâce auxquels l'hôpital a été rénové**.",
        table: {
          head: ['', 'singulier', 'pluriel'],
          rows: [
            ['masculin', 'auquel', 'auxquels'],
            ['féminin', 'à laquelle', 'auxquelles'],
          ],
        },
        examples: [
          { fr: "Le colloque auquel j'ai assisté était passionnant.", en: 'The conference I attended was fascinating.' },
          { fr: 'La conclusion à laquelle ils sont arrivés me paraît hâtive.', en: 'The conclusion they reached seems hasty to me.' },
          { fr: 'Les difficultés auxquelles nous faisons face sont bien réelles.', en: "The difficulties we're facing are very real." },
        ],
      },
      {
        heading: 'De + lequel = duquel',
        body: "With de, the forms are **duquel, de laquelle, desquels, desquelles**. You need them after prepositions ending in de: **près de, à côté de, en face de, autour de, au cours de, à cause de, au sein de, à l'issue de**.\n**Dont is impossible here**: it only replaces a de that depends directly on a verb, a noun or an adjective, not one that belongs to a longer preposition. **Le lac autour duquel nous avons marché**, never 'le lac dont nous avons marché autour'.",
        examples: [
          { fr: "Le débat à l'issue duquel la loi a été adoptée a été houleux.", en: 'The debate at the end of which the law was passed was stormy.' },
          { fr: "Ce sont des pratiques à cause desquelles l'entreprise a été condamnée.", en: 'These are practices for which the company was convicted.' },
          { fr: 'La maison à côté de laquelle nous nous sommes garés est à vendre.', en: 'The house we parked next to is for sale.' },
        ],
      },
      {
        heading: 'Les personnes : qui ou lequel',
        body: "For people, **preposition + qui** is the usual choice, and lequel is just as correct: **l'amie avec qui (avec laquelle) je pars en vacances**, **le notaire à qui (auquel) j'ai écrit**, **le voisin à côté de qui (duquel) j'étais assis**.\nTwo exceptions: after **parmi** and **entre**, always lesquels / lesquelles, even for people: **les invités, parmi lesquels se trouvait le maire**.",
        examples: [
          { fr: "La personne à qui j'ai demandé conseil connaissait bien le dossier.", en: 'The person I asked for advice knew the case well.' },
          { fr: 'Les amis chez qui nous logeons habitent près du port.', en: "The friends we're staying with live near the harbour." },
          { fr: 'Les deux associés, entre lesquels la tension montait, ont fini par se séparer.', en: 'The two partners, between whom tension was rising, ended up parting ways.' },
        ],
      },
    ],
    tips: [
      'If de belongs to a longer preposition (près de, au cours de, à cause de), use **duquel / de laquelle**; dont only works when de depends directly on the verb, noun or adjective.',
      'No noun to refer back to? Use **quoi**: **ce à quoi je pense**, **ce sur quoi il insiste**, **c\'est ce pour quoi je me bats**.',
    ],
    practice: { kinds: ['drill'], drills: ['relatifs-composes'] },
  },
  {
    id: 'doubles-pronoms',
    unit: 'pronoms',
    title: 'Les doubles pronoms',
    en: 'Double object pronouns',
    level: 4,
    intro:
      'When a verb takes two object pronouns, they come in a fixed order: **Je te le prête. Je le lui ai dit. Il nous en a parlé.** The affirmative imperative has an order of its own: **Donne-le-moi.**',
    sections: [
      {
        heading: "L'ordre devant le verbe",
        body: 'Before the verb, the pronouns line up in five slots, from left to right. Two pronouns from the same slot never go together, and **me / te / se / nous / vous** never combine with **lui / leur**.',
        table: {
          head: ['1', '2', '3', '4', '5'],
          rows: [['me, te, se, nous, vous', 'le, la, les', 'lui, leur', 'y', 'en']],
        },
        examples: [
          { fr: "Ma sœur me l'a prêté pour le week-end.", en: 'My sister lent it to me for the weekend.' },
          { fr: 'Ce dossier ? Je le lui ai transmis hier.', en: 'That file? I passed it on to him yesterday.' },
          { fr: 'Ils nous en ont parlé au dernier moment.', en: 'They told us about it at the last minute.' },
          { fr: 'Mes amis étaient au café : je les y ai retrouvés vers midi.', en: 'My friends were at the café: I met them there around noon.' },
          { fr: 'Il y en a encore dans le frigo.', en: "There's still some in the fridge." },
        ],
      },
      {
        heading: 'Aux temps composés',
        body: 'The pronouns go before the auxiliary, and the past participle agrees with **le, la, les** placed before it, never with **en, lui, leur**: **Ces lettres ? Je les lui ai envoyées.** But **Des lettres ? Je lui en ai envoyé.**',
        examples: [
          { fr: "La clé ? Il me l'a rendue ce matin.", en: 'The key? He gave it back to me this morning.' },
          { fr: 'Les résultats, on nous les a annoncés hier soir.', en: 'We were told the results last night.' },
          { fr: 'Des cadeaux, ses grands-parents lui en ont offert plein.', en: 'Presents? His grandparents gave him loads.' },
        ],
      },
      {
        heading: "À l'impératif affirmatif",
        body: "In a positive command, the pronouns follow the verb with hyphens, direct object first: **Donne-le-moi. Envoie-la-leur. Rends-les-lui.** Moi and toi become **m'** and **t'** before en: **Donne-m'en. Va-t'en.** Lui / leur still come before en: **Parle-lui-en.**\nIn a negative command, the normal order comes back, with no hyphens: **Ne me le dis pas. Ne leur en parle pas.**",
        examples: [
          { fr: 'Ce document est urgent : envoyez-le-nous avant midi.', en: 'This document is urgent: send it to us before noon.' },
          { fr: "Il reste du café ? Sers-m'en une tasse, s'il te plaît.", en: 'Is there any coffee left? Pour me a cup, please.' },
          { fr: 'Ne le leur dites pas tout de suite.', en: "Don't tell them just yet." },
        ],
      },
      {
        heading: "Avec la négation et l'infinitif",
        body: '**Ne** goes before the whole block of pronouns and **pas** after the conjugated verb: **Je ne le lui ai pas dit.** With a verb + infinitive (aller, pouvoir, vouloir, devoir, falloir…), the pronouns go before the infinitive they belong to: **Je vais le leur annoncer. Tu peux me l\'envoyer ?**',
        examples: [
          { fr: 'Je ne la leur ai jamais présentée.', en: "I've never introduced her to them." },
          { fr: 'Il faudra le lui rappeler demain.', en: "We'll have to remind him of it tomorrow." },
          { fr: 'Vous pouvez nous en dire un peu plus ?', en: 'Can you tell us a bit more about it?' },
        ],
      },
    ],
    tips: [
      'Me, te, nous, vous come before le / la / les, but lui and leur come after: je **te le** dis / je **le lui** dis.',
      'In the imperative, the tu form of -er verbs (and va) only takes an s right before **en** or **y**: **parles-en**, **vas-y**, but **parle-lui-en**.',
      'Y and en together are rare outside **il y en a** (there is / there are some).',
    ],
    practice: { kinds: ['drill'], drills: ['doubles-pronoms'] },
  },
  {
    id: 'pronoms-y-en',
    unit: 'pronoms',
    title: 'Y et en : emplois avancés',
    en: 'Y and en: advanced uses',
    level: 4,
    intro:
      "**En** replaces a complement introduced by **de**, or the noun after a quantity; **y** replaces one introduced by **à**, or a place. For people, French usually keeps the preposition with a stressed pronoun: **je pense à elle**, **je me méfie de lui**.",
    sections: [
      {
        heading: 'En : de + chose, et les quantités',
        body: "En replaces **de + thing** after verbs and adjectives built with de (**se souvenir de, parler de, être sûr de, avoir besoin de, être capable de**), and the noun after a quantity. The number or quantity word stays after the verb: **J'en ai lu deux. Il en reste un peu.**",
        examples: [
          { fr: "Tu es sûre qu'il viendra ? — Oui, j'en suis sûre.", en: "Are you sure he'll come? — Yes, I'm sure of it." },
          { fr: 'Combien de candidats avez-vous reçus ? — Nous en avons reçu une dizaine.', en: 'How many candidates did you see? — We saw about ten.' },
          { fr: 'Son nouveau roman ? Elle en parle sans arrêt.', en: 'Her new novel? She talks about it all the time.' },
        ],
      },
      {
        heading: 'Y : à + chose, et les lieux',
        body: "Y replaces **à + thing** after verbs like **penser à, s'habituer à, tenir à, renoncer à, croire à, réfléchir à, prendre goût à**, and a place introduced by à, en, dans, chez, sur…",
        examples: [
          { fr: "Ses promesses ? Je n'y crois plus.", en: "His promises? I don't believe in them any more." },
          { fr: "Le télétravail ? J'y ai vite pris goût.", en: 'Working from home? I soon got a taste for it.' },
          { fr: "Ma grand-mère vit à Porto ; j'y vais chaque été.", en: 'My grandmother lives in Porto; I go there every summer.' },
        ],
      },
      {
        heading: "Les personnes : à lui, d'elle",
        body: "With most verbs built with à or de, a person is replaced not by y or en but by the preposition + a stressed pronoun (moi, toi, lui, elle, nous, vous, eux, elles): **penser à quelqu'un → penser à lui**, **se méfier de quelqu'un → se méfier d'elle**. In everyday speech, en is also heard for people (**Les enfants ? Je m'en occupe.**), but de + stressed pronoun is always safe.\nVerbs whose à introduces a plain indirect object (**parler à, dire à, téléphoner à, ressembler à, plaire à**) take **lui / leur**: **je lui parle**.",
        table: {
          head: ['Verbe', 'Une chose', 'Une personne'],
          rows: [
            ['penser à', "j'y pense", 'je pense à elle'],
            ["s'intéresser à", "je m'y intéresse", "je m'intéresse à lui"],
            ['se souvenir de', "je m'en souviens", 'je me souviens de lui'],
            ['parler de', 'on en parle', "on parle d'eux"],
            ['parler à', '—', 'je lui parle'],
          ],
        },
      },
      {
        heading: 'Expressions figées',
        body: "Many everyday expressions contain a y or an en that no longer replaces anything. Learn them as blocks.",
        table: {
          head: ['Expression', 'Sens', 'Exemple'],
          rows: [
            ["s'en aller", 'to leave', "Bon, je m'en vais, à demain !"],
            ['en vouloir à qqn', 'to hold it against sb', 'Elle en veut encore à son frère.'],
            ["s'y faire", 'to get used to it', "Le froid ? On finit par s'y faire."],
            ['y tenir', 'to be keen on it', 'Je viendrai, puisque tu y tiens.'],
            ['ne pas en revenir', "can't get over it", "Il a réussi du premier coup : je n'en reviens pas."],
            ["s'en sortir", 'to manage, to cope', "Ne t'inquiète pas, on va s'en sortir."],
            ['en avoir assez', 'to be fed up', "J'en ai assez de ses retards."],
            ['y être pour quelque chose', 'to have a hand in it', 'Elle y est pour beaucoup dans ce succès.'],
            ["s'en faire", 'to worry', "Ne t'en fais pas pour moi."],
            ["s'en tenir à", 'to stick to', "Je m'en tiens à ce qui a été décidé."],
          ],
        },
      },
    ],
    tips: [
      "The past participle never agrees with en: **Des erreurs ? J'en ai fait**, but **Ces erreurs, je les ai faites.**",
      "**Penser de** (an opinion) takes en: **Qu'est-ce que tu en penses ?** **Penser à** (to think about) takes y: **J'y pense.**",
      "With a quantity, the number stays at the end: **J'en ai acheté trois**, never 'j'ai acheté trois'.",
    ],
    practice: { kinds: ['drill'], drills: ['pronoms-y-en'] },
  },
];
