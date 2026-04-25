import { Article, Filter, makeFilter } from './models';
import { CONFIG } from './config';

const FILTER_KEY   = CONFIG.STORAGE_KEY + '_filters';
const SHORTCUT_KEY = CONFIG.STORAGE_KEY + '_shortcuts_shown';

export function loadArticles(): Article[] {
  try { const raw = localStorage.getItem(CONFIG.STORAGE_KEY); return raw ? (JSON.parse(raw) as Article[]) : []; } 
  catch { return []; }
}

export function saveArticles(articles: Article[]): void {
  try { 
    localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(articles)); 
  } catch (e) { 
    console.warn("Incognito/Privacy limits active. Running safely in memory."); 
  }
}

export function clearArticles(): void {
  try { localStorage.removeItem(CONFIG.STORAGE_KEY); } catch {}
}

export function loadFilters(): Filter {
  try { const raw = localStorage.getItem(FILTER_KEY); return raw ? (JSON.parse(raw) as Filter) : makeFilter(); } 
  catch { return makeFilter(); }
}

export function saveFilters(filters: Filter): void {
  try { localStorage.setItem(FILTER_KEY, JSON.stringify(filters)); } catch {}
}

export function shortcutsShown(): boolean {
  try { return !!localStorage.getItem(SHORTCUT_KEY); } catch { return false; }
}

export function markShortcutsShown(): void {
  try { localStorage.setItem(SHORTCUT_KEY, '1'); } catch {}
}
