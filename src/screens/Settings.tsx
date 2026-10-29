import { useLiveQuery } from 'dexie-react-hooks';
import { AnimatePresence, motion } from 'framer-motion';
import { useState, type ReactNode } from 'react';
import { Emoji } from '../components/Emoji';
import { InstallCard } from '../components/InstallCard';
import { Mascot } from '../components/Mascot';
import { Page } from '../components/Page';
import { Sheet } from '../components/Sheet';
import { toast } from '../components/Toasts';
import { testAiKey } from '../lib/ai';
import {
  BackupError,
  backupFileName,
  backupSummary,
  buildBackup,
  buildDeckShare,
  deckFileName,
  eraseEverything,
  importDeckShare,
  parseBackup,
  parseDeckShare,
  pickTextFile,
  resetProgress,
  restoreBackup,
  saveFile,
  type BackupFile,
} from '../lib/backup';
import { celebrate } from '../lib/confetti';
import { DAY } from '../lib/date';
import { db } from '../lib/db';
import { DEFAULT_SETTINGS, useSettings, type Difficulty, type MascotColorPref, type MinLevel, type ThemePref } from '../lib/settings';
import { sfx } from '../lib/sound';
import { speak, speechSupported, useFrenchVoices } from '../lib/speech';
import './Settings.css';

const GOALS = [
  { xp: 30, label: 'Relax', hint: '≈ 2 min' },
  { xp: 60, label: 'Régulier', hint: '≈ 4 min' },
  { xp: 100, label: 'Sérieux', hint: '≈ 6 min' },
  { xp: 150, label: 'Intense', hint: '≈ 10 min' },
];

const MODEL_CHOICES = [
  { id: 'claude-opus-5-5', label: 'Opus 5.5 · best quality' },
  { id: 'claude-sonnet-5-5', label: 'Sonnet 5.5 · faster' },
  { id: 'claude-haiku-5-5', label: 'Haiku 5.5 · cheapest' },
];
// The app's default model always comes first and is marked as recommended.
const MODELS = [
  ...(MODEL_CHOICES.some((m) => m.id === DEFAULT_SETTINGS.aiModel) ? [] : [{ id: DEFAULT_SETTINGS.aiModel, label: DEFAULT_SETTINGS.aiModel }]),
  ...MODEL_CHOICES,
]
  .sort((a, b) => Number(b.id === DEFAULT_SETTINGS.aiModel) - Number(a.id === DEFAULT_SETTINGS.aiModel))
  .map((m) => (m.id === DEFAULT_SETTINGS.aiModel ? { ...m, label: `${m.label} ★` } : m));

const MASCOT_COLORS: { id: MascotColorPref; label: string }[] = [
  { id: 'pink', label: 'Rose' },
  { id: 'raspberry', label: 'Framboise' },
  { id: 'pistachio', label: 'Pistache' },
  { id: 'lemon', label: 'Citron' },
  { id: 'lavender', label: 'Lavande' },
  { id: 'caramel', label: 'Caramel' },
];

const FLOORS: { id: MinLevel; label: string; emoji: string; help: string }[] = [
  { id: 1, label: 'Tout', emoji: '🧺', help: 'Everything, from the A1 basics (colours, numbers, the présent) up.' },
  { id: 2, label: 'A2 +', emoji: '🎒', help: 'The A1 basics are left out: their themes, lessons, tenses and easy questions, and the picture-tapping and flip-card games. Your own words, your book and your PDFs always stay.' },
  { id: 3, label: 'Avancé', emoji: '🎓', help: 'Advanced only: B2–C1 themes (linking words, idioms, false friends, society, work…), the hardest tenses, and the advanced structures and lessons. Nothing for beginners. Your own words and PDFs always stay.' },
];

const DIFFICULTIES: { id: Difficulty; label: string; emoji: string; help: string }[] = [
  { id: 1, label: 'Facile', emoji: '🌱', help: 'Four choices, small slips forgiven, typing only once a word is well known.' },
  { id: 2, label: 'Normal', emoji: '🌿', help: 'Six choices, more typing and word tiles, accents and le/la must be right.' },
  { id: 3, label: 'Difficile', emoji: '🌶️', help: 'Six look-alike choices, mostly typing, tricky decoys, and only exact answers count.' },
];

const THEMES: { id: ThemePref; label: string; emoji: string }[] = [
  { id: 'auto', label: 'Auto', emoji: '🌗' },
  { id: 'light', label: 'Clair', emoji: '☀️' },
  { id: 'dark', label: 'Sombre', emoji: '🌙' },
];

type Confirm = { kind: 'reset' | 'erase' } | { kind: 'restore'; file: BackupFile } | null;

export default function Settings() {
  const s = useSettings();
  const voices = useFrenchVoices();
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [keyStatus, setKeyStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const hasProgress = useLiveQuery(async () => (await db.daily.filter((d) => d.answers > 0).count()) > 0, [], false);
  const needsBackup = hasProgress && (!s.lastBackupAt || Date.now() - s.lastBackupAt > 14 * DAY);
  const selectedVoice = s.voiceURI && voices.some((v) => v.voiceURI === s.voiceURI) ? s.voiceURI : voices[0]?.voiceURI;

  const set = (patch: Partial<typeof s>) => {
    sfx.tap();
    s.update(patch);
  };

  const testVoice = () => {
    sfx.tap();
    void speak('Bonjour ! Je suis ta voix française.');
  };

  const runKeyTest = async () => {
    if (!s.aiKey.trim()) return;
    setTesting(true);
    setKeyStatus(null);
    const r = await testAiKey(s.aiKey.trim(), s.aiModel);
    setTesting(false);
    if (r.ok) {
      sfx.correct(3);
      setKeyStatus({ ok: true, msg: 'Ça marche ! The magic is switched on.' });
    } else {
      sfx.wrong();
      setKeyStatus({ ok: false, msg: r.error });
    }
  };

  const exportBackup = async () => {
    setBusy(true);
    try {
      const data = await buildBackup();
      await saveFile(backupFileName(), data);
      s.update({ lastBackupAt: Date.now() });
      sfx.coin();
      toast({ title: 'Sauvegarde prête !', body: 'Keep the file somewhere safe (Files, Drive, email…).', emoji: '💾', tone: 'success' });
    } catch (e) {
      if ((e as Error)?.name !== 'AbortError') toast({ title: 'Oups', body: String((e as Error)?.message ?? e), emoji: '😕', tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const chooseBackup = async () => {
    const text = await pickTextFile();
    if (!text) return;
    try {
      setConfirm({ kind: 'restore', file: parseBackup(text) });
      setTyped('');
    } catch (e) {
      toast({ title: 'Fichier refusé', body: e instanceof BackupError ? e.message : 'Could not read that file.', emoji: '🚫', tone: 'error' }, 4200);
    }
  };

  const shareWords = async () => {
    setBusy(true);
    try {
      const data = await buildDeckShare();
      if (!data.cards.length) {
        toast({ title: 'Rien à partager', body: 'Add a few words of your own first.', emoji: '🧺' });
        return;
      }
      const how = await saveFile(deckFileName(), data, true);
      toast({ title: how === 'shared' ? 'Envoyé !' : 'Fichier prêt !', body: `${data.cards.length} word${data.cards.length === 1 ? '' : 's'} ready to send.`, emoji: '💌', tone: 'success' });
    } catch (e) {
      if ((e as Error)?.name !== 'AbortError') toast({ title: 'Oups', body: String((e as Error)?.message ?? e), emoji: '😕', tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const importWords = async () => {
    const text = await pickTextFile('.json,application/json');
    if (!text) return;
    try {
      const file = parseDeckShare(text);
      const r = await importDeckShare(file);
      if (r.cards) {
        sfx.fanfare();
        celebrate(0.6);
      }
      toast(
        {
          title: r.cards ? `${r.cards} nouveau${r.cards === 1 ? '' : 'x'} mot${r.cards === 1 ? '' : 's'} !` : 'Déjà là !',
          body: r.cards ? `${file.from ? `From ${file.from}. ` : ''}${r.decks ? `${r.decks} new theme${r.decks === 1 ? '' : 's'}. ` : ''}${r.skipped ? `${r.skipped} already in your list.` : ''}` : 'You already have all these words.',
          emoji: r.cards ? '🎁' : '👍',
          tone: r.cards ? 'success' : 'default',
        },
        4200,
      );
    } catch (e) {
      toast({ title: 'Fichier refusé', body: e instanceof BackupError ? e.message : 'Could not read that file.', emoji: '🚫', tone: 'error' }, 4200);
    }
  };

  const doConfirm = async () => {
    if (!confirm) return;
    setBusy(true);
    try {
      if (confirm.kind === 'restore') {
        await restoreBackup(confirm.file);
        toast({ title: 'Sauvegarde restaurée !', emoji: '✨', tone: 'success' });
        setTimeout(() => window.location.reload(), 700);
      } else if (confirm.kind === 'reset') {
        await resetProgress();
        toast({ title: 'Progression remise à zéro', body: 'Your words are still here.', emoji: '🧽' });
        setConfirm(null);
      } else {
        await eraseEverything();
        window.location.hash = '#/welcome';
        window.location.reload();
      }
    } catch (e) {
      toast({ title: 'Oups', body: String((e as Error)?.message ?? e), emoji: '😕', tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const needsOui = confirm?.kind === 'reset' || confirm?.kind === 'erase';
  const ouiOk = typed.trim().toUpperCase() === 'OUI';

  return (
    <Page className="settings" narrow>
      <h1 className="screen-title">Réglages</h1>
      <p className="screen-sub">Make Bonbon just right for you.</p>

      {needsBackup && (
        <motion.button className="backup-nudge" onClick={exportBackup} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} whileTap={{ scale: 0.97 }}>
          <Emoji e="💾" size={30} />
          <span>
            <strong>Pense à ta sauvegarde !</strong>
            <span>{s.lastBackupAt ? 'Your last backup is more than 2 weeks old.' : 'You haven’t saved a backup yet.'} Tap to save one now.</span>
          </span>
        </motion.button>
      )}

      <Section emoji="🙋" title="Profil" sub="About you">
        <label className="field">
          <span className="field-label">Prénom · Name</span>
          <input className="input" value={s.name} onChange={(e) => s.update({ name: e.target.value })} placeholder="Ton prénom" maxLength={40} autoComplete="given-name" />
        </label>
        <div className="field-label">Accord · How Coco talks to you</div>
        <p className="set-help">In French, adjectives agree with the person. Pick the one that sounds like you:</p>
        <div className="agree-grid">
          {(['f', 'm'] as const).map((a) => (
            <button key={a} className={'agree-card' + (s.agreement === a ? ' is-on' : '')} onClick={() => set({ agreement: a })} aria-pressed={s.agreement === a}>
              <span className="agree-fr">
                Je suis <b>{a === 'f' ? 'prête' : 'prêt'}</b>
              </span>
              <span className="agree-en">{a === 'f' ? 'féminin · « Tu es prête ? »' : 'masculin · « Tu es prêt ? »'}</span>
            </button>
          ))}
        </div>
      </Section>

      <Section emoji="🎯" title="Objectif du jour" sub="Daily goal">
        <div className="goal-grid">
          {GOALS.map((g) => (
            <button key={g.xp} className={'goal-chip' + (s.dailyGoal === g.xp ? ' is-on' : '')} onClick={() => set({ dailyGoal: g.xp })} aria-pressed={s.dailyGoal === g.xp}>
              <strong>{g.xp} XP</strong>
              <span>{g.label}</span>
              <small>{g.hint}</small>
            </button>
          ))}
        </div>
      </Section>

      <Section emoji="🔊" title="Son" sub="Sound effects">
        <Row label="Effets sonores" sub="Pops, dings and drum rolls">
          <Toggle on={s.sound} onChange={(v) => s.update({ sound: v })} label="Sound effects" />
        </Row>
        <div className={'slider-row' + (s.sound ? '' : ' is-off')}>
          <Emoji e="🔈" size={20} />
          <input type="range" min={0} max={1} step={0.05} value={s.volume} onChange={(e) => s.update({ volume: Number(e.target.value) })} disabled={!s.sound} aria-label="Volume" />
          <Emoji e="🔊" size={20} />
          <button className="btn btn--sm btn--ghost" onClick={() => sfx.rimshot()} disabled={!s.sound}>
            Tester
          </button>
        </div>
        <Row label="Vibrations" sub="Little buzzes on Android phones">
          <Toggle on={s.haptics} onChange={(v) => s.update({ haptics: v })} label="Haptics" />
        </Row>
      </Section>

      <Section emoji="🗣️" title="Voix" sub="French pronunciation">
        {!speechSupported() || voices.length === 0 ? (
          <div className="set-warn">
            <Emoji e="🤫" size={26} />
            <span>
              <strong>Pas de voix française sur cet appareil.</strong> On iPhone/iPad: Settings → Accessibility → Spoken Content → Voices → French. On Android: Settings → Text-to-speech → install French. Then come back here.
            </span>
          </div>
        ) : (
          <div className="voice-list" role="radiogroup" aria-label="French voice">
            {voices.slice(0, 12).map((v) => (
              <button
                key={v.voiceURI}
                role="radio"
                aria-checked={selectedVoice === v.voiceURI}
                className={'voice-row' + (selectedVoice === v.voiceURI ? ' is-on' : '')}
                onClick={() => {
                  s.update({ voiceURI: v.voiceURI });
                  setTimeout(() => void speak('Bonjour ! Je suis ta voix française.'), 30);
                }}
              >
                <span className="voice-dot" />
                <span className="voice-name">
                  <strong>{v.name.replace(/\s*\(.*?\)\s*/g, ' ').trim()}</strong>
                  <small>
                    {v.lang}
                    {v.localService ? ' · offline' : ' · online'}
                  </small>
                </span>
              </button>
            ))}
          </div>
        )}
        <div className="slider-row">
          <Emoji e="🐢" size={20} />
          <input type="range" min={0.6} max={1.2} step={0.05} value={s.rate} onChange={(e) => s.update({ rate: Number(e.target.value) })} aria-label="Speech speed" />
          <Emoji e="🐇" size={20} />
          <button className="btn btn--sm btn--ghost" onClick={testVoice} disabled={!speechSupported()}>
            Tester
          </button>
        </div>
        <Row label="Lecture automatique" sub="Say each word out loud when it appears">
          <Toggle on={s.autoplay} onChange={(v) => s.update({ autoplay: v })} label="Autoplay audio" />
        </Row>
      </Section>

      <Section emoji="🎮" title="Entraînement" sub="Practice">
        <div className="field-label">Difficulté</div>
        <div className="seg3">
          {DIFFICULTIES.map((d) => (
            <button key={d.id} aria-pressed={s.difficulty === d.id} onClick={() => set({ difficulty: d.id })}>
              <Emoji e={d.emoji} size={18} /> {d.label}
            </button>
          ))}
        </div>
        <p className="set-help">{DIFFICULTIES.find((d) => d.id === s.difficulty)?.help}</p>
        <div className="field-label" style={{ marginTop: 16 }}>
          Niveau
        </div>
        <div className="seg3">
          {FLOORS.map((f) => (
            <button key={f.id} aria-pressed={s.minLevel === f.id} onClick={() => set({ minLevel: f.id })}>
              <Emoji e={f.emoji} size={18} /> {f.label}
            </button>
          ))}
        </div>
        <p className="set-help">{FLOORS.find((f) => f.id === s.minLevel)?.help}</p>
        <div className="field-label" style={{ marginTop: 16 }}>
          Questions par partie
        </div>
        <div className="seg3">
          {[10, 15, 20].map((n) => (
            <button key={n} aria-pressed={s.roundLength === n} onClick={() => set({ roundLength: n })}>
              {n}
            </button>
          ))}
        </div>
        <div className="field-label" style={{ marginTop: 16 }}>
          Nouveaux mots par partie
        </div>
        <div className="stepper">
          <button onClick={() => set({ newPerRound: Math.max(1, s.newPerRound - 1) })} disabled={s.newPerRound <= 1} aria-label="Fewer new words">
            −
          </button>
          <motion.strong key={s.newPerRound} initial={{ scale: 1.4 }} animate={{ scale: 1 }}>
            {s.newPerRound}
          </motion.strong>
          <button onClick={() => set({ newPerRound: Math.min(6, s.newPerRound + 1) })} disabled={s.newPerRound >= 6} aria-label="More new words">
            +
          </button>
          <span className="set-help">{s.newPerRound <= 2 ? 'Gentle pace' : s.newPerRound <= 4 ? 'Steady pace' : 'Fast pace'}</span>
        </div>
        <Row label="Présenter les nouveaux mots" sub="Show a “Nouveau mot !” card before asking">
          <Toggle on={s.introduceNew} onChange={(v) => s.update({ introduceNew: v })} label="Introduce new words" />
        </Row>
      </Section>

      <Section emoji="🎨" title="Apparence" sub="Look & feel">
        <div className="seg3">
          {THEMES.map((t) => (
            <button key={t.id} aria-pressed={s.theme === t.id} onClick={() => set({ theme: t.id })}>
              <Emoji e={t.emoji} size={20} /> {t.label}
            </button>
          ))}
        </div>
        <div className="field-label" style={{ marginTop: 18 }}>
          Couleur de Coco
        </div>
        <div className="mascot-swatches">
          {MASCOT_COLORS.map((c) => (
            <button key={c.id} className={'mascot-swatch' + (s.mascotColor === c.id ? ' is-on' : '')} onClick={() => set({ mascotColor: c.id })} aria-pressed={s.mascotColor === c.id} aria-label={c.label}>
              <Mascot color={c.id} size={58} mood={s.mascotColor === c.id ? 'happy' : 'idle'} />
              <span>{c.label}</span>
            </button>
          ))}
        </div>
      </Section>

      <Section emoji="✨" title="Magie IA" sub="Optional: smart photo & text import">
        <p className="set-help">
          With an Anthropic API key, Bonbon can look at a photo or a French text and suggest cards for you: words, phrases, translations and pictures, in one tap. It’s optional and everything else works without it. Each import costs a fraction of a cent.
        </p>
        <label className="field">
          <span className="field-label">Clé API · API key</span>
          <div className="key-row">
            <input
              className="input"
              type={showKey ? 'text' : 'password'}
              value={s.aiKey}
              onChange={(e) => {
                s.update({ aiKey: e.target.value });
                setKeyStatus(null);
              }}
              placeholder="sk-ant-…"
              autoComplete="off"
              spellCheck={false}
              autoCapitalize="off"
            />
            <button className="icon-btn icon-btn--solid" onClick={() => setShowKey((v) => !v)} aria-label={showKey ? 'Hide key' : 'Show key'} type="button">
              <Emoji e={showKey ? '🙈' : '👁️'} size={22} />
            </button>
          </div>
        </label>
        <label className="field">
          <span className="field-label">Modèle · Model</span>
          <select className="select" value={s.aiModel} onChange={(e) => s.update({ aiModel: e.target.value })}>
            {MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
            {!MODELS.some((m) => m.id === s.aiModel) && <option value={s.aiModel}>{s.aiModel}</option>}
          </select>
        </label>
        <div className="row row--wrap" style={{ gap: 10 }}>
          <button className="btn btn--sm btn--grape" onClick={runKeyTest} disabled={!s.aiKey.trim() || testing}>
            {testing ? 'Test en cours…' : 'Tester la clé'}
          </button>
          {s.aiKey && (
            <button
              className="btn btn--sm btn--ghost"
              onClick={() => {
                s.update({ aiKey: '' });
                setKeyStatus(null);
              }}
            >
              Effacer
            </button>
          )}
        </div>
        <AnimatePresence>
          {keyStatus && (
            <motion.div className={'key-status ' + (keyStatus.ok ? 'is-ok' : 'is-bad')} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <Emoji e={keyStatus.ok ? '✅' : '⚠️'} size={20} /> {keyStatus.msg}
            </motion.div>
          )}
        </AnimatePresence>
        <p className="set-fine">
          <Emoji e="🔒" size={14} /> The key is stored only on this device and is never included in backups. Get one at console.anthropic.com.
        </p>
      </Section>

      <Section emoji="💾" title="Sauvegarde & partage" sub="Backup and sharing">
        <p className="set-help">Your progress lives on this device. Save a backup now and then, and use it to move to a new phone.</p>
        <div className="btn-grid">
          <button className="btn btn--sm btn--ok" onClick={exportBackup} disabled={busy}>
            <Emoji e="⬇️" size={18} /> Exporter une sauvegarde
          </button>
          <button className="btn btn--sm btn--ghost" onClick={chooseBackup} disabled={busy}>
            <Emoji e="⬆️" size={18} /> Importer une sauvegarde
          </button>
        </div>
        {s.lastBackupAt > 0 && <p className="set-fine">Last backup: {new Date(s.lastBackupAt).toLocaleDateString()}</p>}
        <div className="share-box">
          <div className="share-head">
            <Emoji e="💌" size={28} />
            <span>
              <strong>Partager mes mots</strong>
              <span>Send the words and photos you added to someone else’s Bonbon, or receive theirs.</span>
            </span>
          </div>
          <div className="btn-grid">
            <button className="btn btn--sm btn--sky" onClick={shareWords} disabled={busy}>
              <Emoji e="📤" size={18} /> Partager mes mots
            </button>
            <button className="btn btn--sm btn--ghost" onClick={importWords} disabled={busy}>
              <Emoji e="📥" size={18} /> Importer des mots
            </button>
          </div>
        </div>
      </Section>

      <Section emoji="📲" title="Installer" sub="Use Bonbon like an app">
        <InstallCard />
      </Section>

      <Section emoji="⚠️" title="Zone sensible" sub="Careful!" danger>
        <div className="btn-grid">
          <button
            className="btn btn--sm btn--ghost danger-btn"
            onClick={() => {
              setTyped('');
              setConfirm({ kind: 'reset' });
            }}
          >
            Remettre la progression à zéro
          </button>
          <button
            className="btn btn--sm btn--bad"
            onClick={() => {
              setTyped('');
              setConfirm({ kind: 'erase' });
            }}
          >
            Tout effacer
          </button>
        </div>
      </Section>

      <Section emoji="💝" title="À propos" sub="About & credits">
        {s.name.trim() && (
          <p className="made-for">
            Fait avec <Emoji e="❤️" size={18} /> pour {s.name.trim()}
          </p>
        )}
        <ul className="credits">
          <li>
            Emoji graphics by{' '}
            <a href="https://github.com/jdecked/twemoji" target="_blank" rel="noreferrer">
              Twemoji
            </a>
            , © Twitter, Inc. / X Corp. and other contributors, licensed under{' '}
            <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">
              CC-BY 4.0
            </a>
            .
          </li>
          <li>
            Text scanning by{' '}
            <a href="https://github.com/naptha/tesseract.js" target="_blank" rel="noreferrer">
              Tesseract.js
            </a>{' '}
            (Apache-2.0).
          </li>
          <li>Fonts: Fredoka and Nunito (SIL Open Font License 1.1).</li>
          <li>Coco the macaron and all sounds are original to Bonbon.</li>
        </ul>
      </Section>

      <Sheet open={!!confirm} onClose={() => !busy && setConfirm(null)} label="Confirm" color={confirm?.kind === 'restore' ? 'var(--sky)' : 'var(--bad)'}>
        {confirm && (
          <div className="confirm">
            <Emoji e={confirm.kind === 'restore' ? '📦' : confirm.kind === 'reset' ? '🧽' : '🧨'} size={60} />
            <h2>{confirm.kind === 'restore' ? 'Restaurer cette sauvegarde ?' : confirm.kind === 'reset' ? 'Remettre à zéro ?' : 'Tout effacer ?'}</h2>
            {confirm.kind === 'restore' ? (
              <RestoreSummary file={confirm.file} />
            ) : (
              <p className="muted">
                {confirm.kind === 'reset'
                  ? 'Your streak, XP, stats and badges will be erased. Your words (and the ones you added) stay.'
                  : 'Everything goes: progress, stats and every word you added. Bonbon will start fresh.'}
              </p>
            )}
            {needsOui && (
              <label className="field" style={{ width: '100%', marginTop: 10 }}>
                <span className="field-label">Tape OUI pour confirmer · type OUI</span>
                <input className="input input--big center" value={typed} onChange={(e) => setTyped(e.target.value)} autoCapitalize="characters" autoComplete="off" />
              </label>
            )}
            <div className="row" style={{ gap: 12, width: '100%', marginTop: 8 }}>
              <button className="btn btn--ghost grow" onClick={() => setConfirm(null)} disabled={busy}>
                Annuler
              </button>
              <button className={'btn grow ' + (confirm.kind === 'restore' ? 'btn--sky' : 'btn--bad')} onClick={doConfirm} disabled={busy || (needsOui && !ouiOk)}>
                {confirm.kind === 'restore' ? 'Remplacer' : 'Confirmer'}
              </button>
            </div>
          </div>
        )}
      </Sheet>
    </Page>
  );
}

function RestoreSummary({ file }: { file: BackupFile }) {
  const sum = backupSummary(file);
  return (
    <div className="restore-sum">
      <p className="muted">Everything on this device will be replaced by the backup from {new Date(sum.exportedAt).toLocaleDateString()}:</p>
      <ul>
        <li>
          <b>{sum.cards}</b> words ({sum.own} of your own)
        </li>
        <li>
          <b>{sum.sessions}</b> rounds over <b>{sum.days}</b> days
        </li>
        <li>
          <b>{sum.images}</b> photos
        </li>
      </ul>
    </div>
  );
}

function Section({ emoji, title, sub, children, danger }: { emoji: string; title: string; sub: string; children: ReactNode; danger?: boolean }) {
  return (
    <motion.section className={'set-section panel' + (danger ? ' is-danger' : '')} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-20px' }} transition={{ type: 'spring', stiffness: 260, damping: 24 }}>
      <header className="set-head">
        <span className="set-icon">
          <Emoji e={emoji} size={26} />
        </span>
        <div>
          <h2>{title}</h2>
          <span>{sub}</span>
        </div>
      </header>
      {children}
    </motion.section>
  );
}

function Row({ label, sub, children }: { label: string; sub?: string; children: ReactNode }) {
  return (
    <div className="set-row">
      <div>
        <div className="set-row-label">{label}</div>
        {sub && <div className="set-row-sub">{sub}</div>}
      </div>
      {children}
    </div>
  );
}

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      className="toggle"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => {
        sfx.softPop();
        onChange(!on);
      }}
    />
  );
}
