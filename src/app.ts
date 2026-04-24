/**
 * app.ts
 * Owns the single global AppState. Wires all modules via event listeners.
 * Flow: splash (1s) -> create review modal -> import screen -> screening.
 */

import { Article, AppState, Decision, makeFilter, makeArticle } from './models';
import {
  loadArticles, saveArticles, clearArticles,
  loadFilters, saveFilters,
} from './storage';
import { parseRIS, parseBibTeX, deduplicateArticles } from './parser';
import { makeDecision, undoLastDecision, undoSession, getNextArticle, getPreviousArticle } from './screening';
import { addTag, removeTag, updateNotes } from './filter';
import { exportCSV, exportRIS, exportJSON } from './export';
import { searchCrossref } from './crossref';
import {
  renderArticleList, renderArticleDetail, renderStats,
  showSnackbar, clearSnackbar,
  openShortcutOverlay, closeShortcutOverlay,
  showScreeningScreen, showImportScreen,
} from './ui';

const state: AppState = {
  articles:      [],
  currentId:     null,
  filters:       makeFilter(),
  snackbarFrame: null,
  snackbarTimer: null,
};

const MODAL_FIELDS = [
  'input-review-title',
  'input-review-topic',
  'input-review-type',
  'input-review-domain',
  'input-review-description',
];

// Track search state for re-rendering added indicators
const addedFromSearch = new Set<string>();
let lastSearchResults: Article[] = [];

// ─── Bootstrap ─────────────────────────────────────────────────────────────

/**
 * Given nothing, initializes the application on DOMContentLoaded.
 */
export function boot(): void {
  state.articles = loadArticles();
  state.filters  = loadFilters();
  bindEvents();
  bindKeyboard();
  startSplash();
}

/**
 * Given nothing, shows splash for 1 second then routes to the correct screen.
 */
function startSplash(): void {
  const splash = document.getElementById('splash-screen')!;
  const main   = document.getElementById('main-app')!;

  setTimeout(() => {
    splash.classList.add('or-fading');
    setTimeout(() => {
      splash.classList.add('hidden');
      main.classList.remove('hidden');

      if (state.articles.length) {
        showScreeningScreen();
        renderAll();
        const first = state.articles.find(a => a.decision === 'unscreened') ?? state.articles[0];
        if (first) selectArticle(first.id);
      } else {
        showCreateReviewModal();
      }
    }, 400);
  }, 1000);
}

// ─── Create Review Modal ───────────────────────────────────────────────────

/**
 * Given nothing, shows the home background and create review modal.
 */
function showCreateReviewModal(): void {
  document.getElementById('home-screen')!.classList.remove('hidden');
  document.getElementById('create-review-overlay')!.classList.remove('hidden');
  document.getElementById('import-screen')!.classList.add('hidden');
  document.getElementById('screening-screen')!.classList.add('hidden');
  setTimeout(() => {
    (document.getElementById('input-review-title') as HTMLInputElement)?.focus();
  }, 80);
}

/**
 * Given nothing, validates the modal and transitions to the import screen.
 */
function submitCreateReview(): void {
  const titleEl = document.getElementById('input-review-title') as HTMLInputElement;
  const title   = titleEl.value.trim();
  const errorEl = document.getElementById('modal-error')!;

  if (!title) {
    errorEl.classList.remove('hidden');
    titleEl.focus();
    return;
  }

  errorEl.classList.add('hidden');
  localStorage.setItem('openreview_review_title', title);
  document.getElementById('create-review-overlay')!.classList.add('hidden');
  document.getElementById('home-screen')!.classList.add('hidden');
  showImportScreen();
  renderImportArticleList();
}

// ─── Import Screen ─────────────────────────────────────────────────────────

/**
 * Given a tab name, activates that tab and hides the others.
 */
function switchImportTab(tab: 'upload' | 'search' | 'manual'): void {
  const tabs: Array<'upload' | 'search' | 'manual'> = ['upload', 'search', 'manual'];
  for (const t of tabs) {
    const btn   = document.getElementById(`tab-btn-${t}`)!;
    const panel = document.getElementById(`panel-${t}`)!;
    const active = t === tab;
    if (active) {
      btn.className = 'px-4 py-1.5 rounded-md text-sm font-medium bg-white shadow-sm text-gray-900 transition-all';
      panel.classList.remove('hidden');
      panel.classList.add('flex');
    } else {
      btn.className = 'px-4 py-1.5 rounded-md text-sm font-medium text-gray-500 hover:text-gray-700 transition-all';
      panel.classList.add('hidden');
      panel.classList.remove('flex');
    }
  }
  if (tab === 'search') {
    (document.getElementById('crossref-input') as HTMLInputElement)?.focus();
  }
  if (tab === 'manual') {
    (document.getElementById('manual-title') as HTMLInputElement)?.focus();
  }
}

/**
 * Given a File object, parses it and adds articles to the review. Does not navigate.
 */
function handleUpload(file: File): void {
  const name   = file.name.toLowerCase();
  const reader = new FileReader();
  const errEl  = document.getElementById('import-error')!;
  const okEl   = document.getElementById('import-success')!;

  errEl.classList.add('hidden');
  okEl.classList.add('hidden');

  reader.onload = (e: ProgressEvent<FileReader>): void => {
    const text = e.target?.result as string;
    let parsed: Article[] = [];

    if      (name.endsWith('.ris')) parsed = parseRIS(text);
    else if (name.endsWith('.bib')) parsed = parseBibTeX(text);
    else {
      errEl.textContent = 'File must be .ris or .bib format.';
      errEl.classList.remove('hidden');
      return;
    }

    const before = state.articles.length;
    const { unique } = deduplicateArticles([...state.articles, ...parsed]);
    const added = unique.length - before;
    state.articles = unique;
    saveArticles(state.articles);
    renderImportArticleList();

    okEl.textContent = `${added} article${added !== 1 ? 's' : ''} added from ${file.name}.`;
    okEl.classList.remove('hidden');
  };

  reader.readAsText(file);
}

/**
 * Given nothing, searches Crossref and renders results.
 */
async function searchPapers(): Promise<void> {
  const input   = document.getElementById('crossref-input') as HTMLInputElement;
  const query   = input.value.trim();
  const loading = document.getElementById('crossref-loading')!;
  const empty   = document.getElementById('crossref-empty')!;
  const errEl   = document.getElementById('crossref-error')!;
  const results = document.getElementById('crossref-results')!;

  if (!query) return;

  loading.classList.remove('hidden');
  empty.classList.add('hidden');
  errEl.classList.add('hidden');
  results.innerHTML = '';

  try {
    lastSearchResults = await searchCrossref(query);
    loading.classList.add('hidden');

    if (!lastSearchResults.length) {
      empty.classList.remove('hidden');
      return;
    }

    renderCrossrefResults();
  } catch {
    loading.classList.add('hidden');
    errEl.classList.remove('hidden');
  }
}

/**
 * Given nothing, renders the current lastSearchResults with added state indicators.
 */
function renderCrossrefResults(): void {
  const container = document.getElementById('crossref-results')!;
  const existingKeys = new Set(state.articles.map(a => a.doi || a.title));

  container.innerHTML = lastSearchResults.map(a => {
    const key     = a.doi || a.title;
    const isAdded = addedFromSearch.has(key) || existingKeys.has(key);
    const authors = a.authors.slice(0, 2).join(', ') + (a.authors.length > 2 ? ' et al.' : '');
    const meta    = [a.year, a.journal].filter(Boolean).join(' · ');

    return `
      <div class="bg-white border border-gray-200 rounded-lg p-3 flex gap-3 items-start hover:border-gray-300 transition-colors">
        <div class="flex-1 min-w-0">
          <p class="text-sm font-semibold text-gray-900 leading-snug mb-0.5"
            style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">
            ${htmlEscape(a.title || '(No title)')}
          </p>
          <p class="text-xs text-gray-500 truncate">${htmlEscape(authors)}</p>
          <p class="text-xs text-gray-400 mt-0.5">${htmlEscape(meta)}</p>
        </div>
        <button data-search-key="${htmlEscape(key)}" data-search-id="${a.id}"
          class="flex-shrink-0 text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${
            isAdded
              ? 'bg-green-100 text-green-700 cursor-default'
              : 'bg-gray-900 text-white hover:bg-gray-700'
          }">
          ${isAdded ? 'Added' : 'Add'}
        </button>
      </div>
    `;
  }).join('');
}

/**
 * Given an article ID from search results, adds that article to the review.
 */
function addFromSearch(articleId: string, key: string): void {
  const article = lastSearchResults.find(a => a.id === articleId);
  if (!article) return;

  addedFromSearch.add(key);
  const { unique } = deduplicateArticles([...state.articles, article]);
  state.articles = unique;
  saveArticles(state.articles);
  renderImportArticleList();
  renderCrossrefResults();
}

/**
 * Given nothing, reads the manual entry form and adds the article to the review.
 */
function submitManualEntry(): void {
  const title   = (document.getElementById('manual-title')   as HTMLInputElement).value.trim();
  const errEl   = document.getElementById('manual-error')!;

  if (!title) {
    errEl.classList.remove('hidden');
    (document.getElementById('manual-title') as HTMLInputElement).focus();
    return;
  }

  errEl.classList.add('hidden');

  const authorsRaw = (document.getElementById('manual-authors')  as HTMLInputElement).value.trim();
  const yearRaw    = (document.getElementById('manual-year')     as HTMLInputElement).value.trim();
  const journal    = (document.getElementById('manual-journal')  as HTMLInputElement).value.trim();
  const doi        = (document.getElementById('manual-doi')      as HTMLInputElement).value.trim();
  const abstract   = (document.getElementById('manual-abstract') as HTMLTextAreaElement).value.trim();

  const article = makeArticle({
    title,
    abstract,
    authors: authorsRaw ? authorsRaw.split(';').map(a => a.trim()).filter(Boolean) : [],
    year:    yearRaw ? parseInt(yearRaw, 10) : null,
    journal,
    doi,
  });

  const { unique } = deduplicateArticles([...state.articles, article]);
  state.articles = unique;
  saveArticles(state.articles);
  renderImportArticleList();

  // Clear form fields
  ['manual-title','manual-authors','manual-year','manual-journal','manual-doi','manual-abstract'].forEach(id => {
    const el = document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement;
    el.value = '';
  });
  (document.getElementById('manual-title') as HTMLInputElement).focus();
}

/**
 * Given nothing, renders the right-hand articles panel from current state.
 */
function renderImportArticleList(): void {
  const list    = document.getElementById('import-article-list')!;
  const empty   = document.getElementById('import-list-empty')!;
  const badge   = document.getElementById('article-count-badge')!;
  const startBtn = document.getElementById('btn-start-screening') as HTMLButtonElement;

  badge.textContent = String(state.articles.length);

  if (!state.articles.length) {
    empty.classList.remove('hidden');
    list.innerHTML = '';
    list.appendChild(empty);
    startBtn.disabled = true;
    startBtn.className = 'w-full bg-gray-900 text-white font-semibold py-2.5 rounded-lg text-sm transition-all opacity-40 cursor-not-allowed';
    return;
  }

  startBtn.disabled = false;
  startBtn.className = 'w-full bg-gray-900 text-white font-semibold py-2.5 rounded-lg text-sm transition-all hover:bg-gray-700';

  list.innerHTML = state.articles.map(a => {
    const authors = a.authors.slice(0, 2).join(', ');
    return `
      <div class="flex items-start gap-2 px-3 py-2.5 border-b border-gray-50 hover:bg-gray-50 transition-colors">
        <div class="flex-1 min-w-0">
          <p class="text-xs font-medium text-gray-900 leading-snug"
            style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">
            ${htmlEscape(a.title || '(No title)')}
          </p>
          <p class="text-xs text-gray-400 mt-0.5 truncate">${htmlEscape(authors)}</p>
        </div>
        <button data-remove-import="${a.id}"
          class="text-gray-300 hover:text-red-400 flex-shrink-0 text-lg leading-none mt-0.5 transition-colors">
          &#x2715;
        </button>
      </div>
    `;
  }).join('');
}

/**
 * Given an article ID, removes it from the review.
 */
function removeFromImport(id: string): void {
  state.articles = state.articles.filter(a => a.id !== id);
  saveArticles(state.articles);
  renderImportArticleList();
  if (lastSearchResults.length) renderCrossrefResults();
}

/**
 * Given nothing, transitions from the import screen to the screening screen.
 */
function startScreening(): void {
  if (!state.articles.length) return;
  showScreeningScreen();
  renderAll();
  const first = state.articles.find(a => a.decision === 'unscreened') ?? state.articles[0];
  if (first) selectArticle(first.id);
}

// ─── Screening ─────────────────────────────────────────────────────────────

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
 * Given nothing, reverts all session decisions after confirmation.
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
 * Given nothing, renders the article list and stats bar from current state.
 */
function renderAll(): void {
  renderArticleList(state);
  renderStats(state.articles);
}

// ─── Utilities ─────────────────────────────────────────────────────────────

/**
 * Given a string, returns an HTML-escaped version safe for innerHTML.
 */
function htmlEscape(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── Event Binding ─────────────────────────────────────────────────────────

/**
 * Given nothing, attaches all DOM event listeners. No inline HTML handlers.
 */
function bindEvents(): void {

  // Modal field Enter-key navigation
  MODAL_FIELDS.forEach((id, index) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('keydown', (ev: Event) => {
      const ke = ev as KeyboardEvent;
      if (ke.key !== 'Enter') return;
      if (el.tagName === 'TEXTAREA') {
        if (!ke.shiftKey) { ke.preventDefault(); submitCreateReview(); }
        return;
      }
      ke.preventDefault();
      const nextId = MODAL_FIELDS[index + 1];
      if (nextId) (document.getElementById(nextId) as HTMLElement)?.focus();
      else submitCreateReview();
    });
  });

  document.getElementById('btn-create-review')?.addEventListener('click', () => submitCreateReview());

  // Import tabs
  document.getElementById('tab-btn-upload')?.addEventListener('click', () => switchImportTab('upload'));
  document.getElementById('tab-btn-search')?.addEventListener('click', () => switchImportTab('search'));
  document.getElementById('tab-btn-manual')?.addEventListener('click', () => switchImportTab('manual'));

  // File upload
  document.getElementById('file-input')?.addEventListener('change', (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) handleUpload(file);
  });

  // Drag and drop
  const dropZone = document.getElementById('drop-zone');
  dropZone?.addEventListener('dragover',  (e) => { e.preventDefault(); dropZone.classList.add('border-blue-400', 'bg-blue-50'); });
  dropZone?.addEventListener('dragleave', ()  => { dropZone.classList.remove('border-blue-400', 'bg-blue-50'); });
  dropZone?.addEventListener('drop',      (e) => {
    e.preventDefault();
    dropZone.classList.remove('border-blue-400', 'bg-blue-50');
    const file = (e as DragEvent).dataTransfer?.files[0];
    if (file) handleUpload(file);
  });

  // Crossref search
  document.getElementById('btn-crossref-search')?.addEventListener('click', () => { void searchPapers(); });
  document.getElementById('crossref-input')?.addEventListener('keydown', (e) => {
    if ((e as KeyboardEvent).key === 'Enter') void searchPapers();
  });

  // Add from search results (event delegation)
  document.getElementById('crossref-results')?.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-search-id]');
    if (!btn) return;
    const id  = btn.dataset['searchId']!;
    const key = btn.dataset['searchKey']!;
    if (!btn.classList.contains('bg-green-100')) addFromSearch(id, key);
  });

  // Remove from import panel (event delegation)
  document.getElementById('import-article-list')?.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-remove-import]');
    if (btn) removeFromImport(btn.dataset['removeImport']!);
  });

  // Manual entry
  document.getElementById('btn-manual-add')?.addEventListener('click', () => submitManualEntry());
  document.getElementById('manual-abstract')?.addEventListener('keydown', (e) => {
    if ((e as KeyboardEvent).key === 'Enter' && (e as KeyboardEvent).ctrlKey) submitManualEntry();
  });

  // Start screening
  document.getElementById('btn-start-screening')?.addEventListener('click', () => startScreening());

  // Article list click delegation
  document.getElementById('article-list')?.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>('.article-btn');
    if (btn?.dataset['id']) selectArticle(btn.dataset['id']);
  });

  // Tag removal delegation
  document.getElementById('article-tags')?.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-remove-tag]');
    if (!btn || !state.currentId) return;
    const tag = btn.dataset['removeTag']!;
    state.articles = state.articles.map(a => a.id === state.currentId ? removeTag(a, tag) : a);
    saveArticles(state.articles);
    const updated = state.articles.find(a => a.id === state.currentId);
    if (updated) renderArticleDetail(updated);
  });

  // Tag input
  document.getElementById('tag-input')?.addEventListener('keydown', (e) => {
    if ((e as KeyboardEvent).key !== 'Enter' || !state.currentId) return;
    const input = e.target as HTMLInputElement;
    const tag   = input.value.trim();
    if (!tag) return;
    state.articles = state.articles.map(a => a.id === state.currentId ? addTag(a, tag) : a);
    saveArticles(state.articles);
    input.value = '';
    const updated = state.articles.find(a => a.id === state.currentId);
    if (updated) renderArticleDetail(updated);
  });

  // Notes autosave
  document.getElementById('notes-input')?.addEventListener('blur', (e) => {
    if (!state.currentId) return;
    const notes = (e.target as HTMLTextAreaElement).value;
    state.articles = state.articles.map(a => a.id === state.currentId ? updateNotes(a, notes) : a);
    saveArticles(state.articles);
  });

  // Decisions
  document.getElementById('btn-include')?.addEventListener('click', () => decide('include'));
  document.getElementById('btn-maybe')?.addEventListener('click',   () => decide('maybe'));
  document.getElementById('btn-exclude')?.addEventListener('click', () => decide('exclude'));

  // Navigation
  document.getElementById('btn-next')?.addEventListener('click',     () => navigate('next'));
  document.getElementById('btn-previous')?.addEventListener('click', () => navigate('previous'));

  // Undo
  document.getElementById('btn-undo')?.addEventListener('click',         () => undoLast());
  document.getElementById('btn-undo-session')?.addEventListener('click', () => undoSessionAll());

  // Shortcut overlay
  document.getElementById('btn-shortcuts')?.addEventListener('click',     () => openShortcutOverlay());
  document.getElementById('btn-close-overlay')?.addEventListener('click', () => closeShortcutOverlay());
  document.getElementById('btn-got-it')?.addEventListener('click',        () => closeShortcutOverlay());
  document.getElementById('shortcut-overlay')?.addEventListener('click',  (e) => {
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
    state.articles  = [];
    state.currentId = null;
    showImportScreen();
    renderImportArticleList();
  });
}

/**
 * Given nothing, attaches keyboard shortcuts. Ignores input when modal is open.
 */
function bindKeyboard(): void {
  document.addEventListener('keydown', (e: KeyboardEvent): void => {
    const active    = document.activeElement as HTMLElement;
    const modalOpen = !document.getElementById('create-review-overlay')!.classList.contains('hidden');
    if (modalOpen) return;
    if (['input', 'textarea', 'select'].includes(active.tagName.toLowerCase())) return;

    switch (e.key) {
      case 'i': case 'I':          decide('include');    break;
      case 'e': case 'E':          decide('exclude');    break;
      case 'm': case 'M':          decide('maybe');      break;
      case 'j': case 'ArrowRight': navigate('next');     break;
      case 'k': case 'ArrowLeft':  navigate('previous'); break;
      case 'z': if (e.ctrlKey || e.metaKey) undoLast();  break;
      case '?':      openShortcutOverlay();  break;
      case 'Escape': closeShortcutOverlay(); break;
    }
  });
}
