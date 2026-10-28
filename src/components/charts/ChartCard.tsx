import { AnimatePresence, motion } from 'framer-motion';
import { useState, type ReactNode } from 'react';
import './charts.css';

export interface TableView {
  columns: string[];
  rows: (string | number)[][];
}

interface Props {
  title: string;
  subtitle?: string;
  /** The chart's accessible twin: every value as a table. */
  table?: TableView;
  children: ReactNode;
  id?: string;
  className?: string;
  aside?: ReactNode;
}

/** Card wrapper for every chart: title, optional table-view toggle. */
export function ChartCard({ title, subtitle, table, children, id, className = '', aside }: Props) {
  const [asTable, setAsTable] = useState(false);
  return (
    <figure className={`viz chart-card ${className}`} id={id}>
      <figcaption className="chart-head">
        <div>
          <h3 className="chart-title">{title}</h3>
          {subtitle && <p className="chart-sub">{subtitle}</p>}
        </div>
        <div className="chart-head-aside">
          {aside}
          {table && (
            <button className="chart-toggle" onClick={() => setAsTable((t) => !t)} aria-pressed={asTable} title={asTable ? 'Show chart' : 'Show as table'}>
              {asTable ? (
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
                  <rect x="4" y="11" width="4" height="9" rx="1.5" fill="currentColor" />
                  <rect x="10" y="6" width="4" height="14" rx="1.5" fill="currentColor" />
                  <rect x="16" y="9" width="4" height="11" rx="1.5" fill="currentColor" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
                  <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                </svg>
              )}
              <span className="sr-only">{asTable ? 'Show chart' : 'Show as table'}</span>
            </button>
          )}
        </div>
      </figcaption>
      <AnimatePresence mode="wait" initial={false}>
        {asTable && table ? (
          <motion.div key="table" className="chart-table-wrap" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <table className="chart-table">
              <thead>
                <tr>
                  {table.columns.map((c) => (
                    <th key={c} scope="col">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.length === 0 ? (
                  <tr>
                    <td colSpan={table.columns.length} className="muted">
                      Nothing yet
                    </td>
                  </tr>
                ) : (
                  table.rows.map((r, i) => (
                    <tr key={i}>
                      {r.map((v, j) => (
                        <td key={j}>{v}</td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </motion.div>
        ) : (
          <motion.div key="chart" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </figure>
  );
}
