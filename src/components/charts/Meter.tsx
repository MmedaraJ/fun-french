import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';

interface Props {
  value: number; // 0..1
  color: string;
  /** Track colour; defaults to a light step of `color`. */
  track?: string;
  height?: number;
  label?: string;
  delay?: number;
}

/** Progress track: the unfilled part is a lighter step of the same colour. */
export function Meter({ value, color, track, height = 12, label, delay = 0 }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-20px' });
  const v = Math.max(0, Math.min(1, value));
  return (
    <div
      ref={ref}
      className="meter"
      style={{ height, background: track ?? `color-mix(in srgb, ${color} 22%, var(--surface))` }}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(v * 100)}
      aria-label={label}
    >
      <motion.span
        style={{ background: color }}
        initial={{ width: 0 }}
        animate={{ width: inView ? `${v * 100}%` : 0 }}
        transition={{ type: 'spring', stiffness: 60, damping: 16, delay }}
      />
    </div>
  );
}
