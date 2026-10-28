import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { isPdf, offerPdfs } from '../lib/pdf-inbox';
import { Emoji } from './Emoji';
import { toast } from './Toasts';
import './PdfDrop.css';

const hasFiles = (e: DragEvent) => !!e.dataTransfer && [...e.dataTransfer.types].includes('Files');
/** While dragging only the types are known, and some browsers leave them empty. */
const maybePdf = (e: DragEvent) => [...(e.dataTransfer?.items ?? [])].some((i) => i.kind === 'file' && (i.type === 'application/pdf' || i.type === ''));

/** Drop PDFs anywhere in the app: they open in Ajouter → Un PDF. */
export function PdfDropCatcher() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [over, setOver] = useState(false);
  const hideTimer = useRef<number | undefined>(undefined);
  const path = useRef(pathname);
  path.current = pathname;

  useEffect(() => {
    const onOver = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      // allow the drop: otherwise the browser leaves the app to open the file
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
      if (!maybePdf(e)) return;
      setOver(true);
      // dragover keeps firing while the file is over the window; when it stops, the drag has left
      window.clearTimeout(hideTimer.current);
      hideTimer.current = window.setTimeout(() => setOver(false), 250);
    };
    const onDrop = (e: DragEvent) => {
      window.clearTimeout(hideTimer.current);
      setOver(false);
      // a drop zone on the page already took it
      if (!hasFiles(e) || e.defaultPrevented) return;
      e.preventDefault();
      const pdfs = [...(e.dataTransfer?.files ?? [])].filter(isPdf);
      if (!pdfs.length) {
        toast({ title: 'Seulement des PDF ici', body: 'Drop PDF files anywhere in Bonbon. Photos go in Ajouter → Une photo.', emoji: '📚' });
        return;
      }
      offerPdfs(pdfs);
      if (path.current !== '/add/pdf') navigate('/add/pdf');
    };
    window.addEventListener('dragover', onOver);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragover', onOver);
      window.removeEventListener('drop', onDrop);
      window.clearTimeout(hideTimer.current);
    };
  }, [navigate]);

  return (
    <AnimatePresence>
      {over && pathname !== '/add/pdf' && (
        <motion.div className="pdf-catch" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} aria-hidden data-testid="pdf-catch">
          <motion.div
            className="pdf-catch-card"
            initial={{ scale: 0.8, y: 24 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 22 }}
          >
            <motion.span animate={{ y: [0, -10, 0], rotate: [0, -6, 6, 0] }} transition={{ duration: 1.2, repeat: Infinity }}>
              <Emoji e="📚" size={64} />
            </motion.span>
            <strong>Lâche ton PDF ici !</strong>
            <span>Drop it to turn your book into games</span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
