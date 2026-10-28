import { useEffect, useState } from 'react';
import { db } from './db';
import { uid } from './ids';

const urlCache = new Map<string, string>();

export function useImageUrl(imageId?: string): string | undefined {
  const [url, setUrl] = useState<string | undefined>(() => (imageId ? urlCache.get(imageId) : undefined));
  useEffect(() => {
    let alive = true;
    if (!imageId) {
      setUrl(undefined);
      return;
    }
    const cached = urlCache.get(imageId);
    if (cached) {
      setUrl(cached);
      return;
    }
    db.images.get(imageId).then((row) => {
      if (!alive || !row) return;
      const u = URL.createObjectURL(row.blob);
      urlCache.set(imageId, u);
      setUrl(u);
    });
    return () => {
      alive = false;
    };
  }, [imageId]);
  return url;
}

export function forgetImageUrl(imageId: string) {
  const u = urlCache.get(imageId);
  if (u) URL.revokeObjectURL(u);
  urlCache.delete(imageId);
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export async function fileToImage(file: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    return await loadImage(url);
  } finally {
    // the decoded image stays usable after revoking
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
}

export interface Crop {
  /** Source rectangle in natural image pixels. */
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Draws (a crop of) an image into a square-ish JPEG no larger than `max` px. */
export async function renderImage(img: HTMLImageElement, crop?: Crop, max = 720, quality = 0.85): Promise<Blob> {
  const c = crop ?? { x: 0, y: 0, w: img.naturalWidth, h: img.naturalHeight };
  const scale = Math.min(1, max / Math.max(c.w, c.h));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(c.w * scale));
  canvas.height = Math.max(1, Math.round(c.h * scale));
  const g = canvas.getContext('2d')!;
  g.imageSmoothingQuality = 'high';
  g.drawImage(img, c.x, c.y, c.w, c.h, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not encode image'))), 'image/jpeg', quality),
  );
}

export async function saveImage(blob: Blob): Promise<string> {
  const id = uid();
  await db.images.put({ id, blob, createdAt: Date.now() });
  return id;
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return res.blob();
}
