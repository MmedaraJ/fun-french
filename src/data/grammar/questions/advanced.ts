// Advanced questions (level 3): complex inversion with a noun subject, prepositions
// before qui / quoi / lequel, and the vocabulary of opinions, work and society.
// After a preposition only the pronoun is blanked ("Sur ____ mise-t-elle ?"), so the
// choice is qui (people) / quoi (things) / lequel (one of a given set), never que.
// "Que" items elide their est-ce que form ("Qu'est-ce qu'il…") so only the
// question word itself can be blanked.
import type { QAItem } from '../../../lib/grammar/types';

export const ADVANCED_QUESTIONS: QAItem[] = [
  // ---- pourquoi ----------------------------------------------------------------
  { id: 'adv-pq-gouvernement', word: 'pourquoi', wordFr: 'Pourquoi', level: 3, topic: 'town',
    forms: { intonation: 'Pourquoi le gouvernement a reculé sur la réforme ?', estceque: 'Pourquoi est-ce que le gouvernement a reculé sur la réforme ?', inversion: 'Pourquoi le gouvernement a-t-il reculé sur la réforme ?' },
    en: 'Why did the government back down on the reform?', answer: { fr: 'Parce que les syndicats menaçaient de bloquer le pays.', en: 'Because the unions were threatening to bring the country to a standstill.' } },
  { id: 'adv-pq-collegue', word: 'pourquoi', wordFr: 'Pourquoi', level: 3, topic: 'work',
    forms: { intonation: 'Pourquoi ta collègue a démissionné ?', estceque: 'Pourquoi est-ce que ta collègue a démissionné ?', inversion: 'Pourquoi ta collègue a-t-elle démissionné ?' },
    en: 'Why did your colleague resign?', answer: { fr: "Parce qu'elle ne supportait plus la pression.", en: "Because she couldn't take the pressure any more." } },
  { id: 'adv-pq-glaciers', word: 'pourquoi', wordFr: 'Pourquoi', level: 3, topic: 'nature',
    forms: { intonation: 'Pourquoi les glaciers fondent si vite ?', estceque: 'Pourquoi est-ce que les glaciers fondent si vite ?', inversion: 'Pourquoi les glaciers fondent-ils si vite ?' },
    en: 'Why are the glaciers melting so fast?', answer: { fr: 'À cause du réchauffement climatique.', en: 'Because of global warming.' } },

  // ---- comment -----------------------------------------------------------------
  { id: 'adv-comment-entreprise', word: 'comment', wordFr: 'Comment', level: 3, topic: 'work',
    forms: { estceque: "Comment est-ce que cette entreprise compte se développer à l'étranger ?", inversion: "Comment cette entreprise compte-t-elle se développer à l'étranger ?" },
    en: 'How does this company plan to expand abroad?', answer: { fr: 'En rachetant des concurrents plus petits.', en: 'By buying up smaller competitors.' } },
  { id: 'adv-comment-reseaux', word: 'comment', wordFr: 'Comment', level: 3, topic: 'tech',
    forms: { estceque: 'Comment est-ce que les réseaux sociaux ont changé notre façon de nous informer ?', inversion: 'Comment les réseaux sociaux ont-ils changé notre façon de nous informer ?' },
    en: 'How have social media changed the way we get our news?', answer: { fr: "Ils ont rendu l'information plus rapide, mais moins fiable.", en: "They've made news faster, but less reliable." } },
  { id: 'adv-comment-operation', word: 'comment', wordFr: 'Comment', level: 3, topic: 'health',
    forms: { estceque: 'Comment est-ce que ton père a vécu son opération ?', inversion: 'Comment ton père a-t-il vécu son opération ?' },
    en: 'How did your father cope with his operation?', answer: { fr: "Plutôt bien, il s'en est vite remis.", en: 'Quite well, he got over it quickly.' } },

  // ---- que (inversion only with a pronoun or on: "Que pense-t-elle… ?") -------
  { id: 'adv-que-reproche', word: 'que', wordFr: 'Que', level: 3, topic: 'love',
    forms: { intonation: 'Il te reproche quoi, au juste ?', estceque: "Qu'est-ce qu'il te reproche, au juste ?", inversion: 'Que te reproche-t-il, au juste ?' },
    en: 'What exactly is he blaming you for?', answer: { fr: "Il me reproche de ne jamais l'écouter.", en: 'He complains that I never listen to him.' } },
  { id: 'adv-que-nationalite', word: 'que', wordFr: 'Que', alsoOk: ['comment'], level: 3, topic: 'town',
    forms: { intonation: 'Il faut faire quoi pour obtenir la nationalité française ?', estceque: "Qu'est-ce qu'il faut faire pour obtenir la nationalité française ?", inversion: 'Que faut-il faire pour obtenir la nationalité française ?' },
    en: 'What do you have to do to get French citizenship?', answer: { fr: 'Il faut notamment justifier de cinq ans de résidence.', en: "Among other things, you have to prove five years' residence." } },
  { id: 'adv-que-telecharger', word: 'que', wordFr: 'Que', level: 3, topic: 'tech',
    forms: { intonation: 'On risque quoi en téléchargeant illégalement des films ?', estceque: "Qu'est-ce qu'on risque en téléchargeant illégalement des films ?", inversion: 'Que risque-t-on en téléchargeant illégalement des films ?' },
    en: 'What do you risk by downloading films illegally?', answer: { fr: 'Une amende, voire des poursuites.', en: 'A fine, or even prosecution.' } },

  // ---- qu'est-ce qui (inversion: impersonal il) ---------------------------------
  { id: 'adv-qqui-orage', word: 'qu-est-ce-qui', wordFr: "Qu'est-ce qui", level: 3, topic: 'nature',
    forms: { intonation: "Il s'est passé quoi dans la vallée pendant l'orage ?", estceque: "Qu'est-ce qui s'est passé dans la vallée pendant l'orage ?", inversion: "Que s'est-il passé dans la vallée pendant l'orage ?" },
    en: 'What happened in the valley during the storm?', answer: { fr: 'La rivière a débordé et inondé plusieurs villages.', en: 'The river burst its banks and flooded several villages.' } },
  { id: 'adv-qqui-vente', word: 'qu-est-ce-qui', wordFr: "Qu'est-ce qui", level: 3, topic: 'home',
    forms: { intonation: "Il reste quoi à régler avant la vente de l'appartement ?", estceque: "Qu'est-ce qui reste à régler avant la vente de l'appartement ?", inversion: "Que reste-t-il à régler avant la vente de l'appartement ?" },
    en: 'What is left to sort out before the flat is sold?', answer: { fr: 'Il ne manque plus que la signature chez le notaire.', en: "All that's missing is the signing at the notary's." } },

  // ---- quel / quelle / quels / quelles -------------------------------------------
  { id: 'adv-quels-effets', word: 'quel', wordFr: 'Quels', level: 3, topic: 'health',
    forms: { intonation: 'Ce traitement peut avoir quels effets secondaires ?', estceque: 'Quels effets secondaires est-ce que ce traitement peut avoir ?', inversion: 'Quels effets secondaires ce traitement peut-il avoir ?' },
    en: 'What side effects can this treatment have?', answer: { fr: 'Il peut provoquer des nausées et une grande fatigue.', en: 'It can cause nausea and extreme tiredness.' } },
  { id: 'adv-quelle-place', word: 'quel', wordFr: 'Quelle', level: 3, topic: 'leisure',
    forms: { intonation: 'La culture occupe quelle place dans ta vie ?', estceque: 'Quelle place est-ce que la culture occupe dans ta vie ?', inversion: 'Quelle place la culture occupe-t-elle dans ta vie ?' },
    en: 'What place does culture have in your life?', answer: { fr: 'Une place essentielle : je vais au théâtre chaque semaine.', en: 'An essential one: I go to the theatre every week.' } },
  { id: 'adv-quelles-valeurs', word: 'quel', wordFr: 'Quelles', level: 3, topic: 'family',
    forms: { intonation: "Tes parents t'ont transmis quelles valeurs ?", estceque: "Quelles valeurs est-ce que tes parents t'ont transmises ?", inversion: "Quelles valeurs tes parents t'ont-ils transmises ?" },
    en: 'What values did your parents pass on to you?', answer: { fr: "Ils m'ont appris le respect des autres et le goût de l'effort.", en: 'They taught me respect for others and the value of hard work.' } },
  { id: 'adv-quel-transport', word: 'quel', wordFr: 'Quel', alsoOk: ['comment'], level: 3, topic: 'travel',
    forms: { estceque: 'Quel moyen de transport est-ce que les touristes privilégient pour visiter la région ?', inversion: 'Quel moyen de transport les touristes privilégient-ils pour visiter la région ?' },
    en: 'Which means of transport do tourists favour for touring the region?', answer: { fr: 'Ils privilégient de plus en plus le vélo.', en: "They're increasingly choosing to cycle." } },

  // ---- combien de temps / combien de fois / combien -----------------------------
  { id: 'adv-cb-tramway', word: 'combien', wordFr: 'Combien de temps', level: 3, topic: 'town',
    forms: { intonation: 'Les travaux du tramway vont durer combien de temps ?', estceque: 'Combien de temps est-ce que les travaux du tramway vont durer ?', inversion: 'Combien de temps les travaux du tramway vont-ils durer ?' },
    en: 'How long is the work on the tramway going to last?', answer: { fr: "Au moins deux ans, d'après la mairie.", en: 'At least two years, according to the town hall.' } },
  { id: 'adv-cb-bilan', word: 'combien', wordFr: 'Combien de fois', level: 3, topic: 'health',
    forms: { estceque: "Combien de fois par an est-ce qu'un adulte devrait faire un bilan sanguin ?", inversion: 'Combien de fois par an un adulte devrait-il faire un bilan sanguin ?' },
    en: 'How many times a year should an adult have a blood test?', answer: { fr: 'Une fois par an, en général.', en: 'Once a year, generally.' } },
  { id: 'adv-cb-appartement', word: 'combien', wordFr: 'Combien', level: 3, topic: 'shopping',
    forms: { intonation: 'Ta sœur a payé son appartement combien ?', estceque: 'Combien est-ce que ta sœur a payé son appartement ?', inversion: 'Combien ta sœur a-t-elle payé son appartement ?' },
    en: 'How much did your sister pay for her flat?', answer: { fr: 'Près de trois cent mille euros.', en: 'Nearly three hundred thousand euros.' } },

  // ---- depuis quand --------------------------------------------------------------
  { id: 'adv-dq-train-nuit', word: 'depuis-quand', wordFr: 'Depuis quand', level: 3, topic: 'travel',
    forms: { intonation: 'Ce train de nuit circule de nouveau depuis quand ?', estceque: 'Depuis quand est-ce que ce train de nuit circule de nouveau ?', inversion: 'Depuis quand ce train de nuit circule-t-il de nouveau ?' },
    en: 'Since when has this night train been running again?', answer: { fr: "Depuis le changement d'horaire de décembre.", en: 'Since the December timetable change.' } },
  { id: 'adv-dq-separes', word: 'depuis-quand', wordFr: 'Depuis quand', level: 3, topic: 'family',
    forms: { intonation: 'Tes parents sont séparés depuis quand ?', estceque: 'Depuis quand est-ce que tes parents sont séparés ?', inversion: 'Depuis quand tes parents sont-ils séparés ?' },
    en: 'How long have your parents been separated?', answer: { fr: "Depuis que j'ai dix ans.", en: 'Since I was ten.' } },

  // ---- d'où ------------------------------------------------------------------------
  { id: 'adv-dou-information', word: 'd-ou', wordFr: "D'où", level: 3, topic: 'tech',
    forms: { estceque: "D'où est-ce que cette information provient ?", inversion: "D'où cette information provient-elle ?" },
    en: 'Where does this information come from?', answer: { fr: "D'une source anonyme au sein du ministère.", en: 'From an anonymous source inside the ministry.' } },
  { id: 'adv-dou-famille', word: 'd-ou', wordFr: "D'où", level: 3, topic: 'family',
    forms: { intonation: "Ta famille est originaire d'où ?", estceque: "D'où est-ce que ta famille est originaire ?", inversion: "D'où ta famille est-elle originaire ?" },
    en: 'Where does your family come from originally?', answer: { fr: "Du sud de l'Italie, du côté de mon père.", en: "From southern Italy, on my father's side." } },

  // ---- quand -------------------------------------------------------------------------
  { id: 'adv-quand-vendanges', word: 'quand', wordFr: 'Quand', level: 3, topic: 'nature',
    forms: { intonation: 'Les vendanges commencent quand dans le Bordelais ?', estceque: 'Quand est-ce que les vendanges commencent dans le Bordelais ?', inversion: 'Quand les vendanges commencent-elles dans le Bordelais ?' },
    en: 'When does the grape harvest start in the Bordeaux region?', answer: { fr: 'Fin août ou début septembre, selon la météo.', en: 'Late August or early September, depending on the weather.' } },
  { id: 'adv-quand-mariage', word: 'quand', wordFr: 'Quand', level: 3, topic: 'love',
    forms: { estceque: 'Quand est-ce que ton frère et sa compagne comptent se marier ?', inversion: 'Quand ton frère et sa compagne comptent-ils se marier ?' },
    en: 'When are your brother and his partner planning to get married?', answer: { fr: "Au printemps prochain, s'ils trouvent une salle.", en: 'Next spring, if they can find a venue.' } },

  // ---- où ------------------------------------------------------------------------------
  { id: 'adv-ou-logement', word: 'ou', wordFr: 'Où', level: 3, topic: 'home',
    forms: { estceque: 'Où est-ce que les jeunes couples peuvent encore se loger à prix abordable ?', inversion: 'Où les jeunes couples peuvent-ils encore se loger à prix abordable ?' },
    en: 'Where can young couples still find affordable housing?', answer: { fr: 'Dans les villes moyennes, loin des grandes métropoles.', en: 'In medium-sized towns, far from the big cities.' } },
  { id: 'adv-ou-festival', word: 'ou', wordFr: 'Où', level: 3, topic: 'leisure',
    forms: { estceque: 'Où est-ce que le prochain festival de jazz aura lieu ?', inversion: 'Où le prochain festival de jazz aura-t-il lieu ?' },
    en: 'Where will the next jazz festival take place?', answer: { fr: "Dans les jardins du château, comme l'an dernier.", en: 'In the castle gardens, like last year.' } },

  // ---- avec qui --------------------------------------------------------------------------
  { id: 'adv-aq-sophie', word: 'avec-qui', wordFr: 'Avec qui', level: 3, topic: 'travel',
    forms: { intonation: 'Sophie est partie en Asie avec qui ?', estceque: 'Avec qui est-ce que Sophie est partie en Asie ?', inversion: 'Avec qui Sophie est-elle partie en Asie ?' },
    en: 'Who did Sophie go to Asia with?', answer: { fr: "Avec une amie d'enfance, sac au dos.", en: 'With a childhood friend, backpacking.' } },
  { id: 'adv-aq-fille', word: 'avec-qui', wordFr: 'Avec qui', level: 3, topic: 'family',
    forms: { intonation: 'Ta fille partage son appartement avec qui ?', estceque: 'Avec qui est-ce que ta fille partage son appartement ?', inversion: 'Avec qui ta fille partage-t-elle son appartement ?' },
    en: 'Who does your daughter share her flat with?', answer: { fr: 'Avec deux étudiantes en médecine.', en: 'With two medical students.' } },
  { id: 'adv-aq-julien', word: 'avec-qui', wordFr: 'Avec qui', level: 3, topic: 'love',
    forms: { intonation: "Julien s'est brouillé avec qui ?", estceque: "Avec qui est-ce que Julien s'est brouillé ?", inversion: "Avec qui Julien s'est-il brouillé ?" },
    en: 'Who did Julien fall out with?', answer: { fr: "Avec son associé, pour une histoire d'argent.", en: 'With his business partner, over money.' } },

  // ---- à qui, de qui, pour qui, chez qui, sur qui, contre qui (only "qui" is blanked) ---
  { id: 'adv-qui-mairie', word: 'qui', wordFr: 'qui', level: 3, topic: 'town',
    forms: { intonation: "La mairie a confié la rénovation de l'église à qui ?", estceque: "À qui est-ce que la mairie a confié la rénovation de l'église ?", inversion: "À qui la mairie a-t-elle confié la rénovation de l'église ?" },
    en: 'Who did the town hall entrust the church renovation to?', answer: { fr: 'À une entreprise locale spécialisée dans le patrimoine.', en: 'To a local firm specialising in heritage buildings.' } },
  { id: 'adv-qui-bebe', word: 'qui', wordFr: 'qui', level: 3, topic: 'family',
    forms: { intonation: 'Le bébé tient ses yeux bleus de qui ?', estceque: 'De qui est-ce que le bébé tient ses yeux bleus ?', inversion: 'De qui le bébé tient-il ses yeux bleus ?' },
    en: 'Who does the baby get his blue eyes from?', answer: { fr: 'De son grand-père paternel.', en: 'From his paternal grandfather.' } },
  { id: 'adv-qui-cousine', word: 'qui', wordFr: 'qui', level: 3, topic: 'love',
    forms: { intonation: 'Ta cousine a quitté Paris pour qui ?', estceque: 'Pour qui est-ce que ta cousine a quitté Paris ?', inversion: 'Pour qui ta cousine a-t-elle quitté Paris ?' },
    en: 'Who did your cousin leave Paris for?', answer: { fr: 'Pour un Breton rencontré en vacances.', en: 'For a Breton she met on holiday.' } },
  { id: 'adv-qui-stage', word: 'qui', wordFr: 'qui', level: 3, topic: 'work',
    forms: { intonation: "Tu as fait ton stage de fin d'études chez qui ?", estceque: "Chez qui est-ce que tu as fait ton stage de fin d'études ?", inversion: "Chez qui as-tu fait ton stage de fin d'études ?" },
    en: 'Who did you do your final-year internship with?', answer: { fr: "Je l'ai fait chez un architecte bordelais assez connu.", en: 'I did it with a fairly well-known Bordeaux architect.' } },
  { id: 'adv-qui-moral', word: 'qui', wordFr: 'qui', level: 3, topic: 'health',
    forms: { intonation: 'Tu peux compter sur qui quand tu as le moral à zéro ?', estceque: 'Sur qui est-ce que tu peux compter quand tu as le moral à zéro ?', inversion: 'Sur qui peux-tu compter quand tu as le moral à zéro ?' },
    en: "Who can you count on when you're feeling really low?", answer: { fr: 'Sur ma meilleure amie, toujours.', en: 'On my best friend, always.' } },
  { id: 'adv-qui-equipe', word: 'qui', wordFr: 'qui', level: 3, topic: 'leisure',
    forms: { intonation: "L'équipe de France jouera contre qui en demi-finale ?", estceque: "Contre qui est-ce que l'équipe de France jouera en demi-finale ?", inversion: "Contre qui l'équipe de France jouera-t-elle en demi-finale ?" },
    en: 'Who will the French team play against in the semi-final?', answer: { fr: 'Contre le Portugal, sauf surprise.', en: 'Against Portugal, barring any surprises.' } },

  // ---- sur quoi, de quoi, à quoi, en quoi, avec quoi (only "quoi" is blanked) ----------
  { id: 'adv-quoi-startup', word: 'quoi', wordFr: 'quoi', level: 3, topic: 'tech',
    forms: { intonation: 'Cette start-up mise sur quoi pour se démarquer ?', estceque: 'Sur quoi est-ce que cette start-up mise pour se démarquer ?', inversion: 'Sur quoi cette start-up mise-t-elle pour se démarquer ?' },
    en: 'What is this start-up banking on to stand out?', answer: { fr: 'Sur une intelligence artificielle conçue en France.', en: 'On an artificial intelligence designed in France.' } },
  { id: 'adv-quoi-clients', word: 'quoi', wordFr: 'quoi', level: 3, topic: 'shopping',
    forms: { estceque: 'De quoi est-ce que les clients se plaignent le plus ?', inversion: 'De quoi les clients se plaignent-ils le plus ?' },
    en: 'What do customers complain about the most?', answer: { fr: 'Des délais de livraison, surtout.', en: 'Delivery times, mainly.' } },
  { id: 'adv-quoi-abeilles', word: 'quoi', wordFr: 'quoi', level: 3, topic: 'nature',
    forms: { estceque: 'À quoi est-ce que les scientifiques attribuent la disparition des abeilles ?', inversion: 'À quoi les scientifiques attribuent-ils la disparition des abeilles ?' },
    en: 'What do scientists attribute the disappearance of bees to?', answer: { fr: 'Surtout aux pesticides et à la perte de leur habitat.', en: 'Mainly to pesticides and the loss of their habitat.' } },
  { id: 'adv-quoi-film', word: 'quoi', wordFr: 'quoi', level: 3, topic: 'leisure',
    forms: { estceque: 'En quoi est-ce que ce film diffère du roman ?', inversion: 'En quoi ce film diffère-t-il du roman ?' },
    en: 'How does this film differ from the novel?', answer: { fr: 'La fin a été complètement réécrite.', en: 'The ending was completely rewritten.' } },
  { id: 'adv-quoi-piscine', word: 'quoi', wordFr: 'quoi', level: 3, topic: 'town',
    forms: { intonation: 'La commune va financer la nouvelle piscine avec quoi ?', estceque: 'Avec quoi est-ce que la commune va financer la nouvelle piscine ?', inversion: 'Avec quoi la commune va-t-elle financer la nouvelle piscine ?' },
    en: 'What is the council going to fund the new swimming pool with?', answer: { fr: 'Avec une hausse des impôts locaux.', en: 'With a rise in local taxes.' } },
  { id: 'adv-quoi-grand-pere', word: 'quoi', wordFr: 'quoi', level: 3, topic: 'health',
    forms: { intonation: 'Ton grand-père souffre de quoi, exactement ?', estceque: 'De quoi est-ce que ton grand-père souffre exactement ?', inversion: 'De quoi ton grand-père souffre-t-il exactement ?' },
    en: 'What exactly is your grandfather suffering from?', answer: { fr: "D'une maladie rare des articulations.", en: 'A rare joint disease.' } },

  // ---- lequel, auquel, duquel… (a set is given; the past participle agrees with a
  // preceding direct object: "Laquelle… as-tu acceptée ?") -----------------------------
  { id: 'adv-laquelle-offre', word: 'lequel', wordFr: 'Laquelle', level: 3, topic: 'work',
    forms: { intonation: "Tu as finalement accepté laquelle de ces deux offres d'emploi ?", estceque: "Laquelle de ces deux offres d'emploi est-ce que tu as finalement acceptée ?", inversion: "Laquelle de ces deux offres d'emploi as-tu finalement acceptée ?" },
    en: 'Which of the two job offers did you accept in the end?', answer: { fr: "Celle de l'agence lyonnaise, malgré un salaire plus bas.", en: "The Lyon agency's, despite a lower salary." } },
  { id: 'adv-lesquels-vols', word: 'lequel', wordFr: 'Lesquels', level: 3, topic: 'travel',
    forms: { estceque: 'Lesquels de ces vols est-ce que la compagnie a annulés ?', inversion: 'Lesquels de ces vols la compagnie a-t-elle annulés ?' },
    en: 'Which of these flights did the airline cancel?', answer: { fr: 'Tous ceux du matin, à cause de la grève.', en: 'All the morning ones, because of the strike.' } },
  { id: 'adv-lequel-forfait', word: 'lequel', wordFr: 'Lequel', level: 3, topic: 'shopping',
    forms: { intonation: 'Vous me conseillez lequel de ces deux forfaits mobiles ?', estceque: 'Lequel de ces deux forfaits mobiles est-ce que vous me conseillez ?', inversion: 'Lequel de ces deux forfaits mobiles me conseillez-vous ?' },
    en: 'Which of these two phone plans would you recommend?', answer: { fr: "Celui à vingt euros, qui inclut les appels à l'étranger.", en: 'The twenty-euro one, which includes calls abroad.' } },
  { id: 'adv-auquel-poste', word: 'lequel', wordFr: 'Auquel', level: 3, topic: 'work',
    forms: { estceque: 'Auquel de ces postes est-ce que ton mari a postulé ?', inversion: 'Auquel de ces postes ton mari a-t-il postulé ?' },
    en: 'Which of these jobs did your husband apply for?', answer: { fr: 'Au poste de chef de projet.', en: 'The project manager job.' } },
  { id: 'adv-a-laquelle-association', word: 'lequel', wordFr: 'laquelle', level: 3, topic: 'shopping',
    forms: { estceque: 'À laquelle de ces associations est-ce que ta mère a fait un don ?', inversion: 'À laquelle de ces associations ta mère a-t-elle fait un don ?' },
    en: 'Which of these charities did your mother donate to?', answer: { fr: 'À celle qui aide les sans-abri.', en: 'The one that helps homeless people.' } },
  { id: 'adv-duquel-romans', word: 'lequel', wordFr: 'Duquel', level: 3, topic: 'leisure',
    forms: { estceque: 'Duquel de ces deux romans est-ce que la presse a le plus parlé ?', inversion: 'Duquel de ces deux romans la presse a-t-elle le plus parlé ?' },
    en: 'Which of these two novels has the press talked about the most?', answer: { fr: 'Du second, qui a reçu un prix littéraire.', en: 'The second one, which won a literary prize.' } },
  { id: 'adv-auxquels-services', word: 'lequel', wordFr: 'Auxquels', level: 3, topic: 'tech',
    forms: { estceque: 'Auxquels de ces services est-ce que les abonnés ont accès gratuitement ?', inversion: 'Auxquels de ces services les abonnés ont-ils accès gratuitement ?' },
    en: 'Which of these services do subscribers get free access to?', answer: { fr: 'Aux deux premiers seulement.', en: 'Only the first two.' } },
];
