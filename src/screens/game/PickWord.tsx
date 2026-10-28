import { motion } from 'framer-motion';
import { CardImage } from '../../components/CardImage';
import { speak } from '../../lib/speech';
import { OptionTile, useChoice } from './Choice';
import type { QProps } from './types';

/** Game 2: see a picture (or the English), pick the French word. */
export function PickWord(props: QProps) {
  const { q, phase, autoplay, onAnswer } = props;
  const { options, pick, stateFor, refs } = useChoice({
    ...props,
    onAnswer: (correct, info) => {
      onAnswer(correct, info);
      if (autoplay) setTimeout(() => void speak(q.card.fr), 250);
    },
  });
  const long = options.some((o) => o.fr.length > 16);

  return (
    <>
      <div className="q-prompt">
        <div className="q-label">Quel est le mot ? · Which word?</div>
        {q.prompt === 'image' ? (
          <motion.div
            className="q-picture"
            initial={{ scale: 0.5, rotate: -8 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 15 }}
            data-target={q.card.id}
          >
            <CardImage card={q.card} size={q.card.imageId ? '100%' : '72%'} rounded={0} />
          </motion.div>
        ) : (
          <div className="q-en" data-target={q.card.id}>
            “{q.card.en}”
          </div>
        )}
        {q.prompt === 'image' && !q.card.gender && !q.card.imageId && <div className="q-caption">{q.card.en}</div>}
      </div>
      <div className={long ? 'option-list' : 'option-grid'}>
        {options.map((c, i) => (
          <OptionTile
            key={c.id}
            card={c}
            index={i}
            look="fr"
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
