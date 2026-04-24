/**
 * app.ts
 * Owns the single global AppState object.
 * Wires all modules together via event listeners. No inline HTML event handlers.
 * All user actions: DOM event -> app.ts -> logic module -> saveArticles -> render.
 */

import { Article, AppState, Decision, makeFilter } from './models';
import {
  loadArticles, saveArticles, clearArticles,
  loadFilters, saveFilters,
  shortcutsShown, markShortcutsShown,
} from './storage';
import { parseRIS, parseBibTeX, deduplicateArticles } from './parser';
import { makeDecision, undoLastDecision, undoSession, getNextArticle, getPreviousArticle } from './screening';
import { addTag, removeTag, updateNotes } from './filter';
import { exportCSV, exportRIS, exportJSON } from './export';
import {
  renderArticleList, renderArticleDetail, renderStats,
  showSnackbar, clearSnackbar,
  openShortcutOverlay, closeShortcutOverlay,
  showImportError, showScreeningScreen, showImportScreen,
} from './ui';

const state: AppState = {
  articles:      [],
  currentId:     null,
  filters:       makeFilter(),
  snackbarFrame: null,
  snackbarTimer: null,
};

/**
 * Given nothing, initializes the application on DOMContentLoaded.
 */
export function boot(): void {
  state.articles = loadArticles();
  state.filters  = loadFilters();

  if (state.articles.length) {
    showScreeningScreen();
    renderAll();
    const first = state.articles.find(a => a.decision === 'unscreened') ?? state.articles[0];
    if (first) selectArticle(first.id);
  }

  if (!shortcutsShown()) {
    openShortcutOverlay();
    markShortcutsShown();
  }

  bindEvents();
  bindKeyboard();
}

/**
 * Given an article ID, sets it as current and renders the detail panel.
 */
function selectArticle(id: string): void {
  state.currentId = id;
  renderArticleList(state);
  const article = state.articles.find(a => a.id === id);
  if (article) renderArticleDetail(article);
}

/**
 * Given a Decision string, applies it to the current article and advances the queue.
 */
function decide(decision: Decision): void {
  if (!state.currentId) return;
  state.articles = makeDecision(state.currentId, decision, state.articles);
  saveArticles(state.articles);

  const updated = state.articles.find(a => a.id === state.currentId);
  if (decision === 'exclude' && updated) showSnackbar(updated, state);

  renderAll();
  if (updated) renderArticleDetail(updated);

  const next = getNextArticle(state.articles, state.currentId);
  if (next) selectArticle(next.id);
}

/**
 * Given a direction string, navigates to the next or previous article.
 */
function navigate(direction: 'next' | 'previous'): void {
  if (!state.currentId) return;
  const article = direction === 'next'
    ? getNextArticle(state.articles, state.currentId)
    : getPreviousArticle(state.articles, state.currentId);
  if (article) selectArticle(article.id);
}

/**
 * Given nothing, reverts the most recent session decision and re-renders.
 */
function undoLast(): void {
  clearSnackbar(state);
  const result = undoLastDecision(state.articles);
  state.articles = result.articles;
  saveArticles(state.articles);
  renderAll();
  if (result.reverted) selectArticle(result.reverted.id);
}

/**
 * Given nothing, reverts all session decisions after user confirmation.
 */
function undoSessionAll(): void {
  if (!confirm('Revert all decisions made this session?')) return;
  clearSnackbar(state);
  state.articles = undoSession(state.articles);
  saveArticles(state.articles);
  renderAll();
  const first = state.articles.find(a => a.decision === 'unscreened') ?? state.articles[0];
  if (first) selectArticle(first.id);
}

/**
 * Given a File object, reads, parses, deduplicates, and stores the citation set.
 */
function handleUpload(file: File): void {
  const name   = file.name.toLowerCase();
  const reader = new FileReader();

  reader.onload = (e: ProgressEvent<FileReader>): void => {
    const text = e.target?.result as string;
    let parsed: Article[] = [];

    if      (name.endsWith('.ris')) parsed = parseRIS(text);
    else if (name.endsWith('.bib')) parsed = parseBibTeX(text);
    else { showImportError('File must be .ris or .bib format.'); return; }

    const { unique } = deduplicateArticles([...state.articles, ...parsed]);
    state.articles   = unique;
    saveArticles(state.articles);
    showScreeningScreen();
    renderAll();

    const first = state.articles.find(a => a.decision === 'unscreened') ?? state.articles[0];
    if (first) selectArticle(first.id);
  };

  reader.readAsText(file);
}

/**
 * Given nothing, renders the article list and stats bar from current state.
 */
function renderAll(): void {
  renderArticleList(state);
  renderStats(state.articles);
}

/**
 * Given nothing, attaches all DOM event listeners using IDs. No inline handlers.
 */
function bindEvents(): void {
  // File upload
  document.getElementById('file-input')?.addEventListener('change', (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) handleUpload(file);
  });

  // Drag and drop
  const dropZone = document.getElementById('drop-zone');
  dropZone?.addEventListener('dragover',  (e) => { e.preventDefault(); dropZone.classList.add('border-blue-400'); });
  dropZone?.addEventListener('dragleave', ()  => { dropZone.classList.remove('border-blue-400'); });
  dropZone?.addEventListener('drop',      (e) => {
    e.preventDefault();
    dropZone.classList.remove('border-blue-400');
    const file = (e as DragEvent).dataTransfer?.files[0];
    if (file) handleUpload(file);
  });

  // Article list click delegation
  document.getElementById('article-list')?.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>('.article-btn');
    if (btn?.dataset['id']) selectArticle(btn.dataset['id']);
  });

  // Tag removal delegation
  document.getElementById('article-tags')?.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-remove-tag]');
    if (!btn || !state.currentId) return;
    const tag  = btn.dataset['removeTag']!;
    state.articles = state.articles.map(a => a.id === state.currentId ? removeTag(a, tag) : a);
    saveArticles(state.articles);
    const updated = state.articles.find(a => a.id === state.currentId);
    if (updated) renderArticleDetail(updated);
  });

  // Tag input
  document.getElementById('tag-input')?.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || !state.currentId) return;
    const input = e.target as HTMLInputElement;
    const tag   = input.value.trim();
    if (!tag) return;
    state.articles = state.articles.map(a => a.id === state.currentId ? addTag(a, tag) : a);
    saveArticles(state.articles);
    input.value = '';
    const updated = state.articles.find(a => a.id === state.currentId);
    if (updated) renderArticleDetail(updated);
  });

  // Notes autosave on blur
  document.getElementById('notes-input')?.addEventListener('blur', (e) => {
    if (!state.currentId) return;
    const notes = (e.target as HTMLTextAreaElement).value;
    state.articles = state.articles.map(a => a.id === state.currentId ? updateNotes(a, notes) : a);
    saveArticles(state.articles);
  });

  // Decision buttons
  document.getElementById('btn-include')?.addEventListener('click', () => decide('include'));
  document.getElementById('btn-maybe')?.addEventListener('click',   () => decide('maybe'));
  document.getElementById('btn-exclude')?.addEventListener('click', () => decide('exclude'));

  // Navigation
  document.getElementById('btn-next')?.addEventListener('click',     () => navigate('next'));
  document.getElementById('btn-previous')?.addEventListener('click', () => navigate('previous'));

  // Undo
  document.getElementById('btn-undo')?.addEventListener('click', () => undoLast());
  document.getElementById('btn-undo-session')?.addEventListener('click', () => undoSessionAll());

  // Shortcut overlay
  document.getElementById('btn-shortcuts')?.addEventListener('click',     () => openShortcutOverlay());
  document.getElementById('btn-close-overlay')?.addEventListener('click', () => closeShortcutOverlay());
  document.getElementById('btn-got-it')?.addEventListener('click',        () => closeShortcutOverlay());
  document.getElementById('shortcut-overlay')?.addEventListener('click', (e) => {
    if (e.target === document.getElementById('shortcut-overlay')) closeShortcutOverlay();
  });

  // Filters
  document.getElementById('status-filter')?.addEventListener('change', (e) => {
    state.filters.status = (e.target as HTMLSelectElement).value;
    saveFilters(state.filters);
    renderArticleList(state);
  });
  document.getElementById('search-input')?.addEventListener('input', (e) => {
    state.filters.query = (e.target as HTMLInputElement).value;
    saveFilters(state.filters);
    renderArticleList(state);
  });

  // Export
  document.getElementById('btn-export-csv')?.addEventListener('click',  () => exportCSV(state.articles));
  document.getElementById('btn-export-ris')?.addEventListener('click',  () => exportRIS(state.articles, 'include'));
  document.getElementById('btn-export-json')?.addEventListener('click', () => exportJSON(state.articles));

  // Clear all
  document.getElementById('btn-clear')?.addEventListener('click', () => {
    if (!confirm('Delete all articles? This cannot be undone.')) return;
    clearArticles();
    state.articles = [];
    state.currentId = null;
    showImportScreen();
  });
}

/**
 * Given nothing, attaches all keyboard shortcut listeners to the document.
 */
function bindKeyboard(): void {
  document.addEventListener('keydown', (e: KeyboardEvent): void => {
    const active = document.activeElement as HTMLElement;
    if (['input', 'textarea', 'select'].includes(active.tagName.toLowerCase())) return;

    switch (e.key) {
      case 'i': case 'I':       decide('include');   break;
      case 'e': case 'E':       decide('exclude');   break;
      case 'm': case 'M':       decide('maybe');     break;
      case 'j': case 'ArrowRight': navigate('next'); break;
      case 'k': case 'ArrowLeft':  navigate('previous'); break;
      case 'z': if (e.ctrlKey || e.metaKey) undoLast(); break;
      case '?':      openShortcutOverlay();  break;
      case 'Escape': closeShortcutOverlay(); break;
    }
  });
}
