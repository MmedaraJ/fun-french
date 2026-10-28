import { motion } from 'framer-motion';
import { useEffect } from 'react';
import { SpeakButton } from '../../components/SpeakButton';
import { speak } from '../../lib/speech';
import { OptionTile, useChoice } from './Choice';
import type { QProps } from './types';

/** Game 4: audio only, then pick the picture (or meaning). */
export function Listen(props: QProps) {
  const { q, phase } = props;
  const { options, pick, stateFor, refs } = useChoice(props);

  // Audio-only game: always play the word, whatever the autoplay setting.
  useEffect(() => {
    const t = setTimeout(() => void speak(q.card.fr), 350);
    return () => clearTimeout(t);
  }, [q.key, q.card.fr]);

  const look = q.optionStyle === 'image' ? 'image' : 'en';

  return (
    <>
      <div className="q-prompt">
        <div className="q-label">Écoute et choisis · Listen and choose</div>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 13 }}
          data-target={q.card.id}
        >
          <SpeakButton text={q.card.fr} size="xl" label="Play the word again" />
        </motion.div>
        <SpeakButton text={q.card.fr} size="md" slow />
        {phase === 'feedback' && (
          <motion.div className="q-word q-word--md" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            {q.card.fr}
          </motion.div>
        )}
      </div>
      <div className={look === 'image' ? 'option-grid' : 'option-list'}>
        {options.map((c, i) => (
          <OptionTile
            key={c.id}
            card={c}
            index={i}
            look={look}
            state={stateFor(c)}
            showSub={phase === 'feedback'}
            onPick={() => pick(c, i)}
            innerRef={(el) => (refs.current[i] = el)}
          />
        ))}
      </div>
    </>
  );
}
