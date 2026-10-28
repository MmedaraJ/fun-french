// On-device French text recognition with tesseract.js. The worker, WASM core
// and French model are self-hosted under /vendor/tesseract (see scripts/prepare-assets.mjs).

export interface OcrProgress {
  /** Overall progress 0..1. */
  progress: number;
  status: string;
}

const STAGES: Record<string, [number, number, string]> = {
  'loading tesseract core': [0, 0.25, 'Réveil du scanner…'],
  'initializing tesseract': [0.25, 0.3, 'Réveil du scanner…'],
  'loading language traineddata': [0.3, 0.45, 'Chargement du français…'],
  'loading language traineddata (from cache)': [0.3, 0.45, 'Chargement du français…'],
  'initializing api': [0.45, 0.5, 'Presque prêt…'],
  'recognizing text': [0.5, 1, 'Lecture du texte…'],
};

/** Absolute URL under the app's base (blob workers can't resolve relative paths). */
function vendorUrl(path: string): string {
  return new URL(`${import.meta.env.BASE_URL}vendor/tesseract/${path}`, window.location.href).href;
}

/** Joins words hyphenated across lines and drops empty/garbage lines. */
export function cleanOcrText(text: string): string {
  return text
    .replace(/\r/g, '')
    .replace(/(\p{L})-\n(\p{Ll})/gu, '$1$2')
    .split('\n')
    .map((l) => l.replace(/[|_~^]+/g, ' ').replace(/\s+/g, ' ').trim())
    .filter((l) => l.length > 1 && /\p{L}{2,}/u.test(l))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Reads French text from an image. */
export async function recognizeFrench(image: Blob, onProgress?: (p: OcrProgress) => void): Promise<string> {
  const { createWorker, OEM } = await import('tesseract.js');
  onProgress?.({ progress: 0.02, status: 'Réveil du scanner…' });
  const worker = await createWorker('fra', OEM.LSTM_ONLY, {
    workerPath: vendorUrl('worker.min.js'),
    corePath: vendorUrl('core'),
    langPath: vendorUrl('lang'),
    logger: (m) => {
      const stage = STAGES[m.status];
      if (!stage || !onProgress) return;
      const [from, to, label] = stage;
      onProgress({ progress: from + (to - from) * (m.progress || 0), status: label });
    },
  });
  try {
    const { data } = await worker.recognize(image);
    onProgress?.({ progress: 1, status: 'Terminé !' });
    return cleanOcrText(data.text ?? '');
  } finally {
    await worker.terminate();
  }
}
