import { motion } from 'framer-motion';
import { Mascot } from '../../components/Mascot';
import { useSettings } from '../../lib/settings';
import type { GameMode } from '../../types';

export const TIPS: Record<GameMode, { fr: string; en: string }> = {
  'pick-image': { fr: 'Écoute le mot et touche la bonne image.', en: 'Listen to the word, tap the right picture.' },
  'pick-word': { fr: 'Regarde l’image et choisis le mot français.', en: 'Look at the picture, pick the French word.' },
  spell: { fr: 'Regarde l’image et le sens, puis épelle le mot de mémoire.', en: 'Look at the picture and meaning, then spell the French word from memory.' },
  listen: { fr: 'Pas de texte ! Écoute bien. Tu peux réécouter, même au ralenti.', en: 'No text! Replay as often as you like, even slowly.' },
  mix: { fr: 'Un peu de tout : le jeu change à chaque question !', en: 'A bit of everything: the game changes every question.' },
  gender: { fr: 'Glisse la carte vers « le » (à gauche) ou « la » (à droite).', en: 'Swipe the card left for le, right for la. Or tap.' },
  build: { fr: 'Lis l’anglais, puis touche les mots français dans le bon ordre.', en: 'Read the English, then tap the French words in the right order.' },
  type: { fr: 'Regarde le sens et écris le mot en français, de mémoire.', en: 'See the meaning and type the French from memory. You hear it after.' },
  dictation: { fr: 'Écoute et écris exactement ce que tu entends.', en: 'Listen and type exactly what you hear. Accent keys are right there.' },
  pairs: { fr: 'Touche un mot, puis son image. Le plus vite possible !', en: 'Tap a word, then its picture. As fast as you can!' },
  flash: { fr: 'Retourne la carte, puis dis honnêtement si tu savais.', en: 'Flip the card, then be honest: did you know it?' },
  speak: { fr: 'Regarde le sens, puis dis le mot en français. Tu l’entends après.', en: 'See the meaning, say it in French. You hear the answer after.' },
  conjugaison: { fr: 'Trouve la bonne forme du verbe pour la personne et le temps donnés.', en: 'Find the right verb form for the person and tense shown.' },
  temps: { fr: 'Repère le temps, change-le, complète la phrase : tous les temps y passent !', en: 'Spot the tense, change it, fill the gap: every tense comes up.' },
  questions: { fr: 'Choisis le bon mot interrogatif et la bonne façon de poser la question.', en: 'Pick the right question word and the right way to ask.' },
  structures: { fr: 'Lis toute la phrase, puis complète le trou : pronom, mode, temps, connecteur…', en: 'Read the whole sentence, then fill the gap: pronoun, mood, tense, linking word…' },
  grammaire: { fr: 'Lis la petite leçon, puis entraîne-toi.', en: 'Read the short lesson, then practise.' },
  cours: { fr: 'Choisis la bonne phrase ; quand tu la connais, construis-la avec les mots.', en: 'Pick the right sentence; once you know it, build it from the word tiles.' },
};

export function TipBubble({ mode, onDone }: { mode: GameMode; onDone: () => void }) {
  const mascotColor = useSettings((s) => s.mascotColor);
  const tip = TIPS[mode];
  return (
    <motion.div className="tip-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onDone}>
      <motion.div
        className="tip-bubble"
        initial={{ y: 80, scale: 0.8 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 22 }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="How to play"
      >
        <div className="tip-mascot">
          <Mascot mood="thinking" size={84} color={mascotColor} />
        </div>
        <div className="tip-text">
          <strong>Comment jouer</strong>
          <p>{tip.fr}</p>
          <p className="tip-en">{tip.en}</p>
        </div>
        <button className="btn btn--block btn--sun" onClick={onDone} autoFocus>
          D’accord !
        </button>
      </motion.div>
    </motion.div>
  );
}
