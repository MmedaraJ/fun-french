import type { Card } from '../types';
import { useImageUrl } from '../lib/images';
import { Emoji } from './Emoji';

interface Props {
  card: Pick<Card, 'emoji' | 'imageId' | 'en' | 'fr'>;
  size?: number | string;
  className?: string;
  /** What to show when the card has no picture: its English meaning, or nothing. */
  fallback?: 'en' | 'none';
  rounded?: number;
}

export function hasPicture(card: Pick<Card, 'emoji' | 'imageId'>): boolean {
  return !!(card.imageId || card.emoji);
}

/** Picture for a card: the learner's photo, else its emoji, else a word bubble. */
export function CardImage({ card, size = 96, className, fallback = 'en', rounded = 18 }: Props) {
  const url = useImageUrl(card.imageId);
  const dim = typeof size === 'number' ? `${size}px` : size;
  if (card.imageId) {
    return url ? (
      <img
        src={url}
        alt=""
        draggable={false}
        className={className}
        style={{ width: dim, height: dim, objectFit: 'cover', borderRadius: rounded, pointerEvents: 'none' }}
      />
    ) : (
      <div className={className} style={{ width: dim, height: dim, borderRadius: rounded, background: 'rgba(0,0,0,0.06)' }} />
    );
  }
  if (card.emoji) return <Emoji e={card.emoji} size={size} className={className} />;
  if (fallback === 'none') return null;
  return (
    <div
      className={className}
      style={{
        width: dim,
        minHeight: `calc(${dim} * 0.6)`,
        display: 'grid',
        placeItems: 'center',
        textAlign: 'center',
        fontFamily: 'var(--font-display)',
        fontWeight: 600,
        fontSize: `calc(${dim} * 0.2)`,
        lineHeight: 1.15,
        padding: '6px',
        overflowWrap: 'anywhere',
      }}
    >
      {card.en}
    </div>
  );
}
