import { motion } from 'framer-motion';

const DOTS = ['var(--berry)', 'var(--sunshine)', 'var(--lagoon)'];

export function Loader({ label }: { label?: string }) {
  return (
    <div style={{ minHeight: '60vh', display: 'grid', placeItems: 'center' }} role="status" aria-live="polite">
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
        <div style={{ display: 'flex', gap: 10 }}>
          {DOTS.map((c, i) => (
            <motion.span
              key={i}
              style={{ width: 18, height: 18, borderRadius: '50%', background: c, display: 'block' }}
              animate={{ y: [0, -14, 0], scale: [1, 1.15, 1] }}
              transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.12, ease: 'easeInOut' }}
            />
          ))}
        </div>
        {label && <span className="muted" style={{ fontWeight: 700 }}>{label}</span>}
      </div>
    </div>
  );
}
