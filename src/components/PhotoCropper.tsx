import { motion } from 'framer-motion';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { fileToImage, renderImage } from '../lib/images';
import { sfx } from '../lib/sound';
import './PhotoCropper.css';

interface Props {
  file: Blob;
  onCancel: () => void;
  onDone: (blob: Blob) => void;
  doneLabel?: string;
}

interface View {
  z: number;
  x: number;
  y: number;
}

const MAX_ZOOM = 4;

/** Square crop with drag to move and pinch / wheel / slider to zoom. */
export function PhotoCropper({ file, onCancel, onDone, doneLabel = 'Valider' }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [url, setUrl] = useState<string>('');
  const [size, setSize] = useState(300);
  const [view, setView] = useState<View>({ z: 1, x: 0, y: 0 });
  const [busy, setBusy] = useState(false);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; z: number } | null>(null);
  const viewRef = useRef(view);
  viewRef.current = view;

  useEffect(() => {
    const u = URL.createObjectURL(file);
    setUrl(u);
    let alive = true;
    fileToImage(file).then((i) => alive && setImg(i));
    return () => {
      alive = false;
      URL.revokeObjectURL(u);
    };
  }, [file]);

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => setSize(Math.max(200, Math.min(el.clientWidth, 380)));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const cover = img ? Math.max(size / img.naturalWidth, size / img.naturalHeight) : 1;

  const clamp = useCallback(
    (v: View): View => {
      if (!img) return v;
      const z = Math.min(MAX_ZOOM, Math.max(1, v.z));
      const w = img.naturalWidth * cover * z;
      const h = img.naturalHeight * cover * z;
      return { z, x: Math.min(0, Math.max(size - w, v.x)), y: Math.min(0, Math.max(size - h, v.y)) };
    },
    [img, cover, size],
  );

  // Centre the photo whenever it (or the viewport) changes.
  useEffect(() => {
    if (!img) return;
    const w = img.naturalWidth * cover;
    const h = img.naturalHeight * cover;
    setView({ z: 1, x: (size - w) / 2, y: (size - h) / 2 });
  }, [img, cover, size]);

  const zoomAt = useCallback(
    (nextZ: number, cx: number, cy: number) => {
      const v = viewRef.current;
      const z = Math.min(MAX_ZOOM, Math.max(1, nextZ));
      const px = (cx - v.x) / (cover * v.z);
      const py = (cy - v.y) / (cover * v.z);
      setView(clamp({ z, x: cx - px * cover * z, y: cy - py * cover * z }));
    },
    [cover, clamp],
  );

  const local = (e: { clientX: number; clientY: number }) => {
    const r = wrapRef.current!.querySelector('.crop-view')!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), z: viewRef.current.z };
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const mid = local({ clientX: (a.x + b.x) / 2, clientY: (a.y + b.y) / 2 });
      zoomAt(pinch.current.z * (dist / pinch.current.dist), mid.x, mid.y);
    } else if (pointers.current.size === 1) {
      const v = viewRef.current;
      setView(clamp({ ...v, x: v.x + e.clientX - prev.x, y: v.y + e.clientY - prev.y }));
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
  };

  const onWheel = (e: React.WheelEvent) => {
    const p = local(e);
    zoomAt(viewRef.current.z * Math.exp(-e.deltaY * 0.0015), p.x, p.y);
  };

  const done = async () => {
    if (!img || busy) return;
    setBusy(true);
    const scale = cover * view.z;
    const crop = { x: -view.x / scale, y: -view.y / scale, w: size / scale, h: size / scale };
    try {
      const blob = await renderImage(img, crop, 720, 0.86);
      sfx.pop();
      onDone(blob);
    } finally {
      setBusy(false);
    }
  };

  const w = img ? img.naturalWidth * cover * view.z : size;
  const h = img ? img.naturalHeight * cover * view.z : size;

  return (
    <div className="cropper" ref={wrapRef}>
      <p className="muted center cropper-hint">Glisse pour cadrer, pince pour zoomer · Drag to frame, pinch to zoom</p>
      <motion.div
        className="crop-view"
        style={{ width: size, height: size }}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
      >
        {url && (
          <img
            src={url}
            alt="Photo to crop"
            draggable={false}
            style={{ width: w, height: h, transform: `translate(${view.x}px, ${view.y}px)` }}
          />
        )}
        <div className="crop-grid" aria-hidden />
      </motion.div>
      <label className="crop-zoom">
        <span aria-hidden>🔍</span>
        <input
          type="range"
          min={1}
          max={MAX_ZOOM}
          step={0.01}
          value={view.z}
          onChange={(e) => zoomAt(Number(e.target.value), size / 2, size / 2)}
          aria-label="Zoom"
        />
      </label>
      <div className="row" style={{ gap: 10, width: '100%' }}>
        <button type="button" className="btn btn--ghost grow" onClick={onCancel}>
          Annuler
        </button>
        <button type="button" className="btn btn--ok grow" onClick={done} disabled={!img || busy}>
          {busy ? '…' : doneLabel}
        </button>
      </div>
    </div>
  );
}
