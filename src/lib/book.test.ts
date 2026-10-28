import { beforeEach, describe, expect, it } from 'vitest';
import { addBookGrammar, getBookGrammar } from './book';
import { db, setMeta } from './db';

beforeEach(async () => {
  await db.meta.clear();
});

describe('book grammar', () => {
  it('starts empty', async () => {
    expect(await getBookGrammar()).toEqual({ lessonIds: [], sources: [] });
  });

  it('adds lessons and sources without repeating them', async () => {
    await addBookGrammar(['pc-avoir', 'imparfait'], 'Unité 3.pdf');
    await addBookGrammar(['imparfait', 'pc-etre', 'pc-etre'], 'Unité 4.pdf');
    const again = await addBookGrammar(['pc-avoir'], 'Unité 3.pdf');
    expect(again).toEqual({ lessonIds: ['pc-avoir', 'imparfait', 'pc-etre'], sources: ['Unité 3.pdf', 'Unité 4.pdf'] });
    expect(await getBookGrammar()).toEqual(again);
  });

  it('does not list a PDF that taught no grammar', async () => {
    await addBookGrammar([], 'Vocabulaire.pdf');
    expect(await getBookGrammar()).toEqual({ lessonIds: [], sources: [] });
  });

  it('survives a malformed stored value', async () => {
    await setMeta('bookGrammar', { lessonIds: 'oops', sources: [1, 'Livre.pdf'] });
    expect(await getBookGrammar()).toEqual({ lessonIds: [], sources: ['Livre.pdf'] });
  });
});
