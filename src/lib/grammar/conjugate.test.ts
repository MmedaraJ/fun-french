import { getConjugation, type Tense as RefTense } from 'french-verbs';
import type { VerbsInfo } from 'french-verbs-lefff';
import { describe, expect, it } from 'vitest';
import verbsData from '../../data/grammar/verbs-fr.json';
import {
  auxiliary,
  conjugate,
  conjugationTable,
  hasVerb,
  pastParticiple,
  vowelSound,
  type ConjugateOptions,
} from './conjugate';
import { PERSONS, type Negation, type Person, type Tense } from './types';
import { baseInf, isPronominal, VERBS } from './verb-list';

// The build script (plain Node) regenerates verbs-fr.json and loads the full Lefff tables,
// which are the reference here (tests only; they never reach the app bundle).
interface BuildScript {
  buildVerbData(): { json: string };
  readOutput(): string;
  loadLefff(): VerbsInfo;
}
const BUILD_SCRIPT = '../../../scripts/build-verbs.mjs';
const build = (await import(/* @vite-ignore */ BUILD_SCRIPT)) as BuildScript;
const LEFFF = build.loadLefff();
type Table = Record<string, (string | null)[]>;
const ref = (verb: string, tense: RefTense, person: number, composed: Parameters<typeof getConjugation>[4], pronominal: boolean) =>
  getConjugation(LEFFF, verb, tense, person, composed, pronominal, undefined, undefined, 'Act');

/** Where the app deliberately differs from Lefff (mirrors OVERRIDES in scripts/build-verbs.mjs). */
const OVERRIDES: Record<string, Table> = {
  pouvoir: { P: ['peux', 'peux', 'peut', 'pouvons', 'pouvez', 'peuvent'] },
  devoir: { K: ['dû', 'dus', 'due', 'dues'] },
  taire: { P: ['tais', 'tais', 'tait', 'taisons', 'taisez', 'taisent'] },
  plaire: { K: ['plu', 'plu', 'plu', 'plu'] },
  payer: {
    P: ['paie', 'paies', 'paie', 'payons', 'payez', 'paient'],
    S: ['paie', 'paies', 'paie', 'payions', 'payiez', 'paient'],
    Y: ['NA', 'paie', 'NA', 'payons', 'payez', 'NA'],
    F: ['paierai', 'paieras', 'paiera', 'paierons', 'paierez', 'paieront'],
    C: ['paierais', 'paierais', 'paierait', 'paierions', 'paieriez', 'paieraient'],
  },
  essayer: {
    P: ['essaie', 'essaies', 'essaie', 'essayons', 'essayez', 'essaient'],
    S: ['essaie', 'essaies', 'essaie', 'essayions', 'essayiez', 'essaient'],
    Y: ['NA', 'essaie', 'NA', 'essayons', 'essayez', 'NA'],
    F: ['essaierai', 'essaieras', 'essaiera', 'essaierons', 'essaierez', 'essaieront'],
    C: ['essaierais', 'essaierais', 'essaierait', 'essaierions', 'essaieriez', 'essaieraient'],
  },
  asseoir: {
    P: ['assieds', 'assieds', 'assied', 'asseyons', 'asseyez', 'asseyent'],
    I: ['asseyais', 'asseyais', 'asseyait', 'asseyions', 'asseyiez', 'asseyaient'],
    F: ['assiérai', 'assiéras', 'assiéra', 'assiérons', 'assiérez', 'assiéront'],
    C: ['assiérais', 'assiérais', 'assiérait', 'assiérions', 'assiériez', 'assiéraient'],
    S: ['asseye', 'asseyes', 'asseye', 'asseyions', 'asseyiez', 'asseyent'],
    Y: ['NA', 'assieds', 'NA', 'asseyons', 'asseyez', 'NA'],
  },
};

const SIMPLE: [Tense, keyof Table & string, RefTense][] = [
  ['present', 'P', 'PRESENT'],
  ['imparfait', 'I', 'IMPARFAIT'],
  ['passe_simple', 'J', 'PASSE_SIMPLE'],
  ['futur_simple', 'F', 'FUTUR'],
  ['conditionnel_present', 'C', 'CONDITIONNEL_PRESENT'],
  ['subjonctif_present', 'S', 'SUBJONCTIF_PRESENT'],
];
const COMPOUND: [Tense, RefTense][] = [
  ['passe_compose', 'PASSE_COMPOSE'],
  ['plus_que_parfait', 'PLUS_QUE_PARFAIT'],
  ['futur_anterieur', 'FUTUR_ANTERIEUR'],
  ['conditionnel_passe', 'CONDITIONNEL_PASSE_1'],
  ['subjonctif_passe', 'SUBJONCTIF_PASSE'],
];
const IMPERSONAL = new Set(['falloir', 'pleuvoir']);
const REFL = ['me', 'te', 'se', 'nous', 'vous', 'se'];
const STRESSED: Partial<Record<Person, string>> = { '2s': 'toi', '1p': 'nous', '2p': 'vous' };
const ALL_TENSES: Tense[] = [
  'present', 'passe_compose', 'imparfait', 'plus_que_parfait', 'passe_simple', 'futur_simple', 'futur_anterieur',
  'futur_proche', 'passe_recent', 'conditionnel_present', 'conditionnel_passe', 'subjonctif_present',
  'subjonctif_passe', 'imperatif',
];

const persons = (inf: string): Person[] => (IMPERSONAL.has(baseInf(inf)) ? ['3s'] : PERSONS);

describe('verb data', () => {
  it('knows every verb of the verb list', () => {
    const missing = VERBS.filter((v) => !hasVerb(v.inf)).map((v) => v.inf);
    expect(missing, 'run `node scripts/build-verbs.mjs`').toEqual([]);
  });

  it('ships only the verbs of the list (plus the helper verbs)', () => {
    const ours = new Set([...VERBS.map((v) => baseInf(v.inf)), 'être', 'avoir', 'aller', 'venir']);
    const extra = Object.keys((verbsData as { verbs: Record<string, number> }).verbs).filter((v) => !ours.has(v));
    expect(extra).toEqual([]);
  });

  it('is what scripts/build-verbs.mjs generates (regenerate after editing the verb list)', () => {
    expect(build.readOutput()).toBe(build.buildVerbData().json);
  });

  it('every verb conjugates in every tense and allowed person', () => {
    const failures: string[] = [];
    for (const v of VERBS) {
      for (const tense of ALL_TENSES) {
        const ps = tense === 'imperatif' ? (['2s', '1p', '2p'] as Person[]) : persons(v.inf);
        for (const p of ps) {
          for (const gender of ['m', 'f'] as const) {
            const out = conjugate(v.inf, tense, p, { gender });
            const noImperative = tense === 'imperatif' && ['pouvoir', 'falloir', 'pleuvoir'].includes(v.inf);
            if (noImperative ? out !== null : !out || /\s\s|undefined|null/.test(out)) failures.push(`${v.inf} ${tense} ${p}: ${out}`);
          }
        }
      }
    }
    expect(failures).toEqual([]);
  });
});

describe('structural invariants (every verb × tense × person × negation × inversion)', () => {
  it('no missed or wrong elision, ne + negation word present, -t- only after a vowel', () => {
    const bad: string[] = [];
    const negations: (Negation | undefined)[] = [undefined, 'pas', 'jamais', 'plus', 'rien', 'personne'];
    for (const v of VERBS)
      for (const tense of ALL_TENSES)
        for (const p of PERSONS)
          for (const negation of negations)
            for (const inversion of [false, true]) {
              const out = conjugate(v.inf, tense, p, { negation, inversion, gender: p === '3p' ? 'f' : 'm' });
              if (!out) continue;
              const why: string[] = [];
              if (/\s\s|^\s|\s$/.test(out)) why.push('spacing');
              if (/(^|\s)(je|ne|me|te|se|de|que) [aeiouyéèêàâîôûh]/.test(out)) why.push('missed elision');
              if (/(^|\s)[jnmtsd]'[^aeiouyéèêàâîôûh]/.test(out)) why.push('wrong elision');
              if (negation && !(/(^|\s)(ne |n')/.test(out) && out.includes(negation))) why.push('negation');
              if (inversion && !/-(t-)?(il|elle|ils|elles|tu|nous|vous)\b/.test(out)) why.push('inversion');
              if (/[aeiouéè]-(il|elle)\b|[^aeiouéèêâ]-t-/.test(out)) why.push('-t-');
              if (why.length) bad.push(`${v.inf} ${tense} ${p} ${negation} ${inversion}: ${out} (${why})`);
            }
    expect(bad.slice(0, 20)).toEqual([]);
  });
});

describe('cross-check against the Lefff reference (french-verbs)', () => {
  it('simple tenses of every verb, every person', () => {
    const diffs: string[] = [];
    let checked = 0;
    for (const v of VERBS) {
      const base = baseInf(v.inf);
      const pronominal = isPronominal(v.inf);
      for (const [tense, slot, fvTense] of SIMPLE) {
        for (const p of persons(v.inf)) {
          const i = PERSONS.indexOf(p);
          const override = OVERRIDES[base]?.[slot];
          let expected: string;
          if (override) {
            const form = override[i]!;
            const r = REFL[i];
            expected = !pronominal ? form : r.length === 2 && vowelSound(form) ? `${r[0]}'${form}` : `${r} ${form}`;
          } else {
            expected = ref(v.inf, fvTense, i, {}, pronominal);
          }
          const got = conjugate(v.inf, tense, p, { pronoun: false });
          checked++;
          if (got !== expected) diffs.push(`${v.inf} ${tense} ${p}: ${got} ≠ ${expected}`);
        }
      }
    }
    expect(diffs).toEqual([]);
    expect(checked).toBeGreaterThan(12000);
  });

  it('imperative of every verb', () => {
    const diffs: string[] = [];
    for (const v of VERBS) {
      const base = baseInf(v.inf);
      const y = OVERRIDES[base]?.Y ?? LEFFF[base]?.Y;
      for (const p of ['2s', '1p', '2p'] as Person[]) {
        const form = y ? y[PERSONS.indexOf(p)] : null;
        const expected = !form || form === 'NA' ? null : isPronominal(v.inf) ? `${form}-${STRESSED[p]}` : form;
        const got = conjugate(v.inf, 'imperatif', p);
        if (got !== expected) diffs.push(`${v.inf} ${p}: ${got} ≠ ${expected}`);
      }
    }
    expect(diffs).toEqual([]);
  });

  it('compound tenses of every verb (auxiliary, agreement, reflexive pronoun)', () => {
    const diffs: string[] = [];
    for (const v of VERBS) {
      const aux = auxiliary(v.inf);
      for (const [tense, fvTense] of COMPOUND) {
        for (const p of persons(v.inf)) {
          for (const gender of ['m', 'f'] as const) {
            const i = PERSONS.indexOf(p);
            const agree = aux === 'être' && !IMPERSONAL.has(v.inf);
            const expected = ref(
              v.inf,
              fvTense,
              i,
              {
                aux: aux === 'être' ? 'ETRE' : 'AVOIR',
                agreeGender: agree && gender === 'f' ? 'F' : 'M',
                agreeNumber: agree && i >= 3 ? 'P' : 'S',
              },
              isPronominal(v.inf),
            )
              // french-verbs bug: for mute-h verbs it elides before any auxiliary ("m'suis habillé")
              .replace(/^([mts])'(?![aeiouéèêh])/, '$1e ');
            const got = conjugate(v.inf, tense, p, { pronoun: false, gender });
            if (got !== expected) diffs.push(`${v.inf} ${tense} ${p} ${gender}: ${got} ≠ ${expected}`);
          }
        }
      }
    }
    expect(diffs).toEqual([]);
  });
});

type Row = [inf: string, tense: Tense, person: Person, opts: ConjugateOptions | null, expected: string | null];
const f: ConjugateOptions = { gender: 'f' };

function check(rows: Row[]) {
  for (const [inf, tense, person, opts, expected] of rows) {
    expect(conjugate(inf, tense, person, opts ?? {}), `${inf} ${tense} ${person} ${JSON.stringify(opts ?? {})}`).toBe(expected);
  }
}

describe('present and spelling-change verbs', () => {
  it('regular and -cer/-ger', () =>
    check([
      ['parler', 'present', '1s', null, 'je parle'],
      ['parler', 'present', '2s', null, 'tu parles'],
      ['parler', 'present', '3s', f, 'elle parle'],
      ['parler', 'present', '1p', null, 'nous parlons'],
      ['parler', 'present', '2p', null, 'vous parlez'],
      ['parler', 'present', '3p', f, 'elles parlent'],
      ['commencer', 'present', '1p', null, 'nous commençons'],
      ['commencer', 'imparfait', '1s', null, 'je commençais'],
      ['commencer', 'imparfait', '1p', null, 'nous commencions'],
      ['commencer', 'passe_simple', '3s', null, 'il commença'],
      ['commencer', 'passe_simple', '3p', null, 'ils commencèrent'],
      ['lancer', 'imperatif', '1p', null, 'lançons'],
      ['manger', 'present', '1p', null, 'nous mangeons'],
      ['manger', 'imparfait', '3s', null, 'il mangeait'],
      ['manger', 'imparfait', '1p', null, 'nous mangions'],
      ['manger', 'passe_simple', '1p', null, 'nous mangeâmes'],
      ['nager', 'imparfait', '2s', null, 'tu nageais'],
      ['voyager', 'imperatif', '1p', null, 'voyageons'],
      ['finir', 'present', '1p', null, 'nous finissons'],
      ['finir', 'present', '3p', null, 'ils finissent'],
      ['choisir', 'subjonctif_present', '1s', null, 'je choisisse'],
    ]));

  it('e→è, é→è, -eler/-eter', () =>
    check([
      ['acheter', 'present', '1s', null, "j'achète"],
      ['acheter', 'present', '1p', null, 'nous achetons'],
      ['acheter', 'futur_simple', '1s', null, "j'achèterai"],
      ['lever', 'present', '3s', null, 'il lève'],
      ['se lever', 'present', '1s', null, 'je me lève'],
      ['se lever', 'present', '1p', null, 'nous nous levons'],
      ['se lever', 'present', '3p', null, 'ils se lèvent'],
      ['promener', 'present', '1s', null, 'je promène'],
      ['se promener', 'futur_simple', '1p', null, 'nous nous promènerons'],
      ['emmener', 'conditionnel_present', '2s', null, 'tu emmènerais'],
      ['préférer', 'present', '1s', null, 'je préfère'],
      ['préférer', 'present', '1p', null, 'nous préférons'],
      ['préférer', 'present', '3p', null, 'ils préfèrent'],
      ['préférer', 'futur_simple', '3s', null, 'il préférera'],
      ['préférer', 'conditionnel_present', '1s', null, 'je préférerais'],
      ['espérer', 'present', '2s', null, 'tu espères'],
      ['espérer', 'futur_simple', '1s', null, "j'espérerai"],
      ['répéter', 'present', '3p', null, 'ils répètent'],
      ['répéter', 'imperatif', '2s', null, 'répète'],
      ['célébrer', 'present', '3s', null, 'il célèbre'],
      ['célébrer', 'futur_simple', '1p', null, 'nous célébrerons'],
      ['appeler', 'present', '1s', null, "j'appelle"],
      ['appeler', 'present', '1p', null, 'nous appelons'],
      ['appeler', 'futur_simple', '1s', null, "j'appellerai"],
      ["s'appeler", 'present', '3s', f, "elle s'appelle"],
      ["s’appeler", 'present', '1s', null, "je m'appelle"],
      ["s'appeler", 'present', '1p', null, 'nous nous appelons'],
      ['rappeler', 'futur_simple', '1s', null, 'je rappellerai'],
      ['jeter', 'present', '3s', null, 'il jette'],
      ['jeter', 'present', '2p', null, 'vous jetez'],
      ['jeter', 'futur_simple', '3p', null, 'ils jetteront'],
    ]));

  it('-yer verbs (paie, essaie, nettoie, envoie)', () =>
    check([
      ['payer', 'present', '1s', null, 'je paie'],
      ['payer', 'present', '1p', null, 'nous payons'],
      ['payer', 'present', '3p', null, 'ils paient'],
      ['payer', 'futur_simple', '1s', null, 'je paierai'],
      ['payer', 'subjonctif_present', '3s', null, 'il paie'],
      ['payer', 'imperatif', '2s', null, 'paie'],
      ['essayer', 'present', '2s', null, 'tu essaies'],
      ['essayer', 'futur_simple', '1p', null, 'nous essaierons'],
      ['nettoyer', 'present', '3s', null, 'il nettoie'],
      ['nettoyer', 'present', '1p', null, 'nous nettoyons'],
      ['nettoyer', 'futur_simple', '1s', null, 'je nettoierai'],
      ['employer', 'present', '3p', null, 'ils emploient'],
      ['envoyer', 'present', '1s', null, "j'envoie"],
      ['envoyer', 'present', '1p', null, 'nous envoyons'],
      ['envoyer', 'imparfait', '1p', null, 'nous envoyions'],
      ['envoyer', 'futur_simple', '1s', null, "j'enverrai"],
      ['envoyer', 'conditionnel_present', '2s', null, 'tu enverrais'],
      ["s'ennuyer", 'present', '1s', null, "je m'ennuie"],
      ["s'ennuyer", 'futur_simple', '1s', null, "je m'ennuierai"],
    ]));

  it('irregular presents', () =>
    check([
      ['être', 'present', '1s', null, 'je suis'],
      ['être', 'present', '2p', null, 'vous êtes'],
      ['être', 'present', '3p', null, 'ils sont'],
      ['avoir', 'present', '1s', null, "j'ai"],
      ['avoir', 'present', '3p', null, 'ils ont'],
      ['aller', 'present', '1s', null, 'je vais'],
      ['aller', 'present', '3p', null, 'ils vont'],
      ['faire', 'present', '2p', null, 'vous faites'],
      ['faire', 'present', '3p', null, 'ils font'],
      ['dire', 'present', '2p', null, 'vous dites'],
      ['pouvoir', 'present', '1s', null, 'je peux'],
      ['pouvoir', 'present', '3p', null, 'ils peuvent'],
      ['vouloir', 'present', '3p', null, 'ils veulent'],
      ['savoir', 'present', '1s', null, 'je sais'],
      ['venir', 'present', '3p', null, 'ils viennent'],
      ['devoir', 'present', '3p', null, 'ils doivent'],
      ['prendre', 'present', '3p', null, 'ils prennent'],
      ['boire', 'present', '1p', null, 'nous buvons'],
      ['boire', 'present', '3p', null, 'ils boivent'],
      ['recevoir', 'present', '1s', null, 'je reçois'],
      ['recevoir', 'present', '3p', null, 'ils reçoivent'],
      ['connaître', 'present', '3s', null, 'il connaît'],
      ['naître', 'present', '3s', null, 'il naît'],
      ['plaire', 'present', '3s', null, 'il plaît'],
      ['mourir', 'present', '3s', null, 'il meurt'],
      ['écrire', 'present', '1p', null, 'nous écrivons'],
      ['peindre', 'present', '1p', null, 'nous peignons'],
      ['ouvrir', 'present', '1s', null, "j'ouvre"],
      ['rire', 'present', '1p', null, 'nous rions'],
      ['croire', 'present', '3p', null, 'ils croient'],
      ['se taire', 'present', '3s', null, 'il se tait'],
      ['se souvenir', 'present', '1s', null, 'je me souviens'],
      ["s'asseoir", 'present', '1s', null, "je m'assieds"],
      ["s'asseoir", 'present', '3s', null, "il s'assied"],
      ["s'asseoir", 'present', '1p', null, 'nous nous asseyons'],
      ["s'asseoir", 'present', '3p', null, "ils s'asseyent"],
      ['falloir', 'present', '3s', null, 'il faut'],
      ['falloir', 'present', '3s', f, 'il faut'],
      ['falloir', 'present', '1s', null, null],
      ['pleuvoir', 'present', '3s', null, 'il pleut'],
    ]));
});

describe('futur, conditionnel, imparfait, passé simple', () => {
  it('irregular future and conditional stems', () =>
    check([
      ['être', 'futur_simple', '1s', null, 'je serai'],
      ['avoir', 'futur_simple', '1s', null, "j'aurai"],
      ['aller', 'futur_simple', '1s', null, "j'irai"],
      ['faire', 'futur_simple', '3s', null, 'il fera'],
      ['pouvoir', 'futur_simple', '1p', null, 'nous pourrons'],
      ['vouloir', 'futur_simple', '2p', null, 'vous voudrez'],
      ['savoir', 'futur_simple', '3p', null, 'ils sauront'],
      ['voir', 'futur_simple', '1s', null, 'je verrai'],
      ['venir', 'futur_simple', '1s', null, 'je viendrai'],
      ['devoir', 'futur_simple', '2s', null, 'tu devras'],
      ['tenir', 'futur_simple', '3s', null, 'il tiendra'],
      ['courir', 'futur_simple', '1s', null, 'je courrai'],
      ['mourir', 'futur_simple', '3s', null, 'il mourra'],
      ['recevoir', 'futur_simple', '1s', null, 'je recevrai'],
      ['falloir', 'futur_simple', '3s', null, 'il faudra'],
      ['pleuvoir', 'futur_simple', '3s', null, 'il pleuvra'],
      ["s'asseoir", 'futur_simple', '1s', null, "je m'assiérai"],
      ['être', 'conditionnel_present', '1s', null, 'je serais'],
      ['avoir', 'conditionnel_present', '2s', null, 'tu aurais'],
      ['aller', 'conditionnel_present', '3s', null, 'il irait'],
      ['faire', 'conditionnel_present', '1p', null, 'nous ferions'],
      ['pouvoir', 'conditionnel_present', '2p', null, 'vous pourriez'],
      ['vouloir', 'conditionnel_present', '1s', null, 'je voudrais'],
      ['devoir', 'conditionnel_present', '2s', null, 'tu devrais'],
      ['falloir', 'conditionnel_present', '3s', null, 'il faudrait'],
    ]));

  it('imparfait', () =>
    check([
      ['être', 'imparfait', '1s', null, "j'étais"],
      ['être', 'imparfait', '1p', null, 'nous étions'],
      ['avoir', 'imparfait', '3p', null, 'ils avaient'],
      ['faire', 'imparfait', '3s', null, 'il faisait'],
      ['aller', 'imparfait', '1p', null, 'nous allions'],
      ['boire', 'imparfait', '3s', null, 'il buvait'],
      ['prendre', 'imparfait', '1p', null, 'nous prenions'],
      ['dire', 'imparfait', '2p', null, 'vous disiez'],
      ['étudier', 'imparfait', '1p', null, 'nous étudiions'],
      ['falloir', 'imparfait', '3s', null, 'il fallait'],
    ]));

  it('passé simple, regular and irregular', () =>
    check([
      ['parler', 'passe_simple', '3s', null, 'il parla'],
      ['parler', 'passe_simple', '3p', null, 'ils parlèrent'],
      ['finir', 'passe_simple', '3s', null, 'il finit'],
      ['être', 'passe_simple', '3s', null, 'il fut'],
      ['être', 'passe_simple', '3p', null, 'ils furent'],
      ['avoir', 'passe_simple', '3s', null, 'il eut'],
      ['aller', 'passe_simple', '3s', null, 'il alla'],
      ['faire', 'passe_simple', '3s', null, 'il fit'],
      ['venir', 'passe_simple', '3s', null, 'il vint'],
      ['venir', 'passe_simple', '3p', null, 'ils vinrent'],
      ['prendre', 'passe_simple', '3s', null, 'il prit'],
      ['voir', 'passe_simple', '3p', null, 'ils virent'],
      ['naître', 'passe_simple', '3s', f, 'elle naquit'],
      ['mettre', 'passe_simple', '3s', null, 'il mit'],
      ['pouvoir', 'passe_simple', '3s', null, 'il put'],
      ['vouloir', 'passe_simple', '3s', null, 'il voulut'],
      ['écrire', 'passe_simple', '3s', null, 'il écrivit'],
      ['vivre', 'passe_simple', '3s', null, 'il vécut'],
      ['mourir', 'passe_simple', '3s', null, 'il mourut'],
      ['se lever', 'passe_simple', '3s', null, 'il se leva'],
    ]));
});

describe('subjonctif présent', () => {
  it('regular and irregular stems', () =>
    check([
      ['parler', 'subjonctif_present', '1s', null, 'je parle'],
      ['parler', 'subjonctif_present', '1p', null, 'nous parlions'],
      ['finir', 'subjonctif_present', '3s', null, 'il finisse'],
      ['être', 'subjonctif_present', '1s', null, 'je sois'],
      ['être', 'subjonctif_present', '1p', null, 'nous soyons'],
      ['être', 'subjonctif_present', '3p', null, 'ils soient'],
      ['avoir', 'subjonctif_present', '1s', null, "j'aie"],
      ['avoir', 'subjonctif_present', '3s', null, 'il ait'],
      ['avoir', 'subjonctif_present', '1p', null, 'nous ayons'],
      ['aller', 'subjonctif_present', '1s', null, "j'aille"],
      ['aller', 'subjonctif_present', '1p', null, 'nous allions'],
      ['aller', 'subjonctif_present', '3p', null, 'ils aillent'],
      ['faire', 'subjonctif_present', '1s', null, 'je fasse'],
      ['pouvoir', 'subjonctif_present', '2s', null, 'tu puisses'],
      ['savoir', 'subjonctif_present', '3s', null, 'il sache'],
      ['vouloir', 'subjonctif_present', '1s', null, 'je veuille'],
      ['vouloir', 'subjonctif_present', '1p', null, 'nous voulions'],
      ['venir', 'subjonctif_present', '3s', null, 'il vienne'],
      ['venir', 'subjonctif_present', '1p', null, 'nous venions'],
      ['prendre', 'subjonctif_present', '1s', null, 'je prenne'],
      ['prendre', 'subjonctif_present', '1p', null, 'nous prenions'],
      ['boire', 'subjonctif_present', '3s', null, 'il boive'],
      ['boire', 'subjonctif_present', '1p', null, 'nous buvions'],
      ['devoir', 'subjonctif_present', '1s', null, 'je doive'],
      ['devoir', 'subjonctif_present', '1p', null, 'nous devions'],
      ['recevoir', 'subjonctif_present', '3s', null, 'il reçoive'],
      ['recevoir', 'subjonctif_present', '1p', null, 'nous recevions'],
      ['voir', 'subjonctif_present', '1s', null, 'je voie'],
      ['voir', 'subjonctif_present', '1p', null, 'nous voyions'],
      ['croire', 'subjonctif_present', '3s', null, 'il croie'],
      ['croire', 'subjonctif_present', '1p', null, 'nous croyions'],
      ['falloir', 'subjonctif_present', '3s', null, 'il faille'],
      ['pleuvoir', 'subjonctif_present', '3s', null, 'il pleuve'],
    ]));
});

describe('impératif', () => {
  it('forms, irregulars and reflexives', () =>
    check([
      ['manger', 'imperatif', '2s', null, 'mange'],
      ['manger', 'imperatif', '1p', null, 'mangeons'],
      ['manger', 'imperatif', '2p', null, 'mangez'],
      ['aller', 'imperatif', '2s', null, 'va'],
      ['aller', 'imperatif', '1p', null, 'allons'],
      ['être', 'imperatif', '2s', null, 'sois'],
      ['être', 'imperatif', '1p', null, 'soyons'],
      ['être', 'imperatif', '2p', null, 'soyez'],
      ['avoir', 'imperatif', '2s', null, 'aie'],
      ['avoir', 'imperatif', '1p', null, 'ayons'],
      ['avoir', 'imperatif', '2p', null, 'ayez'],
      ['savoir', 'imperatif', '2s', null, 'sache'],
      ['savoir', 'imperatif', '1p', null, 'sachons'],
      ['savoir', 'imperatif', '2p', null, 'sachez'],
      ['vouloir', 'imperatif', '2s', null, 'veuille'],
      ['vouloir', 'imperatif', '2p', null, 'veuillez'],
      ['finir', 'imperatif', '2s', null, 'finis'],
      ['faire', 'imperatif', '2p', null, 'faites'],
      ['dire', 'imperatif', '2p', null, 'dites'],
      ['ouvrir', 'imperatif', '2s', null, 'ouvre'],
      ['venir', 'imperatif', '2s', null, 'viens'],
      ['se lever', 'imperatif', '2s', null, 'lève-toi'],
      ['se lever', 'imperatif', '1p', null, 'levons-nous'],
      ['se lever', 'imperatif', '2p', null, 'levez-vous'],
      ['se lever', 'imperatif', '2s', { negation: 'pas' }, 'ne te lève pas'],
      ['se lever', 'imperatif', '1p', { negation: 'pas' }, 'ne nous levons pas'],
      ['se lever', 'imperatif', '2p', { negation: 'pas' }, 'ne vous levez pas'],
      ["s'habiller", 'imperatif', '2s', null, 'habille-toi'],
      ["s'habiller", 'imperatif', '2s', { negation: 'pas' }, "ne t'habille pas"],
      ["s'asseoir", 'imperatif', '2s', null, 'assieds-toi'],
      ["s'asseoir", 'imperatif', '2p', null, 'asseyez-vous'],
      ['se taire', 'imperatif', '2s', null, 'tais-toi'],
      ['se souvenir', 'imperatif', '2s', null, 'souviens-toi'],
      ['se dépêcher', 'imperatif', '2p', null, 'dépêchez-vous'],
      ['manger', 'imperatif', '2s', { negation: 'pas' }, 'ne mange pas'],
      ['manger', 'imperatif', '2s', { negation: 'rien' }, 'ne mange rien'],
      ['regarder', 'imperatif', '2p', { negation: 'personne' }, 'ne regardez personne'],
      ['fumer', 'imperatif', '2s', { negation: 'plus' }, 'ne fume plus'],
      ['oublier', 'imperatif', '2s', { negation: 'jamais' }, "n'oublie jamais"],
      ['avoir', 'imperatif', '2s', { negation: 'pas' }, "n'aie pas"],
      ['être', 'imperatif', '2p', { negation: 'pas' }, 'ne soyez pas'],
      ['manger', 'imperatif', '1s', null, null],
      ['manger', 'imperatif', '3s', null, null],
      ['manger', 'imperatif', '3p', null, null],
      ['manger', 'imperatif', '2s', { inversion: true }, null],
      ['pouvoir', 'imperatif', '2s', null, null],
      ['falloir', 'imperatif', '2s', null, null],
    ]));
});

describe('compound tenses', () => {
  it('passé composé with avoir (irregular participles)', () =>
    check([
      ['manger', 'passe_compose', '1s', null, "j'ai mangé"],
      ['finir', 'passe_compose', '2s', null, 'tu as fini'],
      ['prendre', 'passe_compose', '3s', f, 'elle a pris'],
      ['voir', 'passe_compose', '1p', null, 'nous avons vu'],
      ['faire', 'passe_compose', '2p', null, 'vous avez fait'],
      ['dire', 'passe_compose', '3p', null, 'ils ont dit'],
      ['être', 'passe_compose', '3s', f, 'elle a été'],
      ['avoir', 'passe_compose', '1s', null, "j'ai eu"],
      ['falloir', 'passe_compose', '3s', null, 'il a fallu'],
      ['pleuvoir', 'passe_compose', '3s', null, 'il a plu'],
      ['devoir', 'passe_compose', '1s', f, "j'ai dû"],
      ['pouvoir', 'passe_compose', '1s', null, "j'ai pu"],
      ['savoir', 'passe_compose', '1s', null, "j'ai su"],
      ['lire', 'passe_compose', '1s', null, "j'ai lu"],
      ['écrire', 'passe_compose', '1s', null, "j'ai écrit"],
      ['boire', 'passe_compose', '1s', null, "j'ai bu"],
      ['recevoir', 'passe_compose', '1s', null, "j'ai reçu"],
      ['ouvrir', 'passe_compose', '1s', null, "j'ai ouvert"],
      ['offrir', 'passe_compose', '3p', f, 'elles ont offert'],
      ['vivre', 'passe_compose', '1s', null, "j'ai vécu"],
      ['mettre', 'passe_compose', '1s', null, "j'ai mis"],
      ['croire', 'passe_compose', '1s', null, "j'ai cru"],
      ['connaître', 'passe_compose', '1s', null, "j'ai connu"],
      ['courir', 'passe_compose', '1s', null, "j'ai couru"],
      ['conduire', 'passe_compose', '1s', null, "j'ai conduit"],
      ['éteindre', 'passe_compose', '1s', null, "j'ai éteint"],
      ['attendre', 'passe_compose', '1s', null, "j'ai attendu"],
    ]));

  it('passé composé with être and agreement', () =>
    check([
      ['aller', 'passe_compose', '1s', null, 'je suis allé'],
      ['aller', 'passe_compose', '1s', f, 'je suis allée'],
      ['venir', 'passe_compose', '3s', f, 'elle est venue'],
      ['arriver', 'passe_compose', '1p', null, 'nous sommes arrivés'],
      ['arriver', 'passe_compose', '1p', f, 'nous sommes arrivées'],
      ['partir', 'passe_compose', '2p', null, 'vous êtes partis'],
      ['partir', 'passe_compose', '2p', f, 'vous êtes parties'],
      ['entrer', 'passe_compose', '3p', null, 'ils sont entrés'],
      ['sortir', 'passe_compose', '3p', f, 'elles sont sorties'],
      ['monter', 'passe_compose', '3s', null, 'il est monté'],
      ['descendre', 'passe_compose', '3s', f, 'elle est descendue'],
      ['naître', 'passe_compose', '3s', f, 'elle est née'],
      ['mourir', 'passe_compose', '3s', null, 'il est mort'],
      ['mourir', 'passe_compose', '3p', f, 'elles sont mortes'],
      ['rester', 'passe_compose', '1s', null, 'je suis resté'],
      ['retourner', 'passe_compose', '2s', null, 'tu es retourné'],
      ['rentrer', 'passe_compose', '3s', f, 'elle est rentrée'],
      ['tomber', 'passe_compose', '3s', null, 'il est tombé'],
      ['devenir', 'passe_compose', '3s', f, 'elle est devenue'],
      ['revenir', 'passe_compose', '3p', null, 'ils sont revenus'],
      ['passer', 'passe_compose', '3s', f, 'elle est passée'],
      // with a direct object these verbs take avoir (no agreement)
      ['monter', 'passe_compose', '3s', { aux: 'avoir' }, 'il a monté'],
      ['sortir', 'passe_compose', '3s', { aux: 'avoir', gender: 'f' }, 'elle a sorti'],
      ['passer', 'passe_compose', '1s', { aux: 'avoir' }, "j'ai passé"],
    ]));

  it('reflexive verbs use être and agree', () =>
    check([
      ['se lever', 'passe_compose', '1s', null, 'je me suis levé'],
      ['se lever', 'passe_compose', '1s', f, 'je me suis levée'],
      ["s'habiller", 'passe_compose', '2s', null, "tu t'es habillé"],
      ["s'habiller", 'passe_compose', '3s', f, "elle s'est habillée"],
      ['se lever', 'passe_compose', '1p', null, 'nous nous sommes levés'],
      ['se lever', 'passe_compose', '2p', f, 'vous vous êtes levées'],
      ['se coucher', 'passe_compose', '3p', null, 'ils se sont couchés'],
      ["s'amuser", 'passe_compose', '3p', f, 'elles se sont amusées'],
      ["s'asseoir", 'passe_compose', '3s', f, "elle s'est assise"],
      ["s'asseoir", 'passe_compose', '3p', null, 'ils se sont assis'],
      ["s'asseoir", 'passe_compose', '3p', f, 'elles se sont assises'],
      ['se taire', 'passe_compose', '3s', f, "elle s'est tue"],
      ['se souvenir', 'passe_compose', '3s', f, "elle s'est souvenue"],
      ['se brosser', 'passe_compose', '3s', { gender: 'f', agree: false }, "elle s'est brossé"],
    ]));

  it('plus-que-parfait, futur antérieur, conditionnel passé, subjonctif passé', () =>
    check([
      ['manger', 'plus_que_parfait', '1s', null, "j'avais mangé"],
      ['partir', 'plus_que_parfait', '3s', f, 'elle était partie'],
      ['se lever', 'plus_que_parfait', '1p', null, 'nous nous étions levés'],
      ['finir', 'plus_que_parfait', '3p', null, 'ils avaient fini'],
      ['manger', 'plus_que_parfait', '1s', { adverb: 'déjà' }, "j'avais déjà mangé"],
      ['manger', 'plus_que_parfait', '1s', { negation: 'pas', adverb: 'encore' }, "je n'avais pas encore mangé"],
      ['finir', 'futur_anterieur', '1s', null, "j'aurai fini"],
      ['arriver', 'futur_anterieur', '3s', f, 'elle sera arrivée'],
      ['se lever', 'futur_anterieur', '1p', f, 'nous nous serons levées'],
      ['aimer', 'conditionnel_passe', '1s', null, "j'aurais aimé"],
      ['venir', 'conditionnel_passe', '3s', f, 'elle serait venue'],
      ["s'amuser", 'conditionnel_passe', '3p', null, 'ils se seraient amusés'],
      ['devoir', 'conditionnel_passe', '1s', null, "j'aurais dû"],
      ['pouvoir', 'conditionnel_passe', '1s', null, "j'aurais pu"],
      ['finir', 'subjonctif_passe', '1s', null, "j'aie fini"],
      ['partir', 'subjonctif_passe', '3s', f, 'elle soit partie'],
      ['se lever', 'subjonctif_passe', '1p', null, 'nous nous soyons levés'],
      ['pleuvoir', 'subjonctif_passe', '3s', null, 'il ait plu'],
    ]));

  it('auxiliary()', () => {
    expect(auxiliary('aller')).toBe('être');
    expect(auxiliary('passer')).toBe('être');
    expect(auxiliary('monter')).toBe('être');
    expect(auxiliary('naître')).toBe('être');
    expect(auxiliary('se lever')).toBe('être');
    expect(auxiliary('s’appeler')).toBe('être');
    expect(auxiliary('manger')).toBe('avoir');
    expect(auxiliary('être')).toBe('avoir');
    expect(auxiliary('avoir')).toBe('avoir');
    expect(auxiliary('repasser')).toBe('avoir'); // to iron
    expect(auxiliary('demeurer')).toBe('avoir');
  });

  it('pastParticiple()', () => {
    expect(pastParticiple('manger')).toBe('mangé');
    expect(pastParticiple('manger', 'f')).toBe('mangée');
    expect(pastParticiple('manger', 'm', true)).toBe('mangés');
    expect(pastParticiple('manger', 'f', true)).toBe('mangées');
    expect(pastParticiple('prendre', 'f')).toBe('prise');
    expect(pastParticiple('mettre', 'f', true)).toBe('mises');
    expect(pastParticiple('faire', 'f')).toBe('faite');
    expect(pastParticiple('être', 'f', true)).toBe('été');
    expect(pastParticiple('naître', 'f')).toBe('née');
    expect(pastParticiple("s'asseoir", 'f', true)).toBe('assises');
    expect(pastParticiple('devoir')).toBe('dû');
    expect(pastParticiple('devoir', 'm', true)).toBe('dus');
    expect(pastParticiple('offrir', 'f')).toBe('offerte');
    expect(pastParticiple('mourir', 'f')).toBe('morte');
    expect(pastParticiple('plaire', 'f', true)).toBe('plu');
  });
});

describe('futur proche and passé récent', () => {
  it('aller / venir de + infinitive, reflexive pronoun agrees', () =>
    check([
      ['manger', 'futur_proche', '1s', null, 'je vais manger'],
      ['partir', 'futur_proche', '2s', null, 'tu vas partir'],
      ['pleuvoir', 'futur_proche', '3s', null, 'il va pleuvoir'],
      ['se lever', 'futur_proche', '1s', null, 'je vais me lever'],
      ['se lever', 'futur_proche', '1p', null, 'nous allons nous lever'],
      ["s'habiller", 'futur_proche', '2p', null, 'vous allez vous habiller'],
      ['se coucher', 'futur_proche', '3p', f, 'elles vont se coucher'],
      ["s'habiller", 'futur_proche', '1s', null, "je vais m'habiller"],
      ['aller', 'futur_proche', '1s', null, 'je vais aller'],
      ['manger', 'futur_proche', '1s', { negation: 'pas' }, 'je ne vais pas manger'],
      ['manger', 'futur_proche', '1s', { negation: 'rien' }, 'je ne vais rien manger'],
      ['voir', 'futur_proche', '1s', { negation: 'personne' }, 'je ne vais voir personne'],
      ['se lever', 'futur_proche', '1s', { negation: 'pas' }, 'je ne vais pas me lever'],
      ['fumer', 'futur_proche', '1s', { negation: 'jamais' }, 'je ne vais jamais fumer'],
      ['manger', 'futur_proche', '2s', { inversion: true }, 'vas-tu manger'],
      ['se lever', 'futur_proche', '3s', { inversion: true }, 'va-t-il se lever'],
      ['partir', 'futur_proche', '3s', { inversion: true, negation: 'pas', gender: 'f' }, 'ne va-t-elle pas partir'],
      ['manger', 'passe_recent', '1s', null, 'je viens de manger'],
      ['arriver', 'passe_recent', '1s', null, "je viens d'arriver"],
      ['finir', 'passe_recent', '2s', null, 'tu viens de finir'],
      ['pleuvoir', 'passe_recent', '3s', null, 'il vient de pleuvoir'],
      ['se lever', 'passe_recent', '1p', null, 'nous venons de nous lever'],
      ["s'habiller", 'passe_recent', '3s', f, "elle vient de s'habiller"],
      ['se lever', 'passe_recent', '1s', null, 'je viens de me lever'],
      ['avoir', 'passe_recent', '1s', null, "je viens d'avoir"],
      ['être', 'passe_recent', '1s', null, "je viens d'être"],
      ['habiter', 'passe_recent', '1s', null, "je viens d'habiter"],
      ['manger', 'passe_recent', '1s', { negation: 'pas' }, 'je ne viens pas de manger'],
      ['arriver', 'passe_recent', '3s', { inversion: true }, "vient-il d'arriver"],
      ['manger', 'passe_recent', '1s', { negation: 'jamais' }, null],
    ]));
});

describe('elision', () => {
  it('je, ne, me/te/se, de before a vowel or mute h', () => {
    check([
      ['habiter', 'present', '1s', null, "j'habite"],
      ['hésiter', 'present', '1s', null, "j'hésite"],
      ["s'habiller", 'present', '1s', null, "je m'habille"],
      ["s'habiller", 'present', '2s', null, "tu t'habilles"],
      ["s'habiller", 'present', '3s', null, "il s'habille"],
      ['habiter', 'present', '1s', { negation: 'pas' }, "je n'habite pas"],
      ["s'habiller", 'present', '1s', { negation: 'pas' }, "je ne m'habille pas"],
      ['aimer', 'present', '1s', null, "j'aime"],
      ['aimer', 'present', '1s', { negation: 'pas' }, "je n'aime pas"],
      ['arriver', 'present', '1s', { negation: 'pas' }, "je n'arrive pas"],
      ['arriver', 'passe_compose', '3s', { negation: 'pas' }, "il n'est pas arrivé"],
      ['se lever', 'passe_compose', '3s', f, "elle s'est levée"],
      ["s'appeler", 'passe_compose', '1s', null, "je me suis appelé"],
      ['avoir', 'present', '1s', { negation: 'pas' }, "je n'ai pas"],
      ['être', 'present', '1s', { negation: 'pas' }, 'je ne suis pas'],
    ]);
    expect(vowelSound('habite')).toBe(true);
    expect(vowelSound('hais', true)).toBe(false); // haïr: aspirated h, "je hais"
    expect(vowelSound('parle')).toBe(false);
  });
});

describe('negation', () => {
  it('ne…pas/jamais/plus/rien around the verb or auxiliary; personne after the participle', () =>
    check([
      ['parler', 'present', '1s', { negation: 'pas' }, 'je ne parle pas'],
      ['parler', 'present', '1s', { negation: 'jamais' }, 'je ne parle jamais'],
      ['parler', 'present', '1s', { negation: 'plus' }, 'je ne parle plus'],
      ['manger', 'present', '1s', { negation: 'rien' }, 'je ne mange rien'],
      ['voir', 'present', '1s', { negation: 'personne' }, 'je ne vois personne'],
      ['manger', 'passe_compose', '1s', { negation: 'pas' }, "je n'ai pas mangé"],
      ['voir', 'passe_compose', '1s', { negation: 'rien' }, "je n'ai rien vu"],
      ['voir', 'passe_compose', '1s', { negation: 'personne' }, "je n'ai vu personne"],
      ['manger', 'passe_compose', '1s', { negation: 'jamais' }, "je n'ai jamais mangé"],
      ['manger', 'passe_compose', '1s', { negation: 'plus' }, "je n'ai plus mangé"],
      ['aller', 'passe_compose', '1s', { negation: 'pas' }, 'je ne suis pas allé'],
      ['se lever', 'present', '1s', { negation: 'pas' }, 'je ne me lève pas'],
      ['se lever', 'passe_compose', '1s', { negation: 'pas' }, 'je ne me suis pas levé'],
      ['parler', 'futur_simple', '1p', { negation: 'pas' }, 'nous ne parlerons pas'],
      ['se lever', 'passe_compose', '3s', { negation: 'jamais', gender: 'f' }, "elle ne s'est jamais levée"],
      ['dire', 'conditionnel_passe', '2s', { negation: 'rien' }, "tu n'aurais rien dit"],
      ['partir', 'conditionnel_passe', '3p', { negation: 'pas' }, 'ils ne seraient pas partis'],
      ['falloir', 'present', '3s', { negation: 'pas' }, 'il ne faut pas'],
      ['pleuvoir', 'present', '3s', { negation: 'plus' }, 'il ne pleut plus'],
      ['voir', 'plus_que_parfait', '3p', { negation: 'personne' }, "ils n'avaient vu personne"],
      ['parler', 'passe_compose', '1s', { negation: 'personne', negationPrep: 'à' }, "je n'ai parlé à personne"],
      ['penser', 'passe_compose', '1s', { negation: 'rien', negationPrep: 'à' }, "je n'ai pensé à rien"],
      ['parler', 'futur_proche', '1s', { negation: 'personne', negationPrep: 'à' }, 'je ne vais parler à personne'],
      ['se souvenir', 'present', '1s', { negation: 'rien', negationPrep: 'de' }, 'je ne me souviens de rien'],
      ['parler', 'imperatif', '2s', { negation: 'personne', negationPrep: 'à' }, 'ne parle à personne'],
    ]));

  it('without the subject pronoun (noun subjects)', () =>
    check([
      ['parler', 'present', '3s', { pronoun: false, negation: 'pas' }, 'ne parle pas'],
      ['manger', 'passe_compose', '3s', { pronoun: false, negation: 'pas' }, "n'a pas mangé"],
      ['se lever', 'passe_compose', '3s', { pronoun: false, negation: 'pas', gender: 'f' }, "ne s'est pas levée"],
      ['manger', 'present', '3s', { pronoun: false }, 'mange'],
      ['se lever', 'passe_compose', '3p', { pronoun: false, gender: 'f' }, 'se sont levées'],
      ['manger', 'passe_compose', '3s', { pronoun: false }, 'a mangé'],
      ['aller', 'futur_proche', '3p', { pronoun: false }, 'vont aller'],
    ]));
});

describe('inversion', () => {
  it('verb-pronoun with -t- after a vowel; null for 1s', () =>
    check([
      ['parler', 'present', '2s', { inversion: true }, 'parles-tu'],
      ['parler', 'present', '3s', { inversion: true }, 'parle-t-il'],
      ['parler', 'present', '3s', { inversion: true, gender: 'f' }, 'parle-t-elle'],
      ['parler', 'present', '1p', { inversion: true }, 'parlons-nous'],
      ['parler', 'present', '2p', { inversion: true }, 'parlez-vous'],
      ['parler', 'present', '3p', { inversion: true }, 'parlent-ils'],
      ['manger', 'passe_compose', '3s', { inversion: true, gender: 'f' }, 'a-t-elle mangé'],
      ['manger', 'passe_compose', '2s', { inversion: true }, 'as-tu mangé'],
      ['aller', 'present', '3s', { inversion: true, on: true }, 'va-t-on'],
      ['aller', 'present', '3s', { inversion: true }, 'va-t-il'],
      ['se lever', 'present', '2s', { inversion: true }, 'te lèves-tu'],
      ['se lever', 'present', '3s', { inversion: true }, 'se lève-t-il'],
      ['se lever', 'passe_compose', '3s', { inversion: true, gender: 'f' }, "s'est-elle levée"],
      ['parler', 'present', '2s', { inversion: true, negation: 'pas' }, 'ne parles-tu pas'],
      ['manger', 'passe_compose', '3s', { inversion: true, negation: 'pas' }, "n'a-t-il pas mangé"],
      ['se lever', 'passe_compose', '3s', { inversion: true, negation: 'pas', gender: 'f' }, "ne s'est-elle pas levée"],
      ['voir', 'passe_compose', '3s', { inversion: true, negation: 'personne' }, "n'a-t-il vu personne"],
      ['finir', 'present', '3s', { inversion: true }, 'finit-il'],
      ['prendre', 'present', '3s', { inversion: true }, 'prend-il'],
      ['attendre', 'present', '3s', { inversion: true, gender: 'f' }, 'attend-elle'],
      ['aller', 'passe_compose', '3s', { inversion: true, gender: 'f' }, 'est-elle allée'],
      ['partir', 'passe_compose', '3p', { inversion: true }, 'sont-ils partis'],
      ['parler', 'futur_simple', '3s', { inversion: true }, 'parlera-t-il'],
      ['parler', 'imparfait', '3s', { inversion: true }, 'parlait-il'],
      ['falloir', 'present', '3s', { inversion: true }, 'faut-il'],
      ['pleuvoir', 'passe_compose', '3s', { inversion: true }, 'a-t-il plu'],
      ["s'habiller", 'present', '3s', { inversion: true }, "s'habille-t-il"],
      ['parler', 'present', '1s', { inversion: true }, null],
      ['parler', 'subjonctif_present', '2s', { inversion: true }, null],
      ['manger', 'imperatif', '2s', { inversion: true }, null],
    ]));
});

describe('conjugationTable / hasVerb', () => {
  it('builds lesson tables', () => {
    expect(conjugationTable('parler', 'present')).toEqual({
      '1s': 'je parle',
      '2s': 'tu parles',
      '3s': 'il parle',
      '1p': 'nous parlons',
      '2p': 'vous parlez',
      '3p': 'ils parlent',
    });
    expect(conjugationTable('aller', 'passe_compose')).toEqual({
      '1s': 'je suis allé',
      '2s': 'tu es allé',
      '3s': 'il est allé',
      '1p': 'nous sommes allés',
      '2p': 'vous êtes allés',
      '3p': 'ils sont allés',
    });
    expect(conjugationTable('se lever', 'imperatif')).toEqual({ '2s': 'lève-toi', '1p': 'levons-nous', '2p': 'levez-vous' });
    expect(conjugationTable('avoir', 'subjonctif_present')).toEqual({
      '1s': "que j'aie",
      '2s': 'que tu aies',
      '3s': "qu'il ait",
      '1p': 'que nous ayons',
      '2p': 'que vous ayez',
      '3p': "qu'ils aient",
    });
    expect(conjugationTable('falloir', 'present')).toEqual({ '3s': 'il faut' });
    expect(conjugationTable('pouvoir', 'imperatif')).toBeNull();
    expect(conjugationTable('blablater', 'present')).toBeNull();
  });

  it('normalises infinitives', () => {
    expect(hasVerb('s’appeler')).toBe(true);
    expect(hasVerb("s'appeler")).toBe(true);
    expect(hasVerb('se lever')).toBe(true);
    expect(hasVerb('Parler')).toBe(true);
    expect(hasVerb('blablater')).toBe(false);
    expect(conjugate('blablater', 'present', '1s')).toBeNull();
  });
});
