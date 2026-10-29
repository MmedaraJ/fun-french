// Advanced lessons: expressing cause, consequence, purpose and contrast.
import type { Lesson } from '../../../lib/grammar/types';

export const AVANCE_RELATIONS: Lesson[] = [
  {
    id: 'cause-consequence',
    unit: 'relations',
    title: 'Exprimer la cause et la conséquence',
    en: 'Expressing cause and consequence',
    level: 4,
    intro: "Beyond parce que and donc, French has a whole range of connectors for reasons and results. The choice depends on what follows (a clause or a noun), on the register and on the nuance.",
    sections: [
      {
        heading: 'La cause + une proposition',
        body: "**parce que** is neutral and answers the question pourquoi. **puisque** gives a reason the listener already knows. **comme** puts the cause first, at the start of the sentence. **étant donné que** and **vu que** present an established fact. **sous prétexte que** gives a reason you don't believe. **d'autant plus que** adds a reason that strengthens what you just said. **car** (mostly written) always comes after the main clause.",
        examples: [
          { fr: 'Comme il pleuvait, nous sommes restés à la maison.', en: 'As it was raining, we stayed at home.' },
          { fr: 'Puisque tu es là, aide-moi à porter ça.', en: "Since you're here, help me carry this." },
          { fr: "Il n'est pas venu, sous prétexte qu'il était fatigué.", en: "He didn't come, supposedly because he was tired." },
          { fr: "Ce poste me plaît, d'autant plus que je ne m'y attendais pas.", en: "I'm delighted with this job, all the more so as I wasn't expecting it." },
        ],
      },
      {
        heading: 'La cause + un nom',
        body: "**grâce à** for a cause with a good outcome, **à cause de** for a bad one, **en raison de** neutral and formal (announcements, the news), **faute de** + noun without an article for a lack, **vu** or **étant donné** + noun for a given fact. Watch the contractions: à cause **du** bruit, grâce **aux** bénévoles.",
        table: {
          head: ['Expression', 'Nuance', 'Example'],
          rows: [
            ['grâce à', 'good outcome', 'grâce à ton aide'],
            ['à cause de', 'bad outcome', 'à cause des travaux'],
            ['en raison de', 'neutral, formal', 'en raison des intempéries'],
            ['faute de', 'for lack of', 'faute de temps'],
            ['vu / étant donné', 'given', 'vu la situation'],
          ],
        },
      },
      {
        heading: 'La conséquence',
        body: "**donc**, **par conséquent** and **c'est pourquoi** link two clauses. **si bien que** and **de sorte que** + indicative state a result. **d'où** + noun sums it up: d'où **la grève**. To stress an intensity that causes a result: **si / tellement** + adjective or adverb + **que**, **tant de / tellement de** + noun + **que**, verb + **tant / tellement que**, **un tel** + noun + **que**, and **au point que** for an extreme result.",
        examples: [
          { fr: 'Les loyers ont flambé, si bien que beaucoup de familles ont quitté le centre.', en: 'Rents soared, so many families left the city centre.' },
          { fr: "Il était si fatigué qu'il s'est endormi en réunion.", en: 'He was so tired that he fell asleep in a meeting.' },
          { fr: "Il y avait tellement de monde qu'on n'a pas pu entrer.", en: "There were so many people that we couldn't get in." },
          { fr: "Elle a tant travaillé qu'elle a fini par tomber malade.", en: 'She worked so hard that she ended up falling ill.' },
          { fr: "Les négociations ont échoué, d'où la grève de lundi.", en: "Talks broke down, hence Monday's strike." },
        ],
      },
    ],
    tips: [
      "**Comme** (meaning 'as, since') opens the sentence; **car** never comes before the main clause.",
      'Keep **grâce à** for good news: à cause de la pluie, but grâce au soleil.',
      '**De sorte que** + indicative states a result; + subjunctive it expresses a purpose.',
    ],
    practice: { kinds: ['drill'], drills: ['cause-consequence'] },
  },
  {
    id: 'but',
    unit: 'relations',
    title: 'Exprimer le but',
    en: 'Expressing purpose',
    level: 3,
    intro: 'To say what something is for, look at the subjects: **same subject → infinitive** (pour partir), **different subject → que + subjunctive** (pour que tu partes).',
    sections: [
      {
        heading: 'Pour, afin de / pour que, afin que',
        body: "**pour** and the more formal **afin de** + infinitive when both verbs share a subject. **pour que** / **afin que** + **subjunctive** when they don't. 'Je travaille pour que je réussisse' is a classic mistake: with one subject, use the infinitive.",
        table: {
          head: ['Same subject', 'Different subjects'],
          rows: [
            ['pour + infinitive', 'pour que + subjonctif'],
            ['afin de + infinitive', 'afin que + subjonctif'],
            ['de peur de / de crainte de + infinitive', 'de peur que / de crainte que (ne) + subjonctif'],
            ['de manière à / de façon à + infinitive', 'de manière que / de façon que + subjonctif'],
          ],
        },
        examples: [
          { fr: "J'économise pour m'acheter un appartement.", en: "I'm saving up to buy a flat." },
          { fr: "Je t'envoie le lien pour que tu puisses t'inscrire.", en: "I'm sending you the link so that you can sign up." },
          { fr: 'Nous vous écrivons afin de vous informer d\'un changement.', en: 'We are writing to inform you of a change.' },
        ],
      },
      {
        heading: 'Éviter quelque chose',
        body: "To say what you want to avoid: **pour ne pas** + infinitive (ne pas together, before the verb), or **de peur de / de crainte de** + infinitive. With another subject: **de peur que / de crainte que** + subjunctive, often with an **expletive ne** that has no negative meaning: de peur qu'il **ne** pleuve = for fear that it rains.",
        examples: [
          { fr: 'Il est parti tôt pour ne pas rater son train.', en: 'He left early so as not to miss his train.' },
          { fr: "Il a pris un parapluie de peur d'être trempé.", en: 'He took an umbrella for fear of getting soaked.' },
          { fr: "Je ne lui ai rien dit de peur qu'elle ne s'inquiète.", en: "I didn't tell her anything for fear she'd worry." },
        ],
      },
      {
        heading: 'Manière et visée',
        body: "**de manière à / de façon à** + infinitive stress the method; **de manière que / de façon que** + subjunctive do the same with a new subject. **en vue de** + noun or infinitive expresses a longer-term aim: en vue **des** élections, en vue d'obtenir une promotion.",
        examples: [
          { fr: 'Nous avons classé les dossiers de manière à les retrouver facilement.', en: 'We filed the documents so as to find them easily.' },
          { fr: "Placez les chaises de façon que tout le monde puisse voir l'écran.", en: 'Arrange the chairs so that everyone can see the screen.' },
          { fr: 'Elle prend des cours du soir en vue d\'obtenir une promotion.', en: 'She takes evening classes with a view to getting a promotion.' },
        ],
      },
    ],
    tips: [
      '**Pour que** and **afin que** always take the subjunctive, whatever the tense of the main verb.',
      'Avant de, sans, pour, afin de: these all switch to que + subjunctive only when the subject changes.',
    ],
    practice: { kinds: ['drill'], drills: ['but'] },
  },
  {
    id: 'concession-opposition',
    unit: 'relations',
    title: "La concession et l'opposition",
    en: 'Concession and contrast',
    level: 4,
    intro: "Concession says 'despite this, that still happens'; opposition sets two different facts side by side. The mood is the main trap: **bien que** + subjunctive, but **même si** + indicative.",
    sections: [
      {
        heading: 'Bien que, quoique, même si',
        body: "**bien que** and **quoique** (one word) take the **subjunctive**. **même si** works like si: present, imparfait or plus-que-parfait of the indicative, never the subjunctive or the future.",
        examples: [
          { fr: "Bien qu'il soit très compétent, il manque d'expérience.", en: "Although he's very competent, he lacks experience." },
          { fr: "Quoiqu'elle ait beaucoup travaillé, elle n'a pas fini.", en: "Although she worked hard, she didn't finish." },
          { fr: "Même s'il pleut demain, le match aura lieu.", en: 'Even if it rains tomorrow, the match will go ahead.' },
        ],
      },
      {
        heading: 'Malgré, en dépit de, avoir beau',
        body: "**malgré** and **en dépit de** + noun. **avoir beau** + infinitive means 'however much…': conjugate avoir, and the second clause gives the disappointing result.",
        examples: [
          { fr: 'Des milliers de personnes ont manifesté malgré la pluie.', en: 'Thousands of people demonstrated despite the rain.' },
          { fr: "L'usine a fermé en dépit des protestations.", en: 'The factory closed despite the protests.' },
          { fr: "J'ai beau lui expliquer, il ne comprend pas.", en: "However much I explain, he doesn't understand." },
        ],
      },
      {
        heading: 'Les adverbes',
        body: "**pourtant**, **cependant**, **néanmoins**, **toutefois** (yet, however, nevertheless, from neutral to formal) and the spoken **quand même / tout de même** (often at the end: all the same) link two independent clauses. They can't introduce a noun or a subordinate clause.",
        examples: [
          { fr: 'Le projet est ambitieux ; il est néanmoins réalisable.', en: 'The project is ambitious; it is nevertheless feasible.' },
          { fr: "C'était cher, mais on l'a acheté quand même.", en: 'It was expensive, but we bought it anyway.' },
        ],
      },
      {
        heading: 'Quoi que, où que, qui que',
        body: "**quoi que** (two words) = whatever, **où que** = wherever, **qui que** = whoever, all + subjunctive. Don't confuse **quoi que** (whatever) with **quoique** (although).",
        examples: [
          { fr: "Quoi que tu dises, je ne changerai pas d'avis.", en: "Whatever you say, I won't change my mind." },
          { fr: 'Où que vous alliez, vous trouverez une boulangerie.', en: "Wherever you go, you'll find a bakery." },
          { fr: 'Qui que vous soyez, présentez une pièce d\'identité.', en: 'Whoever you are, show some ID.' },
        ],
      },
      {
        heading: "L'opposition",
        body: "**alors que** and **tandis que** + indicative contrast two facts (whereas). **en revanche** and the more spoken **par contre** introduce a contrasting fact; **au contraire** contradicts what was just said; **au lieu de** + infinitive or noun = instead of.",
        examples: [
          { fr: 'Mon frère est très sociable, tandis que ma sœur est plutôt réservée.', en: 'My brother is very outgoing, whereas my sister is rather reserved.' },
          { fr: 'Les ventes ont chuté en Europe ; en revanche, elles ont doublé en Asie.', en: 'Sales fell in Europe; in Asia, on the other hand, they doubled.' },
          { fr: "Ce n'est pas une mauvaise nouvelle, au contraire !", en: "It's not bad news, quite the opposite!" },
          { fr: 'Au lieu de se plaindre, elle a proposé des solutions.', en: 'Instead of complaining, she came up with solutions.' },
        ],
      },
    ],
    tips: [
      'Quick test: if you can replace it with bien que, write **quoique**; if it means whatever, write **quoi que**.',
      "**Malgré que** is common in speech but frowned upon in writing: use bien que.",
    ],
    practice: { kinds: ['drill'], drills: ['concession-opposition'] },
  },
];
