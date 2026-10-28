// Hands PDF files dropped anywhere in the app over to the PDF import screen (files can't travel in
// the URL), and keeps a review in progress while the learner looks at a lesson and comes back.

export const isPdf = (f: File) => f.type === 'application/pdf' || /\.pdf$/i.test(f.name);

let waiting: File[] = [];
let listener: ((files: File[]) => void) | null = null;

/** Gives dropped PDFs to the import screen: right away when it's open, otherwise when it opens. */
export function offerPdfs(files: File[]): void {
  if (!files.length) return;
  if (listener) listener(files);
  else waiting = [...waiting, ...files];
}

/** For the import screen: takes the files waiting and listens for more. Returns the unsubscribe. */
export function listenForPdfs(onFiles: (files: File[]) => void): () => void {
  listener = onFiles;
  if (waiting.length) {
    const files = waiting;
    waiting = [];
    onFiles(files);
  }
  return () => {
    if (listener === onFiles) listener = null;
  };
}

export interface PdfDraftSummary {
  topics: number;
  items: number;
}

let draft: { value: unknown; summary: PdfDraftSummary } | null = null;

export function keepPdfDraft(value: unknown, summary: PdfDraftSummary): void {
  draft = { value, summary };
}

export function pdfDraft<T>(): T | null {
  return (draft?.value as T | undefined) ?? null;
}

export function pdfDraftSummary(): PdfDraftSummary | null {
  return draft?.summary ?? null;
}

export function clearPdfDraft(): void {
  draft = null;
}
