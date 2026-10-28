import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CardEditor } from '../../components/CardEditor';
import { Emoji } from '../../components/Emoji';
import { Mascot } from '../../components/Mascot';
import { Page } from '../../components/Page';
import { PhotoCropper } from '../../components/PhotoCropper';
import { toast } from '../../components/Toasts';
import { aiAvailable, aiExtractFromImage, type AiItem } from '../../lib/ai';
import { addCards, existingFrench, findDuplicates, replaceImage } from '../../lib/content';
import { fileToImage, renderImage, saveImage } from '../../lib/images';
import { recognizePages } from '../../lib/ocr';
import { useSettings } from '../../lib/settings';
import { sfx } from '../../lib/sound';
import { ReviewList, toRows, type ReviewRow } from './ReviewList';
import { AddDone, AddHeader } from './shared';

type Stage = 'pick' | 'preview' | 'crop' | 'card' | 'ocr' | 'ai' | 'done';

const MAX_PAGES = 12;

async function centreSquare(blob: Blob): Promise<Blob> {
  const img = await fileToImage(blob);
  const side = Math.min(img.naturalWidth, img.naturalHeight);
  return renderImage(img, { x: (img.naturalWidth - side) / 2, y: (img.naturalHeight - side) / 2, w: side, h: side }, 720, 0.86);
}

/**
 * /add/photo — make a picture card, scan the text of one or several pages, or
 * let Claude name what's in the photos.
 */
export default function AddPhoto() {
  const navigate = useNavigate();
  const mascotColor = useSettings((s) => s.mascotColor);
  useSettings((s) => s.aiKey);
  const magic = aiAvailable();
  const [stage, setStage] = useState<Stage>('pick');
  const [pages, setPages] = useState<Blob[]>([]);
  const [cropped, setCropped] = useState<Blob | null>(null);
  const [ocr, setOcr] = useState<{ progress: number; status: string; page: number; pages: number; error?: string; empty?: boolean } | null>(null);
  const [ai, setAi] = useState<{ busy: boolean; page?: number; pages?: number; error?: string }>({ busy: false });
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [attachKey, setAttachKey] = useState<string | null>(null);
  const [done, setDone] = useState<{ ids: string[]; deckId: string } | null>(null);
  const [dragging, setDragging] = useState(false);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const urls = useMemo(() => pages.map((p) => URL.createObjectURL(p)), [pages]);
  useEffect(() => () => urls.forEach((u) => URL.revokeObjectURL(u)), [urls]);
  const single = pages.length === 1;

  const take = useCallback((files: (Blob | null | undefined)[] | FileList | null | undefined) => {
    const list = [...(files ?? [])].filter((f): f is Blob => !!f);
    if (!list.length) return;
    const images = list.filter((f) => f.type.startsWith('image/'));
    if (images.length < list.length) toast({ title: 'Ce n’est pas une image', body: 'Only photos and images can be scanned.', emoji: '🙈', tone: 'error' });
    if (!images.length) return;
    sfx.pop();
    setPages((prev) => {
      const next = [...prev, ...images].slice(0, MAX_PAGES);
      if (prev.length + images.length > MAX_PAGES) toast({ title: `${MAX_PAGES} pages maximum`, emoji: '📚' });
      return next;
    });
    setStage('preview');
  }, []);

  // Paste images from the clipboard (desktop).
  useEffect(() => {
    if (stage !== 'pick' && stage !== 'preview') return;
    const onPaste = (e: ClipboardEvent) => {
      const files = [...(e.clipboardData?.items ?? [])].filter((i) => i.type.startsWith('image/')).map((i) => i.getAsFile());
      if (files.length) take(files);
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [stage, take]);

  const removePage = (i: number) => {
    sfx.unletter();
    setPages((prev) => {
      const next = prev.filter((_, k) => k !== i);
      if (!next.length) setStage('pick');
      return next;
    });
  };

  /** Read every page, then hand the merged text to the text flow, ready to review. */
  const runOcr = async () => {
    if (!pages.length) return;
    setStage('ocr');
    setOcr({ progress: 0, status: 'Réveil du scanner…', page: 1, pages: pages.length });
    try {
      const texts = await recognizePages(pages, (p) => setOcr((o) => ({ ...(o ?? p), ...p })));
      const text = texts.filter(Boolean).join('\n');
      if (!text.trim()) {
        setOcr((o) => ({ ...(o ?? { progress: 1, status: '', page: 1, pages: pages.length }), empty: true }));
        return;
      }
      sfx.match();
      navigate('/add/text', { state: { text, from: 'ocr', auto: true, pages: pages.length } });
    } catch (e) {
      setOcr((o) => ({ ...(o ?? { progress: 0, status: '', page: 1, pages: pages.length }), error: (e as Error).message || 'The scanner failed to start.' }));
    }
  };

  /** Ask Claude page by page and merge everything into one review list. */
  const runAi = async () => {
    if (!pages.length) return;
    setStage('ai');
    const found: AiItem[] = [];
    try {
      for (let i = 0; i < pages.length; i++) {
        setAi({ busy: true, page: i + 1, pages: pages.length });
        found.push(...(await aiExtractFromImage(pages[i])));
      }
      if (!found.length) {
        setAi({ busy: false, error: 'Claude didn’t spot anything to learn here. Try another photo.' });
        return;
      }
      const r = toRows(found, await existingFrench());
      setRows(r);
      const main = single ? (r.find((x) => x.main) ?? r.find((x) => x.kind === 'word')) : undefined;
      setAttachKey(main?.key ?? null);
      setAi({ busy: false });
      sfx.match();
    } catch (e) {
      setAi({ busy: false, error: (e as Error).message });
    }
  };

  const attachRow = single ? rows.find((r) => r.key === attachKey) : undefined;

  const saveAi = async (picked: ReviewRow[], deckId: string) => {
    const attachNew = !!attachRow && picked.some((r) => r.key === attachRow.key);
    // A word she already has keeps its card and simply gets her photo.
    const attachExisting = !!attachRow && !attachNew && attachRow.duplicate === 'existing';
    const imageId = single && (attachNew || attachExisting) ? await saveImage(await centreSquare(pages[0])) : undefined;
    const cards = await addCards(
      picked.map((r) => ({ fr: r.fr, en: r.en, kind: r.kind, gender: r.gender, plural: r.plural, emoji: r.emoji, note: r.note, imageId: r.key === attachRow?.key ? imageId : undefined })),
      { deckId, source: 'ai' },
    );
    const ids = cards.map((c) => c.id);
    if (imageId && attachExisting && attachRow) {
      const [existing] = await findDuplicates(attachRow.fr);
      if (existing) {
        await replaceImage(existing.id, imageId);
        ids.push(existing.id);
      }
    }
    setDone({ ids, deckId });
    setStage('done');
  };

  const reset = () => {
    setPages([]);
    setCropped(null);
    setOcr(null);
    setRows([]);
    setDone(null);
    setStage('pick');
  };

  const n = pages.length;
  const pagesLabel = n > 1 ? ` · ${n} pages` : '';
  const sub: Record<Stage, string> = {
    pick: 'Snap something around you, or one or more pages of your book.',
    preview: n > 1 ? `${n} pages ready. Add more, or pick what to do.` : 'What should we do with it?',
    crop: 'Frame the thing you want to learn.',
    card: 'Name it in French and English.',
    ocr: n > 1 ? `Reading ${n} pages…` : 'Reading the text in your photo…',
    ai: rows.length && !ai.busy ? 'Pick the words to keep.' : 'Claude is looking at your photos…',
    done: '',
  };

  return (
    <Page narrow>
      <AddHeader
        title="Une photo"
        emoji="📸"
        sub={sub[stage]}
        right={
          stage !== 'pick' && stage !== 'done' ? (
            <button className="btn btn--sm btn--ghost" onClick={() => (stage === 'preview' ? reset() : setStage('preview'))}>
              ← Retour
            </button>
          ) : undefined
        }
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => {
          take(e.target.files);
          e.target.value = '';
        }}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          take(e.target.files);
          e.target.value = '';
        }}
        data-testid="photo-input"
      />

      <AnimatePresence mode="wait">
        {stage === 'pick' && (
          <motion.div key="pick" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
            <div
              className={'drop-zone' + (dragging ? ' is-drag' : '')}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                take(e.dataTransfer.files);
              }}
            >
              <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 2.4, repeat: Infinity }}>
                <Emoji e="📸" size={72} />
              </motion.div>
              <div className="photo-btns">
                <motion.button className="btn btn--lg" onClick={() => cameraRef.current?.click()} whileTap={{ scale: 0.95 }} data-testid="photo-camera">
                  <Emoji e="📷" size={26} /> Prendre une photo
                </motion.button>
                <motion.button className="btn btn--lg btn--ghost" onClick={() => galleryRef.current?.click()} whileTap={{ scale: 0.95 }} data-testid="photo-gallery">
                  <Emoji e="🖼️" size={26} /> Choisir des images
                </motion.button>
              </div>
              <p className="muted drop-hint">Several pages at once? Select them all — or drop / paste them here.</p>
            </div>
            <div className="photo-ideas">
              <div className="idea">
                <Emoji e="📚" size={30} />
                <span>
                  <strong>Pages of your book</strong> — word lists like “Abaisser · To lower” come out ready, French and English.
                </span>
              </div>
              <div className="idea">
                <Emoji e="🪴" size={30} />
                <span>
                  <strong>Things at home</strong> — your mug, your plant, your cat… make cards with your own photos.
                </span>
              </div>
            </div>
          </motion.div>
        )}

        {stage === 'preview' && n > 0 && (
          <motion.div key="preview" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
            {single ? (
              <div className="photo-preview">
                <img src={urls[0]} alt="Your photo" />
              </div>
            ) : (
              <div className="page-grid">
                {urls.map((u, i) => (
                  <motion.div key={u} className="page-thumb" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 20, delay: i * 0.04 }}>
                    <img src={u} alt={`Page ${i + 1}`} />
                    <span className="page-num">{i + 1}</span>
                    <button className="page-remove" onClick={() => removePage(i)} aria-label={`Remove page ${i + 1}`}>
                      ✕
                    </button>
                  </motion.div>
                ))}
              </div>
            )}
            <div className="row row--wrap page-add">
              <button className="chip" onClick={() => cameraRef.current?.click()}>
                <Emoji e="📷" size={18} /> + Photo
              </button>
              <button className="chip" onClick={() => galleryRef.current?.click()}>
                <Emoji e="🖼️" size={18} /> + Pages
              </button>
              {single && (
                <button className="chip" onClick={() => removePage(0)}>
                  ✕ Retirer
                </button>
              )}
            </div>
            <div className="photo-actions">
              <motion.button className="photo-action" onClick={runOcr} whileTap={{ scale: 0.97 }} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} data-testid="photo-scan">
                <Emoji e="🔎" size={40} />
                <span>
                  <strong>Scanner le texte{pagesLabel}</strong>
                  <small>Read the French on the page — word lists come out ready to add (works offline).</small>
                </span>
              </motion.button>
              {magic && (
                <motion.button className="photo-action photo-action--magic" onClick={runAi} whileTap={{ scale: 0.97 }} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}>
                  <Emoji e="✨" size={40} />
                  <span>
                    <strong>Demander à l’IA{pagesLabel}</strong>
                    <small>Claude reads word lists (keeping the printed English) or names what it sees.</small>
                  </span>
                </motion.button>
              )}
              {single && (
                <motion.button className="photo-action" onClick={() => setStage('crop')} whileTap={{ scale: 0.97 }} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} data-testid="photo-make-card">
                  <Emoji e="🖼️" size={40} />
                  <span>
                    <strong>Carte photo</strong>
                    <small>Use this photo as the picture of a new word.</small>
                  </span>
                </motion.button>
              )}
            </div>
          </motion.div>
        )}

        {stage === 'crop' && single && (
          <motion.div key="crop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="panel add-form">
            <PhotoCropper
              file={pages[0]}
              doneLabel="Suivant"
              onCancel={() => setStage('preview')}
              onDone={(blob) => {
                setCropped(blob);
                setStage('card');
              }}
            />
          </motion.div>
        )}

        {stage === 'card' && cropped && (
          <motion.div key="card" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="panel add-form">
            <CardEditor
              mode="create"
              presetPhoto={cropped}
              source="photo"
              onSaved={(c) => {
                setDone({ ids: [c.id], deckId: c.deckId });
                setStage('done');
              }}
            />
          </motion.div>
        )}

        {stage === 'ocr' && ocr && (
          <motion.div key="ocr" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {!ocr.error && !ocr.empty && (
              <div className="busy-card panel">
                <Mascot mood="thinking" size={110} color={mascotColor} />
                {ocr.pages > 1 && (
                  <div className="ocr-pages" aria-label={`Page ${ocr.page} of ${ocr.pages}`}>
                    {Array.from({ length: ocr.pages }, (_, i) => (
                      <span key={i} className={'ocr-page' + (i + 1 < ocr.page ? ' is-done' : i + 1 === ocr.page ? ' is-on' : '')}>
                        {i + 1}
                      </span>
                    ))}
                  </div>
                )}
                <strong>{ocr.pages > 1 ? `Page ${ocr.page}/${ocr.pages}` : ocr.status}</strong>
                {ocr.pages > 1 && <span className="muted">{ocr.status}</span>}
                <div className="progress-track">
                  <motion.span animate={{ width: `${Math.round(ocr.progress * 100)}%` }} transition={{ type: 'spring', stiffness: 80, damping: 20 }} />
                </div>
                <span className="muted">{Math.round(ocr.progress * 100)}% · The first scan downloads the French reader (once).</span>
              </div>
            )}
            {ocr.error && (
              <div className="busy-card panel">
                <Mascot mood="sad" size={100} color={mascotColor} />
                <strong>Le scanner n’a pas marché</strong>
                <span className="muted">{ocr.error}</span>
                <button className="btn" onClick={runOcr}>
                  Réessayer
                </button>
              </div>
            )}
            {ocr.empty && (
              <div className="busy-card panel">
                <Mascot mood="sad" size={100} color={mascotColor} />
                <strong>Aucun texte trouvé</strong>
                <span className="muted">Try a sharper, closer photo with good light.</span>
                <button className="btn btn--ghost" onClick={() => setStage('preview')}>
                  Retour
                </button>
              </div>
            )}
          </motion.div>
        )}

        {stage === 'ai' && (
          <motion.div key="ai" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {ai.busy && (
              <div className="busy-card panel">
                <div className="ai-photo-scan">
                  <img src={urls[(ai.page ?? 1) - 1]} alt="" />
                  <motion.span className="scan-line" animate={{ top: ['0%', '100%', '0%'] }} transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }} />
                </div>
                <strong>{(ai.pages ?? 1) > 1 ? `Page ${ai.page}/${ai.pages}` : 'Coco et Claude regardent ta photo…'}</strong>
                <span className="muted">A full page of words takes a little while.</span>
              </div>
            )}
            {ai.error && (
              <div className="busy-card panel">
                <Mascot mood="sad" size={100} color={mascotColor} />
                <strong>Oups !</strong>
                <span className="muted">{ai.error}</span>
                <div className="row" style={{ gap: 10 }}>
                  <button className="btn btn--ghost" onClick={() => setStage('preview')}>
                    Retour
                  </button>
                  <button className="btn" onClick={runAi}>
                    Réessayer
                  </button>
                </div>
              </div>
            )}
            {!ai.busy && !ai.error && rows.length > 0 && (
              <ReviewList
                rows={rows}
                onChange={setRows}
                onSubmit={saveAi}
                photoUrl={single ? urls[0] : undefined}
                attachKey={single ? attachKey : null}
                onAttach={single ? setAttachKey : undefined}
                emptyAction={attachRow?.duplicate === 'existing' ? `📷 Ma photo sur « ${attachRow.fr} »` : undefined}
                top={
                  <div className="ai-note">
                    <img src={urls[0]} alt="" className="ai-thumb" />
                    <span>{single ? <>Found by Claude. Tap <strong>📷 photo</strong> on the card that should use your photo as its picture.</> : <>Found by Claude on {n} pages. Double-check anything that looks off.</>}</span>
                  </div>
                }
              />
            )}
          </motion.div>
        )}

        {stage === 'done' && done && (
          <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <AddDone count={done.ids.length} cardIds={done.ids} deckId={done.deckId} onMore={reset} moreLabel="Une autre photo" />
          </motion.div>
        )}
      </AnimatePresence>
    </Page>
  );
}
