import { describe, expect, it } from 'vitest';
import { LESSONS } from '../data/grammar/lessons';
import { ocrLines, type PdfLine } from './pdf-layout';
import { detectGrammar, fileTitle, keyWords, learnableSentence, pageTexts, readTopics, splitTopics, stripFurniture, topicEmoji, topicHeading, topicKey, type PdfPage } from './pdf-topics';

type Spec = string | [string, number] | [string, number, number];

/** A text-layer page: lines top to bottom at body size 10 unless given ([text, size] or [text, size, y]). */
function page(n: number, specs: Spec[], height = 842): PdfPage {
  let y = 90;
  const lines: PdfLine[] = specs.map((s) => {
    const [text, size, at] = typeof s === 'string' ? [s, 10, undefined] : [s[0], s[1], s[2]];
    y = at ?? y + (size > 12 ? 2.2 : 1.2) * size;
    return { text, page: n, x0: 50, x1: 520, y, size, gap: 1.2, cells: text.split(/\s{3,}/) };
  });
  return { page: n, height, lines };
}

const fr = (items: { fr: string }[]) => items.map((i) => i.fr);

const BOOK: PdfPage[] = [
  page(1, [
    ['Unité 1', 22],
    ['Au café', 18],
    ['Vocabulaire', 13],
    'le café – coffee',
    'le thé – tea',
    'la boulangerie – bakery',
    'un croissant – croissant',
    'Listen and repeat.',
    'Je voudrais un café, s’il vous plaît.',
    'I would like a coffee, please.',
    'Le serveur : Bonjour madame, vous désirez ?',
    'La cliente : Un thé et un croissant, s’il vous plaît.',
    '1. Je ____ (aller) au café.',
    'Abaisser To lower',
    'Accepter To accept',
    'Acheter To buy',
  ]),
  page(2, [
    ['Unité 2', 22],
    ['Le week-end', 18],
    ['Grammaire : le passé composé', 13],
    'On forme le passé composé avec avoir ou être + participe passé.',
    'Avec être : les verbes de mouvement.',
    'Samedi, j’ai mangé au restaurant avec mes amis.',
    'Dimanche, nous sommes allés au parc.',
    ['Vocabulaire', 13],
    'le parc   park',
    'le cinéma   cinema',
    'la piscine   swimming pool',
    'Le samedi, ma sœur joue au tennis avec ses amies. Le dimanche,',
    'elle regarde un film au cinéma avec sa famille.',
  ]),
];

describe('topicHeading', () => {
  it.each([
    ['Unité 3', 'Unité 3'],
    ['UNITÉ 3 – AU RESTAURANT', 'Unité 3 · Au restaurant'],
    ['UNITE 2', 'Unité 2'],
    ['Leçon 5 : On fait les courses', 'Leçon 5 · On fait les courses'],
    ['Unit 4: Shopping', 'Unit 4 · Shopping'],
    ['Chapitre IV', 'Chapitre IV'],
    ['Dossier 1 · La famille', 'Dossier 1 · La famille'],
  ])('reads %s', (text, title) => {
    expect(topicHeading(text)).toBe(title);
  });

  it.each(['Unité 3  Au restaurant ........ 34', 'Unité 3 Au restaurant 34', 'Thème civil', 'Révisez l’unité 3.', 'Le chapitre est long', 'Unité de mesure'])('does not take %s for a heading', (text) => {
    expect(topicHeading(text)).toBeNull();
  });

  it('gives the same key however a unit is printed', () => {
    expect(topicKey('UNITÉ 3')).toBe(topicKey('Unité 3 · Au restaurant'));
    expect(topicKey('Unite 3')).toBe(topicKey('unité 3'));
    expect(topicKey('Unité 3')).not.toBe(topicKey('Unité 4'));
  });
});

describe('stripFurniture', () => {
  it('drops running heads, page numbers and copyright lines, and remembers which unit each page is in', () => {
    const pages = [1, 2, 3, 4].map((n) =>
      page(n, [['Unité 3 · Au restaurant', 9, 30], ['la carte – menu', 10, 200], ['© Hachette Livre 2024 – Photocopie non autorisée', 8, 800], [String(30 + n), 9, 820]]),
    );
    const { pages: clean, running } = stripFurniture(pages);
    expect(clean.map((p) => p.lines.map((l) => l.text))).toEqual([['la carte – menu'], ['la carte – menu'], ['la carte – menu'], ['la carte – menu']]);
    expect(running.get(2)).toBe('Unité 3 · Au restaurant');
  });

  it('reads the unit from a running head however it is set', () => {
    const heads = ['Unité 4', '34 | Unité 4 · En ville', 'Unité 4 · En ville — 34'];
    for (const head of heads) {
      const pages = [1, 2, 3].map((n) => page(n, [[head.replace('34', String(33 + n)), 9, 30], [`la rue ${n} – street`, 10, 200]]));
      expect(stripFurniture(pages).running.get(2)).toMatch(/^Unité 4/);
    }
  });

  it('keeps a heading that appears once at the top of a page', () => {
    const pages = [page(1, [['Unité 1', 22, 40], 'le café – coffee']), page(2, ['le thé – tea']), page(3, ['le lait – milk'])];
    expect(stripFurniture(pages).pages[0].lines[0].text).toBe('Unité 1');
  });
});

describe('splitTopics', () => {
  it('starts a topic at each unit heading, with the title line under it, and sections inside', () => {
    const topics = splitTopics(BOOK, 'Manuel');
    expect(topics.map((t) => t.title)).toEqual(['Unité 1 · Au café', 'Unité 2 · Le week-end']);
    expect(topics[1].sections.map((s) => s.heading)).toEqual([undefined, 'Grammaire : le passé composé', 'Vocabulaire']);
    expect(topics[1]).toMatchObject({ from: 2, to: 2 });
  });

  it('uses running heads when the pages have no heading of their own', () => {
    const pages = [1, 2, 3, 4, 5, 6].map((n) => page(n, [[n <= 3 ? 'Unité 3 · Au restaurant' : 'Unité 4 · En ville', 9, 30], [n <= 3 ? `la carte ${n} – menu` : `la rue ${n} – street`, 10, 200], [String(n), 9, 820]]));
    const topics = splitTopics(pages, 'Manuel');
    expect(topics.map((t) => [t.title, t.from, t.to])).toEqual([
      ['Unité 3 · Au restaurant', 1, 3],
      ['Unité 4 · En ville', 4, 6],
    ]);
  });

  it('merges a unit that comes back later and ignores a contents page', () => {
    const pages = [
      page(1, [['Sommaire', 20], 'Unité 1 Au café ........ 2', 'Unité 2 Le week-end ........ 3']),
      page(2, [['Unité 1', 22], 'le café – coffee']),
      page(3, [['Unité 2', 22], 'le parc – park']),
      page(4, [['Unité 1', 22], ['Exercices', 13], 'le thé – tea']),
    ];
    const { topics } = readTopics(pages, 'cahier.pdf');
    expect(topics.map((t) => [t.title, fr(t.items)])).toEqual([
      ['Unité 1', ['le café', 'le thé']],
      ['Unité 2', ['le parc']],
    ]);
  });

  it('falls back to the biggest titles, then to the file name', () => {
    const titled = [page(1, [['Les vêtements', 24], 'la robe – dress', 'le pantalon – trousers']), page(2, [['Les couleurs', 24], 'rouge – red', 'bleu – blue'])];
    expect(readTopics(titled, 'x.pdf').topics.map((t) => t.title)).toEqual(['Les vêtements', 'Les couleurs']);
    const plain = [page(1, ['la robe – dress', 'le pantalon – trousers'])];
    expect(readTopics(plain, 'unite_5-les-vetements.pdf').topics.map((t) => t.title)).toEqual(['Unite 5 les vetements']);
  });

  it('reads scanned pages (no font sizes) by their headings', () => {
    const scanned: PdfPage = {
      page: 1,
      height: 0,
      ocr: true,
      lines: ocrLines('UNITE 2\nLe week-end\nVocabulaire\nle parc   park\nle cinéma   cinema\nla piscine   swimming pool\nSamedi, j’ai mangé au restaurant.', 1),
    };
    const { topics } = readTopics([scanned], 'scan.pdf');
    expect(topics).toHaveLength(1);
    expect(topics[0].title).toBe('Unité 2 · Le week-end');
    expect(topics[0].items.filter((i) => i.group === 'vocab').map((i) => [i.fr, i.en])).toEqual([
      ['le parc', 'park'],
      ['le cinéma', 'cinema'],
      ['la piscine', 'swimming pool'],
    ]);
  });
});

describe('readTopics', () => {
  const { topics, grammar } = readTopics(BOOK, 'manuel.pdf');
  const [cafe, weekend] = topics;
  const pairs = (t: typeof cafe, group: string) => t.items.filter((i) => i.group === group).map((i) => [i.fr, i.en]);

  it('reads vocabulary lists in every format, keeping the printed meanings', () => {
    expect(pairs(cafe, 'vocab')).toEqual([
      ['le café', 'coffee'],
      ['le thé', 'tea'],
      ['la boulangerie', 'bakery'],
      ['un croissant', 'croissant'],
      ['abaisser', 'to lower'],
      ['accepter', 'to accept'],
      ['acheter', 'to buy'],
    ]);
    expect(pairs(weekend, 'vocab')).toEqual([
      ['le parc', 'park'],
      ['le cinéma', 'cinema'],
      ['la piscine', 'swimming pool'],
    ]);
    expect(cafe.items.find((i) => i.fr === 'la boulangerie')).toMatchObject({ kind: 'word', gender: 'f' });
  });

  it('keeps the French sentences and dialogue lines, with a translation printed under them', () => {
    expect(pairs(cafe, 'sentences')).toEqual([
      ['Je voudrais un café, s’il vous plaît.', 'I would like a coffee, please.'],
      ['Bonjour madame, vous désirez ?', ''],
      ['Un thé et un croissant, s’il vous plaît.', ''],
    ]);
    expect(fr(weekend.items.filter((i) => i.group === 'sentences'))).toEqual([
      'Samedi, j’ai mangé au restaurant avec mes amis.',
      'Dimanche, nous sommes allés au parc.',
      'Le samedi, ma sœur joue au tennis avec ses amies.',
      'Le dimanche, elle regarde un film au cinéma avec sa famille.',
    ]);
  });

  it('skips instructions, exercises with blanks and grammar explanations', () => {
    const all = topics.flatMap((t) => fr(t.items)).join('\n');
    expect(all).not.toMatch(/Listen|repeat|____|aller\)|On forme|participe|verbes de mouvement/);
  });

  it('adds key words from the text, not names or conjugated verbs, nor words the list already has', () => {
    const words = fr(weekend.items.filter((i) => i.group === 'words'));
    expect(words).toEqual(expect.arrayContaining(['le restaurant', 'le tennis', 'le film', 'la famille']));
    expect(words).not.toContain('le parc');
    expect(words).not.toContain('regarde');
    expect(words.every((w) => w.split(' ').length <= 3)).toBe(true);
  });

  it('finds the grammar each topic explains', () => {
    expect(weekend.grammar).toEqual(['pc-avoir', 'pc-etre']);
    expect(cafe.grammar).toEqual([]);
    expect(grammar).toEqual(['pc-avoir', 'pc-etre']);
  });

  it('gives each topic a page range and a fitting emoji', () => {
    expect(cafe).toMatchObject({ from: 1, to: 1, emoji: '🍽️' });
    expect(weekend.emoji).toBe('⚽');
  });
});

describe('learnableSentence', () => {
  it.each(['Je voudrais un café, s’il vous plaît.', 'Où est la gare ?', '« Tu viens avec nous ? »'])('keeps %s', (s) => {
    expect(learnableSentence(s)).toBe(true);
  });

  it.each([
    'Je ____ (aller) au café.',
    'Il (être) content.',
    'Je prends (le / la) train.',
    'Complétez avec le bon article.',
    'Écoutez et répétez.',
    'Le participe passé s’accorde avec le sujet.',
    'On utilise le passé composé pour une action finie.',
    'Bonjour.',
    'Listen and repeat the words.',
    'elle regarde un film au cinéma.',
    'Elle va au cinéma',
    'À vous !',
  ])('skips %s', (s) => {
    expect(learnableSentence(s)).toBe(false);
  });
});

describe('keyWords', () => {
  it('splits neighbouring words again but keeps an adjective before its noun', () => {
    expect(keyWords(['Le serveur apporte le croissant.', 'Le serveur est gentil.'])).toEqual(expect.arrayContaining(['le serveur', 'le croissant']));
    expect(keyWords(['Le serveur apporte le croissant.'])).not.toContain('le serveur apporte');
    expect(keyWords(['Le petit déjeuner est prêt.'])).toContain('le petit déjeuner');
  });

  it('leaves out names, verbs after a pronoun and one-off bare words', () => {
    const words = keyWords(['Paul mange une pomme à Paris.', 'Je regarde la télévision.']);
    expect(words).toEqual(['la pomme', 'la télévision']);
  });

  it('does not take nouns ending in -re for infinitives', () => {
    expect(keyWords(['Ne mangez pas trop de sucre.', 'Il faut dormir huit heures.'])).toEqual(['dormir']);
  });

  it('stops at the limit, most frequent first', () => {
    expect(keyWords(['Le chat dort.', 'Le chien court.', 'Le chien mange.'], 1)).toEqual(['le chien']);
  });
});

describe('detectGrammar', () => {
  it.each([
    ['Grammaire : le passé composé', ['pc-avoir']],
    ['Le passé composé avec être', ['pc-avoir', 'pc-etre']],
    ['L’imparfait', ['imparfait']],
    ['Passé composé ou imparfait ?', ['pc-avoir', 'imparfait', 'pc-ou-imparfait']],
    ['La négation : ne… pas', ['negation-ne-pas']],
    ['ne ... jamais, ne ... plus', ['negation-jamais-plus']],
    ['Poser des questions : l’inversion', ['questions-trois-facons', 'questions-inversion']],
    ['Les verbes pronominaux', ['present-pronominaux']],
    ['Le futur proche : aller + infinitif', ['futur-proche']],
    ['Le futur simple', ['futur-simple']],
    ['Le conditionnel présent', ['conditionnel-present']],
    ['Le conditionnel passé', ['conditionnel-passe']],
    ['L’impératif', ['imperatif']],
    ['Le subjonctif', ['subjonctif-formation']],
    ['The perfect tense and the imperfect', ['pc-avoir', 'imparfait']],
    ['Les verbes en -er', ['present-er']],
    ['Unscanned OCR: le passe compose', ['pc-avoir']],
  ])('%s', (text, ids) => {
    expect(detectGrammar(text)).toEqual(ids);
  });

  it('does not see grammar in ordinary instructions', () => {
    expect(detectGrammar('Répondez aux questions. Lisez le texte. Il fait beau aujourd’hui.')).toEqual([]);
  });

  it('only returns real lesson ids', () => {
    const ids = new Set(LESSONS.map((l) => l.id));
    const all = detectGrammar(
      'passé composé avec être, accord du participe, imparfait, futur simple, futur proche, passé récent, conditionnel, subjonctif, impératif, plus-que-parfait, futur antérieur, passé simple, verbes pronominaux, ne … pas, ne … jamais, mots interrogatifs, quel ou quelle, lequel ou laquelle',
    );
    expect(all.length).toBeGreaterThan(15);
    expect(all.every((id) => ids.has(id))).toBe(true);
  });
});

describe('helpers', () => {
  it('makes titles out of file names', () => {
    expect(fileTitle('unite_3-au-restaurant.pdf')).toBe('Unite 3 au restaurant');
    expect(fileTitle('.pdf')).toBe('Mon PDF');
  });

  it('picks an emoji for a topic', () => {
    expect(topicEmoji('Unité 4 · En ville')).toBe('🏙️');
    expect(topicEmoji('Leçon 9')).toBe('📗');
  });

  it('marks headings in the text sent to Claude', () => {
    const text = pageTexts(BOOK).get(2)!;
    expect(text.split('\n').slice(0, 3)).toEqual(['# Unité 2', '## Le week-end', '## Grammaire : le passé composé']);
  });
});
