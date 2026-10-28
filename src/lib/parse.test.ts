import { describe, expect, it } from 'vitest';
import {
  detectFormat,
  looksSwapped,
  makeCandidate,
  markDuplicates,
  pairsToCandidates,
  parseList,
  segmentText,
  selectedPhrases,
  splitCsv,
  splitSentences,
} from './parse';

describe('parseList', () => {
  it.each([
    ['le chat - cat\nle chien - dog', ' - '],
    ['le chat – cat\nle chien — dog', 'dashes'],
    ['le chat = cat\nle chien = dog', ' = '],
    ['le chat\tcat\nle chien\tdog', 'tab'],
    ['le chat ; cat\nle chien;dog', ';'],
    ['le chat : cat\nle chien : dog', ' : '],
    ['le chat | cat\nle chien | dog', '|'],
    ['le chat -> cat\nle chien → dog', 'arrows'],
    ['le chat,cat\n"le chien, mon ami",dog', 'csv'],
  ])('reads a two-column list separated by %s (%s)', (text) => {
    const pairs = parseList(text)!;
    expect(pairs).toHaveLength(2);
    expect(pairs[0]).toMatchObject({ left: 'le chat', right: 'cat' });
    expect(pairs[1].right).toBe('dog');
  });

  it('strips bullets, numbering and quotes, and reads gender tags', () => {
    const pairs = parseList('1. maison (f) - house\n- arbre (m) - tree\n• "pomme" - apple')!;
    expect(pairs.map((p) => p.left)).toEqual(['maison', 'arbre', 'pomme']);
    expect(pairs[0].gender).toBe('f');
    expect(pairs[1].gender).toBe('m');
  });

  it('keeps hyphenated words intact', () => {
    const pairs = parseList('peut-être - maybe\ngrand-mère - grandmother')!;
    expect(pairs[0]).toMatchObject({ left: 'peut-être', right: 'maybe' });
    expect(pairs[1].left).toBe('grand-mère');
  });

  it('returns null for ordinary prose', () => {
    expect(parseList("Hier, je suis allée au marché. J'ai acheté des pommes, des poires et du pain.")).toBeNull();
    expect(parseList('Bonjour, je m’appelle Marie.')).toBeNull();
  });

  it('accepts a single line pair', () => {
    expect(parseList('la fenêtre - window')).toEqual([{ left: 'la fenêtre', right: 'window', gender: undefined }]);
  });
});

describe('swap', () => {
  it('detects English on the left', () => {
    const pairs = parseList('the cat - le chat\nthe apple - la pomme\nto eat - manger')!;
    expect(looksSwapped(pairs)).toBe(true);
    const c = pairsToCandidates(pairs, true);
    expect(c[0]).toMatchObject({ fr: 'le chat', en: 'the cat', gender: 'm', kind: 'word' });
    expect(c[2].fr).toBe('manger');
  });
  it('keeps French on the left by default', () => {
    const pairs = parseList('le chat - cat\nla pomme - apple')!;
    expect(looksSwapped(pairs)).toBe(false);
    expect(pairsToCandidates(pairs)[1]).toMatchObject({ fr: 'la pomme', en: 'apple', gender: 'f' });
  });
});

describe('splitCsv', () => {
  it('handles quotes and escaped quotes', () => {
    expect(splitCsv('"Il a dit ""oui""",He said yes')).toEqual(['Il a dit "oui"', 'He said yes']);
    expect(splitCsv('a,b,c')).toBeNull();
  });
});

describe('splitSentences', () => {
  it('splits on . ! ? and keeps French spacing', () => {
    expect(splitSentences('Bonjour ! Comment ça va ? Très bien. Merci.')).toEqual(['Bonjour !', 'Comment ça va ?', 'Très bien.', 'Merci.']);
  });
  it('does not split after abbreviations or initials', () => {
    expect(splitSentences('M. Dupont habite ici. Mme Martin aussi.')).toEqual(['M. Dupont habite ici.', 'Mme Martin aussi.']);
    expect(splitSentences('J. Dupont arrive demain.')).toEqual(['J. Dupont arrive demain.']);
  });
  it('treats line breaks as boundaries', () => {
    expect(splitSentences('Le menu\nUne soupe du jour')).toEqual(['Le menu', 'Une soupe du jour']);
  });
});

describe('segmentText / selectedPhrases', () => {
  const text = "Le petit chat dort. J'aime l'arbre, aujourd'hui et peut-être demain.";
  const { sentences, segments } = segmentText(text);
  const words = segments.filter((s) => s.type === 'word').map((s) => s.text);

  it('keeps elisions and hyphens with their word and ignores numbers', () => {
    expect(sentences).toHaveLength(2);
    expect(words).toEqual(['Le', 'petit', 'chat', 'dort', "J'aime", "l'arbre", "aujourd'hui", 'et', 'peut-être', 'demain']);
    const nums = segmentText('Il a 3 chats et 12 chiens.').segments.filter((s) => s.type === 'word').map((s) => s.text);
    expect(nums).toEqual(['Il', 'a', 'chats', 'et', 'chiens']);
  });

  it('merges neighbouring selected words into one phrase', () => {
    const idx = (w: string) => segments.find((s) => s.text === w)!.wordIndex!;
    const sel = new Set([idx('Le'), idx('petit'), idx('chat'), idx("l'arbre")]);
    expect(selectedPhrases(segments, sel)).toEqual(['le petit chat', "l'arbre"]);
  });

  it('does not merge across punctuation or sentences', () => {
    const idx = (w: string) => segments.find((s) => s.text === w)!.wordIndex!;
    expect(selectedPhrases(segments, new Set([idx("l'arbre"), idx("aujourd'hui")]))).toEqual(["l'arbre", "aujourd'hui"]);
    expect(selectedPhrases(segments, new Set([idx('dort'), idx("J'aime")]))).toEqual(['dort', "j'aime"]);
  });
});

describe('detectFormat', () => {
  it('distinguishes lists, prose and empty input', () => {
    expect(detectFormat('').type).toBe('empty');
    expect(detectFormat('chat - cat\nchien - dog').type).toBe('list');
    expect(detectFormat('Je voudrais un café, s’il vous plaît.').type).toBe('text');
  });
});

describe('markDuplicates', () => {
  it('flags repeats in the list and words already in the collection', () => {
    const items = [makeCandidate('le chat'), makeCandidate('Le Chat'), makeCandidate('la pomme'), makeCandidate('le pain')];
    const marked = markDuplicates(items, ['la pomme']);
    expect(marked.map((m) => m.duplicate)).toEqual([null, 'list', 'existing', null]);
  });
});

describe('makeCandidate', () => {
  it('guesses kind and gender', () => {
    expect(makeCandidate('la voiture', 'car')).toMatchObject({ kind: 'word', gender: 'f' });
    expect(makeCandidate('les lunettes', 'glasses')).toMatchObject({ kind: 'word', plural: true });
    expect(makeCandidate('Où est la gare ?', 'Where is the station?')).toMatchObject({ kind: 'sentence', gender: undefined });
  });
});

import { withArticle } from './parse';

describe('withArticle', () => {
  it('adds, swaps and removes the definite article for nouns', () => {
    expect(withArticle('marché', 'm')).toBe('le marché');
    expect(withArticle('le marché', 'f')).toBe('la marché');
    expect(withArticle('la terrasse', undefined)).toBe('terrasse');
    expect(withArticle('oignon', 'm')).toBe("l'oignon");
    expect(withArticle('un café', 'f')).toBe('une café');
    expect(withArticle("l'eau", 'm')).toBe("l'eau");
    expect(withArticle('les fraises', 'f')).toBe('les fraises');
  });
});

import { contentWordIndices, isContentWord, isInfinitive, normalizeGloss, normalizeHead, parseBilingual } from './parse';

describe('lists without separators (textbook pages)', () => {
  const rows = (text: string) => (parseList(text) ?? []).map((p) => [p.left, p.right]);

  it('splits where the capitalised "To" gloss begins and lowercases the infinitive', () => {
    expect(rows('Abaisser To lower\nCoûter To cost\nChercher To look for – To search')).toEqual([
      ['abaisser', 'to lower'],
      ['coûter', 'to cost'],
      ['chercher', 'to look for, to search'],
    ]);
  });

  it('separates two columns that OCR merged into one line', () => {
    expect(rows('Abaisser To lower Coller To stick\nAccorder To admit – To grant Dépenser To spend')).toEqual([
      ['abaisser', 'to lower'],
      ['coller', 'to stick'],
      ['accorder', 'to admit, to grant'],
      ['dépenser', 'to spend'],
    ]);
    expect(rows('Abaisser To lower        Coller To stick\nDanser To dance      Garder To keep')).toEqual([
      ['abaisser', 'to lower'],
      ['coller', 'to stick'],
      ['danser', 'to dance'],
      ['garder', 'to keep'],
    ]);
  });

  it('handles columns read one after the other', () => {
    expect(rows('Abaisser To lower\nAccorder To admit – To grant\nColler To stick\nDanser To dance')).toHaveLength(4);
  });

  it('joins several glosses', () => {
    expect(normalizeGloss('To admit – To grant')).toBe('to admit, to grant');
    expect(normalizeGloss('To pull up – out')).toBe('to pull up, to pull out');
    expect(normalizeGloss('To look for – search')).toBe('to look for, to search');
    expect(normalizeGloss('To lower.')).toBe('to lower');
    expect(rows('Arracher To pull up – out\nDépenser To spend')).toEqual([
      ['arracher', 'to pull up, to pull out'],
      ['dépenser', 'to spend'],
    ]);
  });

  it('drops headers, footers and page numbers', () => {
    const page = [
      'REGULAR -ER VERBS',
      'Abaisser To lower Coller To stick',
      'Accorder To admit – To grant Dépenser To spend',
      'Arracher To pull up – out Garder To keep',
      'Remember to download the audio files to practise your pronunciation.',
      'Remember To Download The Audio Files',
      '12',
      'Page 3',
    ].join('\n');
    expect(rows(page).map((r) => r[0])).toEqual(['abaisser', 'coller', 'accorder', 'dépenser', 'arracher', 'garder']);
  });

  it('copes with reflexive verbs', () => {
    expect(normalizeHead('Lever (se)')).toBe('se lever');
    expect(normalizeHead('Amuser (se)')).toBe("s'amuser");
    expect(rows("Lever (se) To get up\nS'amuser To have fun")).toEqual([
      ['se lever', 'to get up'],
      ["s'amuser", 'to have fun'],
    ]);
  });

  it('turns infinitives into plain words without gender', () => {
    const cands = pairsToCandidates(parseList('Abaisser To lower\nSe lever To get up')!);
    expect(cands[0]).toEqual({ fr: 'abaisser', en: 'to lower', kind: 'word', gender: undefined, plural: undefined });
    expect(cands[1].kind).toBe('word');
    expect(isInfinitive('finir')).toBe(true);
    expect(isInfinitive("s'asseoir")).toBe(true);
    expect(isInfinitive('le chat')).toBe(false);
  });

  it('reports the format as a list with French on the left', () => {
    const f = detectFormat('Abaisser To lower\nCoûter To cost');
    expect(f.type).toBe('list');
    expect(f.type === 'list' && f.swap).toBe(false);
  });

  it('falls back to French-vs-English scoring without "To" anchors', () => {
    expect(parseBilingual('chercher to look for\nparler to speak\nla pomme apple', 'scored')?.map((p) => [p.left, p.right])).toEqual([
      ['chercher', 'to look for'],
      ['parler', 'to speak'],
      ['la pomme', 'apple'],
    ]);
    expect(parseBilingual("Il fait beau aujourd'hui.\nJe vais au marché avec mon mari.", 'scored')).toBeNull();
  });

  it('still reads dash-separated lists the usual way', () => {
    const cands = pairsToCandidates(parseList('parler – To speak\nChanter – To sing')!);
    expect(cands.map((c) => [c.fr, c.en])).toEqual([
      ['parler', 'to speak'],
      ['chanter', 'to sing'],
    ]);
  });
});

describe('pre-selecting words in free text', () => {
  it('keeps content words and skips the small ones', () => {
    expect(['marché', 'fraises', 'achetons', 'semaine'].every(isContentWord)).toBe(true);
    expect(['le', 'des', 'avec', 'nous', 'et', 'trois', "c'est", "qu'il", 'est'].some(isContentWord)).toBe(false);
  });

  it('gives nouns their article from the determiner in front of them', () => {
    const { segments } = segmentText('Nous achetons des fraises, du fromage et une baguette au marché avec mon amie.');
    const sel = contentWordIndices(segments);
    expect(selectedPhrases(segments, sel)).toEqual(['achetons', 'les fraises', 'le fromage', 'la baguette', 'le marché', "l'amie"]);
  });
});

describe('OCR slips on textbook pages', () => {
  const rows = (text: string) => (parseList(text) ?? []).map((p) => [p.left, p.right]);
  it('keeps a gloss together when OCR drops the dash between meanings', () => {
    expect(rows('Accorder To admit To grant Coller To stick\nDanser To dance')).toEqual([
      ['accorder', 'to admit, to grant'],
      ['coller', 'to stick'],
      ['danser', 'to dance'],
    ]);
  });
  it('accepts a lost capital on "to" after a French headword, but not footers', () => {
    expect(rows('Abaisser to lower\nColler To stick\nRemember to download the audio files to practise.')).toEqual([
      ['abaisser', 'to lower'],
      ['coller', 'to stick'],
    ]);
  });
});

describe('wide gaps from OCR', () => {
  const rows = (text: string) => (parseList(text) ?? []).map((p) => [p.left, p.right]);
  it('reads lines where every column gap is wide (as Tesseract keeps them)', () => {
    const ocr = [
      'REGULAR -ER VERBS',
      'Abaisser   To lower   Deviner   To guess',
      'Accorder   To admit - To grant   Donner   To give',
      'Passer   To pass — To spend (time)   Payer   To pay',
      'Remember to download the audio files to practise your pronunciation.   12',
    ].join('\n');
    expect(rows(ocr)).toEqual([
      ['abaisser', 'to lower'],
      ['deviner', 'to guess'],
      ['accorder', 'to admit, to grant'],
      ['donner', 'to give'],
      ['passer', 'to pass, to spend (time)'],
      ['payer', 'to pay'],
    ]);
  });
  it('pairs alternating French / English segments without "To"', () => {
    expect(parseBilingual('pomme   apple   chien   dog\nmaison   house   voiture   car', 'scored')?.map((p) => [p.left, p.right])).toEqual([
      ['pomme', 'apple'],
      ['chien', 'dog'],
      ['maison', 'house'],
      ['voiture', 'car'],
    ]);
  });
});

import { correctAgainstKnown } from './parse';

describe('more OCR slips', () => {
  const rows = (text: string) => (parseList(text) ?? []).map((p) => [p.left, p.right]);
  it('splits a "To" glued to the next word', () => {
    expect(rows('Danser   To dance   Parler   Tospeak-Totalk\nDépenser   To spend   Pleurer   Tocry —')).toEqual([
      ['danser', 'to dance'],
      ['parler', 'to speak, to talk'],
      ['dépenser', 'to spend'],
      ['pleurer', 'to cry'],
    ]);
    // but real English words survive
    expect(rows('Aujourd’hui   Today\nDemain   Tomorrow')).not.toContainEqual(['aujourd’hui', 'to day']);
  });

  it('corrects misread letters and lost accents against known words with the same meaning', () => {
    const known = [
      { fr: 'parler', en: 'to speak, to talk' },
      { fr: 'écouter', en: 'to listen to' },
      { fr: 'parier', en: 'to bet' },
    ];
    const fixed = correctAgainstKnown(
      [
        { fr: 'parier', en: 'to speak, to talk' }, // known word, left alone
        { fr: 'ecouter', en: 'to listen to' },
        { fr: 'pafler', en: 'to speak' },
        { fr: 'danser', en: 'to dance' },
      ],
      known,
    );
    expect(fixed.map((f) => f.fr)).toEqual(['parier', 'écouter', 'parler', 'danser']);
  });
});
