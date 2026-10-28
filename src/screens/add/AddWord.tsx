import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CardEditor } from '../../components/CardEditor';
import { CardImage } from '../../components/CardImage';
import { Page } from '../../components/Page';
import type { Card } from '../../types';
import { AddHeader } from './shared';

/** /add/word — the quick single-card form, built for adding many in a row. */
export default function AddWord() {
  const [search] = useSearchParams();
  const deck = search.get('deck') ?? undefined;
  const [session, setSession] = useState<Card[]>([]);

  return (
    <Page narrow>
      <AddHeader title="Un mot" emoji="✍️" sub="Word, expression or sentence — Bonbon guesses the rest." back={search.get('back') ?? '/add'} />
      <div className="panel add-form">
        <CardEditor mode="create" defaultDeckId={deck} onSaved={(c) => setSession((s) => [c, ...s])} />
      </div>
      {session.length > 0 && (
        <div className="session-strip">
          <span className="field-label">Ajoutés à l’instant · {session.length}</span>
          <div className="hscroll">
            {session.map((c) => (
              <span key={c.id} className="session-chip">
                {(c.emoji || c.imageId) && <CardImage card={c} size={24} fallback="none" rounded={6} />}
                {c.fr}
              </span>
            ))}
          </div>
        </div>
      )}
    </Page>
  );
}
