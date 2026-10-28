import { motion } from 'framer-motion';

const LETTERS = [
  { ch: 'B', c: 'var(--berry)' },
  { ch: 'o', c: 'var(--tangerine)' },
  { ch: 'n', c: 'var(--sunshine)' },
  { ch: 'b', c: 'var(--leaf)' },
  { ch: 'o', c: 'var(--sky)' },
  { ch: 'n', c: 'var(--grape)' },
];

/** The bouncy "Bonbon" logo; letters hop when tapped. */
export function Wordmark({ size = 34 }: { size?: number }) {
  return (
    <motion.div
      aria-label="Bonbon"
      role="img"
      style={{ display: 'flex', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: size, lineHeight: 1, letterSpacing: '-0.02em' }}
      initial="hidden"
      animate="show"
      whileTap="hop"
    >
      {LETTERS.map((l, i) => (
        <motion.span
          key={i}
          aria-hidden
          style={{ color: l.c, display: 'inline-block', textShadow: '0 3px 0 rgba(0,0,0,0.12)' }}
          variants={{
            hidden: { y: -30, opacity: 0, rotate: -20 },
            show: { y: 0, opacity: 1, rotate: 0, transition: { type: 'spring', stiffness: 500, damping: 14, delay: i * 0.06 } },
            hop: { y: [0, -12, 0], transition: { duration: 0.4, delay: i * 0.04 } },
          }}
        >
          {l.ch}
        </motion.span>
      ))}
    </motion.div>
  );
}
