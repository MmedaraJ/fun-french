# Bonbon · fun French 🍬

A playful, picture-first French learning game, inspired by the spirit of illustrated vocabulary games
like babadum, rebuilt from scratch with original artwork direction, a mascot (Coco the macaron),
lots of animation and sound, spaced repetition, and an easy way to add your own words.

Everything runs in the browser. No account, no server: progress lives on the device (IndexedDB),
with backup/export built in. It installs as an app on phones (PWA) and works offline.

## What's inside

**12 vocabulary games**, all fed by the same spaced-repetition engine:

| # | Game | What you do |
|---|------|-------------|
| 1 | Images | Hear a French word, tap its picture |
| 2 | Mots | See a picture, pick the French word |
| 3 | Épeler | See the meaning, rebuild the French word from letter tiles |
| 4 | Écoute | Audio only, tap what you heard |
| 5 | Mélange | A mix of everything, harder as words get stronger |
| 6 | Le ou la ? | Swipe each noun to *le* or *la* |
| 7 | Phrases | Read the English, put the French word tiles in order |
| 8 | Écris | See the meaning, type the French from memory |
| 9 | Dictée | Listen and type exactly what you hear |
| 10 | Paires | Race the clock matching words and pictures |
| 11 | Cartes | Flashcards with an honest self-check |
| 12 | Parle ! | See the meaning, say it out loud (speech recognition, Chrome/Safari) |

**Grammar, in depth** (Grammaire): all 14 tenses (présent, passé composé, imparfait, plus-que-parfait,
passé simple for recognition, futur simple and antérieur, futur proche, passé récent, conditionnel
présent and passé, subjonctif présent and passé, impératif), negation (pas, jamais, plus, rien,
personne) and questions (intonation, est-ce que, inversion, 15 question words). Ten exercise types
are generated from a conjugation engine (365 verbs, including all 228 from her textbook), 500 sentence
frames and a bank of 194 questions with answers, so rounds rarely repeat: conjugate, fill in the verb,
spot the tense, change the tense, make it negative, ask the question, pick the question word, match
question and answer, translate with word tiles, and listen for the tense. Multiple choice while a
tense is new, typing once it's known. 40 short lessons with tables, examples you can hear and tips
form a learning path (each with its own practice round), and the Conjugueur shows every verb in
every tense.

**No answers given away**: nothing plays or shows the answer before she responds. The French audio
comes after answering, except in the listening games where the sound is the question, and a
pronunciation is never cut off when she moves on: the next sound waits for it to finish.

**Difficulté** (Réglages): *Facile* (four choices, small slips forgiven), *Normal* (six choices, more
typing and word tiles, accents and le/la must be right) or *Difficile*, the default (look-alike
choices, mostly typing, decoy tiles that are other forms of the sentence's own words, exact answers
only).

Plus **Révision du jour**, a daily smart mix of due reviews, a few new words and some grammar; **Survie**
mode with three hearts; combos, score multipliers, stars, levels, streaks and badges; and a mistakes
review after each round.

**Adding your own content**: one word at a time (with emoji search or your own photo), paste a text or a
vocabulary list, snap photos of book pages (several at once; French–English lists like "Abaisser To
lower" are read straight into cards, with every word already ticked and words she already has
flagged) or scan French text with on-device OCR (all the useful words pre-selected), and optionally
let AI turn a photo or a text into ready-made cards. AI is off until an Anthropic API key is pasted in **Réglages**; the key stays on that
device and is never included in backups. Without a key, missing translations come from the free
MyMemory service.
**PDFs** (Ajouter → Un PDF, or drop them anywhere in the app): textbook chapters, workbooks and handouts, with a text layer or scanned (read on the device), become one theme per unit or lesson with its vocabulary lists, example sentences, dialogue lines and key words, all ticked. The grammar they teach is marked 📗 in Grammaire, and with an API key Claude can read them instead.

**Stats**: XP by day, an activity calendar, streaks, words new/learning/learned/mastered per theme,
mastery of every tense, accuracy by game, trickiest words, past rounds and badges.

**Built-in content**: about 900 words, phrases and sentences across 24 themes (animals, food, home,
café, sweet words, numbers, verbs, the 228 regular -er verbs from her textbook…), each with an emoji
picture where one fits, and the right gender.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests (Vitest)
npm run e2e        # plays every game end to end (Playwright)
npm run build      # production build in dist/
```

`npm run dev` / `npm run build` first run `scripts/prepare-assets.mjs`, which copies the Twemoji
pictures, the French OCR model and the PDF.js worker out of `node_modules` into `public/vendor` (not committed).

## Deploy (GitHub Pages)

The built site is committed in `docs/`, so GitHub Pages can serve it straight from the branch, with no
GitHub Actions needed:

1. **Settings → Pages → Build and deployment → Source: Deploy from a branch.**
2. Pick the branch, choose the **/docs** folder, and press **Save**.
3. After a minute or two the site is live at `https://<user>.github.io/<repo>/`.

After changing the app, rebuild and commit `docs/`:

```bash
npm run build:pages   # builds for /fun-french/ into docs/ (adds .nojekyll)
```

If the repository is renamed, change `/fun-french/` in the `build:pages` script to match.
When GitHub Actions is available, `.github/workflows/deploy.yml` can build and publish from `main`
instead (Source: GitHub Actions). On the free plan, Pages needs a public repository; any static host
(Netlify, Cloudflare Pages, Vercel) also works with build command `npm run build` and output `dist`.

On a phone, open the site and use **Add to Home Screen**: it then opens full screen, works offline,
and (on iPhone) Safari won't clear its data after a week without visits.

## Where the data lives

All words and progress are stored in the browser's IndexedDB on that device. Use
**Réglages → Sauvegarde** to export a backup file now and then, and to move to a new phone.
**Partager mes mots** exports just your own themes, so someone else can make words on their
phone and send them over.

## Project map

```
src/
  data/starter.ts        built-in decks and words
  lib/engine/            round builder, scoring, recording answers
  lib/grammar/           conjugation engine, sentence renderer, grammar exercise generators
  data/grammar/          sentence frames, question bank, lessons, the textbook verb list
  lib/srs.ts             spaced repetition (Leitner boxes)
  lib/sound.ts           all sound effects, synthesised with Web Audio
  lib/speech.ts          French text-to-speech (browser voices)
  lib/listen.ts          speech recognition for "Parle !"
  screens/Game.tsx       game shell (score, combo, hearts, feedback)
  screens/game/*         the individual games
  screens/add/*          adding words from text, lists, photos and PDFs
  screens/Stats.tsx      progress and history
  screens/grammar/*      lessons path, lesson pages, the Conjugueur
  components/Mascot.tsx  Coco
```

## Credits

- Emoji graphics: [Twemoji](https://github.com/jdecked/twemoji) by Twitter/X and contributors, CC-BY 4.0.
- OCR: [Tesseract.js](https://github.com/naptha/tesseract.js), Apache-2.0.
- PDF reading: [PDF.js](https://github.com/mozilla/pdf.js) (`pdfjs-dist`) by Mozilla, Apache-2.0. The helpers it loads from `public/vendor/pdfjs` keep their own licences, copied next to them: the PDFium JBIG2 decoder (BSD-3-Clause), OpenJPEG (BSD-2-Clause), qcms (MIT), the Foxit (BSD) and Liberation (GPL-2.0 with font exception) standard fonts, and a CC0 colour profile.
- Fonts: Fredoka and Nunito, SIL Open Font License.
- Emoji names and keywords: unicode-emoji-json and emojilib (MIT).
- French conjugation tables: the Lefff lexicon (LGPL-LR), via [french-verbs-lefff](https://www.npmjs.com/package/french-verbs-lefff); our verbs are extracted into `src/data/grammar/verbs-fr.json`.
- Grammar engine test references: french-verbs, english-verbs-helper and english-verbs-irregular from [RosaeNLG](https://github.com/RosaeNLG/rosaenlg) (Apache-2.0), used in tests only.
