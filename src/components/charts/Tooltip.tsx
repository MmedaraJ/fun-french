import { AnimatePresence, motion } from 'framer-motion';

export interface TipState {
  x: number;
  y: number;
  /** First line is the value (strong); the rest are labels. */
  lines: string[];
  key: string;
}

/** Small floating readout positioned inside a relatively positioned chart box. */
export function ChartTooltip({ tip, width }: { tip: TipState | null; width: number }) {
  return (
    <AnimatePresence>
      {tip && (
        <motion.div
          key="tip"
          className="chart-tip"
          role="status"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1, left: Math.max(8, Math.min(width - 8, tip.x)), top: tip.y }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 600, damping: 40 }}
          style={{ x: tip.x < 70 ? '-15%' : tip.x > width - 70 ? '-85%' : '-50%' }}
        >
          <strong>{tip.lines[0]}</strong>
          {tip.lines.slice(1).map((l, i) => (
            <span key={i}>{l}</span>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
