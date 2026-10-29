// Advanced lessons: reported speech.
import type { Lesson } from '../../../lib/grammar/types';

export const AVANCE_DISCOURS: Lesson[] = [
  {
    id: 'discours-indirect',
    unit: 'discours',
    title: 'Le discours indirect',
    en: 'Reported speech',
    level: 4,
    intro:
      "Reported speech retells what someone said without quoting it: **Elle a dit : « Je suis prête. »** → **Elle a dit qu'elle était prête.** Pronouns, possessives, time words and, after a past verb, tenses all shift to the reporter's point of view.",
    sections: [
      {
        heading: 'Les déclarations : dire que',
        body: "Statements are introduced by **que** after **dire, affirmer, expliquer, annoncer, répondre, assurer, prétendre**… Repeat que in front of each reported clause: **Il a dit qu'il était malade et qu'il ne viendrait pas.** When the reporting verb is in the present, the tenses don't change.",
        examples: [
          { fr: "Elle dit qu'elle arrivera vers 20 h.", en: "She says she'll arrive around 8 pm." },
          { fr: "Le porte-parole a affirmé que le ministre n'était pas au courant.", en: 'The spokesperson stated that the minister was not aware.' },
          { fr: "Il a expliqué qu'il avait raté son train et qu'il prendrait le suivant.", en: 'He explained that he had missed his train and would take the next one.' },
        ],
      },
      {
        heading: 'Les questions et les ordres',
        body: "Questions are reported with **si** (yes / no), **ce que** (qu'est-ce que), **ce qui** (qu'est-ce qui) or the question word itself (où, quand, comment, pourquoi…), in statement order: **Il m'a demandé si j'étais libre.** The lesson on indirect questions goes further.\nOrders and requests become **de + infinitive** after dire, demander, conseiller, ordonner, interdire, proposer: **« Rappelez-moi demain. »** → **Il m'a demandé de le rappeler le lendemain.** In the negative, ne pas goes before the infinitive: **Il nous a dit de ne pas attendre.**",
        examples: [
          { fr: "Elle m'a demandé ce que je faisais ce week-end.", en: 'She asked me what I was doing this weekend.' },
          { fr: 'Son coach lui a conseillé de ralentir le rythme.', en: 'His coach advised him to slow down.' },
          { fr: 'Le pilote nous a demandé de rester assis.', en: 'The pilot asked us to remain seated.' },
        ],
      },
      {
        heading: 'Personnes et possessifs',
        body: "Pronouns and possessives follow the people involved, not the original words: **« Je t'envoie mon CV. »** becomes **Elle m'a dit qu'elle m'envoyait son CV.** Ask yourself who is speaking to whom.",
        examples: [
          { fr: "Mon frère m'a promis qu'il me rendrait mes livres lundi.", en: 'My brother promised me he would give me my books back on Monday.' },
          { fr: 'Nos voisins nous ont expliqué que leur fille partait vivre au Japon.', en: 'Our neighbours told us their daughter was moving to Japan.' },
        ],
      },
      {
        heading: 'Les repères de temps et de lieu',
        body: 'When the moment of speaking is over, the words that point to it change too.',
        table: {
          head: ['Paroles', 'Discours rapporté'],
          rows: [
            ["aujourd'hui", 'ce jour-là'],
            ['hier', 'la veille'],
            ['demain', 'le lendemain'],
            ['avant-hier', "l'avant-veille"],
            ['après-demain', 'le surlendemain'],
            ['la semaine dernière', 'la semaine précédente'],
            ['la semaine prochaine', 'la semaine suivante'],
            ['dans deux jours', 'deux jours plus tard'],
            ['il y a deux jours', 'deux jours plus tôt'],
            ['maintenant', 'à ce moment-là'],
            ['ici', 'là'],
          ],
        },
      },
    ],
    tips: [
      'Only change a time word if that moment is over: reported the same evening, demain can stay demain.',
      "Dire **que** reports a statement, dire **de** reports an order: Il m'a dit qu'il partait. Il m'a dit de partir.",
      'After a past reporting verb, the tenses shift as well: see the lesson on the sequence of tenses.',
    ],
    practice: { kinds: ['drill'], drills: ['discours-indirect'] },
  },
  {
    id: 'concordance-des-temps',
    unit: 'discours',
    title: 'La concordance des temps',
    en: 'The sequence of tenses',
    level: 4,
    intro:
      "When the main verb is in a past tense (**il a dit, elle pensait, on m'avait assuré**), the verb that depends on it moves one step back in time: **« Je suis fatigué. »** → **Il a dit qu'il était fatigué.**",
    sections: [
      {
        heading: 'Présent ou passé ?',
        body: "If the main verb is in the present or the future, nothing changes: **Il dit qu'il est fatigué. Il dira qu'il a oublié.** The shift only happens after a past tense: passé composé, imparfait, plus-que-parfait or passé simple.",
        examples: [
          { fr: "Le PDG répète qu'il n'y aura pas de licenciements.", en: 'The CEO keeps saying there will be no lay-offs.' },
          { fr: "Le PDG a répété qu'il n'y aurait pas de licenciements.", en: 'The CEO repeated that there would be no lay-offs.' },
        ],
      },
      {
        heading: 'Le tableau des changements',
        body: 'After a past verb, these tenses change, and the others stay as they are.',
        table: {
          head: ['Paroles', 'Après un verbe au passé', 'Exemple'],
          rows: [
            ['présent', 'imparfait', "« J'ai faim. » → Il a dit qu'il avait faim."],
            ['passé composé', 'plus-que-parfait', "« J'ai fini. » → Il a dit qu'il avait fini."],
            ['futur simple', 'conditionnel présent', "« Je viendrai. » → Il a dit qu'il viendrait."],
            ['futur antérieur', 'conditionnel passé', "« J'aurai fini. » → Il a dit qu'il aurait fini."],
            ['futur proche', "aller à l'imparfait + infinitif", "« Je vais partir. » → Il a dit qu'il allait partir."],
            ['passé récent', "venir à l'imparfait + de + infinitif", "« Je viens d'arriver. » → Il a dit qu'il venait d'arriver."],
            ['imparfait, plus-que-parfait, conditionnel', 'pas de changement', "« J'étais malade. » → Il a dit qu'il était malade."],
          ],
        },
      },
      {
        heading: 'Pas seulement après dire',
        body: "The same shift happens after any past verb of thinking or knowing: **je pensais, je croyais, je savais, j'espérais, je me demandais, j'ignorais, on m'avait dit**…",
        examples: [
          { fr: 'Je pensais que tu viendrais avec ton frère.', en: 'I thought you would come with your brother.' },
          { fr: "Je ne savais pas qu'ils avaient divorcé.", en: "I didn't know they had got divorced." },
          { fr: "J'espérais qu'on aurait fini avant la nuit.", en: 'I was hoping we would have finished before dark.' },
          { fr: 'Elle se demandait si elle avait fait le bon choix.', en: 'She wondered whether she had made the right choice.' },
        ],
      },
      {
        heading: 'Les exceptions',
        body: "A general truth, or a fact that is still true when you report it, can stay in the present: **Le professeur a rappelé que la Terre tourne autour du Soleil. Elle m'a dit qu'elle habite à Nantes** (she still does). Shifting is never wrong, though: **qu'elle habitait à Nantes**.\nIn modern French, a present subjunctive stays as it is: **Il fallait que je parte.**",
        examples: [{ fr: 'Il nous a rappelé que le musée est fermé le mardi.', en: 'He reminded us that the museum is closed on Tuesdays.' }],
      },
    ],
    tips: [
      "Futur → conditionnel is the shift learners forget most, although English does the same (will → would): Il a dit qu'il viendrait.",
      "Passé composé → plus-que-parfait when the reported action came first: Elle m'a dit qu'elle avait déjà mangé.",
      'Time words shift with the tenses: demain → le lendemain, hier → la veille.',
    ],
    practice: { kinds: ['drill'], drills: ['concordance-des-temps'] },
  },
  {
    id: 'interrogation-indirecte',
    unit: 'discours',
    title: "L'interrogation indirecte",
    en: 'Indirect questions',
    level: 4,
    intro:
      'An indirect question sits inside a sentence: **Je me demande si elle viendra. Dis-moi ce que tu en penses.** It uses statement word order, no est-ce que, and no question mark of its own.',
    sections: [
      {
        heading: 'Oui ou non : si',
        body: "A yes / no question becomes **si** (**s'il, s'ils**): **Est-ce que tu viens ?** → **Je voudrais savoir si tu viens.** After this si (= whether), any tense is possible, including the future: **Je me demande s'il pourra venir.**",
        examples: [
          { fr: "Je ne sais pas si j'ai bien fermé la porte à clé.", en: "I don't know whether I locked the door." },
          { fr: "Savez-vous s'il reste des places ?", en: 'Do you know if there are any seats left?' },
        ],
      },
      {
        heading: 'Ce que, ce qui, quoi',
        body: "**Qu'est-ce que / que** becomes **ce que**, and **qu'est-ce qui** becomes **ce qui**: **Qu'est-ce que tu veux ?** → **Dis-moi ce que tu veux.** **Qu'est-ce qui se passe ?** → **Je ne sais pas ce qui se passe.**\nAfter a preposition, **quoi** stays: **De quoi parles-tu ?** → **Je ne vois pas de quoi tu parles.** Before an infinitive, use **quoi** too: **Je ne sais pas quoi dire.**",
        examples: [
          { fr: 'Explique-moi ce que tu as compris.', en: 'Explain to me what you understood.' },
          { fr: "Personne ne sait ce qui l'a poussé à partir.", en: 'Nobody knows what drove him to leave.' },
          { fr: 'Je me demande à quoi il pense.', en: 'I wonder what he is thinking about.' },
        ],
      },
      {
        heading: 'Où, quand, comment, pourquoi…',
        body: "**Qui, où, quand, comment, pourquoi, combien, quel** and **lequel** stay the same, but the word order is that of a statement: no inversion, no est-ce que. **Où habites-tu ?** → **Il m'a demandé où j'habitais.** **Pourquoi est-ce qu'il est parti ?** → **Je me demande pourquoi il est parti.**\nWith a noun subject, a simple inversion is allowed for style: **Je me demande où habite ta sœur.**",
        examples: [
          { fr: 'Je ne comprends pas pourquoi il a refusé.', en: "I don't understand why he refused." },
          { fr: 'Dites-moi combien je vous dois.', en: 'Tell me how much I owe you.' },
          { fr: 'Elle ne sait pas encore quelle robe elle va mettre.', en: "She doesn't know yet which dress she's going to wear." },
          { fr: "J'hésite entre deux vols : je ne sais pas lequel prendre.", en: "I'm torn between two flights: I don't know which one to take." },
        ],
      },
      {
        heading: 'Au passé',
        body: "After a past verb (**il m'a demandé, je me demandais, elle voulait savoir**), the sequence of tenses applies: **« Tu as faim ? »** → **Il m'a demandé si j'avais faim.** **« Qu'est-ce que vous ferez ? »** → **Elle voulait savoir ce que nous ferions.**",
        examples: [
          { fr: 'Je me demandais où tu étais passé.', en: 'I was wondering where you had got to.' },
          { fr: 'Ils voulaient savoir quand nous rentrerions.', en: 'They wanted to know when we would be back.' },
        ],
      },
    ],
    tips: [
      "No question mark after an indirect question, unless the main clause is itself a question: Je me demande s'il viendra. Sais-tu s'il viendra ?",
      "Never qu'est-ce que inside a sentence: Dis-moi **ce que** tu veux, not 'dis-moi qu'est-ce que tu veux'.",
      "Before an infinitive, keep **quoi**: Je ne sais pas quoi faire, not 'ce que faire'.",
    ],
    practice: { kinds: ['drill'], drills: ['interrogation-indirecte'] },
  },
];
