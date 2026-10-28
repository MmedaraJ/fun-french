# Bonbon · fun French 🍬

A playful, picture-first French learning game, inspired by the spirit of illustrated vocabulary games
like babadum, rebuilt from scratch with original artwork direction, a mascot (Coco the macaron),
lots of animation and sound, spaced repetition, and an easy way to add your own words.

Everything runs in the browser. No account, no server: progress lives on the device (IndexedDB),
with backup/export built in. It installs as an app on phones (PWA) and works offline.

## What's inside

**11 games**, all fed by the same spaced-repetition engine:

| # | Game | What you do |
|---|------|-------------|
| 1 | Images | Hear a French word, tap its picture |
| 2 | Mots | See a picture, pick the French word |
| 3 | Épeler | Rebuild the word from flying letter tiles |
| 4 | Écoute | Audio only, tap what you heard |
| 5 | Mélange | A mix of everything, harder as words get stronger |
| 6 | Le ou la ? | Swipe each noun to *le* or *la* |
| 7 | Phrases | Put shuffled word tiles in order |
| 8 | Dictée | Listen and type (accent keys included) |
| 9 | Paires | Race the clock matching words and pictures |
| 10 | Cartes | Flashcards with an honest self-check |
| 11 | Parle ! | Say it out loud (speech recognition, Chrome/Safari) |

Plus **Révision du jour**, a daily smart mix of due reviews and a few new words; **Survie** mode with three
hearts; combos, score multipliers, stars, levels, streaks and badges; and a mistakes review after each round.

**Adding your own content**: one word at a time (with emoji search or your own photo), paste a text or a
vocabulary list, snap a photo to make a picture card or scan French text (on-device OCR), and optionally
let AI turn a photo or a text into ready-made cards. AI is off until an Anthropic API key is pasted in
**Réglages**; the key stays on that device and is never included in backups. Without a key, missing
translations come from the free MyMemory service.

**Stats**: XP by day, an activity calendar, streaks, words new/learning/learned/mastered per theme,
accuracy by game, trickiest words, past rounds and badges.

**Built-in content**: ~700 words, phrases and sentences across 23 themes (animals, food, home, café,
sweet words, numbers, verbs…), each with an emoji picture where one fits, and the right gender.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests (Vitest)
npm run e2e        # plays every game end to end (Playwright)
npm run build      # production build in dist/
```

`npm run dev` / `npm run build` first run `scripts/prepare-assets.mjs`, which copies the Twemoji
pictures and the French OCR model out of `node_modules` into `public/vendor` (not committed).

## Deploy (GitHub Pages)

1. Merge into `main`.
2. In the repository: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. The `Deploy to GitHub Pages` workflow builds and publishes on every push to `main`
   (or run it by hand from the Actions tab). The site appears at
   `https://<user>.github.io/<repo>/`.

GitHub Pages needs a public repository on the free plan. For a private repo, any static host works
(Netlify, Cloudflare Pages, Vercel): build command `npm run build`, output folder `dist`.

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
  lib/srs.ts             spaced repetition (Leitner boxes)
  lib/sound.ts           all sound effects, synthesised with Web Audio
  lib/speech.ts          French text-to-speech (browser voices)
  lib/listen.ts          speech recognition for "Parle !"
  screens/Game.tsx       game shell (score, combo, hearts, feedback)
  screens/game/*         the individual games
  screens/add/*          adding words from text, lists and photos
  screens/Stats.tsx      progress and history
  components/Mascot.tsx  Coco
```

## Credits

- Emoji graphics: [Twemoji](https://github.com/jdecked/twemoji) by Twitter/X and contributors, CC-BY 4.0.
- OCR: [Tesseract.js](https://github.com/naptha/tesseract.js), Apache-2.0.
- Fonts: Fredoka and Nunito, SIL Open Font License.
- Emoji names and keywords: unicode-emoji-json and emojilib (MIT).
