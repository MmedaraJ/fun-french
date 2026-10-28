import { useLiveQuery } from 'dexie-react-hooks';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { CardImage } from '../../components/CardImage';
import { Emoji } from '../../components/Emoji';
import { Mascot } from '../../components/Mascot';
import { Page } from '../../components/Page';
import { aiAvailable } from '../../lib/ai';
import { db } from '../../lib/db';
import { inkOn, paletteColor } from '../../lib/palette';
import { useSettings } from '../../lib/settings';
import { sfx } from '../../lib/sound';
import type { PaletteKey } from '../../types';

const TILES: { to: string; emoji: string; title: string; en: string; sub: string; color: PaletteKey }[] = [
  { to: '/add/word', emoji: '✍️', title: 'Un mot', en: 'One word', sub: 'A word, an expression or a sentence', color: 'berry' },
  { to: '/add/text', emoji: '📋', title: 'Du texte', en: 'Paste text', sub: 'A vocab list, a message, an article…', color: 'sky' },
  { to: '/add/photo', emoji: '📸', title: 'Une photo', en: 'From a photo', sub: 'Snap things, or scan a menu or a page', color: 'tangerine' },
];

export default function AddHub() {
  const navigate = useNavigate();
  const mascotColor = useSettings((s) => s.mascotColor);
  useSettings((s) => s.aiKey); // re-render when the key changes
  const magic = aiAvailable();
  const recent = useLiveQuery(async () => {
    const mine = await db.cards.where('source').anyOf(['manual', 'text', 'photo', 'ai', 'import']).toArray();
    return mine.filter((c) => !c.archived).sort((a, b) => b.createdAt - a.createdAt).slice(0, 8);
  }, []);
  const decks = useLiveQuery(() => db.decks.toArray(), []);
  const deckOf = (id: string) => decks?.find((d) => d.id === id);

  return (
    <Page narrow className="add-hub">
      <div className="hub-hello">
        <Mascot mood="thinking" size={92} color={mascotColor} />
        <div>
          <h1 className="screen-title">Ajouter</h1>
          <p className="muted">Qu’est-ce qu’on apprend aujourd’hui ? Add anything you want to learn — it goes straight into your games.</p>
        </div>
      </div>

      {magic ? (
        <motion.div className="magic-banner" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <motion.span animate={{ rotate: [0, 15, -10, 0], scale: [1, 1.15, 1] }} transition={{ duration: 2.4, repeat: Infinity }}>
            <Emoji e="✨" size={26} />
          </motion.span>
          <span>
            <strong>Magie activée</strong> · Claude can pull words out of any text or photo for you.
          </span>
        </motion.div>
      ) : (
        <button className="magic-hint" onClick={() => navigate('/settings')}>
          <Emoji e="🪄" size={20} /> Tip: add a Claude API key in Settings to unlock magic extraction from photos and texts.
        </button>
      )}

      <div className="hub-tiles">
        {TILES.map((t, i) => (
          <motion.button
            key={t.to}
            className="hub-tile"
            style={{ background: paletteColor(t.color), color: inkOn(t.color) }}
            onClick={() => {
              sfx.pop();
              navigate(t.to);
            }}
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.05 + i * 0.07 }}
            whileHover={{ y: -4 }}
            whileTap={{ scale: 0.96 }}
            data-testid={`hub-${t.to.split('/').pop()}`}
          >
            <motion.span className="hub-art" animate={{ y: [0, -6, 0], rotate: [0, i % 2 ? 6 : -6, 0] }} transition={{ duration: 2.6 + i * 0.4, repeat: Infinity, ease: 'easeInOut' }}>
              <Emoji e={t.emoji} size={58} />
            </motion.span>
            <span className="hub-text">
              <strong>{t.title}</strong>
              <span className="hub-en">{t.en}</span>
              <span className="hub-sub">{t.sub}</span>
            </span>
            {magic && t.to !== '/add/word' && <span className="hub-magic">✨</span>}
            <span className="hub-go" aria-hidden>
              →
            </span>
          </motion.button>
        ))}
      </div>

      <h2 className="section-title">
        Récemment ajoutés <small>{recent?.length ? 'Recently added' : ''}</small>
      </h2>
      {recent && recent.length === 0 && (
        <div className="hub-empty panel panel--flat">
          <Emoji e="🌱" size={36} />
          <p className="muted">Nothing yet! Your own words will show up here — try adding the name of something on your desk.</p>
        </div>
      )}
      <div className="recent-list">
        {recent?.map((c, i) => {
          const d = deckOf(c.deckId);
          return (
            <motion.button
              key={c.id}
              className="recent-item"
              onClick={() => navigate(`/words?card=${encodeURIComponent(c.id)}`)}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 + i * 0.04 }}
            >
              <span className="recent-pic">
                <CardImage card={c} size={40} fallback="none" rounded={10} />
                {!c.emoji && !c.imageId && <Emoji e="💬" size={28} />}
              </span>
              <span className="recent-text">
                <strong>{c.fr}</strong>
                <span>{c.en}</span>
              </span>
              {d && (
                <span className="recent-deck" title={d.name}>
                  <Emoji e={d.emoji} size={20} />
                </span>
              )}
            </motion.button>
          );
        })}
      </div>
    </Page>
  );
}
