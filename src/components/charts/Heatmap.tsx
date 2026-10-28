import { motion, useInView } from 'framer-motion';
import { useMemo, useRef, useState } from 'react';
import { addDays, dayKey, dayStart } from '../../lib/date';
import type { DailyStat } from '../../types';
import { ChartTooltip, type TipState } from './Tooltip';
import { useWidth } from './useWidth';

interface Props {
  daily: DailyStat[];
  weeks?: number;
  goal: number;
  selected: string;
  onSelect: (day: string) => void;
  /** Tooltip lines for a day. */
  describe: (day: string, stat: DailyStat | undefined) => string[];
}

const GUTTER = 24;
const TOP = 18;
const ROW_LABELS = ['L', '', 'M', '', 'V', '', 'D']; // lundi, mercredi, vendredi, dimanche
const MONTHS_FR = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const monthFr = (key: string) => MONTHS_FR[Number(key.slice(5, 7)) - 1];

export function heatBin(xp: number, goal: number): number {
  if (xp <= 0) return 0;
  if (xp < goal / 2) return 1;
  if (xp < goal) return 2;
  if (xp < goal * 2) return 3;
  return 4;
}

/** Practice calendar, Monday-first weeks, one hue light→dark by XP bucket. */
export function Heatmap({ daily, weeks = 20, goal, selected, onSelect, describe }: Props) {
  const [boxRef, width] = useWidth<HTMLDivElement>();
  const svgRef = useRef<SVGSVGElement>(null);
  const inView = useInView(svgRef, { once: true, margin: '-30px' });
  const [hover, setHover] = useState<string | null>(null);
  const byDay = useMemo(() => new Map(daily.map((d) => [d.day, d])), [daily]);

  const today = dayKey();
  const weekday = (dayStart(today).getDay() + 6) % 7;
  const start = addDays(today, -weekday - (weeks - 1) * 7);
  const step = Math.min(22, Math.max(12, Math.floor((width - GUTTER) / weeks)));
  const gap = step >= 16 ? 3 : 2;
  const cell = step - gap;
  const svgW = GUTTER + step * weeks;
  const svgH = TOP + step * 7 + 2;

  const cells = useMemo(() => {
    const out: { day: string; c: number; r: number; bin: number }[] = [];
    for (let c = 0; c < weeks; c++) {
      for (let r = 0; r < 7; r++) {
        const day = addDays(start, c * 7 + r);
        if (day > today) continue;
        out.push({ day, c, r, bin: heatBin(byDay.get(day)?.xp ?? 0, goal) });
      }
    }
    return out;
  }, [start, today, weeks, byDay, goal]);

  const months = useMemo(() => {
    const out: { c: number; label: string }[] = [];
    let prev = '';
    for (let c = 0; c < weeks; c++) {
      const monday = addDays(start, c * 7);
      const m = monthFr(monday);
      const firstOfMonthInWeek = Number(monday.slice(8)) <= 7;
      if (m !== prev && (c === 0 ? Number(monday.slice(8)) <= 21 : firstOfMonthInWeek || prev === '')) {
        if (!out.length || c - out[out.length - 1].c >= 3) out.push({ c, label: m });
        prev = m;
      } else if (m !== prev) prev = m;
    }
    return out;
  }, [start, weeks]);

  const pos = (day: string) => {
    const idx = cells.findIndex((x) => x.day === day);
    return idx >= 0 ? cells[idx] : null;
  };

  const focusDay = hover ?? null;
  const tipCell = focusDay ? pos(focusDay) : null;
  const offsetX = Math.max(0, (width - svgW) / 2);
  const tip: TipState | null = tipCell
    ? { key: tipCell.day, x: offsetX + GUTTER + tipCell.c * step + cell / 2, y: Math.max(0, TOP + tipCell.r * step - 72), lines: describe(tipCell.day, byDay.get(tipCell.day)) }
    : null;

  const onKey = (e: React.KeyboardEvent) => {
    const delta: Record<string, number> = { ArrowLeft: -7, ArrowRight: 7, ArrowUp: -1, ArrowDown: 1 };
    if (!(e.key in delta)) return;
    e.preventDefault();
    const next = addDays(selected, delta[e.key]);
    if (next <= today && next >= start) {
      onSelect(next);
      setHover(next);
    }
  };

  return (
    <div className="chart-box heat-box" ref={boxRef} onPointerLeave={() => setHover(null)}>
      <svg
        ref={svgRef}
        width={svgW}
        height={svgH}
        role="img"
        aria-label={`Practice calendar for the last ${weeks} weeks. Use the arrow keys to move between days.`}
        className="chart-svg heat-svg"
        tabIndex={0}
        onKeyDown={onKey}
        onBlur={() => setHover(null)}
        style={{ marginLeft: offsetX }}
      >
        {months.map((m) => (
          <text key={m.c} x={GUTTER + m.c * step} y={11} className="viz-tick">
            {m.label}
          </text>
        ))}
        {ROW_LABELS.map((l, r) =>
          l ? (
            <text key={r} x={GUTTER - 8} y={TOP + r * step + cell / 2 + 4} textAnchor="end" className="viz-tick">
              {l}
            </text>
          ) : null,
        )}
        {cells.map(({ day, c, r, bin }) => (
          <motion.rect
            key={day}
            x={GUTTER + c * step}
            y={TOP + r * step}
            width={cell}
            height={cell}
            rx={Math.min(4, cell / 3)}
            className={`heat-cell heat-${bin}` + (day === today ? ' is-today' : '') + (day === selected ? ' is-selected' : '')}
            initial={{ opacity: 0, scale: 0.4 }}
            animate={{ opacity: inView ? 1 : 0, scale: inView ? 1 : 0.4 }}
            transition={{ delay: c * 0.018 + r * 0.01, type: 'spring', stiffness: 400, damping: 22 }}
            style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
            onPointerEnter={() => setHover(day)}
            onClick={() => {
              onSelect(day);
              setHover(day);
            }}
          />
        ))}
      </svg>
      <ChartTooltip tip={tip} width={width} />
    </div>
  );
}
