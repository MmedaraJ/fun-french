import { describe, expect, it } from 'vitest';
import {
  compareAnswer,
  definiteArticle,
  detectGender,
  detectKind,
  finalPunctuation,
  isSpellable,
  normalizeAnswer,
  sentenceTokens,
  splitArticle,
} from './french';

describe('splitArticle', () => {
  it('splits definite, indefinite and elided articles', () => {
    expect(splitArticle('le chat')).toEqual({ article: 'le', noun: 'chat' });
    expect(splitArticle("l'arbre")).toEqual({ article: "l'", noun: 'arbre' });
    expect(splitArticle('l’école')).toEqual({ article: "l'", noun: 'école' });
    expect(splitArticle('les lunettes')).toEqual({ article: 'les', noun: 'lunettes' });
    expect(splitArticle('une pomme')).toEqual({ article: 'une', noun: 'pomme' });
    expect(splitArticle('manger')).toEqual({ article: '', noun: 'manger' });
    expect(splitArticle('lait')).toEqual({ article: '', noun: 'lait' });
  });
});

describe('detectGender / detectKind', () => {
  it('reads gender from the article', () => {
    expect(detectGender('le chien')).toEqual({ gender: 'm' });
    expect(detectGender('une maison')).toEqual({ gender: 'f' });
    expect(detectGender('les ciseaux')).toEqual({ plural: true });
    expect(detectGender("l'eau")).toEqual({});
  });
  it('guesses the kind of card', () => {
    expect(detectKind('le chat')).toBe('word');
    expect(detectKind('la pomme de terre')).toBe('word');
    expect(detectKind('manger')).toBe('word');
    expect(detectKind("s'il vous plaît")).toBe('phrase');
    expect(detectKind("Je m'appelle Marie.")).toBe('sentence');
    expect(detectKind('Où sont les toilettes ?')).toBe('sentence');
  });
  it('picks le/la/l\'', () => {
    expect(definiteArticle('m', 'chat')).toBe('le');
    expect(definiteArticle('f', 'pomme')).toBe('la');
    expect(definiteArticle('m', 'arbre')).toBe("l'");
    expect(definiteArticle('f', 'école')).toBe("l'");
    expect(definiteArticle('m', 'homme')).toBe("l'");
  });
});

describe('answers', () => {
  it('normalizes punctuation, case and apostrophes', () => {
    expect(normalizeAnswer('  Bonjour,  Marie ! ')).toBe('bonjour marie');
    expect(normalizeAnswer('L’ARBRE')).toBe("l'arbre");
    expect(normalizeAnswer("l' arbre")).toBe("l'arbre");
  });
  it('grades typed answers', () => {
    expect(compareAnswer('le chat', 'le chat')).toBe('exact');
    expect(compareAnswer('Le Chat.', 'le chat')).toBe('exact');
    expect(compareAnswer('la fenetre', 'la fenêtre')).toBe('accents');
    expect(compareAnswer('chat', 'le chat')).toBe('article');
    expect(compareAnswer('la fenetrr', 'la fenêtre')).toBe('typo');
    expect(compareAnswer('le chien', 'le chat')).toBe('wrong');
    expect(compareAnswer('', 'le chat')).toBe('wrong');
    expect(compareAnswer('ami', 'amie')).toBe('wrong');
  });
});

describe('sentence tools', () => {
  it('tokenizes sentences into tiles', () => {
    expect(sentenceTokens("Je voudrais un café, s'il vous plaît.")).toEqual([
      'Je',
      'voudrais',
      'un',
      'café',
      "s'il",
      'vous',
      'plaît',
    ]);
    expect(sentenceTokens('Où sont les toilettes ?')).toEqual(['Où', 'sont', 'les', 'toilettes']);
    expect(finalPunctuation('Où sont les toilettes ?')).toBe('?');
    expect(finalPunctuation('Bonjour')).toBe('');
  });
  it('decides what can be spelled with tiles', () => {
    expect(isSpellable('le chat')).toBe(true);
    expect(isSpellable('la pomme de terre')).toBe(true);
    expect(isSpellable('Je voudrais un café, s\'il vous plaît.')).toBe(false);
    expect(isSpellable('a')).toBe(false);
  });
});

import { matchSpoken } from './listen';

describe('matchSpoken', () => {
  it('accepts close transcripts and rejects others', () => {
    expect(matchSpoken(['le chat'], 'le chat').ok).toBe(true);
    expect(matchSpoken(['chat'], 'le chat').ok).toBe(true);
    expect(matchSpoken(['Le Château'], 'le chat').ok).toBe(false);
    expect(matchSpoken(['bonjour madame'], 'Bonjour').ok).toBe(true);
    expect(matchSpoken(['3'], 'trois').ok).toBe(true);
    expect(matchSpoken(['je voudrais un cafe'], 'Je voudrais un café.').ok).toBe(true);
    expect(matchSpoken(['au revoir'], 'Bonjour').ok).toBe(false);
    expect(matchSpoken([], 'Bonjour').ok).toBe(false);
  });
});
