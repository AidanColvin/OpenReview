/**
 * storage.ts
 * All localStorage reads and writes live here exclusively.
 * No other module touches localStorage directly.
 */

import { Article, Filter, makeFilter } from './models';
import { CONFIG } from './config';

const FILTER_KEY   = CONFIG.STORAGE_KEY + '_filters';
const SHORTCUT_KEY = CONFIG.STORAGE_KEY + '_shortcuts_shown';

/**
 * Given nothing, returns the full articles array from localStorage or an empty array.
 */
export function loadArticles(): Article[] {
  try {
    const raw = localStorage.getItem(CONFIG.STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Article[]) : [];
  } catch {
    return [];
  }
}

/**
 * Given an articles array, writes it to localStorage.
 */
export function saveArticles(articles: Article[]): void {
  localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(articles));
}

/**
 * Given nothing, removes all article data from localStorage.
 */
export function clearArticles(): void {
  localStorage.removeItem(CONFIG.STORAGE_KEY);
}

/**
 * Given nothing, returns the saved Filter or a default Filter if none is stored.
 */
export function loadFilters(): Filter {
  try {
    const raw = localStorage.getItem(FILTER_KEY);
    return raw ? (JSON.parse(raw) as Filter) : makeFilter();
  } catch {
    return makeFilter();
  }
}

/**
 * Given a Filter object, writes it to localStorage.
 */
export function saveFilters(filters: Filter): void {
  localStorage.setItem(FILTER_KEY, JSON.stringify(filters));
}

/**
 * Given nothing, returns true if the shortcut overlay has already been shown.
 */
export function shortcutsShown(): boolean {
  return !!localStorage.getItem(SHORTCUT_KEY);
}

/**
 * Given nothing, marks the shortcut overlay as having been shown.
 */
export function markShortcutsShown(): void {
  localStorage.setItem(SHORTCUT_KEY, '1');
}
