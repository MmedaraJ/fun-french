import { useEffect } from 'react';
import { SpeakButton } from '../../components/SpeakButton';
import { speak } from '../../lib/speech';
import { OptionTile, useChoice } from './Choice';
import type { QProps } from './types';

/** Game 1: hear/see a French word, tap the matching picture. */
export function PickImage(props: QProps) {
  const { q, autoplay } = props;
  const { options, pick, stateFor, refs } = useChoice(props);

  useEffect(() => {
    if (!autoplay) return;
    const t = setTimeout(() => void speak(q.card.fr, { queue: true }), 300);
    return () => clearTimeout(t);
  }, [q.key, q.card.fr, autoplay]);

  return (
    <>
      <div className="q-prompt">
        <div className="q-label">Trouve l’image · Find the picture</div>
        <div className="q-row">
          <div className="q-word" data-target={q.card.id}>
            {q.card.fr}
          </div>
        </div>
        <div className="q-row">
          <SpeakButton text={q.card.fr} size="md" />
          <SpeakButton text={q.card.fr} size="md" slow />
        </div>
      </div>
      <div className={'option-grid' + (options.length > 4 ? ' option-grid--3' : '')}>
        {options.map((c, i) => (
          <OptionTile
            key={c.id}
            card={c}
            index={i}
            look="image"
            state={stateFor(c)}
            onPick={() => pick(c, i)}
            innerRef={(el) => (refs.current[i] = el)}
          />
        ))}
      </div>
    </>
  );
}
