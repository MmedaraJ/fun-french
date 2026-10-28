import { describe, expect, it } from 'vitest';
import { CUES, renderSentence, resolveComplement, type Rendered } from './render';
import { PERSONS, TENSES, type Frame, type Negation, type Person, type QForm, type Subject, type Tense } from './types';

// ---- sample frames -------------------------------------------------------------------------
const base = { topic: 'test', level: 1 as const };
const apple: Frame = { ...base, id: 'apple', verb: 'manger', fr: 'une pomme', frNeg: 'de pomme', en: 'an apple', enNeg: 'any apples', object: 'thing' };
const getUp: Frame = { ...base, id: 'get-up', verb: 'se lever', fr: 'tôt', en: 'early' };
const cinema: Frame = { ...base, id: 'cinema', verb: 'aller', fr: 'au cinéma', en: 'to the cinema' };
const friends: Frame = { ...base, id: 'friends', verb: 'voir', fr: '{mes} amis', en: '{my} friends', object: 'person' };
const suitcases: Frame = { ...base, id: 'suitcases', verb: 'monter', fr: 'les valises', en: 'the suitcases', enVerb: 'carry up' };
const train: Frame = { ...base, id: 'train', verb: 'monter', fr: 'dans le train', en: 'on the train', enVerb: 'get' };
const week: Frame = { ...base, id: 'week', verb: 'passer', fr: 'une semaine à Paris', en: 'a week in Paris', enVerb: 'spend' };
const paul: Frame = { ...base, id: 'paul', verb: 'passer', fr: 'chez Paul', en: "Paul's", enVerb: 'stop by' };
const goOut: Frame = { ...base, id: 'go-out', verb: 'sortir', fr: 'avec {mes} amis', en: 'with {my} friends' };
const goOutTonight: Frame = { ...base, id: 'go-out-tonight', verb: 'sortir', fr: 'ce soir', en: 'tonight' };
const teeth: Frame = { ...base, id: 'teeth', verb: 'se brosser', fr: 'les dents', en: '{my} teeth' };
const homework: Frame = { ...base, id: 'homework', verb: 'faire', fr: '{mes} devoirs', en: '{my} homework', enVerb: 'do' };
const happy: Frame = { ...base, id: 'happy', verb: 'être', fr: '{content|contente|contents|contentes}', en: 'happy', stative: true };
const rain: Frame = { ...base, id: 'rain', verb: 'pleuvoir', fr: '', en: '', persons: ['3s'] };
const come: Frame = { ...base, id: 'come', verb: 'pouvoir', fr: 'venir', en: 'come' };
const canEat: Frame = { ...base, id: 'can-eat', verb: 'pouvoir', fr: 'manger une pomme', en: 'eat an apple' };
const smoke: Frame = { ...base, id: 'smoke', verb: 'fumer', fr: '', en: '' };
const call: Frame = { ...base, id: 'call', verb: "s’appeler", fr: 'Léa', en: 'Léa', persons: ['1s', '3s'] };
const talk: Frame = { ...base, id: 'talk', verb: 'parler', fr: 'à {ma} mère', en: 'to {my} mother', object: 'person' };
const football: Frame = { ...base, id: 'football', verb: 'jouer', fr: 'au foot', en: 'football', object: 'thing' };
const story: Frame = { ...base, id: 'story', verb: 'se souvenir', fr: 'de cette histoire', en: 'that story', object: 'thing' };
const bread: Frame = { ...base, id: 'bread', verb: 'manger', fr: 'du pain', frNeg: 'de pain', en: 'some bread', enNeg: 'any bread', object: 'thing' };

const S = (person: Person, gender: 'm' | 'f' = 'm', fr?: string, en?: string): Subject => ({ person, gender, fr, en });
const first = () => 0;

function r(
  frame: Frame,
  tense: Tense,
  subject: Subject,
  extra: { negation?: Negation; qform?: QForm; cue?: boolean; rand?: () => number } = {},
): Rendered | null {
  return renderSentence(frame, { tense, subject, rand: first, ...extra });
}
function both(res: Rendered | null): [string, string] | null {
  return res && [res.fr, res.en];
}

describe('renderSentence: tenses with cues', () => {
  it('passé composé, verb group and the text around it', () => {
    const res = r(apple, 'passe_compose', S('1s'))!;
    expect(res.fr).toBe("Hier, j'ai mangé une pomme.");
    expect(res.en).toBe('Yesterday, I ate an apple.');
    expect(res.before).toBe('Hier, ');
    expect(res.verbFr).toBe("j'ai mangé");
    expect(res.after).toBe(' une pomme.');
    expect(res.tense).toBe('passe_compose');
    expect(res.person).toBe('1s');
  });

  it('one sentence per tense', () => {
    expect(both(r(apple, 'present', S('3s', 'f')))).toEqual(["D'habitude, elle mange une pomme.", 'Usually, she eats an apple.']);
    expect(both(r(apple, 'imparfait', S('1s')))).toEqual(['Autrefois, je mangeais une pomme.', 'In the past, I used to eat an apple.']);
    expect(both(r(apple, 'imparfait', S('1s'), { rand: () => 0.7 }))).toEqual([
      'À ce moment-là, je mangeais une pomme.',
      'At that moment, I was eating an apple.',
    ]);
    expect(both(r(apple, 'plus_que_parfait', S('1s')))).toEqual([
      "Ce jour-là, j'avais déjà mangé une pomme.",
      'That day, I had already eaten an apple.',
    ]);
    expect(both(r(apple, 'futur_simple', S('1p')))).toEqual(["L'année prochaine, nous mangerons une pomme.", 'Next year, we will eat an apple.']);
    expect(both(r(apple, 'futur_proche', S('2s')))).toEqual(['Ce soir, tu vas manger une pomme.', "Tonight, you're going to eat an apple."]);
    expect(both(r(apple, 'passe_recent', S('1s')))).toEqual(['Je viens de manger une pomme.', 'I have just eaten an apple.']);
    expect(both(r(apple, 'conditionnel_present', S('1s'), { rand: () => 0.5 }))).toEqual([
      'À ta place, je mangerais une pomme.',
      'If I were you, I would eat an apple.',
    ]);
    expect(both(r(apple, 'conditionnel_passe', S('2p')))).toEqual([
      'Avec plus de temps, vous auriez mangé une pomme.',
      'With more time, you would have eaten an apple.',
    ]);
    expect(both(r(apple, 'futur_anterieur', S('3s')))).toEqual(["D'ici demain, il aura mangé une pomme.", 'By tomorrow, he will have eaten an apple.']);
    expect(both(r(apple, 'imperatif', S('2s')))).toEqual(['Mange une pomme !', 'Eat an apple!']);
    expect(both(r(apple, 'imperatif', S('1p')))).toEqual(['Mangeons une pomme !', "Let's eat an apple!"]);
  });

  it('subjonctif: the trigger supplies que/qu’ and the English', () => {
    const res = r(apple, 'subjonctif_present', S('2s'))!;
    expect([res.fr, res.en]).toEqual(['Il faut que tu manges une pomme.', 'You have to eat an apple.']);
    expect([res.before, res.verbFr, res.after]).toEqual(['Il faut que ', 'tu manges', ' une pomme.']);
    expect(both(r(apple, 'subjonctif_present', S('3s')))).toEqual(["Il faut qu'il mange une pomme.", 'He has to eat an apple.']);
    expect(both(r(apple, 'subjonctif_present', S('2s'), { rand: () => 0.2 }))).toEqual([
      'Ma mère veut que tu manges une pomme.',
      'My mother wants you to eat an apple.',
    ]);
    expect(both(r(apple, 'subjonctif_present', S('3s', 'f', 'Anne', 'Anne'), { rand: () => 0.2 }))).toEqual([
      "Ma mère veut qu'Anne mange une pomme.",
      'My mother wants Anne to eat an apple.',
    ]);
    expect(both(r(apple, 'subjonctif_present', S('3s'), { negation: 'pas' }))).toEqual([
      "Il faut qu'il ne mange pas de pomme.",
      "He mustn't eat any apples.",
    ]);
    expect(both(r(getUp, 'subjonctif_present', S('1s'), { rand: () => 0.3 }))).toEqual([
      'Ma mère veut que je me lève tôt.',
      'My mother wants me to get up early.',
    ]);
    expect(both(r({ ...apple, tenses: ['subjonctif_passe'] }, 'subjonctif_passe', S('3s', 'f', 'Anne', 'Anne')))).toEqual([
      "C'est bien qu'Anne ait mangé une pomme.",
      "It's good that Anne has eaten an apple.",
    ]);
    expect(both(r(apple, 'subjonctif_present', S('3s', 'm', 'on', 'we'), { rand: () => 0.4 }))).toEqual([
      "Mes parents veulent qu'on mange une pomme.",
      'My parents want us to eat an apple.',
    ]);
    // even without cues the subjunctive needs its trigger
    expect(r(apple, 'subjonctif_present', S('1p'), { cue: false })!.fr).toBe('Il faut que nous mangions une pomme.');
  });

  it('never uses a trigger with the same subject as the clause ("Je veux que je…")', () => {
    for (let i = 0; i < 20; i++) {
      const res = r(apple, 'subjonctif_present', S('1s'), { rand: () => i / 20 })!;
      expect(res.fr).not.toMatch(/^Je (veux|voudrais) que je/);
      expect(res.fr).toMatch(/que je mange une pomme\.$/);
    }
  });

  it('passé simple: 3s/3p only, with its cue', () => {
    const ps = { ...apple, tenses: ['passe_simple'] as Tense[] };
    expect(both(r(ps, 'passe_simple', S('3s')))).toEqual(['Il y a très longtemps, il mangea une pomme.', 'A very long time ago, he ate an apple.']);
    expect(both(r(ps, 'passe_simple', S('3p', 'm', 'les rois', 'the kings')))).toEqual([
      'Il y a très longtemps, les rois mangèrent une pomme.',
      'A very long time ago, the kings ate an apple.',
    ]);
    expect(r(ps, 'passe_simple', S('1s'))).toBeNull();
    expect(r(apple, 'passe_simple', S('3s'))).toBeNull(); // not in the frame's default tenses
  });

  it('cue: false', () => {
    expect(both(r(apple, 'passe_compose', S('1s'), { cue: false }))).toEqual(["J'ai mangé une pomme.", 'I ate an apple.']);
    const res = r(apple, 'futur_simple', S('2s'), { cue: false, qform: 'inversion' })!;
    expect([res.fr, res.en, res.verbFr, res.before]).toEqual(['Mangeras-tu une pomme ?', 'Will you eat an apple?', 'Mangeras-tu', '']);
  });
});

describe('renderSentence: questions', () => {
  it('intonation, est-ce que and inversion', () => {
    expect(both(r(apple, 'passe_compose', S('2s'), { qform: 'intonation' }))).toEqual([
      'Hier, tu as mangé une pomme ?',
      'Yesterday, did you eat an apple?',
    ]);
    expect(both(r(apple, 'passe_compose', S('2s'), { qform: 'est-ce-que' }))).toEqual([
      'Hier, est-ce que tu as mangé une pomme ?',
      'Yesterday, did you eat an apple?',
    ]);
    expect(both(r(apple, 'passe_compose', S('2s'), { qform: 'inversion' }))).toEqual([
      'Hier, as-tu mangé une pomme ?',
      'Yesterday, did you eat an apple?',
    ]);
    const esk = r(apple, 'passe_compose', S('3s'), { qform: 'est-ce-que', cue: false })!;
    expect([esk.fr, esk.before, esk.verbFr, esk.after]).toEqual(["Est-ce qu'il a mangé une pomme ?", "Est-ce qu'", 'il a mangé', ' une pomme ?']);
    expect(esk.en).toBe('Did he eat an apple?');
    expect(r(apple, 'present', S('1s'), { qform: 'inversion' })).toBeNull();
  });

  it('noun subjects: complex inversion, est-ce qu’ + vowel', () => {
    const marie = r(apple, 'present', S('3s', 'f', 'Marie', 'Marie'), { qform: 'inversion', cue: false })!;
    expect([marie.fr, marie.en]).toEqual(['Marie mange-t-elle une pomme ?', 'Does Marie eat an apple?']);
    expect([marie.before, marie.verbFr]).toEqual(['Marie ', 'mange-t-elle']);
    expect(both(r(apple, 'passe_compose', S('3s', 'f', 'Anne', 'Anne'), { negation: 'pas', qform: 'est-ce-que', cue: false }))).toEqual([
      "Est-ce qu'Anne n'a pas mangé de pomme ?",
      "Didn't Anne eat any apples?",
    ]);
    expect(both(r(cinema, 'passe_compose', S('3s', 'f', 'Marie', 'Marie'), { qform: 'inversion', cue: false }))).toEqual([
      'Marie est-elle allée au cinéma ?',
      'Did Marie go to the cinema?',
    ]);
    expect(both(r(cinema, 'passe_compose', S('3p', 'm', 'mes parents', 'my parents'), { qform: 'inversion', cue: false }))).toEqual([
      'Mes parents sont-ils allés au cinéma ?',
      'Did my parents go to the cinema?',
    ]);
  });

  it('negative questions and reflexives', () => {
    expect(both(r(apple, 'futur_proche', S('3p', 'f'), { negation: 'pas', qform: 'inversion' }))).toEqual([
      'Ce soir, ne vont-elles pas manger de pomme ?',
      "Tonight, aren't they going to eat any apples?",
    ]);
    expect(both(r(getUp, 'passe_compose', S('3s', 'f'), { negation: 'pas', qform: 'inversion' }))).toEqual([
      'Hier, ne s’est-elle pas levée tôt ?'.replace('’', "'"),
      "Yesterday, didn't she get up early?",
    ]);
    expect(both(r(apple, 'plus_que_parfait', S('2s'), { negation: 'pas', qform: 'inversion' }))).toEqual([
      "Ce jour-là, n'avais-tu pas encore mangé de pomme ?",
      "That day, hadn't you eaten any apples yet?",
    ]);
  });

  it('"on" as a subject', () => {
    expect(both(r(cinema, 'present', S('3s', 'm', 'on', 'we'), { qform: 'inversion' }))).toEqual([
      "D'habitude, va-t-on au cinéma ?",
      'Usually, do we go to the cinema?',
    ]);
    expect(both(r(cinema, 'present', S('3s', 'm', 'on', 'we'), { qform: 'est-ce-que', cue: false }))).toEqual([
      "Est-ce qu'on va au cinéma ?",
      'Do we go to the cinema?',
    ]);
  });
});

describe('renderSentence: negation', () => {
  it('uses frNeg / enNeg and the right cue', () => {
    expect(both(r(apple, 'present', S('1s'), { negation: 'pas' }))).toEqual(["D'habitude, je ne mange pas de pomme.", "Usually, I don't eat any apples."]);
    expect(both(r(smoke, 'present', S('1s'), { negation: 'plus' }))).toEqual(['Le week-end, je ne fume plus.', "At the weekend, I don't smoke anymore."]);
    expect(both(r(smoke, 'present', S('1s'), { negation: 'plus', rand: () => 0.9 }))).toEqual(['Maintenant, je ne fume plus.', "Now, I don't smoke anymore."]);
    expect(both(r(apple, 'passe_compose', S('1s'), { negation: 'jamais' }))).toEqual([
      "Jusqu'à présent, je n'ai jamais mangé de pomme.",
      'So far, I have never eaten any apples.',
    ]);
    expect(both(r(apple, 'plus_que_parfait', S('1s'), { negation: 'pas' }))).toEqual([
      'Ce jour-là, je n’avais pas encore mangé de pomme.'.replace('’', "'"),
      "That day, I hadn't eaten any apples yet.",
    ]);
    expect(both(r(apple, 'plus_que_parfait', S('1s'), { negation: 'jamais' }))).toEqual([
      "Avant ce voyage, je n'avais jamais mangé de pomme.",
      'Before that trip, I had never eaten any apples.',
    ]);
    expect(both(r(apple, 'futur_simple', S('1s'), { negation: 'plus' }))).toEqual([
      'À partir de demain, je ne mangerai plus de pomme.',
      "From tomorrow, I won't eat any apples anymore.",
    ]);
    expect(both(r(getUp, 'imperatif', S('2s'), { negation: 'pas' }))).toEqual(['Ne te lève pas tôt !', "Don't get up early!"]);
    expect(both(r(apple, 'imperatif', S('1p'), { negation: 'pas' }))).toEqual(['Ne mangeons pas de pomme !', "Let's not eat any apples!"]);
    // "Ce soir" never goes with getting up early
    expect(both(r(getUp, 'futur_proche', S('1s'), { negation: 'pas' }))).toEqual([
      'Demain matin, je ne vais pas me lever tôt.',
      "Tomorrow morning, I'm not going to get up early.",
    ]);
  });

  it('rien / personne replace the complement (only for matching objects)', () => {
    const rien = r(apple, 'present', S('1s'), { negation: 'rien' })!;
    expect([rien.fr, rien.en, rien.verbFr, rien.after]).toEqual(["D'habitude, je ne mange rien.", "Usually, I don't eat anything.", 'je ne mange rien', '.']);
    expect(both(r(apple, 'passe_compose', S('3s'), { negation: 'rien', qform: 'est-ce-que' }))).toEqual([
      "Hier, est-ce qu'il n'a rien mangé ?",
      "Yesterday, didn't he eat anything?",
    ]);
    expect(both(r(friends, 'passe_compose', S('1s'), { negation: 'personne' }))).toEqual(["Hier, je n'ai vu personne.", "Yesterday, I didn't see anyone."]);
    expect(both(r(friends, 'futur_proche', S('1s'), { negation: 'personne' }))).toEqual(['Ce soir, je ne vais voir personne.', "Tonight, I'm not going to see anyone."]);
    expect(r(apple, 'present', S('1s'), { negation: 'personne' })).toBeNull();
    expect(r(friends, 'present', S('1s'), { negation: 'rien' })).toBeNull();
    expect(r(getUp, 'present', S('1s'), { negation: 'rien' })).toBeNull();
  });

  it('rien / personne keep the preposition of the complement', () => {
    expect(both(r(talk, 'passe_compose', S('1s'), { negation: 'personne' }))).toEqual([
      "Hier, je n'ai parlé à personne.",
      "Yesterday, I didn't speak to anyone.",
    ]);
    expect(both(r(talk, 'futur_proche', S('2s'), { negation: 'personne', qform: 'inversion' }))).toEqual([
      'Ce soir, ne vas-tu parler à personne ?',
      "Tonight, aren't you going to speak to anyone?",
    ]);
    expect(both(r(talk, 'imperatif', S('2p'), { negation: 'personne' }))).toEqual(['Ne parlez à personne !', "Don't speak to anyone!"]);
    expect(both(r(talk, 'subjonctif_present', S('2s'), { negation: 'personne' }))).toEqual([
      'Il faut que tu ne parles à personne.',
      "You mustn't speak to anyone.",
    ]);
    expect(both(r(talk, 'present', S('3s', 'f')))).toEqual(["D'habitude, elle parle à sa mère.", 'Usually, she speaks to her mother.']);
    expect(both(r(football, 'present', S('1s'), { negation: 'rien' }))).toEqual(["D'habitude, je ne joue à rien.", "Usually, I don't play anything."]);
    expect(both(r(football, 'passe_compose', S('1s'), { negation: 'rien' }))).toEqual(["Hier, je n'ai joué à rien.", "Yesterday, I didn't play anything."]);
    expect(both(r(story, 'passe_compose', S('3s', 'f'), { negation: 'rien' }))).toEqual([
      "Hier, elle ne s'est souvenue de rien.",
      "Yesterday, she didn't remember anything.",
    ]);
    expect(both(r(bread, 'passe_compose', S('1s'), { negation: 'rien' }))).toEqual(["Hier, je n'ai rien mangé.", "Yesterday, I didn't eat anything."]);
    expect(both(r(bread, 'present', S('1s'), { negation: 'pas' }))).toEqual(["D'habitude, je ne mange pas de pain.", "Usually, I don't eat any bread."]);
  });

  it('combinations that make no sense return null', () => {
    expect(r(apple, 'passe_recent', S('1s'), { negation: 'jamais' })).toBeNull();
    expect(r(apple, 'plus_que_parfait', S('1s'), { negation: 'plus' })).toBeNull();
    expect(r(apple, 'futur_anterieur', S('1s'), { negation: 'jamais' })).toBeNull();
  });
});

describe('renderSentence: agreement and auxiliaries', () => {
  it('être verbs agree with the subject', () => {
    expect(both(r(cinema, 'passe_compose', S('3p', 'm', 'mes parents', 'my parents')))).toEqual([
      'Hier, mes parents sont allés au cinéma.',
      'Yesterday, my parents went to the cinema.',
    ]);
    expect(r(cinema, 'passe_compose', S('1p', 'f'))!.fr).toBe('Hier, nous sommes allées au cinéma.');
    expect(r(getUp, 'passe_compose', S('3s', 'f'))!.fr).toBe("Hier, elle s'est levée tôt.");
    expect(r(call, 'passe_compose', S('3s', 'f'), { cue: false })!.fr).toBe("Elle s'est appelée Léa.");
  });

  it('passer, monter, sortir… take avoir with a direct object', () => {
    expect(both(r(suitcases, 'passe_compose', S('3s', 'f')))).toEqual(['Hier, elle a monté les valises.', 'Yesterday, she carried up the suitcases.']);
    expect(both(r(train, 'passe_compose', S('3s', 'f')))).toEqual(['Hier, elle est montée dans le train.', 'Yesterday, she got on the train.']);
    expect(both(r(week, 'passe_compose', S('1p'), { cue: false }))).toEqual(['Nous avons passé une semaine à Paris.', 'We spent a week in Paris.']);
    expect(both(r(paul, 'passe_compose', S('1s', 'f'), { cue: false }))).toEqual(['Je suis passée chez Paul.', "I stopped by Paul's."]);
    expect(both(r(goOut, 'passe_compose', S('3s', 'f'), { cue: false }))).toEqual(['Elle est sortie avec ses amis.', 'She went out with her friends.']);
    expect(r(goOutTonight, 'futur_anterieur', S('3p', 'f'))!.fr).toBe("D'ici demain, elles seront sorties ce soir.");
    const goOutWith: Frame = { ...goOut, id: 'go-out-with', object: 'person' };
    expect(both(r(goOutWith, 'passe_compose', S('1s', 'f'), { negation: 'personne' }))).toEqual([
      'Hier, je ne suis sortie avec personne.',
      "Yesterday, I didn't go out with anyone.",
    ]);
    const takeOut: Frame = { ...base, id: 'take-out', verb: 'sortir', fr: 'la poubelle', frNeg: 'la poubelle', en: 'the rubbish', enVerb: 'take out', object: 'thing' };
    expect(both(r(takeOut, 'passe_compose', S('3s', 'f')))).toEqual(['Hier, elle a sorti la poubelle.', 'Yesterday, she took out the rubbish.']);
  });

  it('reflexive + direct object: no agreement', () => {
    expect(both(r(teeth, 'passe_compose', S('3s', 'f')))).toEqual(["Hier, elle s'est brossé les dents.", 'Yesterday, she brushed her teeth.']);
    const coffee: Frame = { ...base, id: 'coffee', verb: 'se préparer', fr: 'un café', en: 'a coffee', enVerb: 'make {myself}', object: 'thing' };
    expect(both(r(coffee, 'passe_compose', S('3s', 'f')))).toEqual(["Hier, elle s'est préparé un café.", 'Yesterday, she made herself a coffee.']);
    expect(r(story, 'passe_compose', S('1p', 'f'))!.fr).toBe('Hier, nous nous sommes souvenues de cette histoire.');
  });

  it('complement notation: possessives and adjective agreement', () => {
    expect(both(r(homework, 'present', S('3p')))).toEqual(["D'habitude, ils font leurs devoirs.", 'Usually, they do their homework.']);
    expect(both(r(homework, 'imperatif', S('2s')))).toEqual(['Fais tes devoirs !', 'Do your homework!']);
    expect(both(r(happy, 'imparfait', S('1p', 'f'), { cue: false }))).toEqual(['Nous étions contentes.', 'We were happy.']);
    expect(both(r(happy, 'present', S('3s', 'f')))).toEqual(["D'habitude, elle est contente.", "Usually, she's happy."]);
    expect(resolveComplement('{content|contente}', '3s', 'f')).toBe('contente');
    expect(resolveComplement('{mon} ami et {ma} sœur', '2p', 'm')).toBe('votre ami et votre sœur');
    expect(resolveComplement('{myself}', '3s', 'f')).toBe('herself');
  });

  it('impersonal verbs and modals', () => {
    expect(both(r(rain, 'futur_proche', S('3s')))).toEqual(['Ce soir, il va pleuvoir.', "Tonight, it's going to rain."]);
    expect(both(r(rain, 'passe_compose', S('3s'), { qform: 'inversion' }))).toEqual(['Hier, a-t-il plu ?', 'Yesterday, did it rain?']);
    expect(r(rain, 'present', S('1s'))).toBeNull();
    expect(both(r(come, 'conditionnel_passe', S('1s')))).toEqual(["Avec plus de temps, j'aurais pu venir.", 'With more time, I could have come.']);
    expect(both(r(canEat, 'conditionnel_passe', S('1s')))).toEqual([
      "Avec plus de temps, j'aurais pu manger une pomme.",
      'With more time, I could have eaten an apple.',
    ]);
    expect(both(r(come, 'passe_compose', S('3s'), { negation: 'pas' }))).toEqual(["Hier, il n'a pas pu venir.", "Yesterday, he wasn't able to come."]);
  });
});

describe('renderSentence: constraints', () => {
  it('never picks a cue that contradicts the frame', () => {
    const dinner: Frame = { ...base, id: 'dinner', verb: 'préparer', fr: 'le dîner', en: 'dinner', enVerb: 'make' };
    const breakfast: Frame = { ...base, id: 'breakfast', verb: 'prendre', fr: 'le petit-déjeuner', en: 'breakfast', enVerb: 'have' };
    for (let i = 0; i < 20; i++) {
      const rand = () => i / 20;
      expect(r(dinner, 'passe_compose', S('1s'), { rand })!.fr).not.toMatch(/^Ce matin/);
      expect(r(dinner, 'plus_que_parfait', S('1s'), { rand })!.fr).not.toMatch(/^À midi/);
      expect(r(breakfast, 'present', S('1s'), { rand })!.fr).not.toMatch(/^Le soir/);
      expect(r(getUp, 'futur_proche', S('1s'), { rand })!.fr).not.toMatch(/^Ce soir/);
      // a state isn't interrupted by the phone: "Quand le téléphone a sonné, j'étais content"
      expect(r(happy, 'imparfait', S('1s'), { rand })!.fr).not.toMatch(/téléphone/);
    }
  });

  it('respects frame.persons and frame.tenses', () => {
    expect(r({ ...apple, persons: ['1s'] }, 'present', S('2s'))).toBeNull();
    expect(r({ ...apple, persons: ['1s'] }, 'present', S('1s'))).not.toBeNull();
    expect(r({ ...apple, tenses: ['present'] }, 'futur_simple', S('1s'))).toBeNull();
    expect(r(apple, 'subjonctif_passe', S('1s'))).toBeNull(); // default tenses exclude it
  });

  it('imperative: 2s/1p/2p only, no question, no noun subject', () => {
    expect(r(apple, 'imperatif', S('1s'))).toBeNull();
    expect(r(apple, 'imperatif', S('3p'))).toBeNull();
    expect(r(apple, 'imperatif', S('2s'), { qform: 'intonation' })).toBeNull();
    expect(r(apple, 'imperatif', S('2p', 'm', 'les enfants', 'the children'))).toBeNull();
    expect(r(apple, 'subjonctif_present', S('2s'), { qform: 'est-ce-que' })).toBeNull();
  });

  it('exports cues for every tense', () => {
    for (const t of TENSES) expect(Array.isArray(CUES[t.id])).toBe(true);
    expect(CUES.passe_simple.every((c) => c.persons?.every((p) => p === '3s' || p === '3p'))).toBe(true);
    expect(CUES.present[0]).toMatchObject({ fr: "D'habitude,", en: 'Usually,', aspect: 'habitual' });
    expect(CUES.passe_compose[0]).toMatchObject({ fr: 'Hier,', en: 'Yesterday,' });
  });

  it('every rendering is well formed', () => {
    const frames = [apple, getUp, cinema, friends, suitcases, teeth, homework, happy, come, smoke, rain, call, talk, football, story, bread];
    const negations: (Negation | undefined)[] = [undefined, 'pas', 'jamais', 'plus', 'rien', 'personne'];
    const qforms: (QForm | undefined)[] = [undefined, 'intonation', 'est-ce-que', 'inversion'];
    const subjects: Subject[] = [
      ...PERSONS.flatMap((p) => [S(p), S(p, 'f')]),
      S('3s', 'f', 'Anne', 'Anne'),
      S('3p', 'm', 'mes parents', 'my parents'),
      S('3s', 'm', 'on', 'we'),
    ];
    let rendered = 0;
    for (const frame of frames) {
      for (const t of TENSES) {
        for (const subject of subjects) {
          for (const negation of negations) {
            for (const qform of qforms) {
              const res = renderSentence({ ...frame, tenses: undefined }, { tense: t.id, subject, negation, qform, rand: () => 0.5 });
              if (!res) continue;
              rendered++;
              const where = `${frame.id} ${t.id} ${JSON.stringify(subject)} ${negation} ${qform}: ${res.fr} | ${res.en}`;
              expect(res.before + res.verbFr + res.after, where).toBe(res.fr);
              expect(res.fr, where).toMatch(/^[A-ZÀ-Ý]/);
              expect(res.fr, where).toMatch(qform ? /[^ ] \?$/ : t.id === 'imperatif' ? /[^ ] !$/ : /[^ ]\.$/);
              expect(res.en, where).toMatch(/^[A-Z]/);
              expect(res.en, where).toMatch(qform ? /[a-z']\?$/i : /[a-z'.]?[.!]$/i);
              expect(`${res.fr} ${res.en}`, where).not.toMatch(/ {2}|undefined|null|\{|\}|\s[,.]/);
              expect(res.fr.includes(res.verbFr), where).toBe(true);
            }
          }
        }
      }
    }
    expect(rendered).toBeGreaterThan(2000);
  });
});
