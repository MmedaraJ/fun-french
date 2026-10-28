// English side of the grammar system: verb morphology (irregular table, -s / -ed / -ing
// spelling rules, British spelling: "travelled", "have got") and clause building for every
// French tense with negation, questions (do-support), aspect and the modals can / must / want.
import type { Negation, Person, Tense } from './types';

// ---- morphology ------------------------------------------------------------------------

/** base past participle — common irregular verbs (British forms). */
const IRREGULAR_LIST = `
arise arose arisen|awake awoke awoken|babysit babysat babysat|be was been|bear bore borne|beat beat beaten|
become became become|befall befell befallen|begin began begun|behold beheld beheld|bend bent bent|bet bet bet|
bid bid bid|bind bound bound|bite bit bitten|bleed bled bled|blow blew blown|break broke broken|breed bred bred|
bring brought brought|broadcast broadcast broadcast|build built built|burst burst burst|buy bought bought|
cast cast cast|catch caught caught|choose chose chosen|cling clung clung|come came come|cost cost cost|
creep crept crept|cut cut cut|deal dealt dealt|dig dug dug|do did done|draw drew drawn|drink drank drunk|
drive drove driven|dwell dwelt dwelt|eat ate eaten|fall fell fallen|feed fed fed|feel felt felt|fight fought fought|
find found found|flee fled fled|fling flung flung|fly flew flown|forbid forbade forbidden|forecast forecast forecast|
foresee foresaw foreseen|foretell foretold foretold|forget forgot forgotten|forgive forgave forgiven|
forsake forsook forsaken|freeze froze frozen|get got got|give gave given|go went gone|grind ground ground|
grow grew grown|hang hung hung|have had had|hear heard heard|hide hid hidden|hit hit hit|hold held held|
hurt hurt hurt|keep kept kept|kneel knelt knelt|know knew known|lay laid laid|lead led led|leave left left|
lend lent lent|let let let|lie lay lain|light lit lit|lose lost lost|make made made|mean meant meant|meet met met|
mishear misheard misheard|mislead misled misled|mistake mistook mistaken|misunderstand misunderstood misunderstood|
mow mowed mown|offset offset offset|outdo outdid outdone|outgrow outgrew outgrown|outrun outran outrun|
overcome overcame overcome|overdo overdid overdone|overhear overheard overheard|override overrode overridden|
overpay overpaid overpaid|oversee oversaw overseen|oversleep overslept overslept|overspend overspent overspent|
overtake overtook overtaken|overthrow overthrew overthrown|pay paid paid|proofread proofread proofread|put put put|
quit quit quit|read read read|rebuild rebuilt rebuilt|redo redid redone|remake remade remade|repay repaid repaid|
reread reread reread|rerun reran rerun|resell resold resold|retell retold retold|rethink rethought rethought|
rewind rewound rewound|rewrite rewrote rewritten|rid rid rid|ride rode ridden|ring rang rung|rise rose risen|
run ran run|saw sawed sawn|say said said|see saw seen|seek sought sought|sell sold sold|send sent sent|set set set|
sew sewed sewn|shake shook shaken|shed shed shed|shine shone shone|shoot shot shot|show showed shown|
shrink shrank shrunk|shut shut shut|sing sang sung|sink sank sunk|sit sat sat|slay slew slain|sleep slept slept|
slide slid slid|sling slung slung|slink slunk slunk|slit slit slit|sow sowed sown|speak spoke spoken|speed sped sped|
spend spent spent|spin spun spun|spit spat spat|split split split|spread spread spread|spring sprang sprung|
stand stood stood|steal stole stolen|stick stuck stuck|sting stung stung|stink stank stunk|stride strode stridden|
strike struck struck|string strung strung|strive strove striven|swear swore sworn|sweep swept swept|
swell swelled swollen|swim swam swum|swing swung swung|take took taken|teach taught taught|tear tore torn|
tell told told|think thought thought|throw threw thrown|thrust thrust thrust|tread trod trodden|
underpay underpaid underpaid|understand understood understood|undergo underwent undergone|
undertake undertook undertaken|undo undid undone|unwind unwound unwound|uphold upheld upheld|upset upset upset|
wake woke woken|wear wore worn|weave wove woven|weep wept wept|wet wet wet|win won won|wind wound wound|
withdraw withdrew withdrawn|withhold withheld withheld|withstand withstood withstood|wring wrung wrung|
write wrote written`;

export const IRREGULAR: Record<string, [past: string, participle: string]> = Object.fromEntries(
  IRREGULAR_LIST.split('|')
    .map((e) => e.trim().split(/\s+/))
    .map(([base, past, pp]) => [base, [past, pp]]),
);

/** Polysyllabic verbs stressed on the last syllable: final consonant doubles (preferred, regretting). */
const DOUBLE_FINAL = new Set([
  'abet', 'acquit', 'admit', 'allot', 'befit', 'beget', 'begin', 'commit', 'confer', 'defer', 'deter', 'embed',
  'emit', 'equip', 'forbid', 'forget', 'incur', 'infer', 'occur', 'omit', 'outwit', 'permit', 'prefer', 'recur',
  'refer', 'regret', 'submit', 'transfer', 'transmit', 'upset',
]);
const VOWELS = 'aeiou';

function isVowel(c: string | undefined): boolean {
  return !!c && VOWELS.includes(c);
}

/** stop → stopp-, travel → travell- (British), visit → visit-. */
function doublesFinal(v: string): boolean {
  const w = v.replace(/^qu/, 'q');
  const n = w.length;
  if (n < 3) return false;
  const [a, b, c] = [w[n - 3], w[n - 2], w[n - 1]];
  if (isVowel(a) || !isVowel(b) || isVowel(c) || 'wxy'.includes(c)) return false;
  if (c === 'l') return true; // British: travelled, cancelled, controlled
  const syllables = (w.match(/[aeiouy]+/g) || []).length;
  return syllables === 1 || DOUBLE_FINAL.has(v);
}

/** he/she form: goes, watches, tries, plays, has, is. */
export function thirdPerson(v: string): string {
  if (v === 'be') return 'is';
  if (v === 'have') return 'has';
  if (/(s|sh|ch|x|z)$/.test(v) || /[^o]o$/.test(v)) return v + 'es';
  if (/[^aeiou]y$/.test(v)) return v.slice(0, -1) + 'ies';
  return v + 's';
}

function regularPast(v: string): string {
  if (v.endsWith('e')) return v + 'd';
  if (/[^aeiou]y$/.test(v)) return v.slice(0, -1) + 'ied';
  if (doublesFinal(v)) return v + v[v.length - 1] + 'ed';
  if (/[aeiou]c$/.test(v) && v.length > 3) return v + 'ked'; // panicked, picnicked
  return v + 'ed';
}

export function pastTense(v: string): string {
  return IRREGULAR[v]?.[0] ?? regularPast(v);
}

export function pastParticipleEn(v: string): string {
  return IRREGULAR[v]?.[1] ?? regularPast(v);
}

/** -ing form: making, seeing, dying, stopping, travelling, skiing, panicking. */
export function gerund(v: string): string {
  if (v === 'be') return 'being';
  if (v.endsWith('ie')) return v.slice(0, -2) + 'ying';
  if (/(ee|ye|oe)$/.test(v)) return v + 'ing';
  if (/[^aeiou]e$/.test(v) || v.endsWith('ue')) return v.slice(0, -1) + 'ing';
  if (doublesFinal(v)) return v + v[v.length - 1] + 'ing';
  if (/[aeiou]c$/.test(v) && v.length > 3) return v + 'king';
  return v + 'ing';
}

// ---- glosses and pronouns -----------------------------------------------------------------

/** "to speak, to talk" -> "speak"; "to put to bed" -> "put to bed"; "can, to be able to" -> "can"; "to wake (someone) up" -> "wake up". */
export function englishVerb(gloss: string): string {
  const noParens = gloss.replace(/\([^)]*\)/g, ' ');
  const first = noParens.split(/[,;/]/)[0];
  return first
    .replace(/^\s*to\s+/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const SUBJ_EN: Record<Person, [string, string]> = {
  '1s': ['I', 'I'],
  '2s': ['you', 'you'],
  '3s': ['he', 'she'],
  '1p': ['we', 'we'],
  '2p': ['you', 'you'],
  '3p': ['they', 'they'],
};
const OBJ_EN: Record<Person, [string, string]> = {
  '1s': ['me', 'me'],
  '2s': ['you', 'you'],
  '3s': ['him', 'her'],
  '1p': ['us', 'us'],
  '2p': ['you', 'you'],
  '3p': ['them', 'them'],
};
const POSS_EN: Record<Person, [string, string]> = {
  '1s': ['my', 'my'],
  '2s': ['your', 'your'],
  '3s': ['his', 'her'],
  '1p': ['our', 'our'],
  '2p': ['your', 'your'],
  '3p': ['their', 'their'],
};
const REFL_EN: Record<Person, [string, string]> = {
  '1s': ['myself', 'myself'],
  '2s': ['yourself', 'yourself'],
  '3s': ['himself', 'herself'],
  '1p': ['ourselves', 'ourselves'],
  '2p': ['yourselves', 'yourselves'],
  '3p': ['themselves', 'themselves'],
};
const g = (gender?: 'm' | 'f') => (gender === 'f' ? 1 : 0);

/** I / you / he|she / we / you / they */
export function englishSubject(person: Person, gender: 'm' | 'f' = 'm'): string {
  return SUBJ_EN[person][g(gender)];
}
/** me / you / him|her / us / you / them */
export function englishObject(person: Person, gender: 'm' | 'f' = 'm'): string {
  return OBJ_EN[person][g(gender)];
}
/** my / your / his|her / our / your / their */
export function englishPossessive(person: Person, gender: 'm' | 'f' = 'm'): string {
  return POSS_EN[person][g(gender)];
}
/** myself / yourself / himself|herself / ourselves / yourselves / themselves */
export function englishReflexive(person: Person, gender: 'm' | 'f' = 'm'): string {
  return REFL_EN[person][g(gender)];
}

// ---- clauses -------------------------------------------------------------------------------

export interface EnglishOptions {
  gender?: 'm' | 'f';
  negation?: Negation;
  question?: boolean;
  aspect?: 'habitual' | 'progressive';
  stative?: boolean;
  /** Noun subject overrides the pronoun ("my mother"); agreement still follows `person`. */
  subject?: string;
  // ---- additions used by the sentence renderer ---------------------------------------------
  /** Adverb after the first auxiliary: "had already eaten". */
  adverb?: string;
  /** Use the present perfect for the passé composé ("have eaten" rather than "ate"). Automatic with "jamais". */
  perfect?: boolean;
}

export interface EnglishParts {
  /** Subject + verb chain (questions: auxiliary + subject + rest), without the complement. */
  text: string;
  /** Words that go after the complement: "anymore", "anything", "anyone". */
  tail: string;
  /** "could have" / "should have" need the following verb as a past participle ("could have eaten"). */
  complementForm?: 'participle';
}

/** Verbs that don't take the progressive: "I was hungry", not "I was being hungry". */
const STATIVE = new Set([
  'be', 'know', 'like', 'love', 'want', 'need', 'believe', 'prefer', 'hate', 'seem', 'understand', 'remember',
  'own', 'belong', 'mean', 'cost', 'doubt', 'exist', 'matter', 'deserve', 'adore', 'concern', 'suppose', 'hear',
  'recognise', 'recognize', 'contain', 'depend', 'resemble', 'can', 'must',
]);
const STATIVE_PHRASE = /^(look like|belong to|consist of)\b/;
const IMPERSONAL_HEADS = /^(rain|snow|hail|be necessary)\b/;
const NOT_CONTRACT: Record<string, string> = {
  do: "don't", does: "doesn't", did: "didn't", will: "won't", would: "wouldn't", have: "haven't", has: "hasn't",
  had: "hadn't", is: "isn't", are: "aren't", was: "wasn't", were: "weren't", can: "can't", could: "couldn't",
  should: "shouldn't", must: "mustn't",
};
const BE_CONTRACT: Record<string, string> = { am: "'m", is: "'s", are: "'re" };
const PRONOUNS = new Set(['I', 'you', 'he', 'she', 'it', 'we', 'they']);

const beForm = (person: Person, past: boolean) =>
  past ? (person === '1s' || person === '3s' ? 'was' : 'were') : person === '1s' ? 'am' : person === '3s' ? 'is' : 'are';
const haveForm = (person: Person) => (person === '3s' ? 'has' : 'have');

function split(verb: string): { head: string; rest: string[] } {
  const words = verb.trim().split(/\s+/).filter(Boolean);
  return { head: (words[0] ?? '').toLowerCase(), rest: words.slice(1) };
}

/** Bare infinitive, usable after "to" or "let's": "be able to" for can, "have to" for must. */
export function englishBare(verb: string): string {
  const { head, rest } = split(verb);
  const h = head === 'can' ? 'be able to' : head === 'must' ? 'have to' : head;
  return [h, ...rest].join(' ');
}

/** The first word of a verb phrase as a past participle: "eat an apple" → "eaten an apple". */
export function participlePhrase(phrase: string): string {
  const m = phrase.match(/^(\S+)(.*)$/);
  if (!m) return phrase;
  return pastParticipleEn(m[1].toLowerCase()) + m[2];
}

interface Chain {
  /** Verb chain from the finite word on; the verb's own particles/complement included. */
  words: string[];
  /** Finite lexical verb without auxiliary: needs do-support in negatives and questions. */
  doSupport?: { aux: 'do' | 'does' | 'did'; words: string[] };
  complementForm?: 'participle';
}

function chainFor(verb: string, tense: Tense, person: Person, o: EnglishOptions): Chain {
  const { head, rest } = split(verb);
  const neg = o.negation;
  const third = person === '3s';
  const perfect = !!o.perfect || neg === 'jamais';
  const stative = !!o.stative || STATIVE.has(head) || STATIVE_PHRASE.test(verb.trim()) || (head === 'have' && rest.length === 0);
  const pp = pastParticipleEn(head);
  const base = [head, ...rest];
  const simplePresent = (): Chain =>
    head === 'be'
      ? { words: [beForm(person, false), ...rest] }
      : { words: [third ? thirdPerson(head) : head, ...rest], doSupport: { aux: third ? 'does' : 'do', words: base } };
  const simplePast = (): Chain =>
    head === 'be'
      ? { words: [beForm(person, true), ...rest] }
      : { words: [pastTense(head), ...rest], doSupport: { aux: 'did', words: base } };

  // modals have no infinitive or participle of their own
  if (head === 'can') {
    const ableTo = ['able', 'to', ...rest];
    switch (tense) {
      case 'present':
      case 'subjonctif_present':
        return { words: ['can', ...rest] };
      case 'imparfait':
      case 'conditionnel_present':
        return { words: ['could', ...rest] };
      case 'passe_compose':
        return perfect ? { words: [haveForm(person), 'been', ...ableTo] } : { words: [beForm(person, true), ...ableTo] };
      case 'passe_simple':
        return { words: [beForm(person, true), ...ableTo] };
      case 'plus_que_parfait':
        return { words: ['had', 'been', ...ableTo] };
      case 'futur_simple':
        return { words: ['will', 'be', ...ableTo] };
      case 'futur_anterieur':
        return { words: ['will', 'have', 'been', ...ableTo] };
      case 'futur_proche':
        return { words: [beForm(person, false), 'going', 'to', 'be', ...ableTo] };
      case 'passe_recent':
        return { words: [haveForm(person), 'just', 'been', ...ableTo] };
      case 'conditionnel_passe':
        return { words: ['could', 'have', ...rest], complementForm: 'participle' };
      case 'subjonctif_passe':
        return { words: [haveForm(person), 'been', ...ableTo] };
      default:
        return { words: ['be', ...ableTo] };
    }
  }
  if (head === 'must') {
    const hasTo = (h: string): Chain => ({ words: [h, 'to', ...rest], doSupport: { aux: third ? 'does' : 'do', words: ['have', 'to', ...rest] } });
    const hadTo: Chain = { words: ['had', 'to', ...rest], doSupport: { aux: 'did', words: ['have', 'to', ...rest] } };
    switch (tense) {
      case 'present':
      case 'subjonctif_present':
        // "tu ne dois pas" = "you mustn't", "tu ne dois jamais" = "you must never"; questions: "do you have to"
        return neg === 'jamais' || (neg && !o.question) ? { words: ['must', ...rest] } : hasTo(haveForm(person));
      case 'passe_compose':
        return perfect ? { words: [haveForm(person), 'had', 'to', ...rest] } : hadTo;
      case 'imparfait':
      case 'passe_simple':
        return hadTo;
      case 'plus_que_parfait':
        return { words: ['had', 'had', 'to', ...rest] };
      case 'futur_simple':
        return { words: ['will', 'have', 'to', ...rest] };
      case 'futur_anterieur':
        return { words: ['will', 'have', 'had', 'to', ...rest] };
      case 'futur_proche':
        return { words: [beForm(person, false), 'going', 'to', 'have', 'to', ...rest] };
      case 'passe_recent':
        return { words: [haveForm(person), 'just', 'had', 'to', ...rest] };
      case 'conditionnel_present':
        return { words: ['should', ...rest] };
      case 'conditionnel_passe':
        return { words: ['should', 'have', ...rest], complementForm: 'participle' };
      case 'subjonctif_passe':
        return { words: [haveForm(person), 'had', 'to', ...rest] };
      default:
        return { words: ['have', 'to', ...rest] };
    }
  }

  switch (tense) {
    case 'present':
    case 'subjonctif_present':
      if (tense === 'present' && o.aspect === 'progressive' && !stative && neg !== 'jamais')
        return { words: [beForm(person, false), gerund(head), ...rest] };
      return simplePresent();
    case 'passe_compose':
      return perfect ? { words: [haveForm(person), pp, ...rest] } : simplePast();
    case 'passe_simple':
      return simplePast();
    case 'imparfait':
      // "didn't … anymore", "did you never…?" read better in the simple past than with "used to"
      if (o.stative || neg === 'plus' || (neg === 'jamais' && o.question)) return simplePast();
      if (o.aspect === 'progressive') return stative ? simplePast() : { words: [beForm(person, true), gerund(head), ...rest] };
      return { words: ['used', 'to', ...base], doSupport: { aux: 'did', words: ['use', 'to', ...base] } };
    case 'plus_que_parfait':
      return { words: ['had', pp, ...rest] };
    case 'futur_simple':
      return { words: ['will', ...base] };
    case 'futur_anterieur':
      return { words: ['will', 'have', pp, ...rest] };
    case 'futur_proche':
      return { words: [beForm(person, false), 'going', 'to', ...base] };
    case 'passe_recent':
      return { words: [haveForm(person), 'just', pp, ...rest] };
    // "je voudrais" = "I would like", but "je ne voudrais pas" = "I wouldn't want"
    case 'conditionnel_present':
      return head === 'want' && !neg ? { words: ['would', 'like', ...rest] } : { words: ['would', ...base] };
    case 'conditionnel_passe':
      return { words: ['would', 'have', head === 'want' && !neg ? 'liked' : pp, ...rest] };
    case 'subjonctif_passe':
      return { words: [haveForm(person), pp, ...rest] };
    default:
      return { words: base };
  }
}

function tailFor(neg?: Negation): string {
  return neg === 'plus' ? 'anymore' : neg === 'rien' ? 'anything' : neg === 'personne' ? 'anyone' : '';
}

function imperativeParts(verb: string, person: Person, neg?: Negation, adverb?: string): EnglishParts {
  const bare = englishBare(verb);
  const words: string[] = [];
  if (person === '1p') {
    words.push("let's");
    if (neg === 'jamais') words.push('never');
    else if (neg) words.push('not');
  } else if (neg === 'jamais') words.push('never');
  else if (neg) words.push("don't");
  if (adverb) words.push(adverb);
  words.push(bare);
  return { text: words.join(' '), tail: tailFor(neg) };
}

/** Clause parts for the renderer: text (subject + verb), tail (after the complement). */
export function englishParts(verb: string, tense: Tense, person: Person, opts: EnglishOptions = {}): EnglishParts {
  const neg = opts.negation;
  if (tense === 'imperatif') return imperativeParts(verb, person, neg, opts.adverb);

  const subject =
    opts.subject ?? (person === '3s' && IMPERSONAL_HEADS.test(verb.trim().toLowerCase()) ? 'it' : englishSubject(person, opts.gender));
  const chain = chainFor(verb, tense, person, opts);
  const notType = !!neg && neg !== 'jamais';

  // do-support for negatives with "not" and for questions
  const doApplied = !!chain.doSupport && (notType || !!opts.question);
  const words = doApplied ? [chain.doSupport!.aux, ...chain.doSupport!.words] : chain.words.slice();
  // "not"/"never"/adverb go after the finite auxiliary, or before a lone lexical verb ("I never speak")
  const insertAt = chain.doSupport && !doApplied ? 0 : 1;
  const inserts: string[] = [];
  if (notType) inserts.push('not');
  else if (neg === 'jamais') inserts.push('never');
  if (opts.adverb) inserts.push(opts.adverb);
  words.splice(insertAt, 0, ...inserts);

  // contractions: "do not" → "don't"; "am not" stays
  if (notType && NOT_CONTRACT[words[0]] && words[1] === 'not') words.splice(0, 2, NOT_CONTRACT[words[0]]);

  let text: string;
  if (opts.question) {
    text = [words[0], subject, ...words.slice(1)].join(' ');
  } else if (PRONOUNS.has(subject) && BE_CONTRACT[words[0]]) {
    text = [subject + BE_CONTRACT[words[0]], ...words.slice(1)].join(' ');
  } else {
    text = [subject, ...words].join(' ');
  }
  return { text, tail: tailFor(neg), complementForm: chain.complementForm };
}

/** "we will speak", "she doesn't speak", "did you speak", "I was speaking" / "I used to speak", "I have just spoken", "I'm going to speak", "speak" / "let's speak" / "don't speak" (imperative, no subject), modals (can, must/have to, want) handled sensibly in every tense. */
export function englishClause(
  verb: string,
  tense: Tense,
  person: Person,
  opts: {
    gender?: 'm' | 'f';
    negation?: Negation;
    question?: boolean;
    aspect?: 'habitual' | 'progressive';
    stative?: boolean;
    subject?: string /* noun subject overrides pronoun */;
  } = {},
): string {
  const p = englishParts(verb, tense, person, opts);
  return p.tail ? `${p.text} ${p.tail}` : p.text;
}
