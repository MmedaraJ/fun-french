import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { memo, useEffect, useMemo, useState, type ReactNode } from 'react';
import { DeckEditor } from '../../components/DeckEditor';
import { Emoji } from '../../components/Emoji';
import { bestEmoji, EmojiPickerSheet, useEmojiIndex } from '../../components/EmojiPicker';
import { toast } from '../../components/Toasts';
import { existingByFrench, MY_WORDS_DECK } from '../../lib/content';
import { normalizeAnswer } from '../../lib/french';
import { useDecks } from '../../lib/hooks';
import { markDuplicates, withArticle, type Candidate } from '../../lib/parse';
import { sfx } from '../../lib/sound';
import { fillMissing } from '../../lib/translate';
import type { CardKind, Gender } from '../../types';
import { lastDeckId } from '../../components/CardEditor';

export interface ReviewRow extends Candidate {
  key: string;
  include: boolean;
  duplicate: 'existing' | 'list' | null;
  main?: boolean;
}

let rowSeq = 0;

/** Wrap candidates as review rows; duplicates start unticked. */
export function toRows(cands: (Candidate & { main?: boolean })[], existing: string[]): ReviewRow[] {
  return markDuplicates(cands, existing).map(({ item, duplicate }) => ({
    ...item,
    key: `r${++rowSeq}`,
    include: !duplicate,
    duplicate,
  }));
}

interface Props {
  rows: ReviewRow[];
  onChange: (rows: ReviewRow[]) => void;
  onSubmit: (rows: ReviewRow[], deckId: string) => Promise<void>;
  /** Photo flow: offer to attach this photo to one row. */
  photoUrl?: string;
  attachKey?: string | null;
  onAttach?: (key: string | null) => void;
  top?: ReactNode;
  /** Label for the button when nothing is ticked but there is still something to save (photo on an existing word). */
  emptyAction?: string;
}

const KIND_LABEL: Record<CardKind, string> = { word: 'mot', phrase: 'expression', sentence: 'phrase' };

interface ItemProps {
  row: ReviewRow;
  index: number;
  /** Long lists skip the layout animation. */
  big: boolean;
  duplicate: 'existing' | 'list' | null | undefined;
  /** Theme that already has this text. */
  duplicateDeck?: string;
  onPatch: (key: string, patch: Partial<ReviewRow>) => void;
  onPickEmoji: (key: string) => void;
  /** Photo flow: this row can take the photo. */
  photo?: { on: boolean; toggle: () => void };
}

/** One editable candidate: tick, picture, French, English, kind, gender. */
export const ReviewItem = memo(function ReviewItem({ row: r, index: i, big, duplicate, duplicateDeck, onPatch, onPickEmoji, photo }: ItemProps) {
  return (
    <motion.li
      className={'review-row' + (r.include ? '' : ' is-off') + (r.include && !r.en.trim() ? ' is-missing' : '')}
      layout={!big}
      initial={big && i > 12 ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ delay: Math.min(i, 12) * 0.025 }}
    >
      <button
        className={'review-check' + (r.include ? ' is-on' : '')}
        onClick={() => {
          sfx.tap();
          onPatch(r.key, { include: !r.include });
        }}
        aria-label={r.include ? 'Exclude' : 'Include'}
        aria-pressed={r.include}
      >
        {r.include ? '✓' : ''}
      </button>
      <button className="review-emoji" onClick={() => onPickEmoji(r.key)} aria-label="Choose picture">
        {r.emoji ? <Emoji e={r.emoji} size={32} /> : <span className="review-noemoji">＋</span>}
      </button>
      <div className="review-fields">
        <input className="review-input review-fr" value={r.fr} onChange={(e) => onPatch(r.key, { fr: e.target.value })} lang="fr" aria-label="French" spellCheck={false} />
        <input className="review-input review-en" value={r.en} onChange={(e) => onPatch(r.key, { en: e.target.value })} placeholder="English…" aria-label="English" />
        <div className="review-tags">
          <select className="review-kind" value={r.kind} onChange={(e) => onPatch(r.key, { kind: e.target.value as CardKind })} aria-label="Type">
            {(['word', 'phrase', 'sentence'] as CardKind[]).map((k) => (
              <option key={k} value={k}>
                {KIND_LABEL[k]}
              </option>
            ))}
          </select>
          {r.kind === 'word' && (
            <button
              className={'review-g' + (r.gender ? ' g-' + r.gender : '')}
              onClick={() => {
                const next: Gender | undefined = r.gender === undefined ? 'm' : r.gender === 'm' ? 'f' : undefined;
                onPatch(r.key, { gender: next, fr: withArticle(r.fr, next) });
              }}
              title="Gender"
            >
              {r.gender === 'm' ? 'le' : r.gender === 'f' ? 'la' : 'le/la ?'}
            </button>
          )}
          {duplicate && <span className="badge review-dupe">{duplicate === 'existing' ? `déjà dans « ${duplicateDeck ?? 'tes mots'} »` : 'en double'}</span>}
          {photo && (
            <button className={'review-attach' + (photo.on ? ' is-on' : '')} onClick={photo.toggle}>
              <Emoji e="📷" size={16} /> {photo.on ? 'photo ✓' : 'photo'}
            </button>
          )}
        </div>
      </div>
    </motion.li>
  );
});

export function ReviewList({ rows, onChange, onSubmit, photoUrl, attachKey, onAttach, top, emptyAction }: Props) {
  const decks = useDecks();
  const navigate = useNavigate();
  const [existing, setExisting] = useState<Map<string, { id: string; deck: string }>>(new Map());
  useEffect(() => {
    void existingByFrench().then(setExisting);
  }, []);
  // Duplicates are recomputed live: against every theme, and inside the list itself.
  const dupes = useMemo(() => new Map(markDuplicates(rows, existing.keys()).map(({ item, duplicate }) => [item.key, duplicate])), [rows, existing]);
  const known = useMemo(() => rows.map((r) => existing.get(normalizeAnswer(r.fr))).filter((x): x is { id: string; deck: string } => !!x), [rows, existing]);
  const big = rows.length > 40;
  const index = useEmojiIndex();
  const [deckId, setDeckId] = useState(lastDeckId());
  const [deckEditor, setDeckEditor] = useState(false);
  const [pickerFor, setPickerFor] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const included = rows.filter((r) => r.include);
  const missing = rows.filter((r) => r.include && (!r.fr.trim() || !r.en.trim()));
  const sortedDecks = useMemo(() => {
    const list = [...(decks ?? [])].sort((a, b) => Number(a.builtin) - Number(b.builtin) || a.order - b.order);
    if (!list.some((d) => d.id === MY_WORDS_DECK)) {
      list.unshift({ id: MY_WORDS_DECK, name: 'Mes mots', nameEn: 'My words', emoji: '💝', color: 'plum', builtin: false, active: true, level: 1, order: -1, createdAt: 0 });
    }
    return list;
  }, [decks]);
  const deck = sortedDecks.find((d) => d.id === deckId) ?? sortedDecks[0];

  const patch = (key: string, p: Partial<ReviewRow>) => onChange(rows.map((r) => (r.key === key ? { ...r, ...p } : r)));

  const translateAll = async () => {
    if (progress) return;
    const targets = rows.filter((r) => r.include && !!r.fr.trim() !== !!r.en.trim());
    if (!targets.length) return;
    setProgress({ done: 0, total: targets.length });
    try {
      const res = await fillMissing(
        targets.map((r) => ({ fr: r.fr, en: r.en })),
        (done, total) => setProgress({ done, total }),
      );
      const byKey = new Map(targets.map((r, i) => [r.key, res.pairs[i]]));
      onChange(
        rows.map((r) => {
          const t = byKey.get(r.key);
          if (!t) return r;
          const en = t.en;
          const emoji = r.emoji ?? (r.kind === 'word' ? bestEmoji(index, en) : undefined);
          return { ...r, fr: t.fr, en, emoji };
        }),
      );
      sfx.softPop();
      if (res.failed) toast({ title: `${res.failed} sans traduction`, body: res.error ?? 'Type those in by hand.', emoji: '🤷', tone: 'error' }, 4500);
    } catch (e) {
      toast({ title: 'Traduction impossible', body: (e as Error).message, emoji: '😕', tone: 'error' }, 4500);
    } finally {
      setProgress(null);
    }
  };

  const submit = async () => {
    if (submitting || (!included.length && !emptyAction) || missing.length) return;
    setSubmitting(true);
    try {
      await onSubmit(included, deck.id);
    } finally {
      setSubmitting(false);
    }
  };

  const setAll = (include: boolean) => onChange(rows.map((r) => ({ ...r, include })));
  const pickerRow = rows.find((r) => r.key === pickerFor);

  return (
    <div className="review">
      {top}
      <div className="review-bar">
        <span className="review-count">
          <strong>{included.length}</strong> / {rows.length} sélectionnés
        </span>
        <div className="row" style={{ gap: 6 }}>
          <button className="btn btn--sm btn--ghost" onClick={() => setAll(true)}>
            Tout
          </button>
          <button className="btn btn--sm btn--ghost" onClick={() => setAll(false)}>
            Rien
          </button>
        </div>
      </div>

      {known.length > 0 && (
        <div className="review-known">
          <span>
            <Emoji e="✅" size={20} /> {known.length === rows.length ? 'Tu as déjà tous ces mots !' : `${known.length} déjà dans tes thèmes`}
            <small>{rows.length - known.length > 0 ? `${rows.length - known.length} new, ticked below.` : 'Nothing new to add.'}</small>
          </span>
          <button className="btn btn--sm btn--grape" onClick={() => navigate(`/play/mix?cards=${[...new Set(known.map((k) => k.id))].slice(0, 30).join(',')}`)}>
            🎮 Réviser
          </button>
        </div>
      )}

      {missing.length > 0 && (
        <motion.div className="review-translate" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}>
          <span>
            <Emoji e="🌍" size={22} /> {missing.length} carte{missing.length > 1 ? 's' : ''} sans traduction
          </span>
          <button className="btn btn--sm btn--sky" onClick={translateAll} disabled={!!progress} data-testid="translate-all">
            {progress ? `${progress.done}/${progress.total}…` : '✨ Traduire tout'}
          </button>
          {progress && (
            <span className="review-progress">
              <motion.span animate={{ width: `${(progress.done / Math.max(1, progress.total)) * 100}%` }} />
            </span>
          )}
        </motion.div>
      )}

      <ul className="review-list">
        <AnimatePresence initial={false}>
          {rows.map((r, i) => (
            <ReviewItem
              key={r.key}
              row={r}
              index={i}
              big={big}
              duplicate={dupes.get(r.key)}
              duplicateDeck={existing.get(normalizeAnswer(r.fr))?.deck}
              onPatch={patch}
              onPickEmoji={setPickerFor}
              photo={photoUrl && onAttach ? { on: attachKey === r.key, toggle: () => onAttach(attachKey === r.key ? null : r.key) } : undefined}
            />
          ))}
        </AnimatePresence>
      </ul>

      <div className="field" style={{ marginTop: 18 }}>
        <span className="field-label">Dans le thème</span>
        <div className="hscroll">
          {sortedDecks.map((d) => (
            <button key={d.id} className="chip" aria-pressed={d.id === deck?.id} onClick={() => setDeckId(d.id)}>
              <Emoji e={d.emoji} size={18} /> {d.name}
            </button>
          ))}
          <button className="chip ce-newdeck" onClick={() => setDeckEditor(true)}>
            + Nouveau thème
          </button>
        </div>
      </div>

      <div className="review-submit">
        {missing.length > 0 && missing.some((r) => r.fr.trim()) ? (
          <button className="btn btn--lg btn--sky btn--block" onClick={translateAll} disabled={!!progress}>
            {progress ? `Traduction… ${progress.done}/${progress.total}` : `✨ Traduire les ${missing.length} manquante${missing.length > 1 ? 's' : ''}`}
          </button>
        ) : (
          <button className="btn btn--lg btn--ok btn--block" onClick={submit} disabled={(!included.length && !emptyAction) || missing.length > 0 || submitting} data-testid="review-submit">
            {submitting ? '…' : !included.length && emptyAction ? emptyAction : `Ajouter ${included.length} carte${included.length > 1 ? 's' : ''}`}
          </button>
        )}
      </div>

      <EmojiPickerSheet
        open={!!pickerRow}
        onClose={() => setPickerFor(null)}
        onPick={(e) => pickerRow && patch(pickerRow.key, { emoji: e })}
        initialQuery={pickerRow?.en ?? ''}
        current={pickerRow?.emoji}
      />
      <DeckEditor open={deckEditor} onClose={() => setDeckEditor(false)} onSaved={(d) => setDeckId(d.id)} />
    </div>
  );
}
