import { getConjugation, mergeVerbsData } from 'english-verbs-helper';
import IRREGULAR_REF from 'english-verbs-irregular/dist/verbs.json';
import { describe, expect, it } from 'vitest';
import {
  englishClause,
  englishObject,
  englishSubject,
  englishVerb,
  gerund,
  IRREGULAR,
  pastParticipleEn,
  pastTense,
  thirdPerson,
} from './english';
import type { Negation, Person, Tense } from './types';
import { VERBS } from './verb-list';

// english-verbs-helper / english-verbs-irregular are the reference here (tests only).
const IRREGULAR_REF_TABLE: Record<string, string[][]> = IRREGULAR_REF;

type O = Parameters<typeof englishClause>[3];
function check(rows: [verb: string, tense: Tense, person: Person, opts: O | null, expected: string][]) {
  for (const [verb, tense, person, opts, expected] of rows) {
    expect(englishClause(verb, tense, person, opts ?? {}), `${verb} ${tense} ${person} ${JSON.stringify(opts ?? {})}`).toBe(expected);
  }
}
const q = { question: true };
const neg = (negation: Negation, extra: O = {}): O => ({ negation, ...extra });

describe('englishVerb / pronouns', () => {
  it('takes the first meaning of a gloss', () => {
    expect(englishVerb('to speak, to talk')).toBe('speak');
    expect(englishVerb('to put to bed')).toBe('put to bed');
    expect(englishVerb('can, to be able to')).toBe('can');
    expect(englishVerb('must, to have to')).toBe('must');
    expect(englishVerb('to wake (someone) up')).toBe('wake up');
    expect(englishVerb('to brush (your hair, teeth)')).toBe('brush');
    expect(englishVerb('to know (a fact)')).toBe('know');
    expect(englishVerb('to be necessary (il faut)')).toBe('be necessary');
    expect(englishVerb('to have a shower')).toBe('have a shower');
  });

  it('subjects and objects', () => {
    expect(englishSubject('1s')).toBe('I');
    expect(englishSubject('2s')).toBe('you');
    expect(englishSubject('3s')).toBe('he');
    expect(englishSubject('3s', 'f')).toBe('she');
    expect(englishSubject('1p')).toBe('we');
    expect(englishSubject('2p')).toBe('you');
    expect(englishSubject('3p', 'f')).toBe('they');
    expect(englishObject('3s', 'f')).toBe('her');
    expect(englishObject('1p')).toBe('us');
  });
});

describe('morphology', () => {
  it('-s, -ed, -ing spelling rules', () => {
    expect(thirdPerson('go')).toBe('goes');
    expect(thirdPerson('watch')).toBe('watches');
    expect(thirdPerson('fix')).toBe('fixes');
    expect(thirdPerson('try')).toBe('tries');
    expect(thirdPerson('play')).toBe('plays');
    expect(thirdPerson('have')).toBe('has');
    expect(thirdPerson('ski')).toBe('skis');
    expect(pastTense('stop')).toBe('stopped');
    expect(pastTense('visit')).toBe('visited');
    expect(pastTense('prefer')).toBe('preferred');
    expect(pastTense('regret')).toBe('regretted');
    expect(pastTense('travel')).toBe('travelled');
    expect(pastTense('try')).toBe('tried');
    expect(pastTense('play')).toBe('played');
    expect(pastTense('dance')).toBe('danced');
    expect(pastTense('ski')).toBe('skied');
    expect(pastTense('open')).toBe('opened');
    expect(gerund('make')).toBe('making');
    expect(gerund('see')).toBe('seeing');
    expect(gerund('die')).toBe('dying');
    expect(gerund('lie')).toBe('lying');
    expect(gerund('run')).toBe('running');
    expect(gerund('swim')).toBe('swimming');
    expect(gerund('travel')).toBe('travelling');
    expect(gerund('ski')).toBe('skiing');
    expect(gerund('begin')).toBe('beginning');
    expect(gerund('visit')).toBe('visiting');
    expect(gerund('argue')).toBe('arguing');
    expect(gerund('agree')).toBe('agreeing');
    expect(gerund('fix')).toBe('fixing');
    expect(gerund('panic')).toBe('panicking');
  });

  it('has a solid irregular table (≥ 150 verbs) that matches the reference', () => {
    expect(Object.keys(IRREGULAR).length).toBeGreaterThanOrEqual(150);
    // standard forms the reference lists differently or lacks
    const accepted = new Set(['bet', 'slit', 'wet', 'babysit', 'befall', 'behold', 'underpay']);
    const diffs = Object.entries(IRREGULAR)
      .filter(([base]) => !accepted.has(base))
      .filter(([base, [past, pp]]) => !(IRREGULAR_REF_TABLE[base] ?? []).some(([a, b]) => a === past && b === pp))
      .map(([base, forms]) => `${base}: ${forms.join('/')}`);
    expect(diffs).toEqual([]);
    expect(pastTense('go')).toBe('went');
    expect(pastParticipleEn('go')).toBe('gone');
    expect(pastParticipleEn('eat')).toBe('eaten');
    expect(pastParticipleEn('get')).toBe('got');
    expect(pastTense('understand')).toBe('understood');
    expect(pastParticipleEn('forgive')).toBe('forgiven');
  });

  it('agrees with english-verbs-helper on every verb of the list', () => {
    const data = mergeVerbsData(IRREGULAR_REF_TABLE, {});
    // British spellings and forms where the reference is American or wrong ("prefered")
    const known = new Set(['prove', 'stink', 'signal', 'travel', 'bear', 'get', 'prefer']);
    const heads = new Set(VERBS.map((v) => englishVerb(v.en).split(' ')[0]));
    const diffs: string[] = [];
    for (const h of heads) {
      if (h === 'can' || h === 'must' || h === 'be' || known.has(h)) continue;
      const ref3 = getConjugation(data, h, 'PRESENT', 2, {});
      const refPast = getConjugation(data, h, 'SIMPLE_PAST', 2, {});
      const refPerfect = getConjugation(data, h, 'PERFECT_PRESENT', 2, {});
      if (ref3 !== thirdPerson(h)) diffs.push(`${h}: ${thirdPerson(h)} ≠ ${ref3}`);
      if (refPast !== pastTense(h)) diffs.push(`${h}: ${pastTense(h)} ≠ ${refPast}`);
      if (refPerfect !== `has ${pastParticipleEn(h)}`) diffs.push(`${h}: has ${pastParticipleEn(h)} ≠ ${refPerfect}`);
    }
    expect(heads.size).toBeGreaterThan(250);
    expect(diffs).toEqual([]);
  });
});

describe('englishClause', () => {
  it('every tense', () =>
    check([
      ['speak', 'present', '3s', { gender: 'f' }, 'she speaks'],
      ['speak', 'present', '1s', { aspect: 'progressive' }, "I'm speaking"],
      ['speak', 'passe_compose', '1s', null, 'I spoke'],
      ['speak', 'imparfait', '1s', { aspect: 'progressive' }, 'I was speaking'],
      ['speak', 'imparfait', '1s', { aspect: 'habitual' }, 'I used to speak'],
      ['be hungry', 'imparfait', '1s', { stative: true }, 'I was hungry'],
      ['know', 'imparfait', '3s', { aspect: 'progressive' }, 'he knew'],
      ['look like', 'imparfait', '3s', { aspect: 'progressive', gender: 'f' }, 'she looked like'],
      ['speak', 'plus_que_parfait', '1p', null, 'we had spoken'],
      ['speak', 'passe_simple', '3s', null, 'he spoke'],
      ['speak', 'futur_simple', '1p', null, 'we will speak'],
      ['speak', 'futur_anterieur', '3p', null, 'they will have spoken'],
      ['speak', 'futur_proche', '1s', null, "I'm going to speak"],
      ['speak', 'futur_proche', '3s', { subject: 'Marie' }, 'Marie is going to speak'],
      ['speak', 'passe_recent', '1s', null, 'I have just spoken'],
      ['speak', 'passe_recent', '3s', { gender: 'f' }, 'she has just spoken'],
      ['speak', 'conditionnel_present', '2s', null, 'you would speak'],
      ['speak', 'conditionnel_passe', '2p', null, 'you would have spoken'],
      ['speak', 'imperatif', '2s', null, 'speak'],
      ['speak', 'imperatif', '1p', null, "let's speak"],
      ['get up', 'imperatif', '2p', null, 'get up'],
      ['be', 'present', '1s', null, "I'm"],
      ['be', 'imparfait', '3p', { stative: true }, 'they were'],
      ['be', 'passe_compose', '3s', { gender: 'f' }, 'she was'],
      ['have', 'present', '3s', null, 'he has'],
      ['go', 'present', '3s', null, 'he goes'],
      ['eat', 'passe_compose', '3p', null, 'they ate'],
      ['get up', 'passe_recent', '1p', null, 'we have just got up'],
      ['have lunch', 'imparfait', '3s', { aspect: 'progressive', gender: 'f' }, 'she was having lunch'],
      ['rain', 'futur_proche', '3s', null, "it's going to rain"],
      ['rain', 'passe_compose', '3s', null, 'it rained'],
    ]));

  it('negation and do-support', () =>
    check([
      ['speak', 'present', '3s', neg('pas', { gender: 'f' }), "she doesn't speak"],
      ['speak', 'present', '1s', neg('pas'), "I don't speak"],
      ['speak', 'passe_compose', '2s', neg('pas'), "you didn't speak"],
      ['speak', 'futur_simple', '1s', neg('pas'), "I won't speak"],
      ['speak', 'conditionnel_present', '1s', neg('pas'), "I wouldn't speak"],
      ['speak', 'plus_que_parfait', '3s', neg('pas'), "he hadn't spoken"],
      ['speak', 'futur_proche', '1s', neg('pas'), "I'm not going to speak"],
      ['speak', 'futur_proche', '3s', neg('pas'), "he isn't going to speak"],
      ['speak', 'passe_recent', '1s', neg('pas'), "I haven't just spoken"],
      ['speak', 'imparfait', '1s', neg('pas'), "I didn't use to speak"],
      ['speak', 'imparfait', '1s', neg('jamais'), 'I never used to speak'],
      ['speak', 'present', '3s', neg('jamais'), 'he never speaks'],
      ['speak', 'passe_compose', '1s', neg('jamais'), 'I have never spoken'],
      ['speak', 'futur_simple', '1s', neg('jamais'), 'I will never speak'],
      ['eat', 'conditionnel_passe', '1s', neg('jamais'), 'I would never have eaten'],
      ['smoke', 'present', '1s', neg('plus'), "I don't smoke anymore"],
      ['smoke', 'futur_simple', '3s', neg('plus'), "he won't smoke anymore"],
      ['eat', 'present', '1s', neg('rien'), "I don't eat anything"],
      ['see', 'passe_compose', '1s', neg('personne'), "I didn't see anyone"],
      ['see', 'futur_proche', '1s', neg('personne'), "I'm not going to see anyone"],
      ['be', 'present', '1s', neg('pas'), "I'm not"],
      ['be', 'present', '3s', neg('pas', { gender: 'f' }), "she isn't"],
      ['be', 'present', '3p', neg('jamais'), "they're never"],
      ['have', 'present', '3s', neg('pas'), "he doesn't have"],
      ['speak', 'imperatif', '2s', neg('pas'), "don't speak"],
      ['speak', 'imperatif', '1p', neg('pas'), "let's not speak"],
      ['be late', 'imperatif', '2p', neg('pas'), "don't be late"],
      ['forget', 'imperatif', '2s', neg('jamais'), 'never forget'],
      ['eat', 'imperatif', '2s', neg('rien'), "don't eat anything"],
      ['eat', 'futur_anterieur', '1s', neg('pas'), "I won't have eaten"],
    ]));

  it('questions', () =>
    check([
      ['speak', 'present', '2s', q, 'do you speak'],
      ['speak', 'present', '3s', { question: true, gender: 'f' }, 'does she speak'],
      ['speak', 'passe_compose', '2s', q, 'did you speak'],
      ['speak', 'passe_compose', '2s', { question: true, negation: 'jamais' }, 'have you never spoken'],
      ['speak', 'futur_simple', '2p', q, 'will you speak'],
      ['speak', 'futur_proche', '2s', q, 'are you going to speak'],
      ['speak', 'futur_proche', '1s', { question: true, negation: 'pas' }, 'am I not going to speak'],
      ['speak', 'passe_recent', '3s', q, 'has he just spoken'],
      ['speak', 'imparfait', '2s', q, 'did you use to speak'],
      ['speak', 'imparfait', '2s', { question: true, aspect: 'progressive' }, 'were you speaking'],
      ['see', 'imparfait', '2s', { question: true, negation: 'jamais' }, 'did you never see'],
      ['leave', 'imparfait', '1s', { negation: 'plus' }, "I didn't leave anymore"],
      ['speak', 'present', '2s', { question: true, negation: 'pas' }, "don't you speak"],
      ['eat', 'passe_compose', '3s', { question: true, negation: 'pas' }, "didn't he eat"],
      ['eat', 'plus_que_parfait', '2s', { question: true, negation: 'pas' }, "hadn't you eaten"],
      ['be', 'present', '3s', { question: true, negation: 'pas', gender: 'f' }, "isn't she"],
      ['be', 'present', '1s', { question: true, negation: 'pas' }, 'am I not'],
      ['be', 'present', '2s', q, 'are you'],
      ['get up', 'present', '3s', { question: true, negation: 'jamais' }, 'does he never get up'],
      ['eat', 'passe_compose', '3s', { question: true, subject: 'Marie' }, 'did Marie eat'],
      ['eat', 'conditionnel_passe', '2s', q, 'would you have eaten'],
      ['eat', 'present', '2s', { question: true, negation: 'rien' }, "don't you eat anything"],
    ]));

  it('modals in every tense', () =>
    check([
      ['can', 'present', '1s', null, 'I can'],
      ['can', 'present', '1s', neg('pas'), "I can't"],
      ['can', 'present', '2s', q, 'can you'],
      ['can', 'imparfait', '1s', neg('pas'), "I couldn't"],
      ['can', 'passe_compose', '3s', null, 'he was able to'],
      ['can', 'passe_compose', '3s', neg('pas'), "he wasn't able to"],
      ['can', 'passe_compose', '3s', neg('jamais'), 'he has never been able to'],
      ['can', 'futur_simple', '3s', q, 'will he be able to'],
      ['can', 'futur_proche', '1s', null, "I'm going to be able to"],
      ['can', 'conditionnel_present', '1p', null, 'we could'],
      ['can', 'conditionnel_passe', '1s', null, 'I could have'],
      ['can', 'plus_que_parfait', '3p', null, 'they had been able to'],
      ['must', 'present', '1s', null, 'I have to'],
      ['must', 'present', '3s', null, 'he has to'],
      ['must', 'present', '3s', neg('pas'), "he mustn't"],
      ['must', 'present', '2s', neg('jamais'), 'you must never'],
      ['must', 'present', '3s', q, 'does he have to'],
      ['must', 'present', '1p', { question: true, negation: 'jamais' }, 'must we never'],
      ['must', 'present', '2s', { question: true, negation: 'pas' }, "don't you have to"],
      ['must', 'passe_compose', '3s', null, 'he had to'],
      ['must', 'passe_compose', '3s', neg('pas'), "he didn't have to"],
      ['must', 'imparfait', '1s', null, 'I had to'],
      ['must', 'futur_simple', '1p', null, 'we will have to'],
      ['must', 'futur_simple', '1p', neg('pas'), "we won't have to"],
      ['must', 'conditionnel_present', '2s', null, 'you should'],
      ['must', 'conditionnel_passe', '2s', neg('pas'), "you shouldn't have"],
      ['want', 'present', '3s', null, 'he wants'],
      ['want', 'present', '3s', neg('pas'), "he doesn't want"],
      ['want', 'passe_compose', '1s', null, 'I wanted'],
      ['want', 'imparfait', '1s', { aspect: 'progressive' }, 'I wanted'],
      ['want', 'conditionnel_present', '1s', null, 'I would like'],
      ['want', 'conditionnel_passe', '1s', null, 'I would have liked'],
      ['want', 'conditionnel_present', '1s', neg('pas'), "I wouldn't want"],
      ['want', 'conditionnel_passe', '3p', neg('jamais'), 'they would never have wanted'],
      ['want', 'conditionnel_present', '2s', q, 'would you like'],
      ['want', 'futur_simple', '2s', q, 'will you want'],
    ]));
});
