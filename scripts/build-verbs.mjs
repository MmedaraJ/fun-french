// Extracts the simple-tense conjugation tables of the verbs in src/lib/grammar/verb-list.ts
// from the Lefff data (npm: french-verbs-lefff, dev dependency) into a compact JSON file
// that ships with the app: src/data/grammar/verbs-fr.json (committed; regenerate with
// `node scripts/build-verbs.mjs` after adding verbs to the list).
//
// Format: every form is stored relative to its infinitive as "<n><suffix>": drop the last
// n characters of the infinitive, then append the suffix ("parler" + "2ons" = "parlons").
// Verbs whose encoded tables are identical share one "model", so the 220+ regular -er verbs
// cost a single model. Missing forms are empty strings. Tense order is given by "order":
//   P présent · I imparfait · J passé simple · F futur · C conditionnel · S subjonctif présent
//   (6 forms: je, tu, il, nous, vous, ils) · Y impératif (3 forms: tu, nous, vous; empty when
//   the verb has none) · K participe passé (4 forms: m.sg, m.pl, f.sg, f.pl).
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(root, 'src/data/grammar/verbs-fr.json');
const SOURCES = ['src/data/grammar/book-er-verbs.ts', 'src/lib/grammar/verb-list.ts'];
const ORDER = ['P', 'I', 'J', 'F', 'C', 'S', 'Y', 'K'];

/**
 * Corrections to the Lefff data, applied before encoding (tests assert each of them).
 * Lefff sometimes lists a rarer variant or has a typo; the app teaches the usual A2 form.
 */
const OVERRIDES = {
  // "je peux" is the normal form; "je puis" is literary.
  pouvoir: { P: ['peux', 'peux', 'peut', 'pouvons', 'pouvez', 'peuvent'] },
  // participle: dû, dus, due, dues (the circumflex is only on the masculine singular).
  devoir: { K: ['dû', 'dus', 'due', 'dues'] },
  // "il se tait" has no circumflex (unlike "il plaît").
  taire: { P: ['tais', 'tais', 'tait', 'taisons', 'taisez', 'taisent'] },
  // plaire's participle is invariable ("ils se sont plu").
  plaire: { K: ['plu', 'plu', 'plu', 'plu'] },
  // -ayer verbs: both "paye" and "paie" are correct; textbooks teach "paie" (Lefff has "paye").
  payer: aieForms('pa'),
  essayer: aieForms('essa'),
  // s'asseoir: teach "je m'assieds" (Lefff has the "je m'assois" variant).
  asseoir: {
    P: ['assieds', 'assieds', 'assied', 'asseyons', 'asseyez', 'asseyent'],
    I: ['asseyais', 'asseyais', 'asseyait', 'asseyions', 'asseyiez', 'asseyaient'],
    F: ['assiérai', 'assiéras', 'assiéra', 'assiérons', 'assiérez', 'assiéront'],
    C: ['assiérais', 'assiérais', 'assiérait', 'assiérions', 'assiériez', 'assiéraient'],
    S: ['asseye', 'asseyes', 'asseye', 'asseyions', 'asseyiez', 'asseyent'],
    Y: ['NA', 'assieds', 'NA', 'asseyons', 'asseyez', 'NA'],
  },
};

function aieForms(stem) {
  return {
    P: [`${stem}ie`, `${stem}ies`, `${stem}ie`, `${stem}yons`, `${stem}yez`, `${stem}ient`],
    S: [`${stem}ie`, `${stem}ies`, `${stem}ie`, `${stem}yions`, `${stem}yiez`, `${stem}ient`],
    Y: ['NA', `${stem}ie`, 'NA', `${stem}yons`, `${stem}yez`, 'NA'],
    F: ['ai', 'as', 'a', 'ons', 'ez', 'ont'].map((e) => `${stem}ier${e}`),
    C: ['ais', 'ais', 'ait', 'ions', 'iez', 'aient'].map((e) => `${stem}ier${e}`),
  };
}

/** Infinitives from the verb list sources: every `['inf', 'gloss'…]` tuple, pronoun dropped. */
function readInfinitives() {
  const set = new Set(['être', 'avoir', 'aller', 'venir']); // helpers of the compound tenses
  for (const file of SOURCES) {
    const src = fs.readFileSync(path.join(root, file), 'utf8');
    for (const m of src.matchAll(/\[\s*'([^']+)'\s*,\s*'[^']*'/g)) {
      const inf = m[1].replace(/’/g, "'").trim().normalize('NFC');
      set.add(inf.replace(/^(se |s')/, ''));
    }
  }
  return [...set].sort((a, b) => a.localeCompare(b, 'fr'));
}

function encodeForm(inf, form) {
  if (form == null || form === 'NA') return '';
  form = form.normalize('NFC');
  let i = 0;
  while (i < inf.length && i < form.length && inf[i] === form[i]) i++;
  const cut = inf.length - i;
  if (cut > 9) throw new Error(`${inf} → ${form}: cut ${cut} does not fit in one digit`);
  return `${cut}${form.slice(i)}`;
}

function tables(inf, lefff) {
  const entry = lefff[inf];
  if (!entry) throw new Error(`"${inf}" is not in french-verbs-lefff`);
  const t = { ...entry, ...(OVERRIDES[inf] || {}) };
  const out = {};
  for (const k of ORDER) {
    let forms = t[k] || [];
    if (k === 'Y') forms = forms.length ? [forms[1], forms[3], forms[4]] : [];
    if (k === 'K' && forms.length !== 4) throw new Error(`${inf}: participle needs 4 forms`);
    if (k !== 'Y' && k !== 'K' && forms.length !== 6) throw new Error(`${inf}: ${k} needs 6 forms`);
    out[k] = forms;
  }
  return out;
}

/** The full Lefff tables (6 MB, dev dependency only; the unit tests cross-check the engine against them). */
export function loadLefff() {
  return require('french-verbs-lefff/dist/conjugations.json');
}

/** The committed verbs-fr.json, as text. */
export function readOutput() {
  return fs.readFileSync(OUT, 'utf8');
}

/** Builds the JSON text of verbs-fr.json (also used by the unit tests to check the committed file is current). */
export function buildVerbData() {
  const lefff = loadLefff();
  const infinitives = readInfinitives();
  const models = [];
  const modelIndex = new Map();
  const verbs = {};
  for (const inf of infinitives) {
    const t = tables(inf, lefff);
    const encoded = ORDER.map((k) => t[k].map((f) => encodeForm(inf, f)).join(',')).join('|');
    let idx = modelIndex.get(encoded);
    if (idx === undefined) {
      idx = models.length;
      models.push(encoded);
      modelIndex.set(encoded, idx);
    }
    verbs[inf] = idx;
  }
  const about =
    'Generated by scripts/build-verbs.mjs from french-verbs-lefff (Lefff lexicon, LGPL-LR) with a few corrections. Do not edit by hand. Each form is "<n><suffix>": drop n letters from the infinitive, add the suffix.';
  // One model / verb per line keeps diffs readable.
  const entries = Object.entries(verbs);
  const json = [
    '{',
    `"about": ${JSON.stringify(about)},`,
    `"order": ${JSON.stringify(ORDER.join(''))},`,
    '"models": [',
    ...models.map((m, i) => JSON.stringify(m) + (i < models.length - 1 ? ',' : '')),
    '],',
    '"verbs": {',
    ...entries.map(([k, v], i) => `${JSON.stringify(k)}: ${v}` + (i < entries.length - 1 ? ',' : '')),
    '}',
    '}',
    '',
  ].join('\n');
  JSON.parse(json); // sanity check
  return { json, verbs: infinitives.length, models: models.length };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { json, verbs, models } = buildVerbData();
  fs.writeFileSync(OUT, json);
  console.log(`${path.relative(root, OUT)}: ${verbs} verbs, ${models} models, ${Buffer.byteLength(json)} bytes`);
}
