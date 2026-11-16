import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { Emoji } from '../../components/Emoji';
import { Sheet } from '../../components/Sheet';
import { toast } from '../../components/Toasts';
import { celebrate } from '../../lib/confetti';
import { IMAGIER_PAGES } from '../../data/imagier';
import { takeBook, type BookInfo } from '../../lib/imagier';
import type { BookProgress } from '../../lib/imagier-book';
import { sfx } from '../../lib/sound';

const STEP: Record<BookProgress['phase'], string> = {
  check: 'Je vérifie ton livre… · Checking the book',
  pages: 'Je lis les pages et découpe les dessins… · Cutting out the drawings',
  drawings: 'Presque fini… · Almost done',
};

const mb = (bytes: number) => `${Math.max(1, Math.round(bytes / 1_000_000))} Mo`;

/**
 * Her own copy of the book, read on her device: the drawings of every word appear in the games.
 * `compact` is the one-line version for a chapter once the book is in.
 */
export function BookCard({ book, compact }: { book: BookInfo | null | undefined; compact?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<BookProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const [manage, setManage] = useState(false);
  const abort = useRef<AbortController | null>(null);

  const read = async (file: File | undefined) => {
    if (!file || busy) return;
    setError(null);
    sfx.whoosh();
    const ctrl = new AbortController();
    abort.current = ctrl;
    setBusy({ phase: 'check', done: 0, total: 1 });
    try {
      const { importBook } = await import('../../lib/imagier-book');
      const info = await importBook(file, setBusy, ctrl.signal);
      celebrate(1.2);
      sfx.levelUp();
      toast({ title: 'Ton livre est là !', body: `${info.words} drawings cut out, on this device only.`, emoji: '📖' });
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setError((e as Error).message || 'Something went wrong while reading the book.');
    } finally {
      setBusy(null);
      abort.current = null;
    }
  };

  // her book, sent here from Ajouter → Un PDF
  useEffect(() => {
    if (compact || book === undefined) return;
    const f = takeBook();
    const incomplete = !!book && IMAGIER_PAGES.some((p) => !book.pages.includes(p));
    if (f && (!book || incomplete)) void read(f);
    else if (f) toast({ title: 'Déjà là !', body: 'Your book’s drawings are already on this device.', emoji: '📖' });
    // once, when the book's state is known
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book === undefined]);

  const remove = async () => {
    const { removeBook } = await import('../../lib/imagier-book');
    await removeBook();
    setManage(false);
    toast({ title: 'Dessins supprimés', body: 'The book’s pages and drawings are off this device. The words stay.', emoji: '🧹' });
  };

  // pages a newer word list needs that this device doesn't have yet: read the PDF again for them
  const pagesMissing = book ? IMAGIER_PAGES.filter((p) => !book.pages.includes(p)).length : 0;

  if (book && compact && !pagesMissing) return null;

  if (book) {
    return (
      <>
        {pagesMissing > 0 && (
          <div className="book-card panel" data-testid="book-more">
            <div className="book-card-head">
              <span className="book-card-art">
                <Emoji e="✨" size={30} />
              </span>
              <div>
                <strong>De nouvelles pages !</strong>
                <p className="muted">Bonbon now covers {pagesMissing} more page{pagesMissing > 1 ? 's' : ''} of your book. Pick its PDF again to add their drawings.</p>
              </div>
            </div>
            {busy ? (
              <div className="book-card-busy" role="status" aria-live="polite">
                <div className="book-card-step">{STEP[busy.phase]}</div>
                <div className="book-card-bar">
                  <motion.span animate={{ width: `${Math.round(((busy.done + 1) / Math.max(1, busy.total)) * 100)}%` }} />
                </div>
              </div>
            ) : (
              <button className="btn btn--sun btn--block" onClick={() => input.current?.click()}>
                <Emoji e="📂" size={22} /> Choisir le PDF du livre
              </button>
            )}
            {error && (
              <p className="book-card-error" role="alert">
                {error}
              </p>
            )}
            <input
              ref={input}
              type="file"
              accept="application/pdf,.pdf"
              hidden
              onChange={(e) => {
                void read(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
          </div>
        )}
        {!compact && (
        <button className="book-card book-card--in panel" onClick={() => setManage(true)} data-testid="book-in">
          <Emoji e="📖" size={30} />
          <span className="book-card-text">
            <strong>Les dessins de ton livre sont là</strong>
            <span>
              {book.words} dessins · {book.pages.length} pages · {mb(book.bytes)} sur cet appareil
            </span>
          </span>
          <span className="book-card-go" aria-hidden>
            ⋯
          </span>
        </button>
        )}
        <Sheet open={manage} onClose={() => setManage(false)} label="Your book's drawings">
          <div className="center" style={{ padding: '6px 0 4px' }}>
            <Emoji e="📖" size={56} />
            <h2 style={{ marginTop: 8 }}>Les dessins de ton livre</h2>
            <p className="muted" style={{ margin: '8px 0 18px' }}>
              They were cut from your own copy of the book, here on this device, and never leave it. Removing them keeps your words and progress; the games then use emoji, and the page games wait for the book again.
            </p>
            <div className="row" style={{ gap: 12 }}>
              <button className="btn btn--ghost grow" onClick={() => void remove()}>
                Supprimer
              </button>
              <button className="btn btn--ok grow" onClick={() => setManage(false)}>
                Garder
              </button>
            </div>
          </div>
        </Sheet>
      </>
    );
  }

  const pct = busy ? Math.round(((busy.done + (busy.phase === 'drawings' ? 1 : 0)) / Math.max(1, busy.total)) * 100) : 0;

  return (
    <motion.section
      className={'book-card panel' + (over ? ' is-over' : '') + (compact ? ' book-card--compact' : '')}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        // ours: the app-wide catcher sends PDFs to "Ajouter" otherwise
        e.preventDefault();
        setOver(false);
        void read(e.dataTransfer.files[0]);
      }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      data-testid="book-card"
    >
      <div className="book-card-head">
        <span className="book-card-art">
          <Emoji e="🖍️" size={34} />
        </span>
        <div>
          <strong>{compact ? 'En option : les vrais dessins' : 'En option : les vrais dessins du livre'}</strong>
          <p className="muted">
            {compact
              ? 'Every word here has a drawing of Bonbon’s own. With your copy of the book, you can play on its real pages too.'
              : 'Every word has a drawing of Bonbon’s own, and every game works as it is. If you’d also like the book’s own illustrations and pages, pick its PDF once: Bonbon cuts them out on this phone in about a minute, and nothing is uploaded.'}
          </p>
        </div>
      </div>
      {busy ? (
        <div className="book-card-busy" role="status" aria-live="polite">
          <div className="book-card-step">
            {STEP[busy.phase]} {busy.phase === 'pages' ? `${busy.done + 1}/${busy.total}` : ''}
          </div>
          <div className="book-card-bar">
            <motion.span animate={{ width: `${pct}%` }} transition={{ type: 'spring', stiffness: 80, damping: 20 }} />
          </div>
          <small className="muted">A few minutes, once. Keep Bonbon open meanwhile.</small>
          <button className="btn btn--ghost btn--sm" onClick={() => abort.current?.abort()}>
            Arrêter
          </button>
        </div>
      ) : (
        <button className="btn btn--sun btn--block" onClick={() => input.current?.click()} data-testid="book-pick">
          <Emoji e="📂" size={22} /> Choisir le PDF du livre
        </button>
      )}
      {error && (
        <p className="book-card-error" role="alert">
          {error}
        </p>
      )}
      <input
        ref={input}
        type="file"
        accept="application/pdf,.pdf"
        hidden
        data-testid="book-file"
        onChange={(e) => {
          void read(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
    </motion.section>
  );
}
