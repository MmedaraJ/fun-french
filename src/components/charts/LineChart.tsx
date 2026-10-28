import { motion, useInView } from 'framer-motion';
import { useMemo, useRef, useState } from 'react';
import { ChartTooltip, type TipState } from './Tooltip';
import { useWidth } from './useWidth';

export interface LinePoint {
  key: string;
  /** Short axis label (shown for a few points only). */
  label: string;
  /** null = no data that day: the line breaks instead of dropping to zero. */
  value: number | null;
  tip: string[];
}

interface Props {
  points: LinePoint[];
  height?: number;
  color: string;
  yMax: number;
  yTicks: number[];
  format: (v: number) => string;
  ariaLabel: string;
}

const PAD_TOP = 16;
const AXIS_H = 24;
const GUTTER = 38;
const PAD_RIGHT = 44;

/**
 * One series over time: a 2px line through the days that have data (a dot marks
 * each real day, so skipped days are visible), crosshair readout snapping to the nearest day.
 */
export function LineChart({ points, height = 170, color, yMax, yTicks, format, ariaLabel }: Props) {
  const [boxRef, width] = useWidth<HTMLDivElement>();
  const svgRef = useRef<SVGSVGElement>(null);
  const inView = useInView(svgRef, { once: true, margin: '-40px' });
  const [hover, setHover] = useState<number | null>(null);

  const plotW = width - GUTTER - PAD_RIGHT;
  const plotH = height - PAD_TOP - AXIS_H;
  const n = points.length;
  const x = (i: number) => GUTTER + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const y = (v: number) => PAD_TOP + plotH - (Math.max(0, Math.min(yMax, v)) / yMax) * plotH;
  const baseY = PAD_TOP + plotH;

  const withData = useMemo(() => points.map((p, i) => (p.value === null ? -1 : i)).filter((i) => i >= 0), [points]);
  const lastIdx = withData.length ? withData[withData.length - 1] : -1;
  const linePath = withData.map((i, k) => `${k ? 'L' : 'M'}${x(i).toFixed(1)},${y(points[i].value!).toFixed(1)}`).join('');

  const nearest = (clientX: number): number | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const px = clientX - svg.getBoundingClientRect().left;
    let best: number | null = null;
    let bestD = Infinity;
    points.forEach((p, i) => {
      if (p.value === null) return;
      const d = Math.abs(x(i) - px);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    return best;
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (!withData.length) return;
    const pos = hover === null ? withData.length : withData.indexOf(hover);
    if (e.key === 'ArrowLeft') setHover(withData[Math.max(0, pos - 1)]);
    else if (e.key === 'ArrowRight') setHover(withData[Math.min(withData.length - 1, pos + 1)]);
    else return;
    e.preventDefault();
  };

  const tip: TipState | null =
    hover !== null && points[hover]?.value !== null ? { key: points[hover].key, x: x(hover), y: Math.max(0, y(points[hover].value!) - 64), lines: points[hover].tip } : null;

  const labelIdx = [0, Math.floor((n - 1) / 2), n - 1].filter((v, i, a) => a.indexOf(v) === i);

  return (
    <div className="chart-box" ref={boxRef}>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        role="img"
        aria-label={ariaLabel}
        className="chart-svg"
        tabIndex={0}
        onKeyDown={onKey}
        onBlur={() => setHover(null)}
        onPointerMove={(e) => setHover(nearest(e.clientX))}
        onPointerDown={(e) => setHover(nearest(e.clientX))}
        onPointerLeave={() => setHover(null)}
      >
        {yTicks.map((t) => (
          <g key={t}>
            <line x1={GUTTER} x2={width - PAD_RIGHT + 8} y1={y(t)} y2={y(t)} className={t === 0 ? 'viz-baseline' : 'viz-grid'} />
            <text x={GUTTER - 6} y={y(t) + 4} textAnchor="end" className="viz-tick">
              {format(t)}
            </text>
          </g>
        ))}
        {withData.length > 1 && (
          <motion.path
            d={linePath}
            fill="none"
            style={{ stroke: color }}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: inView ? 1 : 0 }}
            transition={{ duration: 1.1, ease: 'easeInOut' }}
          />
        )}
        {withData
          .filter((i) => i !== lastIdx)
          .map((i, k) => (
            <motion.circle
              key={i}
              cx={x(i)}
              cy={y(points[i].value!)}
              r={3.5}
              style={{ fill: color }}
              className="viz-dot"
              initial={{ opacity: 0 }}
              animate={{ opacity: inView ? 1 : 0 }}
              transition={{ delay: 0.2 + k * 0.03 }}
            />
          ))}
        {lastIdx >= 0 && (
          <motion.g initial={{ scale: 0 }} animate={{ scale: inView ? 1 : 0 }} transition={{ delay: 1, type: 'spring', stiffness: 400, damping: 14 }} style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>
            <circle cx={x(lastIdx)} cy={y(points[lastIdx].value!)} r={5} style={{ fill: color }} className="viz-dot" />
            <text x={x(lastIdx) + 9} y={y(points[lastIdx].value!) + 4} className="viz-value">
              {format(points[lastIdx].value!)}
            </text>
          </motion.g>
        )}
        {hover !== null && points[hover]?.value !== null && (
          <g pointerEvents="none">
            <line x1={x(hover)} x2={x(hover)} y1={PAD_TOP - 4} y2={baseY} className="viz-crosshair" />
            <circle cx={x(hover)} cy={y(points[hover].value!)} r={5} style={{ fill: color }} className="viz-dot" />
          </g>
        )}
        {labelIdx.map((i) => (
          <text key={i} x={x(i)} y={height - 6} textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'} className="viz-xlabel">
            {points[i]?.label}
          </text>
        ))}
      </svg>
      <ChartTooltip tip={tip} width={width} />
    </div>
  );
}
