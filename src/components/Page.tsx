import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  className?: string;
  narrow?: boolean;
}

/** Standard screen wrapper with a soft slide-up entrance. */
export function Page({ children, className = '', narrow }: Props) {
  return (
    <motion.main
      className={`screen ${narrow ? 'screen--narrow' : ''} ${className}`}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10, transition: { duration: 0.15 } }}
      transition={{ type: 'spring', stiffness: 260, damping: 28 }}
    >
      {children}
    </motion.main>
  );
}
