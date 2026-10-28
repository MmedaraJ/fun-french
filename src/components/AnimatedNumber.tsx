import { animate, useMotionValue, useMotionValueEvent } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

interface Props {
  value: number;
  duration?: number;
  format?: (n: number) => string;
  onTick?: () => void;
  className?: string;
  /** Start counting from this value on mount (defaults to the value itself). */
  from?: number;
}

const fmt = (n: number) => Math.round(n).toLocaleString();

/** A number that counts smoothly to its new value. */
export function AnimatedNumber({ value, duration = 0.6, format = fmt, onTick, className, from }: Props) {
  const mv = useMotionValue(from ?? value);
  const [text, setText] = useState(format(from ?? value));
  const last = useRef(Math.round(from ?? value));
  useMotionValueEvent(mv, 'change', (v) => {
    setText(format(v));
    const r = Math.round(v);
    if (onTick && r !== last.current) {
      last.current = r;
      onTick();
    }
  });
  useEffect(() => {
    const controls = animate(mv, value, { duration, ease: [0.2, 0.8, 0.2, 1] });
    return () => controls.stop();
  }, [value, duration, mv]);
  return <span className={className}>{text}</span>;
}
