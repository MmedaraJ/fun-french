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
