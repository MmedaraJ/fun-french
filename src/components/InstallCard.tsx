import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { canPromptInstall, isIOS, isStandalone, onInstallChange, promptInstall } from '../lib/install';
import { sfx } from '../lib/sound';
import { Emoji } from './Emoji';
import { toast } from './Toasts';

/** "Add to home screen" help; hidden once Bonbon runs as an installed app. */
export function InstallCard() {
  const [canPrompt, setCanPrompt] = useState(canPromptInstall);
  const [standalone] = useState(isStandalone);
  const ios = isIOS();

  useEffect(() => onInstallChange(() => setCanPrompt(canPromptInstall())), []);

  if (standalone) return null;

  const install = async () => {
    sfx.pop();
    const ok = await promptInstall();
    if (ok) toast({ title: 'Installé !', body: 'Bonbon is on your home screen.', emoji: '🎉', tone: 'success' });
  };

  return (
    <motion.div className="install-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <div className="install-head">
        <span className="install-icon">
          <img src={`${import.meta.env.BASE_URL}icons/icon-192.png`} alt="" width={52} height={52} />
        </span>
        <div>
          <strong>Ajouter à l’écran d’accueil</strong>
          <span>Open Bonbon like a real app, full screen and offline.</span>
        </div>
      </div>
      {ios ? (
        <ol className="install-steps">
          <li>
            Tap <b>Share</b> <ShareIcon /> in Safari’s toolbar
          </li>
          <li>
            Choose <b>Add to Home Screen</b> <Emoji e="➕" size={16} />
          </li>
          <li>
            Tap <b>Add</b>, then open Bonbon from your home screen
          </li>
        </ol>
      ) : canPrompt ? (
        <button className="btn btn--sm btn--grape" onClick={install}>
          <Emoji e="📲" size={20} /> Installer Bonbon
        </button>
      ) : (
        <p className="install-hint">In your browser menu, choose “Install app” or “Add to Home screen”.</p>
      )}
      <p className="install-why">
        <Emoji e="🛡️" size={16} /> On iPhone this also keeps your progress safer: Safari may clear a website’s data after 7 days without a visit, but not for apps on the home screen.
      </p>
    </motion.div>
  );
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-label="Share icon" style={{ verticalAlign: '-3px' }}>
      <path d="M12 3v12M7.5 7.5 12 3l4.5 4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 11H5v10h14V11h-1" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
