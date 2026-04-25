/**
 * app.ts
 * Single state owner. Wires all modules. No logic in HTML.
 */

import { Article, AppState, Decision, makeFilter, makeStats } from './models';
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
} from './ui';

const state: AppState = {
  articles:      [],
  currentId:     null,
  filters:       makeFilter(),
  snackbarFrame: null,
  snackbarTimer: null,
};

const MODAL_FIELDS = [
  'input-review-title','input-review-topic',
  'input-review-type','input-review-domain','input-review-description',
];

let lastSearchResults: Article[] = [];
const addedKeys = new Set<string>();
let duplicatesRemoved = 0;
let abstractTargetArticle: Article | null = null;

// ─── Boot ────────────────────────────────────────────────────────────────────

export function boot(): void {
  state.articles = loadArticles();
  state.filters  = loadFilters();
  bindEvents();
  bindKeyboard();
  startSplash();
}

function startSplash(): void {
  const splash = document.getElementById('splash-screen')!;
  const main   = document.getElementById('main-app')!;
  setTimeout(() => {
    splash.classList.add('or-fading');
    setTimeout(() => {
      splash.classList.add('hidden');
      main.classList.remove('hidden');
      if (state.articles.length) {
        showScreen('screening');
        renderAll();
        const first = state.articles.find(a => a.decision === 'unscreened') ?? state.articles[0];
        if (first) selectArticle(first.id);
      } else {
        showCreateReviewModal();
      }
    }, 400);
  }, 1000);
}

// ─── Screen router ────────────────────────────────────────────────────────────

type Screen = 'home' | 'import' | 'screening' | 'analysis' | 'export';

function showScreen(s: Screen): void {
  const ids: Screen[] = ['import','screening','analysis','export'];
  for (const id of ids) {
    const el = document.getElementById(`${id}-screen`);
    if (el) el.classList.toggle('hidden', id !== s);
  }
  document.getElementById('home-screen')!.classList.toggle('hidden', s !== 'home');

  const navMap: Record<string, Screen> = {
    'nav-import': 'import',
    'nav-screening': 'screening',
    'nav-analysis': 'analysis',
    'nav-export': 'export',
  };
  for (const [btnId, screen] of Object.entries(navMap)) {
    const btn = document.getElementById(btnId)!;
    btn.classList.toggle('active', screen === s);
  }

  if (s === 'analysis') updateAnalysis();
}

// ─── Create Review Modal ──────────────────────────────────────────────────────

function showCreateReviewModal(): void {
  document.getElementById('home-screen')!.classList.remove('hidden');
  document.getElementById('create-review-overlay')!.classList.remove('hidden');
  document.getElementById('import-screen')!.classList.add('hidden');
  document.getElementById('screening-screen')!.classList.add('hidden');
  document.getElementById('analysis-screen')!.classList.add('hidden');
  document.getElementById('export-screen')!.classList.add('hidden');
  setTimeout(() => (document.getElementById('input-review-title') as HTMLInputElement)?.focus(), 80);
}

function submitCreateReview(): void {
  const titleEl = document.getElementById('input-review-title') as HTMLInputElement;
  const title   = titleEl.value.trim();
  const errEl   = document.getElementById('modal-error')!;
  if (!title) { errEl.classList.remove('hidden'); titleEl.focus(); return; }
  errEl.classList.add('hidden');
  localStorage.setItem('openreview_review_title', title);

  const typeEl   = document.getElementById('input-review-type')   as HTMLSelectElement;
  const domainEl = document.getElementById('input-review-domain') as HTMLSelectElement;
  document.getElementById('review-title-display')!.textContent = title;

  const meta = [typeEl.value, domainEl.value].filter(Boolean).join(' · ');
  document.getElementById('review-meta-display')!.textContent = meta;

  document.getElementById('create-review-overlay')!.classList.add('hidden');
  document.getElementById('home-screen')!.classList.add('hidden');
  showScreen('import');
  renderImportArticleList();
}

// ─── Import screen ────────────────────────────────────────────────────────────

function handleUpload(file: File): void {
  const name   = file.name.toLowerCase();
  const errEl  = document.getElementById('import-error')!;
  const okEl   = document.getElementById('import-success')!;
  errEl.style.display = 'none';
  okEl.style.display  = 'none';

  const reader = new FileReader();
  reader.onload = (e: ProgressEvent<FileReader>): void => {
    const text   = e.target?.result as string;
    let parsed: Article[] = [];
    if      (name.endsWith('.ris')) parsed = parseRIS(text);
    else if (name.endsWith('.bib')) parsed = parseBibTeX(text);
    else { errEl.textContent = 'File must be .ris or .bib'; errEl.style.display = 'block'; return; }

    const before = state.articles.length;
    const { unique, removed } = deduplicateArticles([...state.articles, ...parsed]);
    duplicatesRemoved += removed.length;
    const added = unique.length - before;
    state.articles = unique;
    saveArticles(state.articles);
    renderImportArticleList();
    okEl.textContent = `${added} article${added !== 1 ? 's' : ''} added.`;
    okEl.style.display = 'block';
  };
  reader.readAsText(file);
}

async function searchPapers(): Promise<void> {
  const input   = document.getElementById('crossref-input') as HTMLInputElement;
  const query   = input.value.trim();
  const loading = document.getElementById('crossref-loading')!;
  const empty   = document.getElementById('crossref-empty')!;
  const errEl   = document.getElementById('crossref-error')!;
  const results = document.getElementById('crossref-results')!;

  if (!query) return;
  loading.style.display  = 'block';
  empty.style.display    = 'none';
  errEl.style.display    = 'none';
  results.innerHTML      = '';

  try {
    lastSearchResults = await searchCrossref(query);
    loading.style.display = 'none';
    if (!lastSearchResults.length) { empty.style.display = 'block'; return; }
    renderSearchResults();
  } catch {
    loading.style.display = 'none';
    errEl.style.display   = 'block';
  }
}

function renderSearchResults(): void {
  const container  = document.getElementById('crossref-results')!;
  const existingKeys = new Set(state.articles.map(a => a.doi || a.title));

  container.innerHTML = lastSearchResults.map((a, i) => {
    const key     = a.doi || a.title;
    const isAdded = addedKeys.has(key) || existingKeys.has(key);
    const authors = a.authors.slice(0, 2).join(', ') + (a.authors.length > 2 ? ' et al.' : '');
    const meta    = [a.year, a.journal].filter(Boolean).join(' · ');
    return `
      <div style="display:flex;align-items:flex-start;gap:0.75rem;padding:0.875rem 1rem;border-bottom:1px solid #f0ece8;${i === lastSearchResults.length - 1 ? 'border-bottom:none' : ''}">
        <div style="flex:1;min-width:0">
          <p class="sr-title" data-idx="${i}" style="font-size:0.875rem;font-weight:600;color:#1a1a1a;line-height:1.35;margin:0 0 2px;cursor:pointer"
            title="Click to view abstract">
            ${htmlEscape(a.title || '(No title)')}
          </p>
          <p style="font-size:0.75rem;color:#9e9e9e;margin:0">${htmlEscape(authors)}</p>
          <p style="font-size:0.72rem;color:#b0a898;margin:2px 0 0">${htmlEscape(meta)}</p>
        </div>
        <button data-add-idx="${i}" data-add-key="${htmlEscape(key)}"
          style="flex-shrink:0;font-size:0.8rem;font-weight:600;font-family:'DM Sans',sans-serif;padding:4px 10px;border-radius:6px;border:none;cursor:pointer;transition:all .15s;${
            isAdded
              ? 'color:#16a34a;background:#f0fdf4;cursor:default'
              : 'color:#c4622d;background:#fdf0ea'
          }">
          ${isAdded ? 'Added' : '+ add'}
        </button>
      </div>
    `;
  }).join('');
}

function openAbstractModal(idx: number): void {
  const a = lastSearchResults[idx];
  if (!a) return;
  abstractTargetArticle = a;

  document.getElementById('abstract-modal-title')!.textContent = a.title || '(No title)';
  const meta = [a.authors.slice(0,3).join(', '), a.journal, a.year ? String(a.year) : ''].filter(Boolean).join(' · ');
  document.getElementById('abstract-modal-meta')!.textContent = meta;
  document.getElementById('abstract-modal-body')!.textContent = a.abstract || 'No abstract available.';
  const doiEl = document.getElementById('abstract-modal-doi')!;
  if (a.doi) {
    doiEl.innerHTML = `DOI: <a href="https://doi.org/${htmlEscape(a.doi)}" target="_blank" style="color:#c4622d;text-decoration:underline">${htmlEscape(a.doi)}</a>`;
  } else {
    doiEl.textContent = '';
  }

  const key     = a.doi || a.title;
  const isAdded = addedKeys.has(key) || state.articles.some(x => (x.doi || x.title) === key);
  const addBtn  = document.getElementById('btn-abstract-add')!;
  addBtn.textContent = isAdded ? 'Already Added' : '+ Add to Review';
  (addBtn as HTMLButtonElement).disabled = isAdded;
  addBtn.style.opacity = isAdded ? '0.5' : '1';

  document.getElementById('abstract-modal')!.classList.remove('hidden');
}

function addFromSearch(idx: number, key: string): void {
  const article = lastSearchResults[idx];
  if (!article) return;
  addedKeys.add(key);
  const { unique, removed } = deduplicateArticles([...state.articles, article]);
  duplicatesRemoved += removed.length;
  state.articles = unique;
  saveArticles(state.articles);
  renderImportArticleList();
  renderSearchResults();
}

function renderImportArticleList(): void {
  const list    = document.getElementById('import-article-list')!;
  const emptyEl = document.getElementById('import-list-empty')!;
  const startBtn = document.getElementById('btn-start-screening') as HTMLButtonElement;
  const statA   = document.getElementById('stat-articles')!;
  const statD   = document.getElementById('stat-duplicates')!;

  statA.textContent = String(state.articles.length);
  statD.textContent = String(duplicatesRemoved);

  if (!state.articles.length) {
    list.innerHTML = '';
    list.appendChild(emptyEl);
    emptyEl.style.display = 'block';
    startBtn.disabled = true;
    startBtn.style.background = '#e8e4df';
    startBtn.style.color = '#9e9e9e';
    startBtn.style.cursor = 'not-allowed';
    return;
  }

  emptyEl.style.display = 'none';
  startBtn.disabled = false;
  startBtn.style.background = '#1a1a1a';
  startBtn.style.color = '#fff';
  startBtn.style.cursor = 'pointer';

  list.innerHTML = state.articles.map(a => {
    const authors = a.authors.slice(0, 2).join(', ') + (a.authors.length > 2 ? ' et al.' : '');
    const meta    = [authors, a.journal, a.year].filter(Boolean).join(' · ');
    return `
      <div class="article-row" style="display:flex;align-items:flex-start;gap:0.5rem;padding:0.7rem 1rem;border-bottom:1px solid #f0ece8">
        <div style="flex:1;min-width:0">
          <p style="font-size:0.82rem;font-weight:600;color:#1a1a1a;margin:0 0 2px;line-height:1.35;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">
            ${htmlEscape(a.title || '(No title)')}
          </p>
          <p style="font-size:0.72rem;color:#9e9e9e;margin:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${htmlEscape(meta)}</p>
        </div>
        <span style="flex-shrink:0;font-size:0.68rem;font-weight:600;color:#c4622d;background:#fdf0ea;padding:2px 7px;border-radius:4px;margin-top:2px">imported</span>
        <button data-remove-import="${a.id}"
          style="flex-shrink:0;background:none;border:none;cursor:pointer;color:#d1cdc8;font-size:1rem;line-height:1;padding:0 2px;margin-top:1px">&#x2715;</button>
      </div>
    `;
  }).join('');
}

function removeFromImport(id: string): void {
  state.articles = state.articles.filter(a => a.id !== id);
  saveArticles(state.articles);
  renderImportArticleList();
  if (lastSearchResults.length) renderSearchResults();
}

function startScreening(): void {
  if (!state.articles.length) return;
  showScreen('screening');
  renderAll();
  updateCriteriaStrip();
  const first = state.articles.find(a => a.decision === 'unscreened') ?? state.articles[0];
  if (first) selectArticle(first.id);
}

function updateCriteriaStrip(): void {
  const inclusion = localStorage.getItem('openreview_inclusion') || '';
  const strip     = document.getElementById('criteria-strip');
  const box       = document.getElementById('screening-criteria-box');
  if (!strip || !box) return;
  if (inclusion.trim()) {
    const text = `Inclusion: ${inclusion.trim().split('\n').join(' | ')}`;
    strip.textContent = text;
    strip.classList.remove('hidden');
    box.textContent = text;
    box.classList.remove('hidden');
  } else {
    strip.classList.add('hidden');
    box.classList.add('hidden');
  }
}

// ─── Screening ────────────────────────────────────────────────────────────────

function selectArticle(id: string): void {
  state.currentId = id;
  renderArticleList(state);
  const article = state.articles.find(a => a.id === id);
  if (article) renderArticleDetail(article);
}

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

function navigate(direction: 'next' | 'previous'): void {
  if (!state.currentId) return;
  const a = direction === 'next'
    ? getNextArticle(state.articles, state.currentId)
    : getPreviousArticle(state.articles, state.currentId);
  if (a) selectArticle(a.id);
}

function undoLast(): void {
  clearSnackbar(state);
  const result = undoLastDecision(state.articles);
  state.articles = result.articles;
  saveArticles(state.articles);
  renderAll();
  if (result.reverted) selectArticle(result.reverted.id);
}

function undoSessionAll(): void {
  if (!confirm('Revert all session decisions?')) return;
  clearSnackbar(state);
  state.articles = undoSession(state.articles);
  saveArticles(state.articles);
  renderAll();
  const first = state.articles.find(a => a.decision === 'unscreened') ?? state.articles[0];
  if (first) selectArticle(first.id);
}

function renderAll(): void {
  renderArticleList(state);
  renderStats(state.articles);
}

// ─── Analysis ─────────────────────────────────────────────────────────────────

function updateAnalysis(): void {
  const s = makeStats(state.articles);
  const set = (id: string, v: number) => { const el = document.getElementById(id); if (el) el.textContent = String(v); };
  set('analysis-total',    s.total);
  set('analysis-included', s.included);
  set('analysis-excluded', s.excluded);
  set('analysis-maybe',    s.maybe);
  set('prisma-n-identified', s.total);
  set('prisma-n-screened',   s.total - s.unscreened);
  set('prisma-n-included',   s.included);
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function htmlEscape(s: string): string {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ─── Event Binding ────────────────────────────────────────────────────────────

function bindEvents(): void {

  // Nav tabs
  document.getElementById('nav-import')?.addEventListener('click',    () => showScreen('import'));
  document.getElementById('nav-screening')?.addEventListener('click', () => { showScreen('screening'); renderAll(); });
  document.getElementById('nav-analysis')?.addEventListener('click',  () => showScreen('analysis'));
  document.getElementById('nav-export')?.addEventListener('click',    () => showScreen('export'));

  // Modal field Enter navigation
  MODAL_FIELDS.forEach((id, i) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('keydown', (ev: Event) => {
      const ke = ev as KeyboardEvent;
      if (ke.key !== 'Enter') return;
      if (el.tagName === 'TEXTAREA') { if (!ke.shiftKey) { ke.preventDefault(); submitCreateReview(); } return; }
      ke.preventDefault();
      const next = MODAL_FIELDS[i + 1];
      if (next) (document.getElementById(next) as HTMLElement)?.focus();
      else submitCreateReview();
    });
  });
  document.getElementById('btn-create-review')?.addEventListener('click', () => submitCreateReview());

  // File upload & drag-drop
  document.getElementById('file-input')?.addEventListener('change', (e) => {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (f) handleUpload(f);
  });
  const dz = document.getElementById('drop-zone');
  dz?.addEventListener('dragover',  (e) => { e.preventDefault(); dz.style.borderColor='#c4622d'; dz.style.background='#fdf0ea'; });
  dz?.addEventListener('dragleave', ()  => { dz.style.borderColor='#d5cfc9'; dz.style.background=''; });
  dz?.addEventListener('drop',      (e) => {
    e.preventDefault(); dz.style.borderColor='#d5cfc9'; dz.style.background='';
    const f = (e as DragEvent).dataTransfer?.files[0];
    if (f) handleUpload(f);
  });

  // Search
  document.getElementById('btn-crossref-search')?.addEventListener('click', () => { void searchPapers(); });
  document.getElementById('crossref-input')?.addEventListener('keydown', (e) => {
    if ((e as KeyboardEvent).key === 'Enter') void searchPapers();
  });

  // Search results: add or open abstract (event delegation)
  document.getElementById('crossref-results')?.addEventListener('click', (e) => {
    const addBtn  = (e.target as HTMLElement).closest<HTMLElement>('[data-add-idx]');
    const titleEl = (e.target as HTMLElement).closest<HTMLElement>('.sr-title');
    if (addBtn && !addBtn.classList.contains('cursor-default')) {
      const idx = parseInt(addBtn.dataset['addIdx']!);
      const key = addBtn.dataset['addKey']!;
      addFromSearch(idx, key);
    } else if (titleEl) {
      openAbstractModal(parseInt(titleEl.dataset['idx']!));
    }
  });

  // Abstract modal buttons
  document.getElementById('btn-close-abstract')?.addEventListener('click',   () => document.getElementById('abstract-modal')!.classList.add('hidden'));
  document.getElementById('btn-close-abstract-2')?.addEventListener('click', () => document.getElementById('abstract-modal')!.classList.add('hidden'));
  document.getElementById('abstract-modal')?.addEventListener('click', (e) => {
    if (e.target === document.getElementById('abstract-modal')) document.getElementById('abstract-modal')!.classList.add('hidden');
  });
  document.getElementById('btn-abstract-add')?.addEventListener('click', () => {
    if (!abstractTargetArticle) return;
    const key = abstractTargetArticle.doi || abstractTargetArticle.title;
    addedKeys.add(key);
    const { unique, removed } = deduplicateArticles([...state.articles, abstractTargetArticle]);
    duplicatesRemoved += removed.length;
    state.articles = unique;
    saveArticles(state.articles);
    renderImportArticleList();
    if (lastSearchResults.length) renderSearchResults();
    document.getElementById('abstract-modal')!.classList.add('hidden');
  });

  // Import list remove (delegation)
  document.getElementById('import-article-list')?.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-remove-import]');
    if (btn) removeFromImport(btn.dataset['removeImport']!);
  });

  // Start screening
  document.getElementById('btn-start-screening')?.addEventListener('click', () => startScreening());

  // Inclusion criteria modal
  document.getElementById('btn-inclusion-criteria')?.addEventListener('click', () => {
    const incl = localStorage.getItem('openreview_inclusion') || '';
    const excl = localStorage.getItem('openreview_exclusion') || '';
    (document.getElementById('criteria-inclusion') as HTMLTextAreaElement).value = incl;
    (document.getElementById('criteria-exclusion') as HTMLTextAreaElement).value = excl;
    document.getElementById('inclusion-modal')!.classList.remove('hidden');
  });
  document.getElementById('btn-close-inclusion')?.addEventListener('click', () => document.getElementById('inclusion-modal')!.classList.add('hidden'));
  document.getElementById('btn-save-criteria')?.addEventListener('click', () => {
    const incl = (document.getElementById('criteria-inclusion') as HTMLTextAreaElement).value;
    const excl = (document.getElementById('criteria-exclusion') as HTMLTextAreaElement).value;
    localStorage.setItem('openreview_inclusion', incl);
    localStorage.setItem('openreview_exclusion', excl);
    document.getElementById('inclusion-modal')!.classList.add('hidden');
  });

  // Review team modal
  document.getElementById('btn-review-team')?.addEventListener('click',   () => document.getElementById('team-modal')!.classList.remove('hidden'));
  document.getElementById('btn-close-team')?.addEventListener('click',    () => document.getElementById('team-modal')!.classList.add('hidden'));

  // Manage articles = go to screening
  document.getElementById('btn-manage-articles')?.addEventListener('click', () => {
    if (!state.articles.length) return;
    showScreen('screening'); renderAll();
    const first = state.articles.find(a => a.decision === 'unscreened') ?? state.articles[0];
    if (first) selectArticle(first.id);
  });

  // Screening: article list delegation
  document.getElementById('article-list')?.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>('.article-btn');
    if (btn?.dataset['id']) selectArticle(btn.dataset['id']);
  });

  // Tags
  document.getElementById('article-tags')?.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-remove-tag]');
    if (!btn || !state.currentId) return;
    const tag = btn.dataset['removeTag']!;
    state.articles = state.articles.map(a => a.id === state.currentId ? removeTag(a, tag) : a);
    saveArticles(state.articles);
    const u = state.articles.find(a => a.id === state.currentId);
    if (u) renderArticleDetail(u);
  });
  document.getElementById('tag-input')?.addEventListener('keydown', (e) => {
    if ((e as KeyboardEvent).key !== 'Enter' || !state.currentId) return;
    const inp = e.target as HTMLInputElement;
    const tag = inp.value.trim();
    if (!tag) return;
    state.articles = state.articles.map(a => a.id === state.currentId ? addTag(a, tag) : a);
    saveArticles(state.articles);
    inp.value = '';
    const u = state.articles.find(a => a.id === state.currentId);
    if (u) renderArticleDetail(u);
  });

  // Notes
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

  // Shortcuts
  document.getElementById('btn-shortcuts')?.addEventListener('click',     () => openShortcutOverlay());
  document.getElementById('btn-close-overlay')?.addEventListener('click', () => closeShortcutOverlay());
  document.getElementById('btn-got-it')?.addEventListener('click',        () => closeShortcutOverlay());
  document.getElementById('shortcut-overlay')?.addEventListener('click',  (e) => {
    if (e.target === document.getElementById('shortcut-overlay')) closeShortcutOverlay();
  });

  // Filters
  document.getElementById('status-filter')?.addEventListener('change', (e) => {
    state.filters.status = (e.target as HTMLSelectElement).value;
    saveFilters(state.filters); renderArticleList(state);
  });
  document.getElementById('search-input')?.addEventListener('input', (e) => {
    state.filters.query = (e.target as HTMLInputElement).value;
    saveFilters(state.filters); renderArticleList(state);
  });

  // Export buttons (both sets)
  const doExportCSV  = () => exportCSV(state.articles);
  const doExportRIS  = () => exportRIS(state.articles, 'include');
  const doExportJSON = () => exportJSON(state.articles);
  document.getElementById('btn-export-csv')?.addEventListener('click',   doExportCSV);
  document.getElementById('btn-export-ris')?.addEventListener('click',   doExportRIS);
  document.getElementById('btn-export-json')?.addEventListener('click',  doExportJSON);
  document.getElementById('btn-export-csv-2')?.addEventListener('click',  doExportCSV);
  document.getElementById('btn-export-ris-2')?.addEventListener('click',  doExportRIS);
  document.getElementById('btn-export-json-2')?.addEventListener('click', doExportJSON);

  // Clear all
  document.getElementById('btn-clear')?.addEventListener('click', () => {
    if (!confirm('Delete all articles? This cannot be undone.')) return;
    clearArticles(); state.articles = []; state.currentId = null;
    showScreen('import'); renderImportArticleList();
  });
}

function bindKeyboard(): void {
  document.addEventListener('keydown', (e: KeyboardEvent): void => {
    const active    = document.activeElement as HTMLElement;
    const modalOpen = !document.getElementById('create-review-overlay')!.classList.contains('hidden');
    if (modalOpen) return;
    if (['input','textarea','select'].includes(active.tagName.toLowerCase())) return;
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
