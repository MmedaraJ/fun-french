import { motion, useInView } from 'framer-motion';
import { useRef, useState } from 'react';
import { ChartTooltip, type TipState } from './Tooltip';
import { compact, niceMax, useWidth } from './useWidth';

export interface ColumnDatum {
  key: string;
  /** Axis label under the column. */
  label: string;
  value: number;
  /** Tooltip lines: first is the value, then labels. */
  tip: string[];
  /** Emphasised column (e.g. today). */
  highlight?: boolean;
}

interface Props {
  data: ColumnDatum[];
  height?: number;
  /** CSS colour for emphasised columns (or all columns when nothing is emphasised). */
  color: string;
  /** CSS colour for the other columns when one is emphasised. */
  softColor?: string;
  /** Horizontal reference line, e.g. the daily goal. */
  refLine?: { value: number; label: string };
  /** Indices whose value is printed on the cap (label selectively). */
  labelIndices?: number[];
  format?: (v: number) => string;
  ariaLabel: string;
}

const PAD_TOP = 22;
const AXIS_H = 26;
const GUTTER = 30;

function columnPath(x: number, y: number, w: number, h: number, r = 4): string {
  if (h <= 0) return '';
  const rr = Math.min(r, w / 2, h);
  // rounded data-end on top, square at the baseline
  return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`;
}

/** Vertical columns from one baseline, thin bars, selective cap labels, per-column hover/focus. */
export function ColumnChart({ data, height = 180, color, softColor, refLine, labelIndices = [], format = compact, ariaLabel }: Props) {
  const [boxRef, width] = useWidth<HTMLDivElement>();
  const inViewRef = useRef<SVGSVGElement>(null);
  const inView = useInView(inViewRef, { once: true, margin: '-40px' });
  const [tip, setTip] = useState<TipState | null>(null);
  const [active, setActive] = useState<number | null>(null);

  const maxV = niceMax(Math.max(1, ...data.map((d) => d.value), refLine?.value ?? 0));
  const plotH = height - PAD_TOP - AXIS_H;
  const plotW = width - GUTTER - 4;
  const band = plotW / Math.max(1, data.length);
  const barW = Math.max(6, Math.min(24, band * 0.56));
  const y = (v: number) => PAD_TOP + plotH - (v / maxV) * plotH;
  const ticks = [0, maxV / 2, maxV];
  const anyHighlight = data.some((d) => d.highlight);

  const show = (i: number) => {
    const d = data[i];
    setActive(i);
    setTip({ key: d.key, x: GUTTER + band * i + band / 2, y: Math.max(4, y(d.value) - 58), lines: d.tip });
  };
  const hide = () => {
    setActive(null);
    setTip(null);
  };

  return (
    <div className="chart-box" ref={boxRef} onPointerLeave={hide}>
      <svg ref={inViewRef} width={width} height={height} role="img" aria-label={ariaLabel} className="chart-svg">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={GUTTER} x2={width - 4} y1={y(t)} y2={y(t)} className={t === 0 ? 'viz-baseline' : 'viz-grid'} />
            <text x={GUTTER - 6} y={y(t) + 4} textAnchor="end" className="viz-tick">
              {format(t)}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const x = GUTTER + band * i + (band - barW) / 2;
          const h = Math.max(0, PAD_TOP + plotH - y(d.value));
          const fill = !anyHighlight || d.highlight ? color : softColor ?? color;
          const labelled = labelIndices.includes(i) && d.value > 0;
          return (
            <g key={d.key}>
              {h > 0 && (
                <motion.path
                  d={columnPath(x, y(d.value), barW, h)}
                  style={{ fill, transformBox: 'fill-box', transformOrigin: '50% 100%', opacity: active === null || active === i ? 1 : 0.55 }}
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: inView ? 1 : 0 }}
                  transition={{ type: 'spring', stiffness: 140, damping: 14, delay: 0.08 + i * 0.05 }}
                />
              )}
              {labelled && (
                <motion.text
                  x={x + barW / 2}
                  y={y(d.value) - 7}
                  textAnchor="middle"
                  className="viz-value"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: inView ? 1 : 0 }}
                  transition={{ delay: 0.5 + i * 0.05 }}
                >
                  {format(d.value)}
                </motion.text>
              )}
              <text x={GUTTER + band * i + band / 2} y={height - 8} textAnchor="middle" className={'viz-xlabel' + (d.highlight ? ' is-strong' : '')}>
                {d.label}
              </text>
              {/* hit target: the whole band, taller than the mark */}
              <rect
                x={GUTTER + band * i}
                y={PAD_TOP - 10}
                width={band}
                height={plotH + 10}
                fill="transparent"
                tabIndex={0}
                role="button"
                aria-label={d.tip.join(', ')}
                onPointerEnter={() => show(i)}
                onPointerDown={() => show(i)}
                onFocus={() => show(i)}
                onBlur={hide}
                className="viz-hit"
              />
            </g>
          );
        })}
        {refLine && refLine.value > 0 && (
          <line className="viz-ref" x1={GUTTER} x2={width - 4} y1={y(refLine.value)} y2={y(refLine.value)} pointerEvents="none" />
        )}
      </svg>
      {refLine && refLine.value > 0 && (
        <div className="chart-keys">
          <span className="key-line" aria-hidden /> {refLine.label}
        </div>
      )}
      <ChartTooltip tip={tip} width={width} />
    </div>
  );
}
