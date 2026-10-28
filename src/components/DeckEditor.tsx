import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { createDeck, updateDeck } from '../lib/content';
import { PALETTE_KEYS, paletteColor } from '../lib/palette';
import { sfx } from '../lib/sound';
import type { Deck, PaletteKey } from '../types';
import { Emoji } from './Emoji';
import { EmojiPickerSheet, EmojiSuggestions } from './EmojiPicker';
import { Sheet } from './Sheet';
import { toast } from './Toasts';
import './DeckEditor.css';

interface Props {
  open: boolean;
  deck?: Deck | null;
  onClose: () => void;
  onSaved?: (deck: Deck) => void;
}

/** Create or edit one of the learner's own themes. */
export function DeckEditor({ open, deck, onClose, onSaved }: Props) {
  const [name, setName] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [emoji, setEmoji] = useState('📒');
  const [color, setColor] = useState<PaletteKey>('grape');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(deck?.name ?? '');
    setNameEn(deck && deck.nameEn !== deck.name ? deck.nameEn : '');
    setEmoji(deck?.emoji ?? '📒');
    setColor(deck?.color ?? PALETTE_KEYS[Math.floor(Math.random() * PALETTE_KEYS.length)]);
  }, [open, deck]);

  const save = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      if (deck) {
        await updateDeck(deck.id, { name: name.trim(), nameEn: nameEn.trim() || name.trim(), emoji, color });
        onSaved?.({ ...deck, name: name.trim(), nameEn: nameEn.trim() || name.trim(), emoji, color });
        toast({ title: 'Thème modifié', emoji, tone: 'success' });
      } else {
        const d = await createDeck({ name, nameEn, emoji, color });
        onSaved?.(d);
        toast({ title: 'Nouveau thème !', body: d.name, emoji, tone: 'success' });
      }
      sfx.pop();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Sheet open={open} onClose={onClose} color={paletteColor(color)} label={deck ? 'Edit theme' : 'New theme'}>
        <form
          className="deck-editor"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <motion.div className="deck-preview" style={{ background: paletteColor(color) }} layout>
            <motion.span key={emoji} initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 400, damping: 12 }}>
              <Emoji e={emoji} size={52} />
            </motion.span>
            <strong>{name.trim() || 'Mon thème'}</strong>
          </motion.div>

          <div className="field">
            <label htmlFor="deck-name">Nom du thème</label>
            <input id="deck-name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="ex. La cuisine, Mon travail, Voyage à Lyon" autoComplete="off" maxLength={40} />
          </div>
          <div className="field">
            <label htmlFor="deck-en">In English (optional)</label>
            <input id="deck-en" className="input" value={nameEn} onChange={(e) => setNameEn(e.target.value)} placeholder="e.g. Kitchen" autoComplete="off" maxLength={40} />
          </div>

          <div className="field">
            <span className="field-label">Image</span>
            <EmojiSuggestions query={nameEn || name} value={emoji} onPick={setEmoji} onMore={() => setPickerOpen(true)} limit={6} />
          </div>

          <div className="field">
            <span className="field-label">Couleur</span>
            <div className="swatches">
              {PALETTE_KEYS.map((k) => (
                <button
                  key={k}
                  type="button"
                  className={'swatch' + (k === color ? ' is-on' : '')}
                  style={{ background: paletteColor(k) }}
                  onClick={() => {
                    sfx.tap();
                    setColor(k);
                  }}
                  aria-label={k}
                  aria-pressed={k === color}
                />
              ))}
            </div>
          </div>

          <button type="submit" className="btn btn--lg btn--block" style={{ '--btn-bg': paletteColor(color) } as React.CSSProperties} disabled={!name.trim() || saving}>
            {deck ? 'Enregistrer' : 'Créer le thème'}
          </button>
        </form>
      </Sheet>
      <EmojiPickerSheet open={pickerOpen} onClose={() => setPickerOpen(false)} onPick={(e) => e && setEmoji(e)} initialQuery={nameEn || ''} current={emoji} />
    </>
  );
}
