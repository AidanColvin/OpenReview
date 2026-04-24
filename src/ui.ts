/**
 * ui.ts
 * All DOM rendering functions. Reads from state and articles. Writes to DOM only.
 * Never writes to localStorage. Never contains decision or filter logic.
 */

import { Article, AppState, makeStats } from './models';
import { applyFilters } from './filter';
import { CONFIG } from './config';

/**
 * Given the full AppState, renders the filtered article list sidebar.
 */
export function renderArticleList(state: AppState): void {
  const list    = document.getElementById('article-list')!;
  const visible = applyFilters(state.articles, state.filters);

  if (!visible.length) {
    list.innerHTML = '<p class="text-xs text-gray-400 p-4 text-center">No articles match the current filters.</p>';
    return;
  }

  list.innerHTML = visible.map(a => `
    <button data-id="${a.id}"
      class="article-btn w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-l-2 ${
        a.id === state.currentId ? 'bg-blue-50 border-blue-500' : 'border-transparent'
      }">
      <p class="text-xs font-semibold pointer-events-none ${decisionColor(a.decision)}">${decisionLabel(a.decision)}</p>
      <p class="text-sm leading-snug mt-0.5 truncate pointer-events-none">${escapeHtml(a.title || '(No title)')}</p>
      <p class="text-xs text-gray-400 mt-0.5 truncate pointer-events-none">${escapeHtml(a.authors.slice(0, 2).join(', '))}</p>
    </button>
  `).join('');
}

/**
 * Given an Article, renders the full detail panel with metadata, tags, notes, and actions.
 */
export function renderArticleDetail(article: Article): void {
  document.getElementById('article-empty')!.classList.add('hidden');
  document.getElementById('article-detail')!.classList.remove('hidden');

  (document.getElementById('article-meta')     as HTMLElement).textContent = [article.journal, article.year].filter(Boolean).join(' · ');
  (document.getElementById('article-title')    as HTMLElement).textContent = article.title    || '(No title)';
  (document.getElementById('article-authors')  as HTMLElement).textContent = article.authors.join(', ');
  (document.getElementById('article-abstract') as HTMLElement).textContent = article.abstract || 'No abstract available.';
  (document.getElementById('notes-input')      as HTMLTextAreaElement).value = article.notes ?? '';

  document.getElementById('article-tags')!.innerHTML = article.tags.map(t => `
    <span class="bg-gray-100 text-gray-700 text-xs rounded-full px-2 py-0.5 flex items-center gap-1">
      ${escapeHtml(t)}
      <button data-remove-tag="${escapeHtml(t)}" class="text-gray-400 hover:text-red-400 leading-none text-base">&#x2715;</button>
    </span>
  `).join('');
}

/**
 * Given an articles array, renders the segmented progress bar and include rate.
 */
export function renderStats(articles: Article[]): void {
  const stats = makeStats(articles);
  const total = stats.total || 1;

  document.getElementById('stats-label')!.textContent =
    `${stats.included} included · ${stats.excluded} excluded · ${stats.maybe} maybe · ${stats.unscreened} unscreened`;
  document.getElementById('include-rate')!.textContent =
    `Include rate: ${(stats.include_rate * 100).toFixed(1)}%`;

  (document.getElementById('bar-included') as HTMLElement).style.width = `${(stats.included / total) * 100}%`;
  (document.getElementById('bar-excluded') as HTMLElement).style.width = `${(stats.excluded / total) * 100}%`;
  (document.getElementById('bar-maybe')    as HTMLElement).style.width = `${(stats.maybe    / total) * 100}%`;
}

/**
 * Given an excluded Article and the AppState, shows the 8-second undo snackbar with countdown.
 */
export function showSnackbar(article: Article, state: AppState): void {
  clearSnackbar(state);
  const snackbar = document.getElementById('snackbar')!;
  const label    = article.title.length > 60 ? article.title.slice(0, 60) + '...' : article.title;
  document.getElementById('snackbar-text')!.textContent = `Excluded: ${label}`;
  snackbar.classList.remove('hidden');

  const bar   = document.getElementById('snackbar-bar')!;
  const start = performance.now();

  const tick = (now: number): void => {
    const pct = Math.max(0, 100 - ((now - start) / CONFIG.UNDO_DURATION_MS) * 100);
    (bar as HTMLElement).style.width = `${pct}%`;
    if (pct > 0) {
      state.snackbarFrame = requestAnimationFrame(tick);
    } else {
      clearSnackbar(state);
    }
  };
  state.snackbarFrame = requestAnimationFrame(tick);
}

/**
 * Given the AppState, cancels the snackbar animation and hides it.
 */
export function clearSnackbar(state: AppState): void {
  if (state.snackbarFrame !== null) cancelAnimationFrame(state.snackbarFrame);
  if (state.snackbarTimer !== null) clearTimeout(state.snackbarTimer);
  state.snackbarFrame = null;
  state.snackbarTimer = null;
  document.getElementById('snackbar')!.classList.add('hidden');
}

export function openShortcutOverlay():  void { document.getElementById('shortcut-overlay')!.classList.remove('hidden'); }
export function closeShortcutOverlay(): void { document.getElementById('shortcut-overlay')!.classList.add('hidden'); }

/**
 * Given nothing, hides all other screens and shows the screening screen.
 */
export function showScreeningScreen(): void {
  document.getElementById('home-screen')!.classList.add('hidden');
  document.getElementById('create-review-overlay')!.classList.add('hidden');
  document.getElementById('import-screen')!.classList.add('hidden');
  document.getElementById('screening-screen')!.classList.remove('hidden');
}

/**
 * Given nothing, hides all other screens and shows the import (upload) screen.
 */
export function showImportScreen(): void {
  document.getElementById('home-screen')!.classList.add('hidden');
  document.getElementById('create-review-overlay')!.classList.add('hidden');
  document.getElementById('screening-screen')!.classList.add('hidden');
  document.getElementById('import-screen')!.classList.remove('hidden');
}

export function showImportError(msg: string): void {
  const el = document.getElementById('import-error')!;
  el.textContent = msg;
  el.classList.remove('hidden');
}

function decisionLabel(d: string): string {
  const map: Record<string, string> = { include: 'Included', exclude: 'Excluded', maybe: 'Maybe', unscreened: 'Unscreened' };
  return map[d] ?? d;
}

function decisionColor(d: string): string {
  const map: Record<string, string> = { include: 'text-green-600', exclude: 'text-red-500', maybe: 'text-amber-500', unscreened: 'text-gray-400' };
  return map[d] ?? 'text-gray-400';
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
