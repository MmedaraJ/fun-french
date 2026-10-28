import { normalizeAnswer, stripAccents } from '../french';
import type { GrammarPayload } from './exercises';

/** Strict check for typed grammar answers: accents and endings matter here (parle ≠ parlé). */
export function checkTyped(input: string, g: Pick<GrammarPayload, 'answer' | 'accept'>): { correct: boolean; note?: string } {
  const given = normalizeAnswer(input);
  if (!given) return { correct: false };
  const accepted = [...new Set([g.answer, ...(g.accept ?? [])].filter(Boolean))].map((a) => normalizeAnswer(a));
  if (accepted.includes(given)) return { correct: true };
  if (accepted.some((a) => stripAccents(a) === stripAccents(given))) {
    return { correct: false, note: `Presque ! Watch the accents: ${g.answer}` };
  }
  return { correct: false };
}
