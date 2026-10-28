import { expect, test, type Browser, type Page } from '@playwright/test';
import { onboarded, playRound } from './helpers';

// A two-unit textbook chapter, printed to PDF by Chromium: unit headings, a vocabulary list with
// dashes, a separator-less verb list in two columns ("Abaisser To lower"), a dialogue, an example
// with its translation, exercises with blanks, a grammar box on the passé composé, a vocabulary
// table and a reading text set in two columns.
const BOOK = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>
  @page { size: A4; margin: 18mm 16mm; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 11pt; color: #222; }
  h1 { font-size: 26pt; margin: 0; color: #c0392b; }
  h2 { font-size: 19pt; margin: 1mm 0 5mm; }
  h3 { font-size: 14pt; margin: 5mm 0 2mm; color: #2c3e50; }
  p { margin: 0 0 2mm; line-height: 1.35; }
  .unit { break-after: page; }
  .cols { column-count: 2; column-gap: 14mm; line-height: 1.35; }
  .box { border: 2px solid #27ae60; border-radius: 6px; padding: 2mm 5mm; background: #eafaf1; }
  table td { padding: 0.8mm 14mm 0.8mm 0; }
  .en { font-style: italic; color: #555; }
</style></head><body>
<section class="unit">
  <h1>Unité 1</h1>
  <h2>Au café</h2>
  <h3>Vocabulaire</h3>
  <p>le café – coffee<br>la soucoupe – saucer<br>le sucrier – sugar bowl<br>la carafe – jug<br>le pourboire – tip<br>l’addition – bill</p>
  <h3>Les verbes</h3>
  <div class="cols">Abaisser To lower<br>Accepter To accept<br>Acheter To buy<br>Aider To help<br>Aimer To like, to love<br>Ajouter To add<br>Appeler To call<br>Apporter To bring<br>Arriver To arrive<br>Bavarder To chat<br>Chercher To look for<br>Rejoindre To join</div>
  <h3>Dialogue</h3>
  <p>Listen and repeat.</p>
  <p>Le serveur : Bonjour madame, vous désirez ?<br>La cliente : Je voudrais un café crème, s’il vous plaît.<br>Le serveur : Et avec ceci ?<br>La cliente : Un croissant au beurre, merci.</p>
  <p>Je voudrais un thé à la menthe, s’il vous plaît.<br><span class="en">I would like a mint tea, please.</span></p>
  <h3>Exercices</h3>
  <p>1. Je ____ (aller) au café avec ma sœur.<br>2. Tu ____ (prendre) un croissant ?</p>
  <p>Complete the sentences with the correct form of the verb.</p>
</section>
<section class="unit">
  <h1>Unité 2</h1>
  <h2>Le week-end</h2>
  <div class="box">
    <h3>Grammaire : le passé composé</h3>
    <p>On forme le passé composé avec avoir ou être + participe passé.</p>
    <p>Avec être : les verbes de mouvement (aller, venir, partir…).</p>
    <p>Samedi, j’ai mangé au restaurant avec mes amis.<br>Dimanche, nous sommes allés au bord du lac.</p>
  </div>
  <h3>Vocabulaire</h3>
  <table><tr><td>le parc</td><td>park</td></tr><tr><td>la piscine</td><td>swimming pool</td></tr><tr><td>le trottoir</td><td>pavement</td></tr><tr><td>le marché aux puces</td><td>flea market</td></tr><tr><td>la balade</td><td>stroll</td></tr></table>
  <h3>Lecture</h3>
  <div class="cols"><p>Le samedi, ma sœur joue au tennis avec ses amies. Le dimanche, elle regarde un film au cinéma avec sa famille. Après le film, ils mangent une pizza dans un petit restaurant près de la gare.</p><p>Moi, je préfère la piscine. Je nage le matin, puis je lis un roman dans le jardin. Le soir, nous dînons ensemble sur la terrasse et nous parlons de notre semaine.</p></div>
</section>
</body></html>`;

// The same kind of page as a scan: a picture of the page, no text layer.
const SCAN = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>
  body { margin: 0; width: 1240px; padding: 90px 110px; box-sizing: border-box; font-family: Arial, Helvetica, sans-serif; font-size: 34px; color: #111; background: #fff; }
  h1 { font-size: 64px; margin: 0; } h2 { font-size: 48px; margin: 8px 0 40px; } p { margin: 0 0 18px; line-height: 1.5; }
</style></head><body>
  <h1>Unité 4</h1><h2>En ville</h2>
  <p>la rue – street</p><p>la gare – station</p><p>la banque – bank</p><p>la pharmacie – chemist</p><p>le pont – bridge</p><p>tourner – to turn</p>
  <p>Pour aller à la gare, tournez à gauche après le pont.</p>
</body></html>`;

async function pdfFrom(browser: Browser, html: string) {
  const page = await browser.newPage();
  await page.setContent(html);
  const pdf = await page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true });
  await page.close();
  return pdf;
}

async function scannedPdf(browser: Browser) {
  const shot = await browser.newPage({ viewport: { width: 1240, height: 1754 } });
  await shot.setContent(SCAN);
  const png = await shot.screenshot({ fullPage: false });
  await shot.close();
  const page = await browser.newPage();
  await page.setContent(
    `<html><body style="margin:0"><img src="data:image/png;base64,${png.toString('base64')}" style="width:210mm;height:297mm;display:block"></body></html>`,
  );
  const pdf = await page.pdf({ width: '210mm', height: '297mm', margin: { top: '0', bottom: '0', left: '0', right: '0' }, printBackground: true });
  await page.close();
  return pdf;
}

/** Missing English comes from the free translator: answer it locally. */
async function mockTranslator(page: Page) {
  await page.route('https://api.mymemory.translated.net/**', (route) => {
    const q = new URL(route.request().url()).searchParams.get('q') ?? '';
    return route.fulfill({ json: { responseStatus: 200, responseData: { translatedText: `${q} (EN)` } } });
  });
}

const frenchFields = (page: Page) => page.locator('.pdf-topic .review-fr').evaluateAll((els) => els.map((e) => (e as HTMLInputElement).value));

async function dbState(page: Page) {
  return page.evaluate(async () => {
    const { db } = (window as unknown as { __bonbon: { db: { decks: { toArray(): Promise<{ id: string; name: string; active: boolean }[]> }; cards: { toArray(): Promise<{ deckId: string; fr: string; en: string }[]> }; meta: { get(k: string): Promise<{ value: unknown } | undefined> } } } }).__bonbon;
    const [decks, cards, meta] = await Promise.all([db.decks.toArray(), db.cards.toArray(), db.meta.get('bookGrammar')]);
    return { decks, cards, grammar: meta?.value as { lessonIds: string[]; sources: string[] } | undefined };
  });
}

test.describe('PDF import', () => {
  test('a textbook PDF becomes one theme per unit, with its grammar, and can be played', async ({ page, browser }) => {
    // reads, adds and then plays a whole round
    test.setTimeout(120_000);
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    const pdf = await pdfFrom(browser, BOOK);
    await onboarded(page);
    await mockTranslator(page);
    await page.goto('/#/add/pdf');
    await page.getByTestId('pdf-input').setInputFiles({ name: 'manuel-unites-1-2.pdf', mimeType: 'application/pdf', buffer: pdf });
    await expect(page.getByTestId('pdf-file')).toContainText('2 pages', { timeout: 20_000 });
    await page.getByTestId('pdf-read').click();

    // review: one theme per unit, named after its heading
    const names = page.getByTestId('topic-name');
    await expect(names).toHaveCount(2, { timeout: 30_000 });
    await expect(names.nth(0)).toHaveValue('Unité 1 · Au café');
    await expect(names.nth(1)).toHaveValue('Unité 2 · Le week-end');

    const fr = await frenchFields(page);
    // the dash list, the separator-less two-column verb list, the table, dialogue lines, examples, the two-column reading
    for (const w of ['la soucoupe', 'le pourboire', 'abaisser', 'bavarder', 'rejoindre', 'le trottoir', 'le marché aux puces', 'la balade']) expect(fr).toContain(w);
    for (const s of [
      'Bonjour madame, vous désirez ?',
      'Je voudrais un café crème, s’il vous plaît.',
      'Je voudrais un thé à la menthe, s’il vous plaît.',
      'Dimanche, nous sommes allés au bord du lac.',
      'Le dimanche, elle regarde un film au cinéma avec sa famille.',
      'Le soir, nous dînons ensemble sur la terrasse et nous parlons de notre semaine.',
    ]) expect(fr).toContain(s);
    // instructions, blanks and grammar explanations are not cards
    expect(fr.join('\n')).not.toMatch(/Listen|Complete|____|participe passé|On forme/);

    // printed meanings are kept, translations printed under a sentence too
    const row = (french: string) => page.locator('.pdf-topic .review-row').filter({ has: page.locator(`input.review-fr[value="${french}"]`) });
    await expect(row('rejoindre').locator('.review-en')).toHaveValue('to join');
    await expect(row('la soucoupe').locator('.review-en')).toHaveValue('saucer');
    await expect(row('le marché aux puces').locator('.review-en')).toHaveValue('flea market');
    await expect(row('Je voudrais un thé à la menthe, s’il vous plaît.').locator('.review-en')).toHaveValue('I would like a mint tea, please.');
    // everything new is ticked; words she already has (the textbook verbs are built in) are flagged and unticked
    await expect(row('rejoindre').locator('.review-check')).toHaveAttribute('aria-pressed', 'true');
    await expect(row('la soucoupe').locator('.review-check')).toHaveAttribute('aria-pressed', 'true');
    await expect(row('abaisser').locator('.review-check')).toHaveAttribute('aria-pressed', 'false');
    await expect(row('abaisser').locator('.review-dupe')).toBeVisible();

    // grammar found, with links to the lessons
    await expect(page.getByTestId('pdf-grammar')).toContainText('Le passé composé avec avoir');
    await expect(page.getByTestId('pdf-grammar')).toContainText('Le passé composé avec être');

    // rename a theme, fill the missing English, add
    await names.nth(1).fill('Le week-end · mon livre');
    await page.getByTestId('pdf-translate').click();
    await expect(page.getByTestId('pdf-submit')).toBeEnabled({ timeout: 20_000 });
    await page.getByTestId('pdf-submit').click();
    await expect(page.locator('.add-done')).toBeVisible();

    const { decks, cards, grammar } = await dbState(page);
    const cafe = decks.find((d) => d.name === 'Unité 1 · Au café');
    const weekend = decks.find((d) => d.name === 'Le week-end · mon livre');
    expect(cafe?.active).toBe(true);
    expect(weekend?.active).toBe(true);
    const inCafe = cards.filter((c) => c.deckId === cafe!.id);
    expect(inCafe.map((c) => c.fr)).toEqual(expect.arrayContaining(['la soucoupe', 'rejoindre', 'Je voudrais un thé à la menthe, s’il vous plaît.']));
    expect(inCafe.find((c) => c.fr === 'rejoindre')?.en).toBe('to join');
    // already known: not added again
    expect(inCafe.map((c) => c.fr)).not.toContain('abaisser');
    expect(cards.filter((c) => c.deckId === weekend!.id).length).toBeGreaterThan(8);
    expect(cards.every((c) => c.en.trim())).toBe(true);
    expect(grammar?.lessonIds).toEqual(expect.arrayContaining(['pc-avoir', 'pc-etre']));
    expect(grammar?.sources).toEqual(['manuel-unites-1-2.pdf']);

    // practise straight away: a round from the new themes
    await page.getByTestId('done-play').click();
    await expect(page).toHaveURL(/#\/play\/mix\?decks=/);
    await playRound(page);
    await expect(page.locator('.results-title')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('a scanned PDF is read with OCR', async ({ page, browser }) => {
    test.setTimeout(150_000);
    const pdf = await scannedPdf(browser);
    await onboarded(page);
    await page.goto('/#/add/pdf');
    await page.getByTestId('pdf-input').setInputFiles({ name: 'scan-unite-4.pdf', mimeType: 'application/pdf', buffer: pdf });
    await expect(page.getByTestId('pdf-file')).toContainText('1 page', { timeout: 20_000 });
    await page.getByTestId('pdf-read').click();
    await expect(page.getByTestId('pdf-progress')).toContainText(/scan/i, { timeout: 20_000 });
    const names = page.getByTestId('topic-name');
    await expect(names).toHaveCount(1, { timeout: 120_000 });
    await expect(names.first()).toHaveValue(/Unité 4/);
    const fr = await frenchFields(page);
    expect(fr).toEqual(expect.arrayContaining(['la gare', 'la pharmacie', 'tourner']));
    const row = page.locator('.review-row').filter({ has: page.locator('input.review-fr[value="la pharmacie"]') });
    await expect(row.locator('.review-en')).toHaveValue('chemist');
  });

  test('dropping a PDF anywhere opens the PDF import with it', async ({ page, browser }) => {
    const pdf = await pdfFrom(browser, BOOK);
    await onboarded(page);
    const dataTransfer = await page.evaluateHandle(
      ({ b64, name }) => {
        const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
        const dt = new DataTransfer();
        dt.items.add(new File([bytes], name, { type: 'application/pdf' }));
        return dt;
      },
      { b64: pdf.toString('base64'), name: 'depose.pdf' },
    );
    await page.dispatchEvent('main', 'dragover', { dataTransfer });
    await expect(page.getByTestId('pdf-catch')).toBeVisible();
    await page.dispatchEvent('main', 'drop', { dataTransfer });
    await expect(page).toHaveURL(/#\/add\/pdf$/);
    await expect(page.getByTestId('pdf-file')).toContainText('depose.pdf');
    await expect(page.getByTestId('pdf-file')).toContainText('2 pages', { timeout: 20_000 });
  });

  test('with an AI key, Claude reads the PDF (sent whole as a document)', async ({ page, browser }) => {
    const pdf = await pdfFrom(browser, BOOK);
    await onboarded(page, { aiKey: 'sk-ant-test' });
    const bodies: { model: string; betas?: string[]; messages: { content: { type: string; source?: { type: string; media_type: string } }[] }[] }[] = [];
    const answer = {
      topics: [
        {
          title: 'Unité 1 · Au café',
          titleEn: 'Unit 1 · At the café',
          emoji: '☕',
          items: [
            { fr: 'la soucoupe', en: 'saucer', kind: 'word', gender: 'f', plural: false, emoji: '', note: '' },
            { fr: 'Je voudrais un café crème, s’il vous plaît.', en: 'I would like a white coffee, please.', kind: 'sentence', gender: 'none', plural: false, emoji: '', note: '' },
          ],
        },
        { title: 'Unité 2 · Le week-end', titleEn: 'Unit 2 · The weekend', emoji: '🌳', items: [{ fr: 'la balade', en: 'stroll', kind: 'word', gender: 'f', plural: false, emoji: '', note: '' }] },
      ],
      grammar: ['pc-avoir', 'pc-etre'],
    };
    const sse = (type: string, data: object) => `event: ${type}\ndata: ${JSON.stringify({ type, ...data })}\n\n`;
    await page.route('https://api.anthropic.com/**', async (route) => {
      const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'POST, OPTIONS' };
      if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
      bodies.push(route.request().postDataJSON());
      const text = JSON.stringify(answer);
      return route.fulfill({
        status: 200,
        headers: { ...cors, 'content-type': 'text/event-stream' },
        body:
          sse('message_start', { message: { id: 'msg_1', type: 'message', role: 'assistant', model: 'claude-opus-5-5', content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 1, output_tokens: 1 } } }) +
          sse('content_block_start', { index: 0, content_block: { type: 'text', text: '' } }) +
          sse('content_block_delta', { index: 0, delta: { type: 'text_delta', text } }) +
          sse('content_block_stop', { index: 0 }) +
          sse('message_delta', { delta: { stop_reason: 'end_turn', stop_sequence: null }, usage: { output_tokens: 50 } }) +
          sse('message_stop', {}),
      });
    });
    await page.goto('/#/add/pdf');
    await page.getByTestId('pdf-input').setInputFiles({ name: 'manuel.pdf', mimeType: 'application/pdf', buffer: pdf });
    await expect(page.getByTestId('pdf-file')).toContainText('2 pages', { timeout: 20_000 });
    await page.getByTestId('pdf-ai').click();
    const names = page.getByTestId('topic-name');
    await expect(names).toHaveCount(2, { timeout: 30_000 });
    await expect(names.nth(0)).toHaveValue('Unité 1 · Au café');
    expect(await frenchFields(page)).toEqual(expect.arrayContaining(['la soucoupe', 'la balade']));
    await expect(page.getByTestId('pdf-grammar')).toContainText('Le passé composé avec être');

    // one request, the PDF itself as a document block, on the configured model
    expect(bodies).toHaveLength(1);
    expect(bodies[0].model).toBe('claude-opus-5-5');
    expect(bodies[0].messages[0].content[0]).toMatchObject({ type: 'document', source: { type: 'base64', media_type: 'application/pdf' } });
  });
});
