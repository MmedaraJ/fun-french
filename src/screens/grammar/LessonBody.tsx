import { motion } from 'framer-motion';
import { Fragment, type ReactNode } from 'react';
import { Emoji } from '../../components/Emoji';
import { SpeakButton } from '../../components/SpeakButton';
import type { LessonSection } from '../../lib/grammar/types';

/** **bold** and line breaks, nothing more. */
export function RichText({ text }: { text: string }): ReactNode {
  return text.split(/\n{2,}/).map((para, i) => (
    <p key={i}>
      {para.split('\n').map((line, j) => (
        <Fragment key={j}>
          {j > 0 && <br />}
          {line.split(/(\*\*[^*]+\*\*)/g).map((chunk, k) =>
            chunk.startsWith('**') && chunk.endsWith('**') ? <strong key={k}>{chunk.slice(2, -2)}</strong> : <Fragment key={k}>{chunk}</Fragment>,
          )}
        </Fragment>
      ))}
    </p>
  ));
}

/** The sections and tips of a lesson or a course chapter: text, tables and examples to listen to. */
export function LessonBody({ sections, tips }: { sections: LessonSection[]; tips?: string[] }) {
  return (
    <>
      {sections.map((sec, i) => (
        <motion.section key={i} className="lesson-sec panel" initial={{ y: 18, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true, margin: '-40px' }} transition={{ type: 'spring', stiffness: 260, damping: 26 }}>
          <h2>{sec.heading}</h2>
          <div className="lesson-body">
            <RichText text={sec.body} />
          </div>
          {sec.table && (
            <div className="lesson-table-wrap">
              <table className={'lesson-table' + (sec.table.head.length >= 4 ? ' lesson-table--wide' : '')}>
                <thead>
                  <tr>
                    {sec.table.head.map((h, k) => (
                      <th key={k}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sec.table.rows.map((row, r) => (
                    <tr key={r}>
                      {row.map((cell, k) => (
                        <td key={k}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {sec.examples?.length ? (
            <ul className="lesson-examples">
              {sec.examples.map((ex, k) => (
                <li key={k}>
                  <SpeakButton text={ex.fr} size="sm" tone="solid" />
                  <span>
                    <strong>{ex.fr}</strong>
                    <span>{ex.en}</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </motion.section>
      ))}

      {tips?.map((tip, i) => (
        <div key={i} className="lesson-tip">
          <Emoji e="💡" size={26} />
          <RichText text={tip} />
        </div>
      ))}
    </>
  );
}
