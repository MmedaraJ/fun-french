import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CardEditor } from '../components/CardEditor';
import { CardImage, hasPicture } from '../components/CardImage';
import { DeckEditor } from '../components/DeckEditor';
import { Emoji } from '../components/Emoji';
import { Mascot } from '../components/Mascot';
import { Page } from '../components/Page';
import { ProgressRing } from '../components/ProgressRing';
import { Sheet } from '../components/Sheet';
import { SpeakButton } from '../components/SpeakButton';
import { toast } from '../components/Toasts';
import { deleteCard, deleteDeck, moveCards, MY_WORDS_DECK, restoreCard, setFocus, updateDeck } from '../lib/content';
import { DAY, HOUR, MINUTE } from '../lib/date';
import { splitArticle, stripAccents } from '../lib/french';
import { useCards, useDecks, useProgressMap } from '../lib/hooks';
import { paletteColor } from '../lib/palette';
import { useSettings } from '../lib/settings';
import { sfx } from '../lib/sound';
import { statusOf, strength, type CardStatus } from '../lib/srs';
import type { Card, Deck, Progress } from '../types';
import './Words.css';

const PAGE = 60;

const STATUS: { id: CardStatus; label: string; one: string; en: string; color: string }[] = [
  { id: 'new', label: 'Nouveaux', one: 'Nouveau', en: 'new', color: 'var(--text-soft)' },
  { id: 'learning', label: 'En cours', one: 'En cours', en: 'learning', color: 'var(--tangerine)' },
  { id: 'learned', label: 'Appris', one: 'Appris', en: 'learned', color: 'var(--sky)' },
  { id: 'mastered', label: 'Maîtrisés', one: 'Maîtrisé', en: 'mastered', color: 'var(--leaf)' },
];

/** First letter of the noun, for cards without a picture. */
function initial(fr: string): string {
  return (splitArticle(fr).noun.match(/\p{L}/u)?.[0] ?? '?').toUpperCase();
}

const norm = (s: string) => stripAccents(s.toLowerCase()).replace(/[’']/g, "'");

function nextReview(p?: Progress): string {
  if (!p || p.seen === 0) return 'pas encore vu';
  const d = p.due - Date.now();
  if (d <= 0) return 'à réviser maintenant';
  if (d < HOUR) return `dans ${Math.max(1, Math.round(d / MINUTE))} min`;
  if (d < DAY) return `dans ${Math.round(d / HOUR)} h`;
  const days = Math.round(d / DAY);
  return `dans ${days} jour${days > 1 ? 's' : ''}`;
}

const ringColor = (s: CardStatus) => STATUS.find((x) => x.id === s)!.color;

export default function Words() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const allCards = useCards();
  const decks = useDecks();
  // words from themes below the level floor are left out, like the themes themselves
  const cards = useMemo(() => {
    if (!allCards || !decks) return undefined;
    const shown = new Set(decks.map((d) => d.id));
    return allCards.filter((c) => shown.has(c.deckId));
  }, [allCards, decks]);
  const progress = useProgressMap();
  const mascotColor = useSettings((s) => s.mascotColor);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<CardStatus | null>(null);
  const [starred, setStarred] = useState(false);
  const [showHidden, setShowHidden] = useState(false);
  const [limit, setLimit] = useState(PAGE);
  const [deckEditor, setDeckEditor] = useState<{ open: boolean; deck: Deck | null }>({ open: false, deck: null });
  const [deleteDeckOpen, setDeleteDeckOpen] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);

  const deckId = params.get('deck');
  const openCardId = params.get('card');
  const deck = decks?.find((d) => d.id === deckId) ?? null;

  const setDeck = (id: string | null) => {
    sfx.tap();
    const next = new URLSearchParams(params);
    if (id) next.set('deck', id);
    else next.delete('deck');
    next.delete('card');
    setParams(next, { replace: true });
  };
  const openCard = (id: string | null) => {
    const next = new URLSearchParams(params);
    if (id) next.set('card', id);
    else next.delete('card');
    setParams(next, { replace: !id });
  };

  useEffect(() => setLimit(PAGE), [deckId, query, status, starred, showHidden]);

  const searchable = useMemo(() => new Map((cards ?? []).map((c) => [c.id, norm(`${c.fr} ${c.en} ${c.note ?? ''}`)])), [cards]);
  const deckOrder = useMemo(() => new Map((decks ?? []).map((d) => [d.id, d.order])), [decks]);
  const deckColor = useMemo(() => new Map((decks ?? []).map((d) => [d.id, d.color])), [decks]);

  const visible = useMemo(() => {
    if (!cards || !progress) return [];
    const q = norm(query.trim());
    return cards
      .filter((c) => (showHidden ? c.archived : !c.archived))
      .filter((c) => !deckId || c.deckId === deckId)
      .filter((c) => !starred || c.focus)
      .filter((c) => !status || statusOf(progress.get(c.id)) === status)
      .filter((c) => !q || searchable.get(c.id)!.includes(q))
      .sort((a, b) => {
        const ua = a.source !== 'starter';
        const ub = b.source !== 'starter';
        if (ua !== ub) return ua ? -1 : 1;
        if (ua) return b.createdAt - a.createdAt;
        return (deckOrder.get(a.deckId) ?? 0) - (deckOrder.get(b.deckId) ?? 0) || a.order - b.order;
      });
  }, [cards, progress, query, deckId, starred, status, showHidden, searchable, deckOrder]);

  const hiddenCount = useMemo(() => (cards ?? []).filter((c) => c.archived && (!deckId || c.deckId === deckId)).length, [cards, deckId]);

  // Load more as the end comes into view.
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) setLimit((l) => l + PAGE);
    }, { rootMargin: '400px' });
    io.observe(el);
    return () => io.disconnect();
  }, [visible.length]);

  const deckStats = useMemo(() => {
    if (!deck || !cards || !progress) return null;
    const list = cards.filter((c) => c.deckId === deck.id && !c.archived);
    const counts = { new: 0, learning: 0, learned: 0, mastered: 0 } as Record<CardStatus, number>;
    for (const c of list) counts[statusOf(progress.get(c.id))]++;
    return { total: list.length, counts };
  }, [deck, cards, progress]);

  const openedCard = cards?.find((c) => c.id === openCardId) ?? null;
  const sortedDecks = (decks ?? []).slice().sort((a, b) => Number(b.active) - Number(a.active) || Number(a.builtin) - Number(b.builtin) || a.order - b.order);

  const toggleStar = async (c: Card) => {
    sfx.softPop();
    await setFocus(c.id, !c.focus);
  };

  return (
    <Page className="words">
      <div className="words-head">
        <div>
          <h1 className="screen-title">Mes mots</h1>
          <p className="screen-sub">{cards ? `${cards.filter((c) => !c.archived).length} words & phrases · tap one to hear it` : '…'}</p>
        </div>
      </div>

      <div className="words-search">
        <span aria-hidden className="search-icon">
          🔍
        </span>
        <input className="input" placeholder="Chercher · Search French or English" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search words" data-testid="words-search" />
        {query && (
          <button className="search-clear" onClick={() => setQuery('')} aria-label="Clear search">
            ✕
          </button>
        )}
      </div>

      <div className="hscroll words-decks">
        <button className="chip" aria-pressed={!deckId} onClick={() => setDeck(null)}>
          <Emoji e="🍬" size={18} /> Tous
        </button>
        {sortedDecks.map((d) => (
          <button key={d.id} className={'chip' + (d.active ? '' : ' chip--off')} aria-pressed={d.id === deckId} onClick={() => setDeck(d.id)}>
            <Emoji e={d.emoji} size={18} /> {d.name}
          </button>
        ))}
        <button className="chip ce-newdeck" onClick={() => setDeckEditor({ open: true, deck: null })}>
          + Thème
        </button>
      </div>

      <div className="row row--wrap words-filters">
        {STATUS.map((s) => (
          <button key={s.id} className="chip chip--small" aria-pressed={status === s.id} onClick={() => setStatus(status === s.id ? null : s.id)}>
            <span className="dot" style={{ background: s.color }} /> {s.label}
          </button>
        ))}
        <button className="chip chip--small" aria-pressed={starred} onClick={() => setStarred(!starred)}>
          <Emoji e="⭐" size={16} /> Favoris
        </button>
      </div>

      <AnimatePresence mode="wait">
        {deck && deckStats && !showHidden && (
          <motion.section key={deck.id} className="deck-hero" style={{ '--deck': paletteColor(deck.color) } as React.CSSProperties} initial={{ opacity: 0, y: 12, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }}>
            <div className="deck-hero-top">
              <motion.span className="deck-hero-emoji" initial={{ rotate: -20, scale: 0.5 }} animate={{ rotate: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 12 }}>
                <Emoji e={deck.emoji} size={52} />
              </motion.span>
              <div className="deck-hero-text">
                <h2>{deck.name}</h2>
                <span>{deck.nameEn}</span>
              </div>
              {!deck.builtin && (
                <div className="row" style={{ gap: 6 }}>
                  <button className="icon-btn" onClick={() => setDeckEditor({ open: true, deck })} aria-label="Edit theme">
                    ✏️
                  </button>
                  {deck.id !== MY_WORDS_DECK && (
                    <button className="icon-btn" onClick={() => setDeleteDeckOpen(true)} aria-label="Delete theme">
                      🗑️
                    </button>
                  )}
                </div>
              )}
            </div>
            <div className="deck-hero-bar" aria-label="Progress">
              {STATUS.slice()
                .reverse()
                .map((s) => (
                  <motion.span key={s.id} style={{ background: s.id === 'new' ? 'rgba(255,255,255,0.35)' : s.color === 'var(--text-soft)' ? '#fff' : s.color }} initial={{ width: 0 }} animate={{ width: `${(deckStats.counts[s.id] / Math.max(1, deckStats.total)) * 100}%` }} transition={{ type: 'spring', stiffness: 60, damping: 16 }} title={`${deckStats.counts[s.id]} ${s.en}`} />
                ))}
            </div>
            <div className="deck-hero-counts">
              <span>
                <strong>{deckStats.total}</strong> mots
              </span>
              <span>
                <strong>{deckStats.counts.learned + deckStats.counts.mastered}</strong> appris
              </span>
              <span>
                <strong>{deckStats.counts.mastered}</strong> maîtrisés
              </span>
            </div>
            <div className="deck-hero-actions">
              <label className="deck-active">
                <button
                  role="switch"
                  className="toggle"
                  aria-checked={deck.active}
                  onClick={async () => {
                    sfx.tap();
                    await updateDeck(deck.id, { active: !deck.active });
                    toast({ title: deck.active ? 'Thème en pause' : 'Thème actif !', body: deck.active ? 'No new words from it in daily practice.' : 'New words from it will show up in daily practice.', emoji: deck.emoji });
                  }}
                  aria-label="Use in daily practice"
                />
                <span>Dans la révision du jour</span>
              </label>
              <button className="btn btn--white" onClick={() => navigate(`/play/mix?decks=${encodeURIComponent(deck.id)}`)} disabled={!deckStats.total}>
                <Emoji e="🎮" size={22} /> Jouer
              </button>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {showHidden && (
        <div className="hidden-banner">
          <span>
            <Emoji e="🙈" size={20} /> Mots masqués — built-in words you removed.
          </span>
          <button className="btn btn--sm btn--ghost" onClick={() => setShowHidden(false)}>
            Fermer
          </button>
        </div>
      )}

      {cards && progress && visible.length === 0 && (
        <motion.div className="words-empty panel panel--flat" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Mascot mood={query ? 'thinking' : 'sleepy'} size={100} color={mascotColor} />
          <h3>{query ? 'Aucun mot trouvé' : 'Rien ici pour l’instant'}</h3>
          <p className="muted">{query ? `Nothing matches “${query}”. Add it?` : 'Add your first words to this theme.'}</p>
          <button className="btn btn--ok" onClick={() => navigate(`/add/word?back=/words${deckId ? `&deck=${encodeURIComponent(deckId)}` : ''}`)}>
            + Ajouter un mot
          </button>
        </motion.div>
      )}

      <div className="word-grid">
        {visible.slice(0, limit).map((c, i) => {
          const p = progress?.get(c.id);
          const st = statusOf(p);
          return (
            <motion.div
              key={c.id}
              className="word-card"
              initial={{ opacity: 0, y: 14, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 380, damping: 26, delay: Math.min(i % PAGE, 18) * 0.015 }}
              layout="position"
            >
              <button className="word-card-main" onClick={() => openCard(c.id)} data-testid="word-card">
                <span className="word-pic">
                  {hasPicture(c) && c.kind !== 'sentence' ? (
                    <CardImage card={c} size={c.imageId ? '100%' : 50} rounded={c.imageId ? 16 : 10} fallback="none" />
                  ) : c.kind === 'word' ? (
                    <span className="word-initial" style={{ '--deck': paletteColor(deckColor.get(c.deckId)) } as React.CSSProperties}>
                      {initial(c.fr)}
                    </span>
                  ) : (
                    <span className="word-quote">“</span>
                  )}
                </span>
                <strong className="word-fr">{c.fr}</strong>
                <span className="word-en">{c.en}</span>
              </button>
              <span className="word-ring" title={st}>
                <ProgressRing value={strength(p)} size={24} stroke={4} color={ringColor(st)} />
              </span>
              {showHidden ? (
                <button
                  className="word-restore"
                  onClick={async () => {
                    await restoreCard(c.id);
                    sfx.pop();
                    toast({ title: 'Restauré', body: c.fr, emoji: '♻️', tone: 'success' });
                  }}
                >
                  ♻️
                </button>
              ) : (
                <motion.button className={'word-star' + (c.focus ? ' is-on' : '')} onClick={() => toggleStar(c)} whileTap={{ scale: 1.5, rotate: 30 }} aria-label={c.focus ? 'Unstar' : 'Star'} aria-pressed={!!c.focus}>
                  {c.focus ? <Emoji e="⭐" size={20} /> : '☆'}
                </motion.button>
              )}
            </motion.div>
          );
        })}
      </div>
      {visible.length > limit && (
        <div ref={sentinel} className="center" style={{ marginTop: 18 }}>
          <button className="btn btn--ghost" onClick={() => setLimit((l) => l + PAGE)}>
            Voir plus ({visible.length - limit})
          </button>
        </div>
      )}
      {!showHidden && hiddenCount > 0 && (
        <div className="center" style={{ marginTop: 22 }}>
          <button className="link-btn muted" onClick={() => setShowHidden(true)}>
            Mots masqués ({hiddenCount})
          </button>
        </div>
      )}

      <motion.button
        className="fab"
        onClick={() => {
          sfx.pop();
          navigate(`/add/word?back=/words${deckId ? `&deck=${encodeURIComponent(deckId)}` : ''}`);
        }}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileTap={{ scale: 0.9 }}
        aria-label="Add a word"
      >
        <Emoji e="✍️" size={22} /> Ajouter
      </motion.button>

      <CardSheet card={openedCard} progress={openedCard ? progress?.get(openedCard.id) : undefined} decks={sortedDecks} onClose={() => openCard(null)} onToggleStar={toggleStar} />
      <DeckEditor open={deckEditor.open} deck={deckEditor.deck} onClose={() => setDeckEditor({ open: false, deck: null })} onSaved={(d) => !deckEditor.deck && setDeck(d.id)} />
      <DeleteDeckSheet open={deleteDeckOpen} deck={deck} count={deckStats?.total ?? 0} onClose={() => setDeleteDeckOpen(false)} onDeleted={() => setDeck(null)} />
    </Page>
  );
}

function CardSheet({ card, progress, decks, onClose, onToggleStar }: { card: Card | null; progress?: Progress; decks: Deck[]; onClose: () => void; onToggleStar: (c: Card) => void }) {
  const [mode, setMode] = useState<'view' | 'edit' | 'move' | 'delete'>('view');
  const lastCard = useRef<Card | null>(null);
  if (card) lastCard.current = card;
  const c = card ?? lastCard.current;
  useEffect(() => {
    if (card) setMode('view');
  }, [card?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const deck = c ? decks.find((d) => d.id === c.deckId) : undefined;
  const st = statusOf(progress);
  const stInfo = STATUS.find((s) => s.id === st)!;

  return (
    <Sheet open={!!card} onClose={onClose} color={paletteColor(deck?.color)} label={c?.fr}>
      {c && mode === 'view' && (
        <div className="card-sheet">
          <div className="card-sheet-pic">
            {hasPicture(c) ? (
              <motion.div initial={{ scale: 0.4, rotate: -10 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 14 }} className="card-sheet-pic-inner">
                <CardImage card={c} size={c.imageId ? '100%' : 110} rounded={c.imageId ? 26 : 16} fallback="none" />
              </motion.div>
            ) : (
              <Emoji e="💬" size={80} />
            )}
          </div>
          <div className="card-sheet-fr">{c.fr}</div>
          <div className="card-sheet-en">{c.en}</div>
          <div className="row" style={{ justifyContent: 'center', gap: 10, margin: '8px 0 6px' }}>
            <SpeakButton text={c.fr} size="lg" tone="solid" />
            <SpeakButton text={c.fr} size="md" tone="solid" slow />
          </div>
          <div className="card-sheet-tags">
            {c.gender && <span className={'badge g-' + c.gender}>{c.gender === 'm' ? 'masculin · le' : 'féminin · la'}</span>}
            {c.plural && <span className="badge">pluriel</span>}
            <span className="badge">{c.kind === 'word' ? 'mot' : c.kind === 'phrase' ? 'expression' : 'phrase'}</span>
            {deck && (
              <span className="badge">
                <Emoji e={deck.emoji} size={14} /> {deck.name}
              </span>
            )}
            {c.source !== 'starter' && <span className="badge">✍️ ajouté par toi</span>}
          </div>
          {c.note && <p className="card-sheet-note">{c.note}</p>}
          <div className="card-sheet-stats">
            <div>
              <strong style={{ color: stInfo.color }}>{stInfo.one}</strong>
              <span>statut</span>
            </div>
            <div>
              <strong>{progress?.seen ?? 0}</strong>
              <span>vu</span>
            </div>
            <div>
              <strong>{progress?.correct ?? 0}</strong>
              <span>justes</span>
            </div>
            <div>
              <strong>{progress?.wrong ?? 0}</strong>
              <span>erreurs</span>
            </div>
          </div>
          <p className="muted center card-sheet-next">Prochaine révision : {nextReview(progress)}</p>
          <div className="card-sheet-actions">
            <button className="btn btn--ghost" onClick={() => onToggleStar(c)}>
              <Emoji e="⭐" size={20} /> {c.focus ? 'Retirer' : 'Favori'}
            </button>
            <button className="btn btn--ghost" onClick={() => setMode('edit')}>
              ✏️ Modifier
            </button>
            <button className="btn btn--ghost" onClick={() => setMode('move')}>
              📁 Déplacer
            </button>
            <button className="btn btn--ghost card-sheet-del" onClick={() => setMode('delete')}>
              🗑️ Supprimer
            </button>
          </div>
        </div>
      )}
      {c && mode === 'edit' && <CardEditor key={c.id} mode="edit" card={c} onSaved={() => setMode('view')} onCancel={() => setMode('view')} />}
      {c && mode === 'move' && (
        <div className="card-sheet-move">
          <h3>Déplacer « {c.fr} » vers…</h3>
          <div className="move-list">
            {decks.map((d) => (
              <button
                key={d.id}
                className={'move-item' + (d.id === c.deckId ? ' is-current' : '')}
                disabled={d.id === c.deckId}
                onClick={async () => {
                  await moveCards([c.id], d.id);
                  sfx.pop();
                  toast({ title: 'Déplacé', body: `→ ${d.name}`, emoji: d.emoji, tone: 'success' });
                  setMode('view');
                }}
              >
                <Emoji e={d.emoji} size={26} /> <span>{d.name}</span>
              </button>
            ))}
          </div>
          <button className="btn btn--ghost btn--block" onClick={() => setMode('view')}>
            Annuler
          </button>
        </div>
      )}
      {c && mode === 'delete' && (
        <div className="center card-sheet-confirm">
          <Emoji e="🗑️" size={60} />
          <h3>Supprimer « {c.fr} » ?</h3>
          <p className="muted">{c.source === 'starter' ? 'This built-in word will be hidden (you can restore it from “Mots masqués”).' : 'This removes the card, its photo and its progress.'}</p>
          <div className="row" style={{ gap: 10, marginTop: 14 }}>
            <button className="btn btn--ghost grow" onClick={() => setMode('view')}>
              Annuler
            </button>
            <button
              className="btn btn--bad grow"
              onClick={async () => {
                await deleteCard(c);
                sfx.whoosh();
                toast({ title: 'Supprimé', body: c.fr, emoji: '🗑️' });
                onClose();
              }}
            >
              Supprimer
            </button>
          </div>
        </div>
      )}
    </Sheet>
  );
}

function DeleteDeckSheet({ open, deck, count, onClose, onDeleted }: { open: boolean; deck: Deck | null; count: number; onClose: () => void; onDeleted: () => void }) {
  const run = async (moveTo?: string) => {
    if (!deck) return;
    try {
      await deleteDeck(deck.id, { moveTo });
      sfx.whoosh();
      toast({ title: 'Thème supprimé', body: deck.name, emoji: '🗑️' });
      onClose();
      onDeleted();
    } catch (e) {
      toast({ title: 'Impossible', body: (e as Error).message, emoji: '🙅', tone: 'error' });
    }
  };
  return (
    <Sheet open={open} onClose={onClose} label="Delete theme">
      {deck && (
        <div className="center card-sheet-confirm">
          <Emoji e={deck.emoji} size={60} />
          <h3>Supprimer « {deck.name} » ?</h3>
          <p className="muted">It has {count} card{count === 1 ? '' : 's'}. Keep them in “Mes mots”, or delete them too?</p>
          <div className="col-actions">
            {count > 0 && (
              <button className="btn btn--block" onClick={() => run(MY_WORDS_DECK)}>
                Garder les cartes dans « Mes mots »
              </button>
            )}
            <button className="btn btn--bad btn--block" onClick={() => run()}>
              Tout supprimer
            </button>
            <button className="btn btn--ghost btn--block" onClick={onClose}>
              Annuler
            </button>
          </div>
        </div>
      )}
    </Sheet>
  );
}
