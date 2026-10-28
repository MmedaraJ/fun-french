import { motion } from 'framer-motion';
import { NavLink, useLocation } from 'react-router-dom';
import { sfx } from '../lib/sound';
import './BottomNav.css';

const ITEMS = [
  { to: '/', label: 'Jouer', en: 'Play', icon: HomeIcon, color: 'var(--berry)' },
  { to: '/words', label: 'Mots', en: 'Words', icon: CardsIcon, color: 'var(--sky)' },
  { to: '/add', label: 'Ajouter', en: 'Add', icon: PlusIcon, color: 'var(--leaf)', big: true },
  { to: '/stats', label: 'Progrès', en: 'Stats', icon: ChartIcon, color: 'var(--grape)' },
  { to: '/settings', label: 'Réglages', en: 'Settings', icon: GearIcon, color: 'var(--tangerine)' },
];

export function BottomNav() {
  const { pathname } = useLocation();
  return (
    <nav className="bottom-nav" aria-label="Main">
      <div className="bottom-nav-inner">
        {ITEMS.map((it) => {
          const active = it.to === '/' ? pathname === '/' : pathname.startsWith(it.to);
          const Icon = it.icon;
          return (
            <NavLink
              key={it.to}
              to={it.to}
              className={'nav-item' + (active ? ' is-active' : '') + (it.big ? ' nav-item--big' : '')}
              style={{ '--nav-color': it.color } as React.CSSProperties}
              onClick={() => sfx.tap()}
              aria-label={`${it.label} (${it.en})`}
            >
              <motion.span
                className="nav-icon"
                animate={active ? { y: [0, -6, 0], scale: [1, 1.15, 1] } : { y: 0, scale: 1 }}
                transition={{ duration: 0.4 }}
              >
                <Icon />
              </motion.span>
              {!it.big && <span className="nav-label">{it.label}</span>}
              {active && !it.big && <motion.span layoutId="nav-dot" className="nav-dot" />}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden>
      <path d="M3.5 10.5 12 3.8l8.5 6.7V20a1 1 0 0 1-1 1h-5v-6h-5v6h-5a1 1 0 0 1-1-1z" fill="currentColor" />
    </svg>
  );
}
function CardsIcon() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden>
      <rect x="7" y="3" width="13" height="16" rx="3" fill="currentColor" opacity="0.45" transform="rotate(8 13 11)" />
      <rect x="4" y="5" width="13" height="16" rx="3" fill="currentColor" />
    </svg>
  );
}
function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" width="30" height="30" aria-hidden>
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" />
    </svg>
  );
}
function ChartIcon() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden>
      <rect x="3.5" y="12" width="4.2" height="8.5" rx="1.6" fill="currentColor" />
      <rect x="9.9" y="7" width="4.2" height="13.5" rx="1.6" fill="currentColor" />
      <rect x="16.3" y="3.5" width="4.2" height="17" rx="1.6" fill="currentColor" />
    </svg>
  );
}
function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden>
      <path
        fill="currentColor"
        d="M13.7 2.5l.5 2.3a7.6 7.6 0 0 1 1.9.8l2-1.3 2.4 2.4-1.3 2c.3.6.6 1.2.8 1.9l2.3.5v3.4l-2.3.5a7.6 7.6 0 0 1-.8 1.9l1.3 2-2.4 2.4-2-1.3a7.6 7.6 0 0 1-1.9.8l-.5 2.3h-3.4l-.5-2.3a7.6 7.6 0 0 1-1.9-.8l-2 1.3-2.4-2.4 1.3-2a7.6 7.6 0 0 1-.8-1.9l-2.3-.5v-3.4l2.3-.5c.2-.7.5-1.3.8-1.9l-1.3-2 2.4-2.4 2 1.3c.6-.3 1.2-.6 1.9-.8l.5-2.3zM12 8.6a3.4 3.4 0 1 0 0 6.8 3.4 3.4 0 0 0 0-6.8z"
      />
    </svg>
  );
}
