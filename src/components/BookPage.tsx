import type { CSSProperties, ReactNode } from 'react';
import { pageImageId } from '../lib/imagier';
import { isDrawnSpot } from '../lib/imagier-layout';
import { useImageUrl } from '../lib/images';
import type { Box, Card } from '../types';
import { CardImage } from './CardImage';
import './BookPage.css';

/** A page of her picture dictionary, in PDF points. */
export const PAGE_W = 739;
export const PAGE_H = 989;

/** CSS position of a box on a page drawn `k` CSS pixels per point. */
export function boxStyle(box: Box, k: number, pad = 0): CSSProperties {
  const [x0, y0, x1, y1] = box;
  return { left: (x0 - pad) * k, top: (y0 - pad) * k, width: (x1 - x0 + 2 * pad) * k, height: (y1 - y0 + 2 * pad) * k };
}

/** The word whose drawing is under a point (in points): the smallest box that holds it, a little generously. */
export function hitTest<T extends { spot?: { b: Box } }>(items: T[], x: number, y: number, slack = 6): T | undefined {
  let best: T | undefined;
  let bestArea = Infinity;
  for (const it of items) {
    if (!it.spot) continue;
    const [x0, y0, x1, y1] = it.spot.b;
    if (x < x0 - slack || x > x1 + slack || y < y0 - slack || y > y1 + slack) continue;
    const area = (x1 - x0) * (y1 - y0);
    if (area < bestArea) {
      best = it;
      bestArea = area;
    }
  }
  return best;
}

/** Height of a page in points: her book's pages are all the same; Bonbon's own grow with their words. */
export function pageHeight(words?: Pick<Card, 'spot'>[]): number {
  const drawn = words?.find((w) => isDrawnSpot(w.spot));
  return drawn?.spot?.h ?? PAGE_H;
}

interface Props {
  page: number;
  /**
   * The words on this page. On Bonbon's own pages (no book on the device) their drawings ARE the
   * page; on her book's pages they're only needed for the page's height.
   */
  words?: Card[];
  /** Width on screen, CSS pixels. */
  width: number;
  /** Only part of the page (a patch of drawings), in points; the whole page otherwise. */
  view?: Box;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLDivElement>, point: { x: number; y: number }) => void;
  /** Things drawn over the page, given its scale (CSS pixels per point). */
  children?: (k: number) => ReactNode;
}

/**
 * A page: her book's, from the copy on her device, or Bonbon's own page of drawings when the book
 * isn't there. Overlays are positioned in page points either way.
 */
export function BookPage({ page, words, width, view, className, onClick, children }: Props) {
  const drawn = !!words?.some((w) => isDrawnSpot(w.spot));
  const url = useImageUrl(drawn ? undefined : pageImageId(page));
  const pageH = pageHeight(words);
  const [vx0, vy0, vx1, vy1] = view ?? [0, 0, PAGE_W, pageH];
  const k = width / (vx1 - vx0);
  return (
    <div className={'book-page' + (drawn ? ' book-page--drawn' : '') + (className ? ' ' + className : '')} style={{ width, height: (vy1 - vy0) * k }} data-page={page}>
      <div
        className="book-page-sheet"
        style={{ width: PAGE_W * k, height: pageH * k, transform: `translate(${-vx0 * k}px, ${-vy0 * k}px)` }}
        onClick={(e) => {
          if (!onClick) return;
          const r = e.currentTarget.getBoundingClientRect();
          onClick(e, { x: (e.clientX - r.left) / k, y: (e.clientY - r.top) / k });
        }}
      >
        {drawn ? (
          // Bonbon's own page: each word's drawing in its place on the grid
          words!.map((w) => {
            const [x0, y0, x1, y1] = w.spot!.b;
            return (
              <span key={w.id} className="book-page-drawing" style={{ left: x0 * k, top: y0 * k, width: (x1 - x0) * k, height: (y1 - y0) * k }}>
                <CardImage card={w} size="100%" rounded={8} />
              </span>
            );
          })
        ) : url ? (
          <img src={url} alt="" draggable={false} className="book-page-img" />
        ) : (
          <div className="book-page-wait" />
        )}
        {children?.(k)}
      </div>
    </div>
  );
}
