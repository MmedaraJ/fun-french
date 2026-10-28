import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CardEditor } from '../../components/CardEditor';
import { Emoji } from '../../components/Emoji';
import { Mascot } from '../../components/Mascot';
import { Page } from '../../components/Page';
import { PhotoCropper } from '../../components/PhotoCropper';
import { toast } from '../../components/Toasts';
import { aiAvailable, aiExtractFromImage } from '../../lib/ai';
import { addCards, existingFrench, findDuplicates, replaceImage } from '../../lib/content';
import { fileToImage, renderImage, saveImage } from '../../lib/images';
import { recognizeFrench } from '../../lib/ocr';
import { useSettings } from '../../lib/settings';
import { sfx } from '../../lib/sound';
import { ReviewList, toRows, type ReviewRow } from './ReviewList';
import { AddDone, AddHeader } from './shared';

type Stage = 'pick' | 'preview' | 'crop' | 'card' | 'ocr' | 'ai' | 'done';

async function centreSquare(blob: Blob): Promise<Blob> {
  const img = await fileToImage(blob);
  const side = Math.min(img.naturalWidth, img.naturalHeight);
  return renderImage(img, { x: (img.naturalWidth - side) / 2, y: (img.naturalHeight - side) / 2, w: side, h: side }, 720, 0.86);
}

/** /add/photo — make a picture card, scan text, or let Claude name what's in the photo. */
export default function AddPhoto() {
  const navigate = useNavigate();
  const mascotColor = useSettings((s) => s.mascotColor);
  useSettings((s) => s.aiKey);
  const magic = aiAvailable();
  const [stage, setStage] = useState<Stage>('pick');
  const [file, setFile] = useState<Blob | null>(null);
  const [cropped, setCropped] = useState<Blob | null>(null);
  const [ocr, setOcr] = useState<{ progress: number; status: string; text?: string; error?: string } | null>(null);
  const [ai, setAi] = useState<{ busy: boolean; error?: string }>({ busy: false });
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [attachKey, setAttachKey] = useState<string | null>(null);
  const [done, setDone] = useState<{ ids: string[]; deckId: string } | null>(null);
  const [dragging, setDragging] = useState(false);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const url = useMemo(() => (file ? URL.createObjectURL(file) : ''), [file]);
  useEffect(() => () => {
    if (url) URL.revokeObjectURL(url);
  }, [url]);

  const take = useCallback((f: Blob | undefined | null) => {
    if (!f) return;
    if (!f.type.startsWith('image/')) {
      toast({ title: 'Ce n’est pas une image', emoji: '🙈', tone: 'error' });
      return;
    }
    sfx.pop();
    setFile(f);
    setStage('preview');
  }, []);

  // Paste an image from the clipboard (desktop).
  useEffect(() => {
    if (stage !== 'pick') return;
    const onPaste = (e: ClipboardEvent) => {
      const item = [...(e.clipboardData?.items ?? [])].find((i) => i.type.startsWith('image/'));
      if (item) take(item.getAsFile());
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [stage, take]);

  const runOcr = async () => {
    if (!file) return;
    setStage('ocr');
    setOcr({ progress: 0, status: 'Réveil du scanner…' });
    try {
      const text = await recognizeFrench(file, (p) => setOcr((o) => ({ ...o, ...p })));
      setOcr({ progress: 1, status: 'Terminé !', text });
      if (text) sfx.match();
    } catch (e) {
      setOcr({ progress: 0, status: '', error: (e as Error).message || 'The scanner failed to start.' });
    }
  };

  const runAi = async () => {
    if (!file) return;
    setStage('ai');
    setAi({ busy: true });
    try {
      const items = await aiExtractFromImage(file);
      if (!items.length) {
        setAi({ busy: false, error: 'Claude didn’t spot anything to learn here. Try another photo.' });
        return;
      }
      const r = toRows(items, await existingFrench());
      setRows(r);
      const main = r.find((x) => x.main) ?? r.find((x) => x.kind === 'word');
      setAttachKey(main?.key ?? null);
      setAi({ busy: false });
      sfx.match();
    } catch (e) {
      setAi({ busy: false, error: (e as Error).message });
    }
  };

  const attachRow = rows.find((r) => r.key === attachKey);

  const saveAi = async (picked: ReviewRow[], deckId: string) => {
    const attachNew = !!attachRow && picked.some((r) => r.key === attachRow.key);
    // A word she already has keeps its card and simply gets her photo.
    const attachExisting = !!attachRow && !attachNew && attachRow.duplicate === 'existing';
    const imageId = file && (attachNew || attachExisting) ? await saveImage(await centreSquare(file)) : undefined;
    const cards = await addCards(
      picked.map((r) => ({ fr: r.fr, en: r.en, kind: r.kind, gender: r.gender, plural: r.plural, emoji: r.emoji, note: r.note, imageId: r.key === attachKey ? imageId : undefined })),
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
    setFile(null);
    setCropped(null);
    setOcr(null);
    setRows([]);
    setDone(null);
    setStage('pick');
  };

  const sub: Record<Stage, string> = {
    pick: 'Snap something around you, or a page, a menu, a sign.',
    preview: 'What should we do with it?',
    crop: 'Frame the thing you want to learn.',
    card: 'Name it in French and English.',
    ocr: 'Reading the text in your photo…',
    ai: 'Claude is looking at your photo…',
    done: '',
  };

  return (
    <Page narrow>
      <AddHeader
        title="Une photo"
        emoji="📸"
        sub={stage === 'ocr' && ocr?.text !== undefined ? 'Here’s what the scanner read.' : stage === 'ai' && rows.length && !ai.busy ? 'Pick the words to keep.' : sub[stage]}
        right={
          stage !== 'pick' && stage !== 'done' ? (
            <button className="btn btn--sm btn--ghost" onClick={() => (stage === 'preview' ? reset() : setStage('preview'))}>
              ← Retour
            </button>
          ) : undefined
        }
      />
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => take(e.target.files?.[0])} />
      <input ref={galleryRef} type="file" accept="image/*" hidden onChange={(e) => take(e.target.files?.[0])} />

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
                take(e.dataTransfer.files?.[0]);
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
                  <Emoji e="🖼️" size={26} /> Choisir une image
                </motion.button>
              </div>
              <p className="muted drop-hint">…or drop / paste an image here</p>
            </div>
            <div className="photo-ideas">
              <div className="idea">
                <Emoji e="🪴" size={30} />
                <span>
                  <strong>Things at home</strong> — your mug, your plant, your cat… make cards with your own photos.
                </span>
              </div>
              <div className="idea">
                <Emoji e="📖" size={30} />
                <span>
                  <strong>Text</strong> — a menu, a sign, a page of your book: scan it and pick words.
                </span>
              </div>
            </div>
          </motion.div>
        )}

        {stage === 'preview' && file && (
          <motion.div key="preview" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
            <div className="photo-preview">
              <img src={url} alt="Your photo" />
            </div>
            <div className="photo-actions">
              <motion.button className="photo-action" onClick={() => setStage('crop')} whileTap={{ scale: 0.97 }} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} data-testid="photo-make-card">
                <Emoji e="🖼️" size={40} />
                <span>
                  <strong>Carte photo</strong>
                  <small>Use this photo as the picture of a new word.</small>
                </span>
              </motion.button>
              <motion.button className="photo-action" onClick={runOcr} whileTap={{ scale: 0.97 }} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }} data-testid="photo-scan">
                <Emoji e="🔎" size={40} />
                <span>
                  <strong>Scanner le texte</strong>
                  <small>Read the French text in it (works offline).</small>
                </span>
              </motion.button>
              {magic && (
                <motion.button className="photo-action photo-action--magic" onClick={runAi} whileTap={{ scale: 0.97 }} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
                  <Emoji e="✨" size={40} />
                  <span>
                    <strong>Demander à l’IA</strong>
                    <small>Claude names everything in the photo, in French.</small>
                  </span>
                </motion.button>
              )}
            </div>
          </motion.div>
        )}

        {stage === 'crop' && file && (
          <motion.div key="crop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="panel add-form">
            <PhotoCropper
              file={file}
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
            {ocr.text === undefined && !ocr.error && (
              <div className="busy-card panel">
                <Mascot mood="thinking" size={110} color={mascotColor} />
                <strong>{ocr.status}</strong>
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
            {ocr.text !== undefined && (
              <div className="panel add-form">
                {ocr.text ? (
                  <>
                    <span className="field-label">Texte trouvé · fix anything the scanner misread</span>
                    <textarea className="textarea" value={ocr.text} onChange={(e) => setOcr({ ...ocr, text: e.target.value })} lang="fr" spellCheck={false} />
                    <button className="btn btn--lg btn--block" style={{ marginTop: 12 }} onClick={() => navigate('/add/text', { state: { text: ocr.text, from: 'ocr' } })} disabled={!ocr.text.trim()}>
                      Choisir les mots →
                    </button>
                  </>
                ) : (
                  <div className="busy-card">
                    <Mascot mood="sad" size={100} color={mascotColor} />
                    <strong>Aucun texte trouvé</strong>
                    <span className="muted">Try a sharper, closer photo with good light.</span>
                    <button className="btn btn--ghost" onClick={() => setStage('preview')}>
                      Retour
                    </button>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {stage === 'ai' && (
          <motion.div key="ai" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {ai.busy && (
              <div className="busy-card panel">
                <div className="ai-photo-scan">
                  <img src={url} alt="" />
                  <motion.span className="scan-line" animate={{ top: ['0%', '100%', '0%'] }} transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }} />
                </div>
                <strong>Coco et Claude regardent ta photo…</strong>
                <span className="muted">This takes a few seconds.</span>
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
                photoUrl={url}
                attachKey={attachKey}
                onAttach={setAttachKey}
                emptyAction={attachRow?.duplicate === 'existing' ? `📷 Ma photo sur « ${attachRow.fr} »` : undefined}
                top={
                  <div className="ai-note">
                    <img src={url} alt="" className="ai-thumb" />
                    <span>
                      Found by Claude. Tap <strong>📷 photo</strong> on the card that should use your photo as its picture.
                    </span>
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
