import { AnimatePresence, motion, useAnimate } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { addCards, findDuplicates, MY_WORDS_DECK, replaceImage, updateCard } from '../lib/content';
import { ACCENT_KEYS, detectGender, detectKind, splitArticle } from '../lib/french';
import { useDecks } from '../lib/hooks';
import { saveImage, useImageUrl } from '../lib/images';
import { paletteColor } from '../lib/palette';
import { sfx } from '../lib/sound';
import { translateOne } from '../lib/translate';
import type { Card, CardKind, CardSource, Gender } from '../types';
import { DeckEditor } from './DeckEditor';
import { Emoji } from './Emoji';
import { bestEmoji, EmojiPickerSheet, EmojiSuggestions, useEmojiIndex } from './EmojiPicker';
import { PhotoCropper } from './PhotoCropper';
import { Sheet } from './Sheet';
import { SpeakButton } from './SpeakButton';
import { toast } from './Toasts';
import './CardEditor.css';

const LAST_DECK_KEY = 'bonbon-last-deck';

export function lastDeckId(): string {
  try {
    return localStorage.getItem(LAST_DECK_KEY) || MY_WORDS_DECK;
  } catch {
    return MY_WORDS_DECK;
  }
}

function rememberDeck(id: string) {
  try {
    localStorage.setItem(LAST_DECK_KEY, id);
  } catch {
    /* private mode */
  }
}

type Picture = { type: 'none' } | { type: 'emoji'; emoji: string } | { type: 'photo'; blob?: Blob; imageId?: string };

const KINDS: { id: CardKind; label: string; en: string }[] = [
  { id: 'word', label: 'Mot', en: 'word' },
  { id: 'phrase', label: 'Expression', en: 'phrase' },
  { id: 'sentence', label: 'Phrase', en: 'sentence' },
];

interface Props {
  mode: 'create' | 'edit';
  card?: Card;
  defaultDeckId?: string;
  /** Photo flow: a cropped photo to use as the picture. */
  presetPhoto?: Blob;
  source?: CardSource;
  onSaved?: (card: Card) => void;
  onCancel?: () => void;
}

/** The form for one card: French, English, picture, type, gender, theme, note. */
export function CardEditor({ mode, card, defaultDeckId, presetPhoto, source = 'manual', onSaved, onCancel }: Props) {
  const decks = useDecks();
  const [fr, setFr] = useState(card?.fr ?? '');
  const [en, setEn] = useState(card?.en ?? '');
  const [kind, setKind] = useState<CardKind>(card?.kind ?? 'word');
  const [kindTouched, setKindTouched] = useState(mode === 'edit');
  const [gender, setGender] = useState<Gender | undefined>(card?.gender);
  const [plural, setPlural] = useState(!!card?.plural);
  const [genderTouched, setGenderTouched] = useState(mode === 'edit');
  const [note, setNote] = useState(card?.note ?? '');
  const [showNote, setShowNote] = useState(!!card?.note);
  const [deckId, setDeckId] = useState(card?.deckId ?? defaultDeckId ?? lastDeckId());
  const [picture, setPicture] = useState<Picture>(() =>
    presetPhoto ? { type: 'photo', blob: presetPhoto } : card?.imageId ? { type: 'photo', imageId: card.imageId } : card?.emoji ? { type: 'emoji', emoji: card.emoji } : { type: 'none' },
  );
  const [pictureTouched, setPictureTouched] = useState(mode === 'edit' || !!presetPhoto);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [cropFile, setCropFile] = useState<Blob | null>(null);
  const [deckEditorOpen, setDeckEditorOpen] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dupes, setDupes] = useState<Card[]>([]);
  const [flyer, setFlyer] = useState<{ key: number; fr: string; emoji?: string } | null>(null);
  const frRef = useRef<HTMLInputElement>(null);
  const enRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [formScope, animate] = useAnimate<HTMLFormElement>();

  // Keep kind and gender in sync with what's typed, unless chosen by hand.
  useEffect(() => {
    if (!kindTouched) setKind(fr.trim() ? detectKind(fr) : 'word');
  }, [fr, kindTouched]);
  useEffect(() => {
    if (genderTouched) return;
    const g = detectGender(fr);
    setGender(g.gender);
    setPlural(!!g.plural);
  }, [fr, genderTouched]);

  // Duplicate check, lightly debounced.
  useEffect(() => {
    const t = setTimeout(() => {
      if (!fr.trim()) return setDupes([]);
      void findDuplicates(fr, card?.id).then(setDupes);
    }, 250);
    return () => clearTimeout(t);
  }, [fr, card?.id]);

  // Auto-pick a confident emoji for simple words until the learner chooses.
  const emojiIndex = useEmojiIndex();
  const best = useMemo(() => (kind === 'word' ? bestEmoji(emojiIndex, en) : undefined), [emojiIndex, en, kind]);
  useEffect(() => {
    if (pictureTouched) return;
    setPicture(best ? { type: 'emoji', emoji: best } : { type: 'none' });
  }, [best, pictureTouched]);

  const photoUrlFromDb = useImageUrl(picture.type === 'photo' ? picture.imageId : undefined);
  const blobUrl = useMemo(() => (picture.type === 'photo' && picture.blob ? URL.createObjectURL(picture.blob) : undefined), [picture]);
  useEffect(() => () => {
    if (blobUrl) URL.revokeObjectURL(blobUrl);
  }, [blobUrl]);
  const photoUrl = blobUrl ?? photoUrlFromDb;

  const sortedDecks = useMemo(() => {
    const list = [...(decks ?? [])].sort((a, b) => Number(a.builtin) - Number(b.builtin) || a.order - b.order);
    if (!list.some((d) => d.id === MY_WORDS_DECK)) {
      list.unshift({ id: MY_WORDS_DECK, name: 'Mes mots', nameEn: 'My words', emoji: '💝', color: 'plum', builtin: false, active: true, level: 1, order: -1, createdAt: 0 });
    }
    return list;
  }, [decks]);
  const deck = sortedDecks.find((d) => d.id === deckId) ?? sortedDecks[0];

  const insertAccent = (ch: string) => {
    const el = frRef.current;
    if (!el) return;
    const start = el.selectionStart ?? fr.length;
    const end = el.selectionEnd ?? fr.length;
    setFr(fr.slice(0, start) + ch + fr.slice(end));
    sfx.tap();
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + ch.length, start + ch.length);
    });
  };

  const translate = async () => {
    if (translating || !!fr.trim() === !!en.trim()) return;
    setTranslating(true);
    try {
      const out = await translateOne({ fr, en });
      if (!fr.trim()) setFr(out.fr);
      if (!en.trim()) setEn(out.en);
      sfx.softPop();
    } catch (e) {
      toast({ title: 'Pas de traduction', body: (e as Error).message, emoji: '🤷', tone: 'error' }, 4000);
    } finally {
      setTranslating(false);
    }
  };

  const onPhotoChosen = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Ce n’est pas une image', emoji: '🙈', tone: 'error' });
      return;
    }
    setCropFile(file);
  };

  const reset = () => {
    setFr('');
    setEn('');
    setNote('');
    setShowNote(false);
    setKindTouched(false);
    setGenderTouched(false);
    setPicture({ type: 'none' });
    setPictureTouched(false);
    setDupes([]);
    requestAnimationFrame(() => frRef.current?.focus());
  };

  const save = async () => {
    if (saving) return;
    if (!fr.trim() || !en.trim()) {
      const missing = !fr.trim() ? frRef.current : enRef.current;
      missing?.focus();
      if (missing) void animate(missing, { x: [0, -10, 10, -6, 6, 0] }, { duration: 0.4 });
      toast({ title: !fr.trim() ? 'Écris le mot en français' : 'Ajoute la traduction', body: !fr.trim() ? undefined : 'Type the English, or tap “Traduire”.', emoji: '✏️' });
      return;
    }
    setSaving(true);
    try {
      const isWord = kind === 'word';
      if (mode === 'create') {
        const imageId = picture.type === 'photo' && picture.blob ? await saveImage(picture.blob) : undefined;
        const [saved] = await addCards(
          [
            {
              fr,
              en,
              kind,
              gender: isWord ? gender : undefined,
              plural: isWord ? plural : undefined,
              emoji: picture.type === 'emoji' ? picture.emoji : undefined,
              imageId,
              note: showNote ? note : undefined,
            },
          ],
          { deckId: deck.id, source: imageId ? 'photo' : source },
        );
        rememberDeck(deck.id);
        sfx.pop();
        setFlyer({ key: Date.now(), fr: saved.fr, emoji: saved.emoji });
        toast({ title: 'Ajouté !', body: `${saved.fr} → ${deck.name}`, emoji: saved.emoji ?? '✨', tone: 'success' });
        onSaved?.(saved);
        reset();
      } else if (card) {
        await updateCard(card.id, {
          fr,
          en,
          kind,
          gender: isWord ? gender : undefined,
          plural: isWord && plural ? true : undefined,
          emoji: picture.type === 'emoji' ? picture.emoji : undefined,
          note: showNote ? note : undefined,
          deckId: deck.id,
        });
        if (picture.type === 'photo' && picture.blob) await replaceImage(card.id, await saveImage(picture.blob));
        else if (picture.type !== 'photo' && card.imageId) await replaceImage(card.id, undefined);
        sfx.pop();
        toast({ title: 'Enregistré', emoji: '💾', tone: 'success' });
        onSaved?.({ ...card, fr, en, kind, deckId: deck.id });
      }
    } catch (e) {
      toast({ title: 'Oups', body: (e as Error).message, emoji: '😬', tone: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const article = splitArticle(fr).article;
  const elided = article === "l'";

  return (
    <form
      ref={formScope}
      className="ce"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <div className="ce-top">
        <motion.button
          type="button"
          className={'ce-picture' + (picture.type === 'none' ? ' is-empty' : '')}
          onClick={() => setPickerOpen(true)}
          whileTap={{ scale: 0.94 }}
          aria-label="Choose a picture"
          style={{ '--deck': paletteColor(deck?.color) } as React.CSSProperties}
        >
          <AnimatePresence mode="popLayout">
            <motion.span
              key={picture.type === 'emoji' ? picture.emoji : picture.type === 'photo' ? photoUrl ?? 'photo' : 'none'}
              className="ce-picture-inner"
              initial={{ scale: 0, rotate: -25 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 420, damping: 16 }}
            >
              {picture.type === 'emoji' && <Emoji e={picture.emoji} size={78} />}
              {picture.type === 'photo' && photoUrl && <img src={photoUrl} alt="" draggable={false} />}
              {picture.type === 'none' && <span className="ce-q">?</span>}
            </motion.span>
          </AnimatePresence>
        </motion.button>
        <div className="ce-picture-actions">
          <span className="field-label">Image</span>
          <EmojiSuggestions
            query={en}
            value={picture.type === 'emoji' ? picture.emoji : undefined}
            onPick={(e) => {
              setPicture({ type: 'emoji', emoji: e });
              setPictureTouched(true);
            }}
            onMore={() => setPickerOpen(true)}
            limit={5}
          />
          <div className="row row--wrap ce-photo-btns">
            <button type="button" className="chip" onClick={() => cameraRef.current?.click()}>
              <Emoji e="📷" size={18} /> Caméra
            </button>
            <button type="button" className="chip" onClick={() => galleryRef.current?.click()}>
              <Emoji e="🖼️" size={18} /> Galerie
            </button>
            {picture.type !== 'none' && (
              <button
                type="button"
                className="chip"
                onClick={() => {
                  setPicture({ type: 'none' });
                  setPictureTouched(true);
                }}
              >
                ✕ Aucune
              </button>
            )}
          </div>
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => onPhotoChosen(e.target.files?.[0])} />
          <input ref={galleryRef} type="file" accept="image/*" hidden onChange={(e) => onPhotoChosen(e.target.files?.[0])} />
        </div>
      </div>

      <div className="field">
        <label htmlFor="ce-fr">
          Français <span className="ce-flag">🇫🇷</span>
        </label>
        <div className="ce-input-row">
          <input
            id="ce-fr"
            ref={frRef}
            className="input input--big"
            value={fr}
            onChange={(e) => setFr(e.target.value)}
            placeholder="le chat, bon appétit, Je suis prête !"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            lang="fr"
            enterKeyHint="next"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !en.trim()) {
                e.preventDefault();
                enRef.current?.focus();
              }
            }}
            data-testid="ce-fr"
          />
          {fr.trim() && <SpeakButton text={fr} size="md" tone="solid" />}
        </div>
        <div className="ce-accents">
          {ACCENT_KEYS.map((k) => (
            <button key={k} type="button" className="ce-accent" onMouseDown={(e) => e.preventDefault()} onClick={() => insertAccent(k)}>
              {k}
            </button>
          ))}
        </div>
        <AnimatePresence>
          {dupes.length > 0 && (
            <motion.div className="ce-dupe" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
              <Emoji e="👀" size={18} /> Déjà dans tes mots : <strong>{dupes[0].fr}</strong>
              {dupes[0].en ? ` (${dupes[0].en})` : ''}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="field">
        <div className="ce-label-row">
          <label htmlFor="ce-en">
            English <span className="ce-flag">🇬🇧</span>
          </label>
          {!!fr.trim() !== !!en.trim() && (
            <motion.button type="button" className="btn btn--sm btn--sky" onClick={translate} disabled={translating} initial={{ scale: 0 }} animate={{ scale: 1 }}>
              {translating ? '…' : '✨ Traduire'}
            </motion.button>
          )}
        </div>
        <input
          id="ce-en"
          ref={enRef}
          className="input"
          value={en}
          onChange={(e) => setEn(e.target.value)}
          placeholder="cat, enjoy your meal, I'm ready!"
          autoComplete="off"
          enterKeyHint="done"
          data-testid="ce-en"
        />
      </div>

      <div className="ce-meta">
        <div className="field">
          <span className="field-label">Type</span>
          <div className="row row--wrap" style={{ gap: 6 }}>
            {KINDS.map((k) => (
              <button
                key={k.id}
                type="button"
                className="chip"
                aria-pressed={kind === k.id}
                onClick={() => {
                  setKind(k.id);
                  setKindTouched(true);
                  sfx.tap();
                }}
                title={k.en}
              >
                {k.label}
              </button>
            ))}
          </div>
        </div>
        {kind === 'word' && (
          <div className="field">
            <span className="field-label">Genre {elided && !gender && <em className="ce-hint">l’… : le ou la ?</em>}</span>
            <div className="row row--wrap" style={{ gap: 6 }}>
              {(
                [
                  ['m', 'le · masc.'],
                  ['f', 'la · fém.'],
                ] as [Gender, string][]
              ).map(([g, label]) => (
                <button
                  key={g}
                  type="button"
                  className={'chip ce-g ce-g--' + g}
                  aria-pressed={gender === g}
                  onClick={() => {
                    setGender(gender === g ? undefined : g);
                    setGenderTouched(true);
                    sfx.tap();
                  }}
                >
                  {label}
                </button>
              ))}
              <button
                type="button"
                className="chip"
                aria-pressed={plural}
                onClick={() => {
                  setPlural(!plural);
                  setGenderTouched(true);
                  sfx.tap();
                }}
              >
                pluriel
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="field">
        <span className="field-label">Thème</span>
        <div className="hscroll ce-decks">
          {sortedDecks.map((d) => (
            <button
              key={d.id}
              type="button"
              className="chip"
              aria-pressed={d.id === deck?.id}
              onClick={() => {
                setDeckId(d.id);
                sfx.tap();
              }}
            >
              <Emoji e={d.emoji} size={18} /> {d.name}
            </button>
          ))}
          <button type="button" className="chip ce-newdeck" onClick={() => setDeckEditorOpen(true)}>
            + Nouveau thème
          </button>
        </div>
      </div>

      {showNote ? (
        <div className="field">
          <label htmlFor="ce-note">Note</label>
          <input id="ce-note" className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="informal, f: petite, from my book p.12…" autoComplete="off" maxLength={80} />
        </div>
      ) : (
        <button type="button" className="ce-addnote" onClick={() => setShowNote(true)}>
          + Ajouter une note
        </button>
      )}

      <div className="ce-actions">
        {onCancel && (
          <button type="button" className="btn btn--ghost" onClick={onCancel}>
            Annuler
          </button>
        )}
        <button type="submit" className="btn btn--lg btn--ok grow" disabled={saving} data-testid="ce-save">
          {saving ? '…' : mode === 'create' ? 'Ajouter' : 'Enregistrer'}
        </button>
      </div>

      <AnimatePresence>
        {flyer && (
          <motion.div
            key={flyer.key}
            className="ce-flyer"
            initial={{ opacity: 0, scale: 0.6, y: 0 }}
            animate={{ opacity: [0, 1, 1, 0], scale: [0.6, 1.1, 1, 0.5], y: [0, -20, -60, -220], rotate: [0, -4, 4, 12] }}
            transition={{ duration: 1.1, times: [0, 0.2, 0.5, 1] }}
            onAnimationComplete={() => setFlyer(null)}
            aria-hidden
          >
            {flyer.emoji && <Emoji e={flyer.emoji} size={34} />}
            <span>{flyer.fr}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <EmojiPickerSheet
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={(e) => {
          setPicture(e ? { type: 'emoji', emoji: e } : { type: 'none' });
          setPictureTouched(true);
        }}
        initialQuery={en}
        current={picture.type === 'emoji' ? picture.emoji : undefined}
      />
      <Sheet open={!!cropFile} onClose={() => setCropFile(null)} label="Crop photo">
        {cropFile && (
          <PhotoCropper
            file={cropFile}
            onCancel={() => setCropFile(null)}
            onDone={(blob) => {
              setPicture({ type: 'photo', blob });
              setPictureTouched(true);
              setCropFile(null);
            }}
          />
        )}
      </Sheet>
      <DeckEditor open={deckEditorOpen} onClose={() => setDeckEditorOpen(false)} onSaved={(d) => setDeckId(d.id)} />
    </form>
  );
}
