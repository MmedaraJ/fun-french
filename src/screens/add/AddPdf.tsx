import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { Emoji } from '../../components/Emoji';
import { bestEmoji, EmojiPickerSheet, useEmojiIndex } from '../../components/EmojiPicker';
import { Mascot } from '../../components/Mascot';
import { Page } from '../../components/Page';
import { toast } from '../../components/Toasts';
import { LESSONS } from '../../data/grammar/lessons';
import { aiAvailable, aiExtractFromPdf, planPdfParts } from '../../lib/ai';
import { addBookGrammar } from '../../lib/book';
import { addCards, celebrateUnlocks, createDeck, existingByFrench, existingFrench, existingPairs } from '../../lib/content';
import { normalizeAnswer } from '../../lib/french';
import { uid } from '../../lib/ids';
import type { OcrProgress } from '../../lib/ocr';
import { cycleColor, inkOn, paletteColor } from '../../lib/palette';
import { correctAgainstKnown, markDuplicates, type Candidate } from '../../lib/parse';
import { MAX_PAGES, openPdf, readPdfPages, type OutlineEntry, type PdfDoc } from '../../lib/pdf';
import { clearPdfDraft, isPdf, keepPdfDraft, listenForPdfs, pdfDraft } from '../../lib/pdf-inbox';
import { pageTexts, readTopics, topicEmoji, type ItemGroup } from '../../lib/pdf-topics';
import { useSettings } from '../../lib/settings';
import { sfx } from '../../lib/sound';
import { fillMissing } from '../../lib/translate';
import type { Deck, PaletteKey } from '../../types';
import { ReviewItem, type ReviewRow } from './ReviewList';
import { AddDone, AddHeader } from './shared';

type Stage = 'pick' | 'prepare' | 'read' | 'review' | 'done';

const MAX_FILES = 10;
/** From this many pages, a page range can be picked. */
const RANGE_FROM = 30;
/** Rows shown per topic at first (long lists grow on demand). */
const ROWS_STEP = 40;

interface PdfFile {
  id: string;
  file: File;
  pages: number;
  from: number;
  to: number;
  outline: OutlineEntry[];
  opening: boolean;
  error?: string;
}

type PdfRow = ReviewRow & { group: ItemGroup };

interface TopicDraft {
  key: string;
  name: string;
  nameEn: string;
  emoji: string;
  color: PaletteKey;
  from: number;
  to: number;
  file: string;
  rows: PdfRow[];
}

interface GrammarPick {
  id: string;
  on: boolean;
  files: string[];
}

interface Review {
  topics: TopicDraft[];
  grammar: GrammarPick[];
  fromAi: boolean;
  notes: string[];
}

interface Reading {
  file: string;
  fileIndex: number;
  files: number;
  phase: 'text' | 'ocr' | 'ai';
  page: number;
  done: number;
  total: number;
  scanned: number;
  ocr?: OcrProgress;
  part?: { done: number; total: number; from: number; to: number };
  error?: string;
  stopping?: boolean;
}

interface Found {
  title: string;
  titleEn?: string;
  emoji: string;
  from: number;
  to: number;
  file: string;
  items: (Candidate & { group: ItemGroup })[];
}

let rowSeq = 0;

const GROUPS: { id: ItemGroup; emoji: string; label: string }[] = [
  { id: 'vocab', emoji: '📋', label: 'mots du livre' },
  { id: 'words', emoji: '🔤', label: 'mots du texte' },
  { id: 'sentences', emoji: '💬', label: 'phrases' },
];

const LESSON_BY_ID = new Map(LESSONS.map((l, i) => [l.id, { lesson: l, order: i }]));

const sizeLabel = (bytes: number) => (bytes >= 1e6 ? `${(bytes / 1e6).toFixed(1)} Mo` : `${Math.max(1, Math.round(bytes / 1e3))} Ko`);
const plural = (n: number, word: string, many = word + 's') => `${n} ${n > 1 ? many : word}`;

/** Requests Claude will get for a file: one when it's sent whole, else about one per 30 pages. */
function aiRequests(f: PdfFile): number {
  const [first] = planPdfParts({ file: f.file, pageCount: f.pages, from: f.from, to: f.to, texts: new Map() });
  return first?.kind === 'pdf' ? 1 : Math.ceil((f.to - f.from + 1) / 30);
}

/** Chapters from the bookmarks, as page ranges. */
function chapters(f: PdfFile): { title: string; from: number; to: number }[] {
  const top = f.outline.filter((o) => o.depth === 0);
  const list = top.length >= 2 ? top : f.outline.filter((o) => o.depth === 1);
  return list
    .map((o, i) => ({ title: o.title, from: o.page, to: Math.max(o.page, (list[i + 1]?.page ?? f.pages + 1) - 1) }))
    .filter((c) => c.from >= 1 && c.from <= f.pages)
    .slice(0, 40);
}

/**
 * /add/pdf — drop textbook PDFs (chapters, workbooks, handouts): every topic they teach becomes a
 * theme with its words and sentences, and the grammar they cover is marked in Grammaire.
 */
export default function AddPdf() {
  const navigate = useNavigate();
  const mascotColor = useSettings((s) => s.mascotColor);
  useSettings((s) => s.aiKey);
  const magic = aiAvailable();
  const index = useEmojiIndex();
  const [stage, setStage] = useState<Stage>(() => (pdfDraft<Review>() ? 'review' : 'pick'));
  const [files, setFiles] = useState<PdfFile[]>([]);
  const [reading, setReading] = useState<Reading | null>(null);
  const [review, setReview] = useState<Review | null>(() => pdfDraft<Review>());
  const [existing, setExisting] = useState<Map<string, { id: string; deck: string }>>(new Map());
  const [open, setOpen] = useState<Set<string>>(() => new Set(pdfDraft<Review>()?.topics.slice(0, 1).map((t) => t.key) ?? []));
  const [shown, setShown] = useState<Record<string, number>>({});
  const [pickerFor, setPickerFor] = useState<{ topic: string; row?: string } | null>(null);
  const [translating, setTranslating] = useState<{ done: number; total: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState<{ decks: Deck[]; ids: string[]; lessons: string[] } | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const docs = useRef(new Map<string, PdfDoc>());
  const filesRef = useRef(files);
  filesRef.current = files;
  const stageRef = useRef(stage);
  stageRef.current = stage;
  const abortRef = useRef<AbortController | null>(null);
  const reviewRef = useRef(review);
  reviewRef.current = review;
  /** PDFs dropped while another one is being read or reviewed: opened next. */
  const queued = useRef<File[]>([]);
  const mounted = useRef(true);

  // leaving the screen stops the reading and frees the PDFs
  useEffect(() => {
    mounted.current = true;
    const open = docs.current;
    return () => {
      mounted.current = false;
      abortRef.current?.abort();
      for (const d of open.values()) void d.close();
      open.clear();
    };
  }, []);

  useEffect(() => {
    if (stage === 'review') void existingByFrench().then(setExisting);
  }, [stage]);

  // keep the review if she goes to look at a lesson
  useEffect(() => {
    if (stage === 'review' && review) keepPdfDraft(review, { topics: review.topics.length, items: review.topics.reduce((a, t) => a + t.rows.length, 0) });
  }, [stage, review]);

  const openFile = useCallback(async (f: PdfFile) => {
    try {
      const doc = await openPdf(f.file, f.file.name);
      if (!filesRef.current.some((x) => x.id === f.id)) {
        void doc.close();
        return;
      }
      docs.current.set(f.id, doc);
      setFiles((prev) => prev.map((x) => (x.id === f.id ? { ...x, pages: doc.pages, from: 1, to: Math.min(doc.pages, MAX_PAGES), outline: doc.outline, opening: false } : x)));
    } catch (e) {
      setFiles((prev) => prev.map((x) => (x.id === f.id ? { ...x, opening: false, error: (e as Error).message } : x)));
    }
  }, []);

  const addFiles = useCallback(
    (list: File[]) => {
      if (stageRef.current !== 'pick' && stageRef.current !== 'prepare') {
        queued.current.push(...list.filter(isPdf));
        toast({ title: 'Gardé pour après', body: 'Finish this PDF first; the new one opens next.', emoji: '📚' });
        return;
      }
      const pdfs = list.filter(isPdf);
      if (pdfs.length < list.length) toast({ title: 'Ce n’est pas un PDF', body: 'Only PDF files can be read here.', emoji: '🙈', tone: 'error' });
      if (!pdfs.length) return;
      const room = MAX_FILES - filesRef.current.length;
      if (pdfs.length > room) toast({ title: `${MAX_FILES} PDF maximum`, emoji: '📚' });
      const fresh: PdfFile[] = pdfs.slice(0, Math.max(0, room)).map((file) => ({ id: uid(), file, pages: 0, from: 1, to: 1, outline: [], opening: true }));
      if (!fresh.length) return;
      sfx.pop();
      filesRef.current = [...filesRef.current, ...fresh];
      setFiles(filesRef.current);
      setStage('prepare');
      for (const f of fresh) void openFile(f);
    },
    [openFile],
  );

  // PDFs dropped anywhere in the app come in through the inbox
  useEffect(() => listenForPdfs(addFiles), [addFiles]);

  const removeFile = (id: string) => {
    sfx.unletter();
    void docs.current.get(id)?.close();
    docs.current.delete(id);
    const next = filesRef.current.filter((f) => f.id !== id);
    filesRef.current = next;
    setFiles(next);
    if (!next.length) setStage('pick');
  };

  const setRange = (id: string, from: number, to: number) => {
    setFiles((prev) =>
      prev.map((f) => {
        if (f.id !== id) return f;
        const a = Math.min(Math.max(1, Math.round(from) || 1), f.pages);
        let b = Math.min(Math.max(a, Math.round(to) || a), f.pages);
        if (b - a + 1 > MAX_PAGES) b = a + MAX_PAGES - 1;
        return { ...f, from: a, to: b };
      }),
    );
  };

  const ready = files.filter((f) => f.pages > 0 && !f.error);
  const pageCount = ready.reduce((a, f) => a + f.to - f.from + 1, 0);
  const requests = ready.reduce((a, f) => a + aiRequests(f), 0);

  const reset = () => {
    abortRef.current?.abort();
    for (const d of docs.current.values()) void d.close();
    docs.current.clear();
    filesRef.current = [];
    setFiles([]);
    setReading(null);
    setReview(null);
    setDone(null);
    setShown({});
    clearPdfDraft();
    setStage('pick');
    stageRef.current = 'pick';
    const next = queued.current;
    queued.current = [];
    if (next.length) addFiles(next);
  };

  /** Duplicates across all topics and against her words; scanned text fixed against words she has. */
  const enterReview = async (found: Found[], grammar: Map<string, Set<string>>, fromAi: boolean, notes: string[]) => {
    const all = found.flatMap((t) => t.items);
    const fixed = fromAi ? all : correctAgainstKnown(all, await existingPairs());
    const marked = markDuplicates(fixed, await existingFrench());
    if (!mounted.current) return;
    let at = 0;
    const stamp = Date.now().toString(36);
    const topics: TopicDraft[] = found.map((t, i) => ({
      key: `t${stamp}-${i}`,
      name: t.title,
      nameEn: t.titleEn ?? '',
      emoji: t.emoji,
      color: cycleColor(i, 3),
      from: t.from,
      to: t.to,
      file: t.file,
      rows: t.items.map(() => {
        const { item, duplicate } = marked[at++];
        const emoji = item.emoji ?? (item.kind === 'word' && item.en ? bestEmoji(index, item.en) : undefined);
        return { ...item, emoji, key: `p${++rowSeq}`, include: !duplicate, duplicate };
      }),
    }));
    const picks = [...grammar.entries()]
      .filter(([id]) => LESSON_BY_ID.has(id))
      .sort((a, b) => LESSON_BY_ID.get(a[0])!.order - LESSON_BY_ID.get(b[0])!.order)
      .map(([id, set]) => ({ id, on: true, files: [...set] }));
    if (!topics.length && !picks.length) {
      setReading((r) => r && { ...r, error: 'Nothing to learn was found in these pages. Try other pages, or a clearer scan.' });
      return;
    }
    const items = topics.reduce((a, t) => a + t.rows.length, 0);
    setReview({ topics, grammar: picks, fromAi, notes });
    setOpen(new Set(items <= 60 ? topics.map((t) => t.key) : topics.slice(0, 1).map((t) => t.key)));
    setShown({});
    setStage('review');
    sfx.match();
    toast({ title: `${plural(topics.length, 'thème')} · ${plural(items, 'élément')}`, body: 'Everything is ticked, except words you already have.', emoji: '📚' });
  };

  const addGrammar = (map: Map<string, Set<string>>, ids: string[], file: string) => {
    for (const id of ids) {
      if (!map.has(id)) map.set(id, new Set());
      map.get(id)!.add(file);
    }
  };

  /** Reads every page on the device: the text layer, or OCR for scanned pages. */
  const runLocal = async () => {
    if (!ready.length) return;
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setStage('read');
    const found: Found[] = [];
    const grammar = new Map<string, Set<string>>();
    const notes: string[] = [];
    for (let i = 0; i < ready.length; i++) {
      const f = ready[i];
      const doc = docs.current.get(f.id);
      if (!doc) continue;
      setReading({ file: f.file.name, fileIndex: i, files: ready.length, phase: 'text', page: f.from, done: 0, total: f.to - f.from + 1, scanned: 0 });
      try {
        const res = await readPdfPages(doc, f.from, f.to, { signal: ctrl.signal, onProgress: (p) => setReading((r) => r && { ...r, ...p }) });
        if (res.ocrError) notes.push(`${f.file.name}: ${plural(res.scanned.length, 'scanned page')} couldn’t be read (${res.ocrError}).`);
        const { topics, grammar: g } = readTopics(res.pages, f.file.name);
        found.push(...topics.map((t) => ({ ...t, file: f.file.name })));
        addGrammar(grammar, g, f.file.name);
        if (res.cancelled) {
          if (res.pages.length) notes.push(`Stopped after ${plural(res.pages.length, 'page')} of ${f.file.name}.`);
          break;
        }
      } catch (e) {
        setReading((r) => r && { ...r, error: (e as Error).message || 'This PDF couldn’t be read.' });
        return;
      }
    }
    if (ctrl.signal.aborted && !found.length) {
      setStage('prepare');
      setReading(null);
      return;
    }
    await enterReview(found, grammar, false, notes);
  };

  /** Lets Claude read the pages (the PDF itself when it's small, else page ranges). */
  const runAi = async () => {
    if (!ready.length) return;
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setStage('read');
    const found: Found[] = [];
    const grammar = new Map<string, Set<string>>();
    for (let i = 0; i < ready.length; i++) {
      const f = ready[i];
      const doc = docs.current.get(f.id);
      if (!doc) continue;
      setReading({ file: f.file.name, fileIndex: i, files: ready.length, phase: 'text', page: f.from, done: 0, total: f.to - f.from + 1, scanned: 0 });
      try {
        // the text layer first: Claude gets it instead of page images where there is one
        const res = await readPdfPages(doc, f.from, f.to, { signal: ctrl.signal, ocr: false, onProgress: (p) => setReading((r) => r && { ...r, ...p }) });
        if (res.cancelled) break;
        addGrammar(grammar, readTopics(res.pages, f.file.name).grammar, f.file.name);
        const out = await aiExtractFromPdf(
          {
            name: f.file.name,
            file: f.file,
            pageCount: f.pages,
            from: f.from,
            to: f.to,
            texts: pageTexts(res.pages),
            renderPage: (p) => doc.render(p, { longEdge: 1568, type: 'image/jpeg', quality: 0.85 }),
          },
          { signal: ctrl.signal, onProgress: (d, total, part) => setReading((r) => r && { ...r, phase: 'ai', part: { done: d, total, from: part.from, to: part.to } }) },
        );
        for (const t of out.topics) {
          found.push({
            title: t.title,
            titleEn: t.titleEn,
            emoji: t.emoji ?? topicEmoji(t.title),
            from: f.from,
            to: f.to,
            file: f.file.name,
            items: t.items.map((it) => ({ ...it, group: it.kind === 'sentence' ? 'sentences' : 'vocab' })),
          });
        }
        addGrammar(grammar, out.grammar, f.file.name);
      } catch (e) {
        if ((e as Error).name === 'AbortError') break;
        setReading((r) => r && { ...r, error: (e as Error).message });
        return;
      }
    }
    if (ctrl.signal.aborted && !found.length) {
      setStage('prepare');
      setReading(null);
      return;
    }
    await enterReview(found, grammar, true, []);
  };

  const stop = () => {
    sfx.tap();
    setReading((r) => r && { ...r, stopping: true });
    abortRef.current?.abort();
  };

  // ---------------------------------------------------------------- review

  const rows = useMemo(() => review?.topics.flatMap((t) => t.rows) ?? [], [review]);
  const dupes = useMemo(() => new Map(markDuplicates(rows, existing.keys()).map(({ item, duplicate }) => [item.key, duplicate])), [rows, existing]);
  const included = rows.filter((r) => r.include);
  const missing = included.filter((r) => !r.fr.trim() || !r.en.trim());
  const lessonsOn = review?.grammar.filter((g) => g.on) ?? [];
  const multiFile = new Set(review?.topics.map((t) => t.file)).size > 1;
  const decksToMake = review?.topics.filter((t) => t.rows.some((r) => r.include && r.fr.trim() && r.en.trim())).length ?? 0;

  const updateTopics = useCallback((fn: (t: TopicDraft) => TopicDraft) => setReview((rv) => rv && { ...rv, topics: rv.topics.map(fn) }), []);

  const patchRow = useCallback(
    (key: string, patch: Partial<ReviewRow>) => updateTopics((t) => (t.rows.some((r) => r.key === key) ? { ...t, rows: t.rows.map((r) => (r.key === key ? { ...r, ...patch } : r)) } : t)),
    [updateTopics],
  );

  const pickEmojiFor = useCallback((key: string) => {
    const topic = reviewRef.current?.topics.find((t) => t.rows.some((r) => r.key === key));
    if (topic) setPickerFor({ topic: topic.key, row: key });
  }, []);

  const setAll = (include: boolean, topicKey?: string) => {
    sfx.softPop();
    updateTopics((t) => (topicKey && t.key !== topicKey ? t : { ...t, rows: t.rows.map((r) => ({ ...r, include })) }));
  };

  const translateMissing = async () => {
    if (!review || translating) return;
    const targets = rows.filter((r) => r.include && !!r.fr.trim() !== !!r.en.trim());
    if (!targets.length) return;
    setTranslating({ done: 0, total: targets.length });
    let failed = 0;
    let error: string | undefined;
    try {
      for (let k = 0; k < targets.length; k += 40) {
        const batch = targets.slice(k, k + 40);
        const res = await fillMissing(
          batch.map((r) => ({ fr: r.fr, en: r.en })),
          (d) => setTranslating({ done: k + d, total: targets.length }),
        );
        const byKey = new Map(batch.map((r, i) => [r.key, res.pairs[i]]));
        updateTopics((t) => ({
          ...t,
          rows: t.rows.map((r) => {
            const p = byKey.get(r.key);
            return p ? { ...r, fr: p.fr, en: p.en, emoji: r.emoji ?? (r.kind === 'word' && p.en ? bestEmoji(index, p.en) : undefined) } : r;
          }),
        }));
        failed += res.failed;
        error = res.error ?? error;
        // a quota or connection problem won't fix itself for the next batch
        if (res.error && /limit|online|connection/i.test(res.error)) {
          failed += targets.length - k - batch.length;
          break;
        }
      }
      sfx.softPop();
      if (failed) toast({ title: `${failed} sans traduction`, body: error ?? 'Type those in, or leave them out.', emoji: '🤷', tone: 'error' }, 4500);
    } catch (e) {
      toast({ title: 'Traduction impossible', body: (e as Error).message, emoji: '😕', tone: 'error' }, 4500);
    } finally {
      setTranslating(null);
    }
  };

  const dropUntranslated = () => {
    sfx.tap();
    const keys = new Set(missing.map((r) => r.key));
    updateTopics((t) => ({ ...t, rows: t.rows.map((r) => (keys.has(r.key) ? { ...r, include: false } : r)) }));
  };

  const save = async () => {
    if (!review || saving || missing.length || (!included.length && !lessonsOn.length)) return;
    setSaving(true);
    try {
      const made: { deck: Deck; ids: string[] }[] = [];
      for (const t of review.topics) {
        const picked = t.rows.filter((r) => r.include && r.fr.trim() && r.en.trim());
        if (!picked.length) continue;
        const name = t.name.trim() || 'Mon livre';
        const deck = await createDeck({ name, nameEn: t.nameEn.trim() || name, emoji: t.emoji, color: t.color });
        const cards = await addCards(
          picked.map((r) => ({ fr: r.fr, en: r.en, kind: r.kind, gender: r.gender, plural: r.plural, emoji: r.emoji, note: r.note })),
          { deckId: deck.id, source: review.fromAi ? 'ai' : 'text', celebrate: false },
        );
        made.push({ deck, ids: cards.map((c) => c.id) });
      }
      for (const file of new Set(lessonsOn.flatMap((g) => g.files))) {
        await addBookGrammar(
          lessonsOn.filter((g) => g.files.includes(file)).map((g) => g.id),
          file,
        );
      }
      void celebrateUnlocks();
      clearPdfDraft();
      setDone({ decks: made.map((m) => m.deck), ids: made.flatMap((m) => m.ids), lessons: lessonsOn.map((g) => g.id) });
      setStage('done');
    } catch (e) {
      toast({ title: 'Oups', body: (e as Error).message, emoji: '😕', tone: 'error' }, 5000);
    } finally {
      setSaving(false);
    }
  };

  const pickerTopic = review?.topics.find((t) => t.key === pickerFor?.topic);
  const pickerRow = pickerFor?.row ? pickerTopic?.rows.find((r) => r.key === pickerFor.row) : undefined;

  // ---------------------------------------------------------------- screens

  const sub: Record<Stage, string> = {
    pick: 'Add a PDF · Textbook chapters, workbooks, handouts — scanned ones too.',
    prepare: files.length > 1 ? `${files.length} PDF ready. Pick the pages, then let Bonbon read them.` : 'Pick the pages, then let Bonbon read them.',
    read: 'Reading your book…',
    review: 'One theme per topic. Rename them, untick what you don’t want.',
    done: '',
  };

  return (
    <Page narrow className="add-pdf">
      <AddHeader
        title="Ajouter un PDF"
        emoji="📚"
        sub={sub[stage]}
        right={
          stage === 'prepare' || stage === 'review' ? (
            <button className="btn btn--sm btn--ghost" onClick={() => (stage === 'review' && ready.length ? setStage('prepare') : reset())}>
              ← Retour
            </button>
          ) : undefined
        }
      />
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        multiple
        hidden
        onChange={(e) => {
          addFiles([...(e.target.files ?? [])]);
          e.target.value = '';
        }}
        data-testid="pdf-input"
      />

      <AnimatePresence mode="wait">
        {stage === 'pick' && (
          <motion.div key="pick" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
            <div
              className={'drop-zone pdf-drop' + (dragging ? ' is-drag' : '')}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                addFiles([...e.dataTransfer.files]);
              }}
              data-testid="pdf-drop"
            >
              <motion.div animate={dragging ? { scale: 1.15, rotate: -6 } : { y: [0, -8, 0], rotate: [0, -3, 3, 0] }} transition={dragging ? { type: 'spring', stiffness: 400, damping: 14 } : { duration: 2.6, repeat: Infinity }}>
                <Emoji e="📚" size={76} />
              </motion.div>
              <div className="pdf-drop-text">
                <strong>{dragging ? 'Lâche-le !' : 'Dépose tes PDF ici'}</strong>
                <span>Drop your PDF files here</span>
              </div>
              <motion.button className="btn btn--lg pdf-pick" onClick={() => inputRef.current?.click()} whileTap={{ scale: 0.95 }} data-testid="pdf-pick">
                <Emoji e="📂" size={26} /> Choisir des PDF
              </motion.button>
              <p className="muted drop-hint">On a computer you can drop PDFs anywhere in Bonbon.</p>
            </div>
            <div className="photo-ideas">
              {[
                ['🗂️', 'Each unit becomes a theme', '“Unité 3 · Au restaurant” with its vocabulary, its example sentences and the words of its texts — all ticked.'],
                ['🔎', 'Scanned pages too', 'Pages without text are read on your device (works offline once set up).'],
                ['📗', 'Its grammar, marked', 'Lessons your book teaches get a “Dans ton livre” badge in Grammaire.'],
              ].map(([e, title, text], i) => (
                <motion.div key={title} className="idea" initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.08 + i * 0.06 }}>
                  <Emoji e={e} size={30} />
                  <span>
                    <strong>{title}</strong> — {text}
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {stage === 'prepare' && (
          <motion.div key="prepare" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
            <div className="pdf-files">
              <AnimatePresence initial={false}>
                {files.map((f, i) => {
                  const chaps = chapters(f);
                  return (
                    <motion.div
                      key={f.id}
                      className="pdf-file panel"
                      layout
                      initial={{ opacity: 0, y: 16, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, x: -40, height: 0, padding: 0, margin: 0 }}
                      transition={{ type: 'spring', stiffness: 380, damping: 28, delay: i * 0.04 }}
                      data-testid="pdf-file"
                    >
                      <div className="pdf-file-head">
                        <motion.span className="pdf-file-icon" animate={f.opening ? { rotate: [0, -8, 8, 0] } : { rotate: 0 }} transition={{ duration: 0.8, repeat: f.opening ? Infinity : 0 }}>
                          <Emoji e={f.error ? '😕' : '📕'} size={34} />
                        </motion.span>
                        <span className="pdf-file-text">
                          <strong>{f.file.name}</strong>
                          <small>{f.error ? f.error : f.opening ? 'Ouverture…' : `${plural(f.pages, 'page')} · ${sizeLabel(f.file.size)}`}</small>
                        </span>
                        <button className="icon-btn pdf-file-remove" onClick={() => removeFile(f.id)} aria-label={`Remove ${f.file.name}`}>
                          ✕
                        </button>
                      </div>
                      {f.pages > RANGE_FROM && (
                        <div className="pdf-range">
                          <span className="field-label">Pages à lire · Pages to read</span>
                          <div className="pdf-range-inputs">
                            <input className="input" type="number" inputMode="numeric" min={1} max={f.pages} value={f.from} onChange={(e) => setRange(f.id, Number(e.target.value), f.to)} aria-label="First page" />
                            <span>→</span>
                            <input className="input" type="number" inputMode="numeric" min={1} max={f.pages} value={f.to} onChange={(e) => setRange(f.id, f.from, Number(e.target.value))} aria-label="Last page" />
                            <span className="muted">{plural(f.to - f.from + 1, 'page')}</span>
                          </div>
                          <div className="hscroll pdf-range-chips">
                            <button className="chip" aria-pressed={f.from === 1 && f.to === Math.min(f.pages, MAX_PAGES)} onClick={() => setRange(f.id, 1, f.pages)}>
                              Tout
                            </button>
                            {chaps.map((c) => (
                              <button key={c.title + c.from} className="chip" aria-pressed={f.from === c.from && f.to === c.to} onClick={() => setRange(f.id, c.from, c.to)} title={c.title}>
                                {c.title.length > 26 ? c.title.slice(0, 25) + '…' : c.title} <small>p. {c.from}–{c.to}</small>
                              </button>
                            ))}
                          </div>
                          {f.pages > MAX_PAGES && <p className="muted pdf-range-note">Up to {MAX_PAGES} pages at a time.</p>}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
            <div className="row row--wrap page-add">
              <button className="chip" onClick={() => inputRef.current?.click()} disabled={files.length >= MAX_FILES}>
                <Emoji e="📂" size={18} /> + Un autre PDF
              </button>
              {review && (
                <button className="chip chip--on" onClick={() => setStage('review')}>
                  ↩ Revenir aux résultats
                </button>
              )}
            </div>
            <div className="photo-actions">
              <motion.button
                className="photo-action"
                onClick={runLocal}
                disabled={!ready.length}
                whileTap={{ scale: 0.97 }}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                data-testid="pdf-read"
              >
                <Emoji e="📖" size={40} />
                <span>
                  <strong>Lire le PDF{pageCount ? ` · ${plural(pageCount, 'page')}` : ''}</strong>
                  <small>Words, sentences and grammar, sorted by unit. Scanned pages are read on your device.</small>
                </span>
              </motion.button>
              {magic && (
                <motion.button
                  className="photo-action photo-action--magic"
                  onClick={runAi}
                  disabled={!ready.length}
                  whileTap={{ scale: 0.97 }}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.06 }}
                  data-testid="pdf-ai"
                >
                  <Emoji e="✨" size={40} />
                  <span>
                    <strong>Demander à Claude{requests > 1 ? ` · ${requests} envois` : ''}</strong>
                    <small>Claude reads the pages, keeps the printed meanings and finds the grammar.</small>
                  </span>
                </motion.button>
              )}
            </div>
          </motion.div>
        )}

        {stage === 'read' && reading && (
          <motion.div key="read" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {!reading.error ? (
              <div className="busy-card panel pdf-busy" data-testid="pdf-progress">
                <Mascot mood="thinking" size={104} color={mascotColor} />
                <span className="pdf-busy-file">
                  <Emoji e="📕" size={20} /> {reading.file}
                  {reading.files > 1 && <small> · {reading.fileIndex + 1}/{reading.files}</small>}
                </span>
                {reading.phase === 'ai' && reading.part ? (
                  <>
                    <strong>{reading.part.total > 1 ? `Claude lit les pages ${reading.part.from}–${reading.part.to}` : 'Claude lit ton PDF…'}</strong>
                    <span className="muted">{reading.part.total > 1 ? `Envoi ${reading.part.done + 1} / ${reading.part.total} · A big chapter takes a little while.` : 'A whole chapter takes a little while.'}</span>
                    <div className="progress-track">
                      <motion.span animate={{ width: `${Math.round(((reading.part.done + 0.5) / reading.part.total) * 100)}%` }} transition={{ type: 'spring', stiffness: 60, damping: 20 }} />
                    </div>
                  </>
                ) : reading.phase === 'ocr' ? (
                  <>
                    <strong>
                      Page {reading.page} · scan {Math.min(reading.done + 1, reading.total)}/{reading.total}
                    </strong>
                    <span className="muted">{reading.ocr?.status ?? 'Réveil du scanner…'} · Pages without text are read like a photo.</span>
                    <div className="progress-track">
                      <motion.span animate={{ width: `${Math.round((reading.ocr?.progress ?? 0) * 100)}%` }} transition={{ type: 'spring', stiffness: 80, damping: 20 }} />
                    </div>
                    <span className="muted">The first scan downloads the French reader (once).</span>
                  </>
                ) : (
                  <>
                    <strong>
                      Page {Math.min(reading.done + 1, reading.total)} / {reading.total}
                    </strong>
                    <span className="muted">
                      {reading.page !== reading.done + 1 && `p. ${reading.page} · `}Lecture des pages · Reading the text{reading.scanned ? ` · ${plural(reading.scanned, 'page')} to scan` : ''}
                    </span>
                    <div className="progress-track">
                      <motion.span animate={{ width: `${Math.round(((reading.done + 1) / reading.total) * 100)}%` }} transition={{ type: 'spring', stiffness: 120, damping: 22 }} />
                    </div>
                  </>
                )}
                <button className="btn btn--ghost btn--sm" onClick={stop} disabled={reading.stopping} data-testid="pdf-stop">
                  {reading.stopping ? 'Arrêt…' : 'Arrêter · Stop'}
                </button>
              </div>
            ) : (
              <div className="busy-card panel">
                <Mascot mood="sad" size={100} color={mascotColor} />
                <strong>Oups !</strong>
                <span className="muted">{reading.error}</span>
                <div className="row" style={{ gap: 10 }}>
                  <button
                    className="btn btn--ghost"
                    onClick={() => {
                      setReading(null);
                      setStage('prepare');
                    }}
                  >
                    Retour
                  </button>
                  {reading.phase === 'ai' && (
                    <button className="btn" onClick={runLocal}>
                      Lire sans l’IA
                    </button>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {stage === 'review' && review && (
          <motion.div key="review" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="review pdf-review">
            {review.fromAi && (
              <div className="ai-note">
                <Emoji e="✨" size={18} /> Read by Claude — double-check anything that looks off.
              </div>
            )}
            {review.notes.map((n) => (
              <div key={n} className="pdf-note">
                <Emoji e="ℹ️" size={18} /> {n}
              </div>
            ))}
            <div className="review-bar pdf-review-bar">
              <span className="review-count">
                <strong>{included.length}</strong> / {rows.length} sélectionnés
              </span>
              <div className="row" style={{ gap: 6 }}>
                <button className="btn btn--sm btn--ghost" onClick={() => setAll(true)} data-testid="pdf-all">
                  Tout sélectionner
                </button>
                <button className="btn btn--sm btn--ghost" onClick={() => setAll(false)}>
                  Tout effacer
                </button>
              </div>
            </div>

            {review.grammar.length > 0 && (
              <motion.section className="pdf-grammar panel" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} data-testid="pdf-grammar">
                <h3>
                  <Emoji e="📗" size={22} /> Grammaire dans ton livre <small>Grammar it teaches</small>
                </h3>
                <div className="pdf-grammar-list">
                  {review.grammar.map((g) => {
                    const l = LESSON_BY_ID.get(g.id)!.lesson;
                    return (
                      <span key={g.id} className={'pdf-lesson' + (g.on ? ' is-on' : '')}>
                        <button
                          className="pdf-lesson-toggle"
                          aria-pressed={g.on}
                          onClick={() => {
                            sfx.tap();
                            setReview((rv) => rv && { ...rv, grammar: rv.grammar.map((x) => (x.id === g.id ? { ...x, on: !x.on } : x)) });
                          }}
                        >
                          {g.on ? '✓' : '+'} {l.title}
                        </button>
                        <button className="pdf-lesson-go" onClick={() => navigate(`/grammaire/lecon/${g.id}`)} aria-label={`Open the lesson ${l.title}`} title="Voir la leçon">
                          →
                        </button>
                      </span>
                    );
                  })}
                </div>
                <small className="muted">These lessons get a “📗 Dans ton livre” badge and come up more in your practice.</small>
              </motion.section>
            )}

            {missing.length > 0 && (
              <motion.div className="review-translate" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}>
                <span>
                  <Emoji e="🌍" size={22} /> {missing.length} sans traduction
                </span>
                <div className="row" style={{ gap: 6 }}>
                  <button className="btn btn--sm btn--ghost" onClick={dropUntranslated} disabled={!!translating}>
                    Les retirer
                  </button>
                  <button className="btn btn--sm btn--sky" onClick={translateMissing} disabled={!!translating} data-testid="pdf-translate">
                    {translating ? `${translating.done}/${translating.total}…` : '✨ Traduire tout'}
                  </button>
                </div>
                {translating && (
                  <span className="review-progress">
                    <motion.span animate={{ width: `${(translating.done / Math.max(1, translating.total)) * 100}%` }} />
                  </span>
                )}
              </motion.div>
            )}

            <div className="pdf-topics">
              {review.topics.map((t, ti) => {
                const isOpen = open.has(t.key);
                const on = t.rows.filter((r) => r.include).length;
                const limit = shown[t.key] ?? ROWS_STEP;
                return (
                  <motion.section
                    key={t.key}
                    className={'pdf-topic panel' + (on ? '' : ' is-off')}
                    style={{ '--topic': paletteColor(t.color) } as CSSProperties}
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(ti, 8) * 0.05, type: 'spring', stiffness: 300, damping: 26 }}
                    data-testid="pdf-topic"
                  >
                    <header className="pdf-topic-head">
                      <button className="pdf-topic-emoji" style={{ background: paletteColor(t.color), color: inkOn(t.color) }} onClick={() => setPickerFor({ topic: t.key })} aria-label="Theme picture">
                        <Emoji e={t.emoji} size={30} />
                      </button>
                      <div className="pdf-topic-title">
                        <input
                          className="pdf-topic-name"
                          value={t.name}
                          onChange={(e) => updateTopics((x) => (x.key === t.key ? { ...x, name: e.target.value } : x))}
                          aria-label="Theme name"
                          lang="fr"
                          data-testid="topic-name"
                        />
                        <small>
                          {on}/{plural(t.rows.length, 'élément')} · p. {t.from === t.to ? t.from : `${t.from}–${t.to}`}
                          {multiFile && ` · ${t.file}`}
                        </small>
                      </div>
                      <button
                        className={'pdf-topic-toggle' + (isOpen ? ' is-open' : '')}
                        onClick={() => {
                          sfx.tap();
                          setOpen((s) => {
                            const n = new Set(s);
                            if (n.has(t.key)) n.delete(t.key);
                            else n.add(t.key);
                            return n;
                          });
                        }}
                        aria-expanded={isOpen}
                        aria-label={isOpen ? 'Hide the words' : 'Show the words'}
                      >
                        ▾
                      </button>
                    </header>
                    <div className="pdf-topic-tools">
                      {GROUPS.map((g) => {
                        const n = t.rows.filter((r) => r.group === g.id).length;
                        return n ? (
                          <span key={g.id} className="pdf-topic-group">
                            <Emoji e={g.emoji} size={16} /> {n} {g.label}
                          </span>
                        ) : null;
                      })}
                      <span className="pdf-topic-actions">
                        <button className="btn btn--sm btn--ghost" onClick={() => setAll(true, t.key)}>
                          Tout sélectionner
                        </button>
                        <button className="btn btn--sm btn--ghost" onClick={() => setAll(false, t.key)}>
                          Tout effacer
                        </button>
                      </span>
                    </div>
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div className="pdf-topic-body" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }}>
                          <ul className="review-list">
                            {t.rows.slice(0, limit).map((r, i) => (
                              <ReviewItem
                                key={r.key}
                                row={r}
                                index={i}
                                big={t.rows.length > 40}
                                duplicate={dupes.get(r.key)}
                                duplicateDeck={existing.get(normalizeAnswer(r.fr))?.deck}
                                onPatch={patchRow}
                                onPickEmoji={pickEmojiFor}
                              />
                            ))}
                          </ul>
                          {t.rows.length > limit && (
                            <button className="btn btn--sm btn--ghost pdf-more" onClick={() => setShown((s) => ({ ...s, [t.key]: limit + ROWS_STEP * 2 }))}>
                              Voir {Math.min(ROWS_STEP * 2, t.rows.length - limit)} de plus · {t.rows.length - limit} hidden
                            </button>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.section>
                );
              })}
            </div>

            <div className="review-submit">
              {missing.length > 0 && missing.some((r) => r.fr.trim()) ? (
                <button className="btn btn--lg btn--sky btn--block" onClick={translateMissing} disabled={!!translating}>
                  {translating ? `Traduction… ${translating.done}/${translating.total}` : `✨ Traduire les ${missing.length} manquante${missing.length > 1 ? 's' : ''}`}
                </button>
              ) : (
                <button className="btn btn--lg btn--ok btn--block" onClick={save} disabled={(!included.length && !lessonsOn.length) || missing.length > 0 || saving} data-testid="pdf-submit">
                  {saving
                    ? '…'
                    : included.length
                      ? `Ajouter ${plural(included.length, 'carte')} · ${plural(decksToMake, 'thème')}`
                      : lessonsOn.length
                        ? 'Garder la grammaire du livre'
                        : 'Rien de nouveau à ajouter'}
                </button>
              )}
            </div>

            <EmojiPickerSheet
              open={!!pickerFor}
              onClose={() => setPickerFor(null)}
              onPick={(e) => {
                if (!pickerFor) return;
                if (pickerFor.row) patchRow(pickerFor.row, { emoji: e });
                else if (e) updateTopics((x) => (x.key === pickerFor.topic ? { ...x, emoji: e } : x));
              }}
              initialQuery={pickerRow ? pickerRow.en : (pickerTopic?.nameEn ?? '')}
              current={pickerRow ? pickerRow.emoji : pickerTopic?.emoji}
            />
          </motion.div>
        )}

        {stage === 'done' && done && (
          <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <AddDone
              count={done.ids.length}
              cardIds={done.ids}
              deckId={done.decks[0]?.id}
              onMore={reset}
              moreLabel="Un autre PDF"
              playUrl={`/play/mix?decks=${done.decks.map((d) => d.id).join(',')}`}
              title={done.ids.length ? `${plural(done.ids.length, 'carte')} · ${plural(done.decks.length, 'thème')} !` : 'Grammaire enregistrée !'}
            >
              {done.decks.length > 0 && (
                <div className="pdf-done-decks">
                  {done.decks.map((d, i) => (
                    <motion.span
                      key={d.id}
                      className="pdf-done-deck"
                      style={{ background: paletteColor(d.color), color: inkOn(d.color) }}
                      initial={{ scale: 0, rotate: -8 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: 'spring', stiffness: 420, damping: 16, delay: 0.25 + i * 0.07 }}
                    >
                      <Emoji e={d.emoji} size={20} /> {d.name}
                    </motion.span>
                  ))}
                </div>
              )}
              {done.lessons.length > 0 && (
                <button className="pdf-done-lesson" onClick={() => navigate(`/grammaire/lecon/${done.lessons[0]}`)} data-testid="done-lesson">
                  <Emoji e="📗" size={28} />
                  <span>
                    <small>Grammaire de ton livre · {plural(done.lessons.length, 'leçon')}</small>
                    <strong>{LESSON_BY_ID.get(done.lessons[0])?.lesson.title}</strong>
                  </span>
                  <span aria-hidden>→</span>
                </button>
              )}
            </AddDone>
          </motion.div>
        )}
      </AnimatePresence>
    </Page>
  );
}
