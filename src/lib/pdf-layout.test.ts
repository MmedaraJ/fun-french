import { describe, expect, it } from 'vitest';
import { NEW_BLOCK, ocrLines, pageLines, textQuality, type PdfItem } from './pdf-layout';

/** One run of text; width from a rough 0.5 em per character. */
function run(str: string, x: number, y: number, size = 10, font = 'body'): PdfItem {
  return { str, x, y, w: str.length * size * 0.5, size, font };
}

/** A line of words as separate runs (PDFs often split text word by word). */
function wordsAt(text: string, x: number, y: number, size = 10): PdfItem[] {
  const out: PdfItem[] = [];
  let at = x;
  for (const w of text.split(' ')) {
    out.push(run(w, at, y, size));
    at += (w.length + 1) * size * 0.5;
  }
  return out;
}

const texts = (items: PdfItem[]) => pageLines(items, 1).map((l) => l.text);

describe('pageLines', () => {
  it('rebuilds lines top to bottom, with spaces between words and none between letters', () => {
    const items = [
      ...wordsAt('Je vais au marché.', 50, 120),
      ...wordsAt('Bonjour tout le monde !', 50, 100),
      // a word drawn letter by letter
      run('c', 50, 140),
      run('a', 55, 140),
      run('f', 60, 140),
      run('é', 65, 140),
    ];
    expect(texts(items)).toEqual(['Bonjour tout le monde !', 'Je vais au marché.', 'café']);
  });

  it('keeps a superscript on its row and ignores a run drawn twice for fake bold', () => {
    const items = [run('le', 50, 100), run('1', 66, 100), run('er', 71, 96.5, 6), run('mai', 85, 100), run('Titre', 50, 130, 14), run('Titre', 50.6, 130, 14)];
    expect(texts(items)).toEqual(['le 1er mai', 'Titre']);
  });

  it('keeps wide gaps as cells: a word and its meaning stay on their row', () => {
    const items = ['le pain:bread', 'la pomme:apple', 'le fromage:cheese', 'le lait:milk', 'le beurre:butter', 'les œufs:eggs'].flatMap((pair, i) => {
      const [fr, en] = pair.split(':');
      return [run(fr, 60, 100 + i * 14), run(en, 300, 100 + i * 14)];
    });
    const lines = pageLines(items, 1);
    expect(lines.map((l) => l.text)).toEqual(['le pain   bread', 'la pomme   apple', 'le fromage   cheese', 'le lait   milk', 'le beurre   butter', 'les œufs   eggs']);
    expect(lines[0].cells).toEqual(['le pain', 'bread']);
  });

  it('reads a two-column page column by column, after a title across both', () => {
    const left = ['Samedi matin, je vais au marché avec', 'mon mari. Nous achetons des fraises,', 'du fromage et une baguette bien chaude.', 'Il fait beau, alors on prend un café.'];
    const right = ['Le dimanche, nous allons chez ma', 'grand-mère. Elle prépare toujours un', 'gâteau au chocolat pour toute la famille.', 'Après le repas, on joue aux cartes.'];
    const items = [
      run('Unité 3 · Le week-end', 180, 60, 20, 'title'),
      ...left.flatMap((t, i) => wordsAt(t, 50, 100 + i * 14)),
      ...right.flatMap((t, i) => wordsAt(t, 320, 100 + i * 14)),
    ];
    const lines = pageLines(items, 1);
    expect(lines.map((l) => l.text)).toEqual(['Unité 3 · Le week-end', ...left, ...right]);
    expect(lines[0].size).toBe(20);
    expect(lines[2].gap).toBeCloseTo(14 / 12, 1);
    // the right column starts a new block
    expect(lines[5].gap).toBe(NEW_BLOCK);
  });

  it('finds two columns under full-width text and a table, ending each column with its last short line', () => {
    const left = ['Le samedi, ma sœur joue au tennis avec ses', 'amies. Le dimanche, elle regarde un film au', 'cinéma avec sa famille. Après le film, ils', 'près de la gare.'];
    const right = ['Moi, je préfère la piscine. Je nage le matin,', 'puis je lis un roman dans le jardin. Le soir,', 'nous dînons ensemble sur la terrasse.'];
    const items = [
      ...wordsAt('On forme le passé composé avec avoir ou être + participe passé.', 50, 100),
      ...wordsAt('Samedi, j’ai mangé au restaurant avec mes amis.', 50, 115),
      run('le parc', 50, 140),
      run('park', 200, 140),
      run('la piscine', 50, 155),
      run('swimming pool', 200, 155),
      run('Lecture', 50, 180, 14),
      ...left.flatMap((t, i) => wordsAt(t, 50, 200 + i * 15)),
      ...right.flatMap((t, i) => wordsAt(t, 310, 200 + i * 15)),
      ...wordsAt('Complete the sentences with the words from the text.', 50, 270),
    ];
    expect(texts(items)).toEqual([
      'On forme le passé composé avec avoir ou être + participe passé.',
      'Samedi, j’ai mangé au restaurant avec mes amis.',
      'le parc   park',
      'la piscine   swimming pool',
      'Lecture',
      ...left,
      ...right,
      'Complete the sentences with the words from the text.',
    ]);
  });

  it('keeps French sentences next to their English translation together', () => {
    const rows = [
      ['Je voudrais un café, s’il vous plaît.', 'I would like a coffee, please.'],
      ['Où est la gare, s’il vous plaît ?', 'Where is the station, please?'],
      ['Nous avons réservé une table pour deux.', 'We have booked a table for two.'],
      ['L’addition, s’il vous plaît !', 'The bill, please!'],
    ];
    const items = rows.flatMap(([fr, en], i) => [...wordsAt(fr, 40, 100 + i * 16), ...wordsAt(en, 330, 100 + i * 16)]);
    const lines = pageLines(items, 1);
    expect(lines).toHaveLength(4);
    expect(lines[0].cells).toEqual(rows[0]);
  });

  it('reads two columns of "word – meaning" entries one column at a time', () => {
    const left = ['le café – coffee', 'le thé – tea', 'le lait – milk', 'le sucre – sugar', 'le jus – juice'];
    const right = ['la tasse – cup', 'le verre – glass', 'la carte – menu', 'le serveur – waiter', 'l’addition – bill'];
    const items = [...left.flatMap((t, i) => wordsAt(t, 50, 100 + i * 14)), ...right.flatMap((t, i) => wordsAt(t, 320, 100 + i * 14))];
    expect(texts(items)).toEqual([...left, ...right]);
  });

  it('joins letter-spaced titles', () => {
    const items = 'U N I T É'.split(' ').map((ch, i) => run(ch, 50 + i * 12, 60, 18));
    items.push(run('3', 50 + 5 * 12 + 6, 60, 18));
    expect(texts(items)).toEqual(['UNITÉ 3']);
  });

  it('skips empty and invisible runs', () => {
    expect(pageLines([run('   ', 10, 10), { str: 'x', x: 10, y: 10, w: 5, size: 0 }], 1)).toEqual([]);
  });
});

describe('ocrLines', () => {
  it('turns OCR text into lines, keeping wide gaps as cells', () => {
    const lines = ocrLines('Unité 2\nle pain   bread\n\nla pomme   apple', 4);
    expect(lines.map((l) => l.text)).toEqual(['Unité 2', 'le pain   bread', 'la pomme   apple']);
    expect(lines[1]).toMatchObject({ page: 4, size: 0, cells: ['le pain', 'bread'] });
  });
});

describe('textQuality', () => {
  const lines = (text: string) => ocrLines(text, 1);

  it('says a page with a real text layer is good', () => {
    expect(textQuality(lines('Samedi matin, je vais au marché avec mon mari.\nNous achetons des fraises et une baguette.'))).toBe('good');
  });

  it('says a scanned page with only a page number or a header is empty', () => {
    expect(textQuality(lines('34\nUnité 3'))).toBe('empty');
    expect(textQuality([])).toBe('empty');
  });

  it('says a broken text layer is garbage', () => {
    expect(textQuality(lines('  '.repeat(20) + 'abcdefghijklmnopqrstuvwxyz abcdefghijklmn'))).toBe('garbage');
    expect(textQuality(lines('xzkq bcdfg hjklm npqrs tvwxz '.repeat(4)))).toBe('garbage');
  });
});
