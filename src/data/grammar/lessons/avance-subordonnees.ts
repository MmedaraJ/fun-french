// Advanced lessons: subordinate clauses: mood and si.
import type { Lesson } from '../../../lib/grammar/types';

export const AVANCE_SUBORDONNEES: Lesson[] = [
  {
    id: 'subjonctif-conjonctions',
    unit: 'subordonnees',
    title: 'Les conjonctions : subjonctif ou indicatif ?',
    en: 'Conjunctions: subjunctive or indicative?',
    level: 4,
    intro:
      'Some conjunctions always take the subjunctive (**bien que, pour que, avant que**…), others always take the indicative (**parce que, alors que, après que**…). Purpose, concession, condition and anything that has not happened yet point to the subjunctive.',
    sections: [
      {
        heading: 'Toujours + subjonctif',
        body: 'Learn these as a list: they take the subjunctive whatever the context.',
        table: {
          head: ['Conjonction', 'Sens', 'Exemple'],
          rows: [
            ['pour que, afin que', 'so that', "Je parle lentement pour qu'il me comprenne."],
            ['bien que, quoique', 'although', "Bien qu'il soit tard, elle travaille encore."],
            ['avant que', 'before', 'Partons avant que la nuit tombe.'],
            ['à moins que', 'unless', "Je viendrai, à moins qu'il y ait une grève."],
            ['sans que', 'without', "Il est entré sans que je l'entende."],
            ["jusqu'à ce que", 'until', "Attends ici jusqu'à ce que je revienne."],
            ['pourvu que', "provided that, let's hope", "Pourvu qu'il fasse beau demain !"],
            ['de peur que, de crainte que', 'for fear that', "Il se tait de peur qu'on le juge."],
            ['à condition que', 'on condition that', 'Je te prête ma voiture, à condition que tu fasses le plein.'],
            ['en attendant que', 'until, while waiting for', "Asseyez-vous en attendant qu'on vous appelle."],
          ],
        },
      },
      {
        heading: 'Le ne explétif',
        body: "After **avant que, à moins que, de peur que** and **de crainte que**, formal French often adds a **ne** with no negative meaning: **Partons avant qu'il ne pleuve** means exactly the same as **avant qu'il pleuve**. It's optional. A real negation still needs pas: **de peur qu'il ne se fâche** (for fear he'll get angry), **de peur qu'il ne vienne pas** (for fear he won't come).",
        examples: [
          { fr: "Préviens-la avant qu'elle ne parte.", en: 'Let her know before she leaves.' },
          { fr: "Nous signerons demain, à moins que le client ne change d'avis.", en: 'We will sign tomorrow, unless the client changes his mind.' },
          { fr: "Elle a gardé le secret de peur qu'on ne se moque d'elle.", en: 'She kept it secret for fear people would laugh at her.' },
        ],
      },
      {
        heading: 'Toujours + indicatif',
        body: "Cause, time and contrast take the indicative: **parce que, puisque, comme, pendant que, alors que, tandis que, dès que, depuis que, une fois que, maintenant que, si bien que, même si**.\nWatch out for **après que**: it takes the indicative, because the action really happened. **Après qu'il est parti**, not 'après qu'il soit parti'. When the action is still to come, use the future (or the futur antérieur): **Dès que tu auras fini, appelle-moi.**",
        examples: [
          { fr: 'On a dîné après que les enfants se sont couchés.', en: 'We had dinner after the children had gone to bed.' },
          { fr: "Il pleut à Brest alors qu'il fait trente degrés à Nice.", en: "It's raining in Brest while it's thirty degrees in Nice." },
          { fr: "Même s'il pleut, le concert aura lieu.", en: 'Even if it rains, the concert will go ahead.' },
          { fr: "Depuis qu'il a changé de poste, il est beaucoup plus serein.", en: 'Since he changed jobs, he has been much calmer.' },
        ],
      },
      {
        heading: 'Même sujet : préposition + infinitif',
        body: "When both clauses have the same subject, most of these conjunctions give way to a preposition + infinitive: **pour, afin de, avant de, sans, à moins de, de peur de, à condition de**. **Je t'appelle avant de partir**, not 'avant que je parte'. **Bien que** has no such equivalent: **Bien qu'elle soit fatiguée, elle continue.**",
        examples: [
          { fr: 'Il a économisé pendant deux ans pour acheter un appartement.', en: 'He saved for two years to buy a flat.' },
          { fr: 'Elle est partie sans prévenir personne.', en: 'She left without telling anyone.' },
          { fr: 'Relis ton contrat avant de le signer.', en: 'Read your contract again before you sign it.' },
        ],
      },
    ],
    tips: [
      "**Avant que** + subjonctif, **après que** + indicatif: avant qu'il (ne) parte, après qu'il est parti.",
      "**Même si** takes the indicative, **bien que** the subjunctive: même s'il pleut, bien qu'il pleuve.",
      "After **dès que, quand, une fois que**, an action still to come goes in the future: Dès qu'il arrivera, on passera à table.",
    ],
    practice: { kinds: ['drill'], drills: ['subjonctif-conjonctions'] },
  },
  {
    id: 'subjonctif-ou-indicatif',
    unit: 'subordonnees',
    title: 'Subjonctif ou indicatif ?',
    en: 'Subjunctive or indicative?',
    level: 4,
    intro:
      "The indicative presents a fact as real or likely; the subjunctive presents it through a wish, a feeling, a doubt or a mere possibility. The same verb can switch: **je pense qu'il a raison**, but **je ne pense pas qu'il ait raison**.",
    sections: [
      {
        heading: 'Penser, croire, trouver',
        body: 'Affirmative verbs of opinion and certainty take the indicative: **je pense, je crois, je trouve, je suis sûr(e), il me semble que** + indicatif. Negated, or turned into a question with inversion, they express doubt and usually take the subjunctive: **je ne pense pas que, je ne crois pas que, pensez-vous que** + subjonctif.',
        examples: [
          { fr: 'Je crois que ce restaurant est fermé le lundi.', en: 'I think this restaurant is closed on Mondays.' },
          { fr: 'Je ne crois pas que le projet soit viable.', en: "I don't think the project is viable." },
          { fr: "Pensez-vous que la situation puisse s'améliorer ?", en: 'Do you think the situation can improve?' },
          { fr: "Il me semble qu'on s'est déjà rencontrés.", en: 'I think we have met before.' },
        ],
      },
      {
        heading: 'Probable ou possible ?',
        body: "**Il est probable que, il est certain que, il est évident que, il est clair que** + indicatif: the speaker leans towards reality. **Il est possible que, il se peut que, il est peu probable que, il n'est pas certain que** + subjonctif: it's only a possibility.\n**Il semble que** usually takes the subjunctive, while **il me semble que** takes the indicative.",
        examples: [
          { fr: 'Il est probable que les prix augmenteront encore.', en: 'Prices will probably go up again.' },
          { fr: 'Il se peut que je sois en retard ce soir.', en: 'I may be late this evening.' },
          { fr: "Il est peu probable qu'il obtienne la majorité.", en: "It's unlikely he'll win a majority." },
          { fr: 'Il semble que le suspect ait quitté le pays.', en: 'It seems the suspect has left the country.' },
        ],
      },
      {
        heading: 'Volonté, sentiment, attente',
        body: "Wishes, demands, feelings and expectations take the subjunctive: **vouloir, souhaiter, exiger, tenir à ce que, s'attendre à ce que, craindre, avoir peur, regretter, être content, s'étonner**. **Le fait que** is usually followed by the subjunctive too.\nThe classic trap: **espérer** takes the indicative. **J'espère qu'elle viendra**, but **je souhaite qu'elle vienne**.",
        examples: [
          { fr: 'Je souhaite que vous trouviez rapidement un accord.', en: 'I hope you reach an agreement quickly.' },
          { fr: "On ne s'attendait pas à ce qu'il démissionne.", en: 'Nobody expected him to resign.' },
          { fr: "Je regrette qu'elle n'ait pas pu venir.", en: "I'm sorry she couldn't come." },
          { fr: "Le fait qu'il ait menti ne m'étonne pas.", en: "The fact that he lied doesn't surprise me." },
          { fr: "J'espère que tu as passé une bonne soirée.", en: 'I hope you had a nice evening.' },
        ],
      },
      {
        heading: 'Superlatifs et antécédents incertains',
        body: "After **le seul, l'unique, le premier, le dernier, le meilleur** and other superlatives, the relative clause is usually in the subjunctive, which adds a note of personal judgement: **C'est le meilleur film que j'aie vu cette année.** The indicative remains possible for a plain fact.\nThe subjunctive also appears when the person or thing may not exist: **Je cherche quelqu'un qui sache coder** (I don't know if there is such a person), but **je connais quelqu'un qui sait coder** (I know one). The same goes after a negative: **Il n'y a personne qui puisse m'aider.**",
        examples: [
          { fr: "C'est la seule solution qui soit vraiment satisfaisante.", en: "It's the only truly satisfactory solution." },
          { fr: 'Nous cherchons un appartement qui ait trois chambres.', en: "We're looking for a flat with three bedrooms." },
          { fr: 'Je ne connais personne qui puisse te remplacer.', en: "I don't know anyone who could replace you." },
        ],
      },
    ],
    tips: [
      "**Espérer** takes the indicative, **souhaiter** the subjunctive: J'espère qu'il viendra. Je souhaite qu'il vienne.",
      '**Il me semble que** + indicatif, **il semble que** + subjonctif.',
      "Same subject? Use an infinitive: **Je ne pense pas pouvoir venir. Je regrette d'être parti si tôt.**",
    ],
    practice: { kinds: ['drill'], drills: ['subjonctif-ou-indicatif'] },
  },
  {
    id: 'hypotheses-si',
    unit: 'subordonnees',
    title: 'Les hypothèses avec si',
    en: 'Conditional sentences with si',
    level: 4,
    intro:
      'In a conditional sentence, the tense after **si** decides the tense of the result. There are three main patterns, a few mixed ones, and one golden rule: never a future or a conditional straight after this si.',
    sections: [
      {
        heading: 'Les trois schémas',
        body: '**Si + présent**: a real possibility; the result is in the futur, the présent or the impératif.\n**Si + imparfait**: something imagined, now or in the future; the result is in the conditionnel présent.\n**Si + plus-que-parfait**: something that did not happen; the result is in the conditionnel passé.',
        table: {
          head: ['Si…', 'Résultat', 'Exemple'],
          rows: [
            ['si + présent', 'futur / présent / impératif', "S'il pleut, on restera à la maison."],
            ['si + imparfait', 'conditionnel présent', "S'il pleuvait, on resterait à la maison."],
            ['si + plus-que-parfait', 'conditionnel passé', "S'il avait plu, on serait restés à la maison."],
          ],
        },
        examples: [
          { fr: 'Si tu passes par la boulangerie, prends du pain.', en: "If you're going past the bakery, get some bread." },
          { fr: "Si j'avais plus de temps, j'apprendrais le piano.", en: "If I had more time, I'd learn the piano." },
          { fr: 'Si nous avions su, nous serions venus plus tôt.', en: "If we'd known, we'd have come earlier." },
        ],
      },
      {
        heading: 'Les schémas mixtes',
        body: 'The two halves can belong to different times. A past condition with a present result: **si + plus-que-parfait → conditionnel présent**. A permanent condition with a past result: **si + imparfait → conditionnel passé**.',
        examples: [
          { fr: 'Si elle avait pris le train de 8 h, elle serait déjà là.', en: "If she'd taken the 8 o'clock train, she'd be here by now." },
          { fr: "Si tu étais plus prudent, tu n'aurais pas eu cet accident.", en: "If you were more careful, you wouldn't have had that accident." },
        ],
      },
      {
        heading: 'Jamais de futur ni de conditionnel après si',
        body: "After the si of a condition, never use the future or the conditional: **si j'avais**, never 'si j'aurais'; **s'il vient**, never 's'il viendra'. Si becomes **s'** only before il and ils.\nBut when si means **whether** (an indirect question), any tense is possible: **Je me demande s'il viendra. Je ne savais pas s'il accepterait.**",
        examples: [
          { fr: 'Si on avait plus de budget, on embaucherait.', en: "If we had a bigger budget, we'd hire." },
          { fr: 'Je ne sais pas si elle acceptera notre offre.', en: "I don't know whether she'll accept our offer." },
        ],
      },
      {
        heading: 'Au cas où, même si',
        body: '**Au cas où** (in case) takes the conditional: **Prends un pull au cas où il ferait froid.** **Même si** (even if) follows the same tense patterns as si. And **si + imparfait** on its own makes a suggestion: **Et si on allait au cinéma ?**',
        examples: [
          { fr: "Je te laisse mon numéro au cas où tu aurais besoin de quelque chose.", en: 'I\'ll leave you my number in case you need anything.' },
          { fr: "Même si tu me l'avais demandé, je n'aurais pas pu t'aider.", en: "Even if you'd asked me, I couldn't have helped you." },
          { fr: 'Et si on partait quelques jours en Bretagne ?', en: 'How about going to Brittany for a few days?' },
        ],
      },
    ],
    tips: [
      "**Si** + il / ils becomes **s'il, s'ils**, but **si elle** and **si on** never elide.",
      "The conditional after si is a very common slip, even among native speakers: say **si j'avais su**, not 'si j'aurais su'.",
      '**Au cas où** + conditionnel, **à condition que** + subjonctif, **si** + indicatif.',
    ],
    practice: {
      kinds: ['drill', 'conj'],
      tenses: ['plus_que_parfait', 'conditionnel_present', 'conditionnel_passe'],
      drills: ['hypotheses-si'],
    },
  },
];
