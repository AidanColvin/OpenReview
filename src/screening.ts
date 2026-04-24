/**
 * screening.ts
 * All article decision logic. Pure functions only.
 * Takes state in, returns new state out. No DOM. No localStorage.
 */

import { Article, Decision } from './models';
import { CONFIG } from './config';

export interface UndoResult {
  articles: Article[];
  reverted: Article | null;
}

/**
 * Given an article ID, a Decision, and an articles array, returns the updated articles array.
 * Throws if the decision value is not in DECISION_STATES.
 */
export function makeDecision(
  articleId: string,
  decision: Decision,
  articles: Article[],
): Article[] {
  if (!(CONFIG.DECISION_STATES as readonly string[]).includes(decision)) {
    throw new Error(`Decision must be one of: ${CONFIG.DECISION_STATES.join(', ')}`);
  }
  return articles.map(a =>
    a.id === articleId
      ? { ...a, decision, screened_at: new Date().toISOString(), session_decision: true }
      : a,
  );
}

/**
 * Given an articles array, returns the array with the most recent session decision reverted.
 * Also returns the reverted Article, or null if there was nothing to undo.
 */
export function undoLastDecision(articles: Article[]): UndoResult {
  const candidates = articles.filter(a => a.session_decision && a.screened_at);
  if (!candidates.length) return { articles, reverted: null };

  const last = candidates.reduce((a, b) => (a.screened_at! > b.screened_at! ? a : b));
  const reverted: Article = {
    ...last,
    decision: 'unscreened',
    screened_at: null,
    session_decision: false,
  };

  return {
    articles: articles.map(a => (a.id === last.id ? reverted : a)),
    reverted,
  };
}

/**
 * Given an articles array, returns the array with all session decisions cleared to unscreened.
 */
export function undoSession(articles: Article[]): Article[] {
  return articles.map(a =>
    a.session_decision
      ? { ...a, decision: 'unscreened' as Decision, screened_at: null, session_decision: false }
      : a,
  );
}

/**
 * Given an articles array and a current article ID, returns the next unscreened Article or null.
 */
export function getNextArticle(articles: Article[], currentId: string): Article | null {
  const unscreened = articles.filter(a => a.decision === 'unscreened');
  if (!unscreened.length) return null;
  const idx = unscreened.findIndex(a => a.id === currentId);
  return idx >= 0 && idx + 1 < unscreened.length
    ? unscreened[idx + 1]
    : unscreened[0];
}

/**
 * Given an articles array and a current article ID, returns the previous unscreened Article or null.
 */
export function getPreviousArticle(articles: Article[], currentId: string): Article | null {
  const unscreened = articles.filter(a => a.decision === 'unscreened');
  if (!unscreened.length) return null;
  const idx = unscreened.findIndex(a => a.id === currentId);
  return idx > 0
    ? unscreened[idx - 1]
    : unscreened[unscreened.length - 1];
}
