import { motion } from 'framer-motion';
import { useState } from 'react';
import { speak } from '../lib/speech';
import './SpeakButton.css';

interface Props {
  text: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  slow?: boolean;
  className?: string;
  label?: string;
  tone?: 'light' | 'solid';
}

/** Round speaker button with animated sound waves while speaking. */
export function SpeakButton({ text, size = 'md', slow, className = '', label, tone = 'light' }: Props) {
  const [talking, setTalking] = useState(false);
  const say = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setTalking(true);
    await speak(text, { slow });
    setTalking(false);
  };
  return (
    <motion.button
      type="button"
      className={`speak-btn speak-btn--${size} speak-btn--${tone} ${talking ? 'is-talking' : ''} ${className}`}
      onClick={say}
      whileTap={{ scale: 0.88 }}
      aria-label={label ?? (slow ? 'Play slowly' : 'Play sound')}
      title={slow ? 'Slowly' : 'Listen'}
    >
      {slow ? <SnailIcon /> : <SpeakerIcon talking={talking} />}
    </motion.button>
  );
}

function SpeakerIcon({ talking }: { talking: boolean }) {
  return (
    <svg viewBox="0 0 32 32" width="58%" height="58%" aria-hidden>
      <path d="M5 12.5h5l7-6v19l-7-6H5z" fill="currentColor" strokeLinejoin="round" stroke="currentColor" strokeWidth="2" />
      <path className={'wave w1' + (talking ? ' on' : '')} d="M21 12.2a5 5 0 0 1 0 7.6" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
      <path className={'wave w2' + (talking ? ' on' : '')} d="M24.2 9a9.5 9.5 0 0 1 0 14" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}

function SnailIcon() {
  return (
    <svg viewBox="0 0 32 32" width="62%" height="62%" aria-hidden>
      <circle cx="15" cy="15" r="8" fill="none" stroke="currentColor" strokeWidth="2.6" />
      <path d="M15 15m-3.5 0a3.5 3.5 0 1 0 3.5-3.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M4 25h20c2.5 0 4-1.6 4-4v-2" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M26 12l1.5-4M28.5 13l3-2.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
