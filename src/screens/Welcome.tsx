import { AnimatePresence, motion, type PanInfo } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Emoji } from '../components/Emoji';
import { Mascot, type MascotMood } from '../components/Mascot';
import { celebrate, emojiRain } from '../lib/confetti';
import { useDecks } from '../lib/hooks';
import { inkOn, paletteColor } from '../lib/palette';
import { setActiveDecks } from '../lib/seed';
import { useSettings } from '../lib/settings';
import { sfx, unlockAudio } from '../lib/sound';
import { speak } from '../lib/speech';
import type { Deck, PaletteKey } from '../types';
import './Welcome.css';

type Level = 0 | 1 | 2;

const STEP_COLORS: PaletteKey[] = ['berry', 'sky', 'tangerine', 'leaf', 'grape', 'lagoon', 'berry'];
const STEP_MOODS: MascotMood[] = ['excited', 'happy', 'thinking', 'happy', 'love', 'excited', 'love'];
const LAST = STEP_COLORS.length - 1;

const LEVELS: { emoji: string; fr: string; en: string; perRound: number }[] = [
  { emoji: '🌱', fr: 'Je débute', en: 'I’m a total beginner', perRound: 3 },
  { emoji: '🌿', fr: 'Je connais quelques mots', en: 'I know a few words', perRound: 4 },
  { emoji: '🌳', fr: 'Je me débrouille', en: 'I can get by', perRound: 5 },
];

const BEGINNER = ['animals', 'food', 'home', 'colors', 'numbers', 'phrases', 'love'];

const GOALS = [
  { xp: 30, fr: 'Tranquille', en: 'Relaxed', emoji: '🐢' },
  { xp: 60, fr: 'Régulier', en: 'Regular', emoji: '🚶' },
  { xp: 100, fr: 'Motivé', en: 'Keen', emoji: '🏃' },
  { xp: 150, fr: 'À fond !', en: 'All in', emoji: '🚀' },
];

function suggestedDecks(decks: Deck[], level: Level): string[] {
  if (level === 0) {
    const picks = BEGINNER.filter((id) => decks.some((d) => d.id === id));
    return picks.length ? picks : decks.filter((d) => d.level <= 1).slice(0, 7).map((d) => d.id);
  }
  if (level === 1) return decks.filter((d) => d.level <= 1 || ['love', 'cafe'].includes(d.id)).map((d) => d.id);
  return decks.filter((d) => d.level <= 2).map((d) => d.id);
}

export default function Welcome() {
  const navigate = useNavigate();
  const update = useSettings((s) => s.update);
  const mascotColor = useSettings((s) => s.mascotColor);
  const decks = useDecks();
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [name, setName] = useState(useSettings.getState().name);
  const [agreement, setAgreement] = useState<'f' | 'm'>(useSettings.getState().agreement);
  const [level, setLevel] = useState<Level | null>(null);
  const [chosen, setChosen] = useState<string[]>([]);
  const [goal, setGoal] = useState(60);
  const [react, setReact] = useState(0);
  const finishing = useRef(false);
  const nameRef = useRef<HTMLInputElement>(null);

  const builtin = useMemo(() => (decks ?? []).filter((d) => d.builtin).sort((a, b) => a.order - b.order), [decks]);
  const color = STEP_COLORS[step];
  const ink = inkOn(color);
  const trimmed = name.trim();

  const go = (to: number) => {
    if (to < 0 || to > LAST || to === step) return;
    setDir(to > step ? 1 : -1);
    setStep(to);
    setReact((r) => r + 1);
    sfx.swish();
  };

  const canNext = step !== 4 || chosen.length > 0;
  const next = () => {
    if (!canNext) {
      sfx.wrong();
      return;
    }
    if (step === 1 && trimmed) void speak(`Bienvenue, ${trimmed} !`);
    go(step + 1);
  };

  const begin = () => {
    unlockAudio();
    sfx.fanfare();
    void speak('Bonjour ! Je m’appelle Coco.');
    go(1);
  };

  const pickLevel = (l: Level) => {
    setLevel(l);
    setChosen(suggestedDecks(builtin, l));
    sfx.pop();
    setReact((r) => r + 1);
    setTimeout(() => go(4), 380);
  };

  const toggleDeck = (id: string) => {
    sfx.softPop();
    setReact((r) => r + 1);
    setChosen((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));
  };

  const finish = async () => {
    if (finishing.current) return;
    finishing.current = true;
    const ids = chosen.length ? chosen : suggestedDecks(builtin, level ?? 0);
    await setActiveDecks(ids);
    update({
      name: trimmed,
      agreement,
      newPerRound: LEVELS[level ?? 0].perRound,
      dailyGoal: goal,
      onboarded: true,
    });
    sfx.fanfare();
    celebrate(1.2);
    emojiRain(['🥐', '💖', '⭐', '🍬'], 36);
    void speak(trimmed ? `C'est parti, ${trimmed} !` : "C'est parti !");
    setTimeout(() => navigate('/', { replace: true }), 900);
  };

  useEffect(() => {
    if (step !== 1) return;
    const t = setTimeout(() => nameRef.current?.focus({ preventScroll: true }), 450);
    return () => clearTimeout(t);
  }, [step]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || step === 0 || step === LAST) return;
      if (step === 3 && level === null) return;
      next();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (step === 1) return;
    if (info.offset.x < -90 && step > 0 && step < LAST && (step !== 3 || level !== null)) next();
    else if (info.offset.x > 90 && step > 0) go(step - 1);
  };

  return (
    <div className="welcome" style={{ background: paletteColor(color), color: ink }}>
      <div className="welcome-blobs" aria-hidden>
        <span />
        <span />
        <span />
      </div>

      <header className="welcome-top">
        <button className="icon-btn" onClick={() => go(step - 1)} aria-label="Back" style={{ visibility: step > 0 && step < LAST ? 'visible' : 'hidden' }}>
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
            <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div className="dots" aria-label={`Step ${step + 1} of ${LAST + 1}`}>
          {STEP_COLORS.map((_, i) => (
            <motion.span key={i} className="dot" animate={{ width: i === step ? 26 : 10, opacity: i <= step ? 1 : 0.45 }} transition={{ type: 'spring', stiffness: 400, damping: 30 }} />
          ))}
        </div>
        <span style={{ width: 46 }} />
      </header>

      <div className="welcome-mascot">
        <Mascot mood={STEP_MOODS[step]} size={step === 0 ? 170 : 104} color={mascotColor} reactKey={react} onClick={() => {
          sfx.rimshot();
          setReact((r) => r + 1);
        }} />
      </div>

      <AnimatePresence mode="wait" custom={dir} initial={false}>
        <motion.section
          key={step}
          className="welcome-step"
          custom={dir}
          variants={{
            enter: (d: number) => ({ x: d * 120, opacity: 0, scale: 0.96 }),
            center: { x: 0, opacity: 1, scale: 1 },
            exit: (d: number) => ({ x: d * -120, opacity: 0, scale: 0.96 }),
          }}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ type: 'spring', stiffness: 320, damping: 30 }}
          drag={step === 1 ? false : 'x'}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.25}
          onDragEnd={onDragEnd}
        >
          {step === 0 && (
            <div className="w-center">
              <Pop delay={0.1}>
                <h1 className="w-title">Bonjour !</h1>
              </Pop>
              <Pop delay={0.2}>
                <p className="w-lead">Je m’appelle Coco.</p>
              </Pop>
              <Pop delay={0.3}>
                <p className="w-sub">I’m your little French buddy. Let’s set things up, it takes one minute.</p>
              </Pop>
              <Pop delay={0.45}>
                <button className="btn btn--lg btn--white w-cta" onClick={begin}>
                  Commencer <Emoji e="✨" size={24} />
                </button>
              </Pop>
            </div>
          )}

          {step === 1 && (
            <div className="w-center">
              <h1 className="w-title w-title--md">Comment tu t’appelles ?</h1>
              <p className="w-sub">What’s your name?</p>
              <input
                className="w-input"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (e.target.value.length % 3 === 1) setReact((r) => r + 1);
                }}
                ref={nameRef}
                placeholder="Ton prénom"
                maxLength={40}
                autoComplete="given-name"
                enterKeyHint="next"
                aria-label="Your name"
              />
              <AnimatePresence>
                {trimmed && (
                  <motion.p className="w-hello" initial={{ opacity: 0, y: 8, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }}>
                    Bienvenue, {trimmed} ! <Emoji e="👋" size={24} />
                  </motion.p>
                )}
              </AnimatePresence>
              <div className="w-actions">
                <button className="btn btn--lg btn--white w-cta" onClick={next}>
                  {trimmed ? 'Suivant' : 'Passer'}
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="w-center">
              <h1 className="w-title w-title--md">Petite leçon de grammaire</h1>
              <p className="w-sub">In French, words like “ready” change with the person. Which one is you?</p>
              <div className="w-choices">
                {(['f', 'm'] as const).map((a, i) => (
                  <motion.button
                    key={a}
                    className={'w-choice' + (agreement === a ? ' is-on' : '')}
                    onClick={() => {
                      setAgreement(a);
                      sfx.pop();
                      setReact((r) => r + 1);
                      void speak(a === 'f' ? 'Je suis prête !' : 'Je suis prêt !');
                    }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + i * 0.08 }}
                    whileTap={{ scale: 0.96 }}
                    aria-pressed={agreement === a}
                  >
                    <span className="w-choice-big">
                      Je suis <b>{a === 'f' ? 'prête' : 'prêt'}</b>
                    </span>
                    <span className="w-choice-small">{a === 'f' ? 'féminin · Coco will say « Bravo, tu es prête ! »' : 'masculin · Coco will say « Bravo, tu es prêt ! »'}</span>
                  </motion.button>
                ))}
              </div>
              <div className="w-actions">
                <button className="btn btn--lg btn--white w-cta" onClick={next}>
                  Suivant
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="w-center">
              <h1 className="w-title w-title--md">Ton niveau ?</h1>
              <p className="w-sub">How much French do you know already?</p>
              <div className="w-choices">
                {LEVELS.map((l, i) => (
                  <motion.button
                    key={l.fr}
                    className={'w-choice w-choice--row' + (level === i ? ' is-on' : '')}
                    onClick={() => pickLevel(i as Level)}
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.08 + i * 0.08, type: 'spring', stiffness: 300, damping: 24 }}
                    whileTap={{ scale: 0.96 }}
                    aria-pressed={level === i}
                  >
                    <Emoji e={l.emoji} size={40} />
                    <span>
                      <span className="w-choice-big">{l.fr}</span>
                      <span className="w-choice-small">{l.en}</span>
                    </span>
                  </motion.button>
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="w-center w-wide">
              <h1 className="w-title w-title--md">Tes thèmes</h1>
              <p className="w-sub">Pick what you’d like to learn first. You can change this any time.</p>
              <div className="w-decks">
                {builtin.map((d, i) => {
                  const on = chosen.includes(d.id);
                  return (
                    <motion.button
                      key={d.id}
                      className={'w-deck' + (on ? ' is-on' : '')}
                      onClick={() => toggleDeck(d.id)}
                      initial={{ opacity: 0, scale: 0.7 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.02 * i, type: 'spring', stiffness: 400, damping: 22 }}
                      whileTap={{ scale: 0.92 }}
                      aria-pressed={on}
                    >
                      <Emoji e={d.emoji} size={24} />
                      <span>{d.name}</span>
                      <AnimatePresence>
                        {on && (
                          <motion.span className="w-check" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                            ✓
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </motion.button>
                  );
                })}
              </div>
              <div className="w-actions">
                <button className={'btn btn--lg btn--white w-cta' + (canNext ? '' : ' is-disabled')} onClick={next} aria-disabled={!canNext}>
                  {chosen.length ? `Suivant · ${chosen.length} thème${chosen.length > 1 ? 's' : ''}` : 'Choisis au moins un thème'}
                </button>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="w-center">
              <h1 className="w-title w-title--md">Ton objectif du jour</h1>
              <p className="w-sub">A little every day beats a lot once a week.</p>
              <div className="w-goals">
                {GOALS.map((g, i) => (
                  <motion.button
                    key={g.xp}
                    className={'w-goal' + (goal === g.xp ? ' is-on' : '')}
                    onClick={() => {
                      setGoal(g.xp);
                      sfx.pop();
                      setReact((r) => r + 1);
                    }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.06 * i }}
                    whileTap={{ scale: 0.95 }}
                    aria-pressed={goal === g.xp}
                  >
                    <Emoji e={g.emoji} size={34} />
                    <strong>{g.fr}</strong>
                    <span>
                      {g.xp} XP · {g.en}
                    </span>
                  </motion.button>
                ))}
              </div>
              <div className="w-actions">
                <button className="btn btn--lg btn--white w-cta" onClick={next}>
                  Suivant
                </button>
              </div>
            </div>
          )}

          {step === LAST && (
            <div className="w-center">
              <Pop delay={0.05}>
                <h1 className="w-title">{trimmed ? `Prêt${agreement === 'f' ? 'e' : ''}, ${trimmed} ?` : `Prêt${agreement === 'f' ? 'e' : ''} ?`}</h1>
              </Pop>
              <Pop delay={0.15}>
                <p className="w-sub">
                  {chosen.length} thème{chosen.length > 1 ? 's' : ''} · {goal} XP par jour · {LEVELS[level ?? 0].perRound} nouveaux mots par partie
                </p>
              </Pop>
              <Pop delay={0.25}>
                <p className="w-lead w-lead--sm">Every round teaches a few new words and brings back the ones you’re about to forget.</p>
              </Pop>
              <Pop delay={0.35}>
                <button className="btn btn--lg btn--white w-cta" onClick={finish}>
                  C’est parti ! <Emoji e="🚀" size={24} />
                </button>
              </Pop>
            </div>
          )}
        </motion.section>
      </AnimatePresence>
    </div>
  );
}

function Pop({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 18, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 380, damping: 20, delay }}>
      {children}
    </motion.div>
  );
}
