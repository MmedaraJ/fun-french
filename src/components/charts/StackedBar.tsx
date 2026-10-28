import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { useWidth } from './useWidth';

export interface Segment {
  key: string;
  label: string;
  value: number;
  /** CSS colour of the fill. */
  color: string;
  /** Label colour that reads inside the fill. */
  ink: string;
}

interface Props {
  segments: Segment[];
  ariaLabel: string;
  height?: number;
}

const GAP = 2;

/** Part-to-whole bar with 2px surface gaps; counts sit inside a segment only when they fit. */
export function StackedBar({ segments, ariaLabel, height = 34 }: Props) {
  const [boxRef, width] = useWidth<HTMLDivElement>();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-30px' });
  const total = segments.reduce((a, s) => a + s.value, 0);
  const visible = segments.filter((s) => s.value > 0);
  const usable = width - GAP * Math.max(0, visible.length - 1);

  return (
    <div ref={ref}>
      <div className="stack" ref={boxRef} role="img" aria-label={ariaLabel} style={{ height }}>
        {visible.map((s, i) => {
          const w = total ? (s.value / total) * usable : 0;
          const text = String(s.value);
          const fits = w >= text.length * 9 + 16;
          return (
            <motion.div
              key={s.key}
              className="stack-seg"
              style={{ background: s.color, color: s.ink, marginLeft: i ? GAP : 0 }}
              initial={{ width: 0 }}
              animate={{ width: inView ? w : 0 }}
              transition={{ type: 'spring', stiffness: 70, damping: 18, delay: 0.1 + i * 0.12 }}
              title={`${s.label}: ${s.value}`}
            >
              {fits && <span>{text}</span>}
            </motion.div>
          );
        })}
      </div>
      <ul className="legend">
        {segments.map((s) => (
          <li key={s.key}>
            <span className="legend-swatch" style={{ background: s.color }} />
            <span className="legend-label">{s.label}</span>
            <strong>{s.value}</strong>
            <span className="legend-pct">({total ? Math.round((s.value / total) * 100) : 0}%)</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
