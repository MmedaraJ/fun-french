import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ModeInfo } from '../lib/engine/modes';
import { useDecks } from '../lib/hooks';
import { inkOn, paletteColor } from '../lib/palette';
import { useSettings, type ModeOptions } from '../lib/settings';
import { sfx } from '../lib/sound';
import { wipeFrom } from './ColorWipe';
import { Emoji } from './Emoji';
import { Sheet } from './Sheet';
import './GameSetup.css';

interface Props {
  mode: ModeInfo | null;
  onClose: () => void;
}

export function GameSetup({ mode, onClose }: Props) {
  const navigate = useNavigate();
  const decks = useDecks();
  const { modeOptions, roundLength, update } = useSettings();
  const startRef = useRef<HTMLButtonElement>(null);
  const opts: ModeOptions = (mode && modeOptions[mode.id]) || { deckIds: [], survival: false, length: roundLength };
  const [showDecks, setShowDecks] = useState(false);
  // Open the theme list straight away when this game was last played with chosen themes.
  useEffect(() => {
    if (mode) setShowDecks(((mode && modeOptions[mode.id]?.deckIds.length) ?? 0) > 0);
    // only when a different game is opened
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode?.id]);
  const color = mode ? paletteColor(mode.color) : undefined;
  const noSurvival = mode?.id === 'pairs' || mode?.id === 'flash';

  const setOpts = (patch: Partial<ModeOptions>) => {
    if (!mode) return;
    sfx.tap();
    update({ modeOptions: { ...modeOptions, [mode.id]: { ...opts, ...patch } } });
  };

  const toggleDeck = (id: string) => {
    const has = opts.deckIds.includes(id);
    setOpts({ deckIds: has ? opts.deckIds.filter((d) => d !== id) : [...opts.deckIds, id] });
  };

  const start = async () => {
    if (!mode) return;
    sfx.whoosh();
    const params = new URLSearchParams();
    if (opts.deckIds.length) params.set('decks', opts.deckIds.join(','));
    if (opts.focus) params.set('focus', '1');
    if (opts.survival && !noSurvival) params.set('survival', '1');
    else params.set('len', String(opts.length));
    await wipeFrom(startRef.current, color!);
    onClose();
    navigate(`/play/${mode.id}?${params}`);
  };

  const visibleDecks = (decks ?? []).slice().sort((a, b) => Number(b.active) - Number(a.active) || a.order - b.order);

  return (
    <Sheet open={!!mode} onClose={onClose} color={color} label={mode?.name}>
      {mode && (
        <div className="setup">
          <div className="setup-head">
            <motion.div
              className="setup-art"
              style={{ background: color }}
              initial={{ rotate: -20, scale: 0.4 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 12 }}
            >
              <Emoji e={mode.emoji} size={56} />
              <span className="setup-num" style={{ color: inkOn(mode.color) }}>
                {mode.num}
              </span>
            </motion.div>
            <div>
              <h2>{mode.name}</h2>
              <div className="setup-en">{mode.en}</div>
              <p className="muted">{mode.blurb}</p>
            </div>
          </div>

          <div className="field-label">Words from</div>
          <div className="row row--wrap setup-decks">
            <button className="chip" aria-pressed={opts.deckIds.length === 0 && !opts.focus} onClick={() => setOpts({ deckIds: [], focus: false })}>
              <Emoji e="🍬" size={18} /> My active themes
            </button>
            <button className="chip" aria-pressed={!!opts.focus} onClick={() => setOpts({ focus: !opts.focus })}>
              <Emoji e="⭐" size={18} /> Starred only
            </button>
            <button
              className={'chip chip--more' + (opts.deckIds.length ? ' chip--on' : '')}
              aria-expanded={showDecks}
              onClick={() => {
                sfx.tap();
                setShowDecks((v) => !v);
              }}
            >
              <Emoji e="🗂️" size={18} /> {opts.deckIds.length ? `${opts.deckIds.length} theme${opts.deckIds.length > 1 ? 's' : ''}` : 'Choose themes'}
              <span className={'chev' + (showDecks ? ' is-open' : '')}>▾</span>
            </button>
          </div>
          <AnimatePresence initial={false}>
            {showDecks && (
              <motion.div
                className="setup-deck-list"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 32 }}
              >
                <div className="row row--wrap setup-decks">
                  {visibleDecks.map((d) => (
                    <button key={d.id} className="chip" aria-pressed={opts.deckIds.includes(d.id)} onClick={() => toggleDeck(d.id)}>
                      <Emoji e={d.emoji} size={18} /> {d.name}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {!noSurvival && (
            <>
              <div className="field-label" style={{ marginTop: 18 }}>
                Round
              </div>
              <div className="segmented">
                {[10, 20].map((n) => (
                  <button key={n} aria-pressed={!opts.survival && opts.length === n} onClick={() => setOpts({ survival: false, length: n })}>
                    <strong>{n}</strong>
                    <span>questions</span>
                  </button>
                ))}
                <button aria-pressed={opts.survival} onClick={() => setOpts({ survival: true })}>
                  <strong>
                    <Emoji e="❤️" size={16} />
                    <Emoji e="❤️" size={16} />
                    <Emoji e="❤️" size={16} />
                  </strong>
                  <span>Survie (endless)</span>
                </button>
              </div>
            </>
          )}
          {mode.id === 'flash' && (
            <>
              <div className="field-label" style={{ marginTop: 18 }}>
                Cards
              </div>
              <div className="segmented">
                {[10, 20, 30].map((n) => (
                  <button key={n} aria-pressed={opts.length === n} onClick={() => setOpts({ length: n })}>
                    <strong>{n}</strong>
                    <span>cards</span>
                  </button>
                ))}
              </div>
            </>
          )}

          <div className="setup-footer">
            <button ref={startRef} className="btn btn--lg btn--block setup-go" style={{ '--btn-bg': color, '--btn-fg': inkOn(mode.color) } as React.CSSProperties} onClick={start}>
              C’est parti !
            </button>
          </div>
        </div>
      )}
    </Sheet>
  );
}
