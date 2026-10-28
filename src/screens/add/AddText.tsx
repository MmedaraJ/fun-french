import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { bestEmoji, useEmojiIndex } from '../../components/EmojiPicker';
import { Emoji } from '../../components/Emoji';
import { Mascot } from '../../components/Mascot';
import { Page } from '../../components/Page';
import { toast } from '../../components/Toasts';
import { aiAvailable, aiExtractFromText } from '../../lib/ai';
import { addCards, existingFrench } from '../../lib/content';
import { wordCount } from '../../lib/french';
import { detectFormat, makeCandidate, pairsToCandidates, segmentText, selectedPhrases, type Candidate } from '../../lib/parse';
import { useSettings } from '../../lib/settings';
import { sfx } from '../../lib/sound';
import { ReviewList, toRows, type ReviewRow } from './ReviewList';
import { AddDone, AddHeader } from './shared';

type Stage = 'input' | 'pick' | 'review' | 'done';

const SAMPLE_LIST = `le marché - market
la boulangerie - bakery
les fraises - strawberries
acheter - to buy
C'est combien ? - How much is it?`;

const SAMPLE_TEXT = `Samedi matin, je vais au marché avec mon mari. Nous achetons des fraises, du fromage et une baguette. Il fait beau, alors on prend un café en terrasse. C'est mon moment préféré de la semaine !`;

/** /add/text — paste a vocabulary list or any French text and pick what to learn. */
export default function AddText() {
  const location = useLocation();
  const incoming = (location.state as { text?: string; from?: string } | null)?.text ?? '';
  const mascotColor = useSettings((s) => s.mascotColor);
  useSettings((s) => s.aiKey);
  const magic = aiAvailable();
  const index = useEmojiIndex();
  const [text, setText] = useState(incoming);
  const [stage, setStage] = useState<Stage>('input');
  const [swap, setSwap] = useState<boolean | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [sentencePick, setSentencePick] = useState<Set<number>>(new Set());
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [fromAi, setFromAi] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [done, setDone] = useState<{ ids: string[]; deckId: string } | null>(null);

  useEffect(() => {
    if (incoming) toast({ title: 'Texte scanné', body: 'Check it, then pick what to learn.', emoji: '🔎' });
  }, [incoming]);

  const format = useMemo(() => detectFormat(text), [text]);
  const seg = useMemo(() => (format.type === 'text' ? segmentText(text) : null), [format.type, text]);
  const useSwap = swap ?? (format.type === 'list' ? format.swap : false);
  const phrases = useMemo(() => (seg ? selectedPhrases(seg.segments, selected) : []), [seg, selected]);
  const learnableSentences = useMemo(() => (seg ? seg.sentences.map((s, i) => ({ s, i })).filter(({ s }) => wordCount(s) >= 3 && wordCount(s) <= 22) : []), [seg]);

  const withEmoji = (cands: Candidate[]) =>
    cands.map((c) => ({ ...c, emoji: c.emoji ?? (c.kind === 'word' && c.en ? bestEmoji(index, c.en) : undefined) }));

  const goReview = async (cands: Candidate[], ai = false) => {
    if (!cands.length) {
      toast({ title: 'Rien à ajouter', body: 'Select a few words first.', emoji: '🙈' });
      return;
    }
    setRows(toRows(withEmoji(cands), await existingFrench()));
    setFromAi(ai);
    setStage('review');
    sfx.whoosh();
  };

  const next = () => {
    if (format.type === 'list') void goReview(pairsToCandidates(format.pairs, useSwap));
    else if (format.type === 'text') {
      setSelected(new Set());
      setSentencePick(new Set());
      setStage('pick');
      sfx.whoosh();
    }
  };

  const extractWithAi = async () => {
    if (aiBusy || !text.trim()) return;
    setAiBusy(true);
    try {
      const items = await aiExtractFromText(text);
      if (!items.length) toast({ title: 'Rien trouvé', body: 'Claude found nothing to learn in that text.', emoji: '🤔' });
      else await goReview(items, true);
    } catch (e) {
      toast({ title: 'Oups', body: (e as Error).message, emoji: '😕', tone: 'error' }, 5000);
    } finally {
      setAiBusy(false);
    }
  };

  const toggleWord = (i: number) => {
    sfx.softPop();
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(i)) n.delete(i);
      else n.add(i);
      return n;
    });
  };

  const pickNext = () => {
    const cands = [...phrases.map((p) => makeCandidate(p)), ...learnableSentences.filter(({ i }) => sentencePick.has(i)).map(({ s }) => makeCandidate(s))];
    void goReview(cands);
  };

  const save = async (picked: ReviewRow[], deckId: string) => {
    const cards = await addCards(
      picked.map((r) => ({ fr: r.fr, en: r.en, kind: r.kind, gender: r.gender, plural: r.plural, emoji: r.emoji, note: r.note })),
      { deckId, source: fromAi ? 'ai' : 'text' },
    );
    setDone({ ids: cards.map((c) => c.id), deckId });
    setStage('done');
  };

  const restart = () => {
    setText('');
    setRows([]);
    setSwap(null);
    setDone(null);
    setStage('input');
  };

  return (
    <Page narrow>
      <AddHeader
        title="Du texte"
        emoji="📋"
        sub={stage === 'pick' ? 'Tap the words you want to learn.' : stage === 'review' ? 'Check and tweak, then add.' : 'Paste a vocab list or any French text.'}
        back={stage === 'input' || stage === 'done' ? '/add' : undefined}
        right={
          stage === 'pick' || stage === 'review' ? (
            <button className="btn btn--sm btn--ghost" onClick={() => setStage(stage === 'review' && format.type === 'text' && !fromAi ? 'pick' : 'input')}>
              ← Retour
            </button>
          ) : undefined
        }
      />

      <AnimatePresence mode="wait">
        {stage === 'input' && (
          <motion.div key="input" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
            <div className="panel add-form">
              <textarea
                className="textarea add-textarea"
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  setSwap(null);
                }}
                placeholder={'le chat - cat\nla pomme - apple\n\n…or paste a message, a recipe, an article, your class notes…'}
                lang="fr"
                spellCheck={false}
                data-testid="text-input"
              />
              <div className="row row--wrap" style={{ gap: 8, marginTop: 10 }}>
                <button
                  className="chip"
                  onClick={async () => {
                    try {
                      const t = await navigator.clipboard.readText();
                      if (t) setText(t);
                    } catch {
                      toast({ title: 'Paste with your keyboard', body: 'Long-press the box and choose Paste.', emoji: '📋' });
                    }
                  }}
                >
                  <Emoji e="📋" size={18} /> Coller
                </button>
                <button className="chip" onClick={() => setText(SAMPLE_LIST)}>
                  Exemple : liste
                </button>
                <button className="chip" onClick={() => setText(SAMPLE_TEXT)}>
                  Exemple : texte
                </button>
                {text && (
                  <button className="chip" onClick={() => setText('')}>
                    ✕ Effacer
                  </button>
                )}
              </div>

              <AnimatePresence mode="wait">
                {format.type !== 'empty' && (
                  <motion.div key={format.type} className="detect" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                    {format.type === 'list' ? (
                      <>
                        <Emoji e="📋" size={26} />
                        <span>
                          <span>
                            <strong>Liste détectée</strong> · {format.pairs.length} paire{format.pairs.length > 1 ? 's' : ''}
                          </span>
                          <small>
                            French is on the {useSwap ? 'right' : 'left'}.{' '}
                            <button className="link-btn" onClick={() => setSwap(!useSwap)}>
                              Swap ⇄
                            </button>
                          </small>
                        </span>
                      </>
                    ) : (
                      <>
                        <Emoji e="📖" size={26} />
                        <span>
                          <span>
                            <strong>Texte libre</strong> · {seg?.sentences.length ?? 0} phrase{(seg?.sentences.length ?? 0) > 1 ? 's' : ''}
                          </span>
                          <small>You’ll tap the words and sentences you want.</small>
                        </span>
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="add-actions">
              {magic && format.type !== 'empty' && (
                <button className="btn btn--lg btn--block btn--grape" onClick={extractWithAi} disabled={aiBusy}>
                  {aiBusy ? (
                    <>
                      <motion.span animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }} style={{ display: 'grid' }}>
                        <Emoji e="✨" size={22} />
                      </motion.span>
                      Claude lit ton texte…
                    </>
                  ) : (
                    <>✨ Extraire avec l’IA</>
                  )}
                </button>
              )}
              <button className={'btn btn--lg btn--block' + (magic ? ' btn--ghost' : '')} onClick={next} disabled={format.type === 'empty' || aiBusy} data-testid="text-next">
                {format.type === 'list' ? `Vérifier ${format.pairs.length} paire${format.pairs.length > 1 ? 's' : ''} →` : 'Choisir les mots →'}
              </button>
            </div>
            {aiBusy && (
              <div className="center" style={{ marginTop: 16 }}>
                <Mascot mood="thinking" size={90} color={mascotColor} />
              </div>
            )}
          </motion.div>
        )}

        {stage === 'pick' && seg && (
          <motion.div key="pick" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
            <div className="panel tap-text" lang="fr">
              {seg.segments.map((s, k) =>
                s.type === 'word' ? (
                  <button key={k} className={'tw' + (selected.has(s.wordIndex!) ? ' is-sel' : '')} onClick={() => toggleWord(s.wordIndex!)} data-word={s.text}>
                    {s.text}
                  </button>
                ) : (
                  <span key={k} className="tgap">
                    {s.text}
                  </span>
                ),
              )}
            </div>
            <AnimatePresence>
              {phrases.length > 0 && (
                <motion.div className="picked" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <span className="field-label">Tes mots · {phrases.length}</span>
                  <div className="row row--wrap" style={{ gap: 6 }}>
                    {phrases.map((p, i) => (
                      <motion.span key={p + i} className="picked-chip" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 18 }}>
                        {p}
                      </motion.span>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <p className="muted tip">Tip: tap neighbouring words (like “le” + “marché”) to keep them together.</p>

            {learnableSentences.length > 0 && (
              <>
                <h3 className="section-title">Ajouter des phrases entières</h3>
                <ul className="sentence-picks">
                  {learnableSentences.map(({ s, i }) => (
                    <li key={i}>
                      <button
                        className={'sentence-pick' + (sentencePick.has(i) ? ' is-on' : '')}
                        onClick={() => {
                          sfx.tap();
                          setSentencePick((p) => {
                            const n = new Set(p);
                            if (n.has(i)) n.delete(i);
                            else n.add(i);
                            return n;
                          });
                        }}
                        aria-pressed={sentencePick.has(i)}
                      >
                        <span className="sp-box">{sentencePick.has(i) ? '✓' : '+'}</span>
                        <span>{s}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
            <div className="add-actions sticky-actions">
              <button className="btn btn--lg btn--block" onClick={pickNext} disabled={!phrases.length && !sentencePick.size} data-testid="pick-next">
                Suivant ({phrases.length + sentencePick.size}) →
              </button>
            </div>
          </motion.div>
        )}

        {stage === 'review' && (
          <motion.div key="review" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
            <ReviewList
              rows={rows}
              onChange={setRows}
              onSubmit={save}
              top={
                format.type === 'list' && !fromAi ? (
                  <div className="row" style={{ justifyContent: 'flex-end', marginBottom: 6 }}>
                    <button
                      className="btn btn--sm btn--ghost"
                      onClick={async () => {
                        const s = !useSwap;
                        setSwap(s);
                        setRows(toRows(withEmoji(pairsToCandidates(format.pairs, s)), await existingFrench()));
                      }}
                    >
                      ⇄ Inverser français / anglais
                    </button>
                  </div>
                ) : fromAi ? (
                  <div className="ai-note">
                    <Emoji e="✨" size={18} /> Picked by Claude — double-check anything that looks off.
                  </div>
                ) : undefined
              }
            />
          </motion.div>
        )}

        {stage === 'done' && done && (
          <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <AddDone count={done.ids.length} cardIds={done.ids} deckId={done.deckId} onMore={restart} />
          </motion.div>
        )}
      </AnimatePresence>
    </Page>
  );
}
