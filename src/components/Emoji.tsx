import { useState } from 'react';
import { twemojiUrl, twemojiUrlAlt } from '../lib/emoji';

interface Props {
  e: string;
  size?: number | string;
  className?: string;
  alt?: string;
}

/** Twemoji picture with graceful fallback to the system emoji font. */
export function Emoji({ e, size = 48, className, alt = '' }: Props) {
  const [stage, setStage] = useState(0);
  const dim = typeof size === 'number' ? `${size}px` : size;
  if (stage >= 2) {
    return (
      <span
        className={className}
        role={alt ? 'img' : undefined}
        aria-label={alt || undefined}
        aria-hidden={alt ? undefined : true}
        style={{ fontSize: `calc(${dim} * 0.86)`, lineHeight: 1, width: dim, height: dim, display: 'inline-grid', placeItems: 'center' }}
      >
        {e}
      </span>
    );
  }
  return (
    <img
      key={stage}
      src={stage === 0 ? twemojiUrl(e) : twemojiUrlAlt(e)}
      alt={alt}
      className={className}
      draggable={false}
      width={typeof size === 'number' ? size : undefined}
      height={typeof size === 'number' ? size : undefined}
      style={{ width: dim, height: dim, objectFit: 'contain', userSelect: 'none', pointerEvents: 'none' }}
      onError={() => setStage((s) => s + 1)}
    />
  );
}
