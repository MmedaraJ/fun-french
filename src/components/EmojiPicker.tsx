import { motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { loadEmojiIndex, searchEmoji, twemojiUrl, type EmojiEntry } from '../lib/emoji';
import { sfx } from '../lib/sound';
import { Sheet } from './Sheet';
import './EmojiPicker.css';

let cached: EmojiEntry[] | null = null;

export function useEmojiIndex(): EmojiEntry[] | null {
  const [index, setIndex] = useState<EmojiEntry[] | null>(cached);
  useEffect(() => {
    if (cached) return;
    let alive = true;
    loadEmojiIndex().then((i) => {
      cached = i;
      if (alive) setIndex(i);
    });
    return () => {
      alive = false;
    };
  }, []);
  return index;
}

/** Best emoji matches for an English meaning, e.g. "red apple" -> 🍎. */
export function useEmojiSuggestions(query: string, limit = 8): EmojiEntry[] {
  const index = useEmojiIndex();
  return useMemo(() => (index && query.trim() ? searchEmoji(index, query, limit) : []), [index, query, limit]);
}

const stem = (w: string) => w.replace(/(ies)$/, 'y').replace(/(es|s)$/, '');

/**
 * Single confident emoji for a short meaning, or nothing. Weak keyword-only
 * matches (e.g. "market" -> a stock chart) are refused: no picture beats a misleading one.
 */
export function bestEmoji(index: EmojiEntry[] | null, english: string): string | undefined {
  if (!index || !english.trim()) return undefined;
  const words = english
    .toLowerCase()
    .replace(/[^a-z ]/g, ' ')
    .split(/\s+/)
    .filter((w) => w && !['the', 'a', 'an', 'to', 'of', 'my', 'some'].includes(w));
  if (!words.length || words.length > 3) return undefined;
  const top = searchEmoji(index, english, 1)[0];
  if (!top) return undefined;
  const nameWords = top.name.toLowerCase().split(/[\s:,-]+/);
  const inName = words.some((w) => nameWords.includes(w) || nameWords.includes(stem(w)));
  const inKeywords = words.some((w) => top.keywords.includes(w) || top.keywords.includes(stem(w)));
  if (inName) return top.e;
  if (inKeywords && top.group !== 'Symbols' && top.group !== 'Flags') return top.e;
  return undefined;
}

function LazyEmoji({ e, size = 34 }: { e: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <span style={{ fontSize: size * 0.85, lineHeight: 1 }}>{e}</span>;
  return <img src={twemojiUrl(e)} alt="" width={size} height={size} loading="lazy" draggable={false} onError={() => setFailed(true)} />;
}

const GROUP_ICONS: Record<string, string> = {
  'Smileys & Emotion': '😀',
  'People & Body': '👋',
  'Animals & Nature': '🐻',
  'Food & Drink': '🍔',
  'Travel & Places': '✈️',
  Activities: '⚽',
  Objects: '💡',
  Symbols: '💖',
  Flags: '🏳️',
};

interface SheetProps {
  open: boolean;
  onClose: () => void;
  onPick: (emoji: string | undefined) => void;
  initialQuery?: string;
  current?: string;
}

/** Full emoji browser: search by English word or browse by group. */
export function EmojiPickerSheet({ open, onClose, onPick, initialQuery = '', current }: SheetProps) {
  const index = useEmojiIndex();
  const [query, setQuery] = useState(initialQuery);
  const [group, setGroup] = useState('Food & Drink');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery(initialQuery);
      setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 250);
    }
  }, [open, initialQuery]);

  const groups = useMemo(() => [...new Set(index?.map((e) => e.group) ?? [])], [index]);
  const shown = useMemo(() => {
    if (!index) return [];
    if (query.trim()) return searchEmoji(index, query, 80);
    return index.filter((e) => e.group === group);
  }, [index, query, group]);

  const pick = (e: string | undefined) => {
    sfx.pop();
    onPick(e);
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} label="Choose an emoji" wide>
      <div className="ep">
        <div className="ep-head">
          <h3>Choisis une image</h3>
          {current && (
            <button className="btn btn--sm btn--ghost" onClick={() => pick(undefined)}>
              Aucune
            </button>
          )}
        </div>
        <input
          ref={inputRef}
          className="input"
          placeholder="Search in English: apple, train, happy…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search emoji"
        />
        {!query.trim() && (
          <div className="ep-tabs" role="tablist">
            {groups.map((gname) => (
              <button key={gname} role="tab" aria-selected={gname === group} className={'ep-tab' + (gname === group ? ' is-on' : '')} onClick={() => setGroup(gname)} title={gname}>
                <LazyEmoji e={GROUP_ICONS[gname] ?? '⭐'} size={24} />
              </button>
            ))}
          </div>
        )}
        <div className="ep-grid">
          {!index && <div className="muted">Chargement…</div>}
          {index && shown.length === 0 && <div className="muted ep-empty">No emoji for “{query}”. Try a simpler English word.</div>}
          {shown.map((entry) => (
            <motion.button
              key={entry.e}
              className={'ep-cell' + (entry.e === current ? ' is-on' : '')}
              onClick={() => pick(entry.e)}
              whileTap={{ scale: 0.8 }}
              title={entry.name}
              aria-label={entry.name}
            >
              <LazyEmoji e={entry.e} />
            </motion.button>
          ))}
        </div>
      </div>
    </Sheet>
  );
}

interface ChipsProps {
  query: string;
  value?: string;
  onPick: (emoji: string) => void;
  onMore: () => void;
  limit?: number;
}

/** A row of suggested emoji for the current English text, plus "more". */
export function EmojiSuggestions({ query, value, onPick, onMore, limit = 7 }: ChipsProps) {
  const suggestions = useEmojiSuggestions(query, limit);
  return (
    <div className="ep-suggest">
      {suggestions.map((s, i) => (
        <motion.button
          key={s.e}
          type="button"
          className={'ep-chip' + (s.e === value ? ' is-on' : '')}
          onClick={() => {
            sfx.softPop();
            onPick(s.e);
          }}
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 18, delay: i * 0.03 }}
          title={s.name}
          aria-label={s.name}
        >
          <LazyEmoji e={s.e} size={30} />
        </motion.button>
      ))}
      <button type="button" className="ep-chip ep-more" onClick={onMore}>
        {suggestions.length ? '+' : 'Choisir…'}
      </button>
    </div>
  );
}
