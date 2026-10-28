import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { Emoji } from '../Emoji';

export interface HBarDatum {
  key: string;
  label: string;
  emoji?: string;
  /** 0..max */
  value: number;
  /** Text printed at the bar tip. */
  display: string;
  /** Secondary line under the label, e.g. "42 answers". */
  sub?: string;
}

interface Props {
  data: HBarDatum[];
  max: number;
  color: string;
  ariaLabel: string;
}

/** Horizontal bars, one series: value at the tip, label + count on the left. */
export function HBarChart({ data, max, color, ariaLabel }: Props) {
  const ref = useRef<HTMLUListElement>(null);
  const inView = useInView(ref, { once: true, margin: '-30px' });
  return (
    <ul className="hbar" ref={ref} aria-label={ariaLabel}>
      {data.map((d, i) => (
        <li key={d.key} className="hbar-row" aria-label={`${d.label}: ${d.display}${d.sub ? `, ${d.sub}` : ''}`}>
          <span className="hbar-label">
            {d.emoji && <Emoji e={d.emoji} size={20} />}
            <span>
              <strong>{d.label}</strong>
              {d.sub && <small>{d.sub}</small>}
            </span>
          </span>
          <span className="hbar-track">
            <motion.span
              className="hbar-fill"
              style={{ background: color }}
              initial={{ width: 0 }}
              animate={{ width: inView ? `${Math.max(1.5, (d.value / max) * 100)}%` : 0 }}
              transition={{ type: 'spring', stiffness: 70, damping: 16, delay: 0.05 + i * 0.06 }}
            />
            <motion.span className="hbar-value" initial={{ opacity: 0 }} animate={{ opacity: inView ? 1 : 0 }} transition={{ delay: 0.4 + i * 0.06 }}>
              {d.display}
            </motion.span>
          </span>
        </li>
      ))}
    </ul>
  );
}
