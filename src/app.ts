/**
 * app.ts
 * Single state owner. Wires all modules. No logic in HTML.
 */
import { Article, AppState, Decision, makeFilter, makeStats, makeArticle } from './models';
import { loadArticles, saveArticles, clearArticles, loadFilters, saveFilters } from './storage';
import { parseRIS, parseBibTeX, parsePdf, parseDocx } from './parser';
import { makeDecision, undoLastDecision, undoSession, getNextArticle, getPreviousArticle } from './screening';
import { addTag, removeTag, updateNotes } from './filter';
import { exportCSV, exportRIS, exportJSON } from './export';
import { searchCrossref } from './crossref';
import { renderArticleList, renderArticleDetail, renderStats, showSnackbar, clearSnackbar } from './ui';

const state: AppState = {
  articles: [], currentId: null, filters: makeFilter(),
  snackbarFrame: null, snackbarTimer: null,
};

const MODAL_FIELDS = [
  'input-review-title','input-review-topic',
  'input-review-type','input-review-domain','input-review-description',
];

let lastSearchResults: Article[] = [];
const addedKeys = new Set<string>();
let dupCount = 0;
let abstractTarget: Article | null = null;

// Sequential upload queue — prevents race condition that caused overwriting
let uploadQueue: File[] = [];
let isProcessing = false;

function esc(s: any): string {
  if (!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function show(id: string, flex = false): void {
  document.getElementById(id)!.style.display = flex ? 'flex' : 'block';
}
function hide(id: string): void { document.getElementById(id)!.style.display = 'none'; }
function el(id: string): HTMLElement { return document.getElementById(id)!; }

export function boot(): void {
  state.articles = loadArticles();
  state.filters  = loadFilters();
  bindEvents();
  bindKeyboard();
  startSplash();
}

function startSplash(): void {
  const splash = el('splash-screen');
  setTimeout(() => {
    splash.classList.add('fading');
    setTimeout(() => {
      hide('splash-screen');
      show('main-app', true);
      (el('main-app')).style.flexDirection = 'column';
      if (state.articles.length) { showScreen('screening'); renderAll(); autoSelectFirst(); }
      else showCreateReviewModal();
    }, 400);
  }, 1000);
}

type Screen = 'import' | 'screening' | 'analysis' | 'export';

function showScreen(s: Screen): void {
  (['import','screening','analysis','export'] as Screen[]).forEach(scr => {
    document.getElementById(scr + '-screen')!.style.display = scr === s ? 'block' : 'none';
  });
  hide('home-screen');
  hide('create-review-overlay');
  const map: Record<string, Screen> = {
    'nav-import':'import','nav-screening':'screening','nav-analysis':'analysis','nav-export':'export',
  };
  for (const [btnId, screen] of Object.entries(map)) {
    el(btnId).classList.toggle('active', screen === s);
  }
  if (s === 'analysis') refreshAnalysis();
}

function showCreateReviewModal(): void {
  show('home-screen');
  el('create-review-overlay').style.display = 'flex';
  (['import','screening','analysis','export'] as Screen[]).forEach(s => hide(s + '-screen'));
  setTimeout(() => (el('input-review-title') as HTMLInputElement).focus(), 80);
}

function submitCreateReview(): void {
  const titleEl = el('input-review-title') as HTMLInputElement;
  const title   = titleEl.value.trim();
  const errEl   = el('modal-error');
  if (!title) { errEl.style.display = 'block'; titleEl.focus(); return; }
  errEl.style.display = 'none';
  localStorage.setItem('openreview_review_title', title);
  const typeVal   = (el('input-review-type')   as HTMLSelectElement).value;
  const domainVal = (el('input-review-domain') as HTMLSelectElement).value;
  el('review-title-display').textContent = title;
  el('review-meta-display').textContent  = [typeVal, domainVal].filter(Boolean).join(' · ');
  hide('create-review-overlay');
  hide('home-screen');
  showScreen('import');
  renderImportList();
}

function renderImportList(): void {
  const list     = el('import-article-list');
  const emptyEl  = el('import-list-empty');
  const startBtn = el('btn-start-screening') as HTMLButtonElement;
  el('stat-articles').textContent   = String(state.articles.length);
  el('stat-duplicates').textContent = String(dupCount);

  if (!state.articles.length) {
    list.innerHTML = '';
    list.appendChild(emptyEl);
    emptyEl.style.display = 'block';
    startBtn.disabled = true;
    startBtn.style.background = '#d0cbc4';
    startBtn.style.color      = '#9e9e9e';
    startBtn.style.cursor     = 'not-allowed';
    return;
  }

  emptyEl.style.display = 'none';
  startBtn.disabled = false;
  startBtn.style.background = '#1a1a1a';
  startBtn.style.color      = '#fff';
  startBtn.style.cursor     = 'pointer';

  list.innerHTML = state.articles.map((a, i) => {
    const displayTitle = a.title || '(Untitled)';
    const authors = (a.authors ?? []).slice(0,2).join(', ') + ((a.authors ?? []).length > 2 ? ' et al.' : '');
    const meta    = [a.journal, authors, a.year].filter(Boolean).join(' · ');
    const last    = i === state.articles.length - 1;
    return `
      <div class="article-row" style="display:flex;align-items:flex-start;gap:8px;padding:10px 14px;${last ? '' : 'border-bottom:1px solid #f0ece8'}">
        <div style="flex:1;min-width:0">
          <p style="font-size:13px;font-weight:600;color:#1a1a1a;margin:0 0 2px;line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${esc(displayTitle)}</p>
          <p style="font-size:11px;color:#9e9e9e;margin:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(meta)}</p>
        </div>
        <span style="flex-shrink:0;font-size:11px;font-weight:600;color:#c4622d;background:#fdf0ea;padding:2px 7px;border-radius:4px;margin-top:2px">imported</span>
        <button data-remove-import="${a.id}" style="flex-shrink:0;background:none;border:none;cursor:pointer;color:#ccc;font-size:16px;line-height:1;padding:0 2px">&#x2715;</button>
      </div>`;
  }).join('');
}

/**
 * Adds files to a queue and processes them one at a time to prevent race conditions.
 */
function enqueueFiles(files: FileList | File[]): void {
  Array.from(files).forEach(f => uploadQueue.push(f));
  if (!isProcessing) processNextFile();
}

async function processNextFile(): Promise<void> {
  if (uploadQueue.length === 0) { isProcessing = false; return; }
  isProcessing = true;
  const file = uploadQueue.shift()!;
  await handleUpload(file);
  processNextFile();
}

async function handleUpload(file: File): Promise<void> {
  const name = file.name.toLowerCase();
  const okEl = el('import-success');
  okEl.style.display = 'none';

  let parsed: Article[] = [];

  try {
    if (name.endsWith('.pdf')) {
      parsed = await parsePdf(file);
    } else if (name.endsWith('.docx')) {
      parsed = await parseDocx(file);
    } else if (name.endsWith('.ris')) {
      const text = await file.text();
      parsed = parseRIS(text);
    } else if (name.endsWith('.bib')) {
      const text = await file.text();
      parsed = parseBibTeX(text);
    } else {
      parsed = [makeArticle({ title: file.name, journal: file.name })];
    }
  } catch {
    parsed = [makeArticle({ title: file.name, journal: file.name })];
  }

  // Guarantee every article has a human-readable title
  parsed = parsed.map(p => {
    if (!p.title || p.title.trim().length === 0) {
      return { ...p, title: file.name };
    }
    return p;
  });

  // Always reload from localStorage before prepending so previous uploads are never lost
  const existing = loadArticles();
  state.articles = [...parsed, ...existing];
  saveArticles(state.articles);
  renderImportList();

  okEl.textContent = parsed.length + ' article(s) added from ' + file.name;
  okEl.style.display = 'block';
}

async function searchPapers(): Promise<void> {
  const query = (el('crossref-input') as HTMLInputElement).value.trim();
  if (!query) return;
  el('crossref-loading').style.display = 'block';
  el('crossref-empty').style.display   = 'none';
  el('crossref-error').style.display   = 'none';
  el('crossref-results').innerHTML     = '';
  try {
    lastSearchResults = await searchCrossref(query);
    el('crossref-loading').style.display = 'none';
    if (!lastSearchResults.length) { el('crossref-empty').style.display = 'block'; return; }
    renderSearchResults();
  } catch {
    el('crossref-loading').style.display = 'none';
    el('crossref-error').style.display   = 'block';
  }
}

function renderSearchResults(): void {
  const container    = el('crossref-results');
  const existingKeys = new Set(state.articles.map(a => a.doi || a.title));
  container.innerHTML = lastSearchResults.map((a, i) => {
    const key     = a.doi || a.title;
    const isAdded = addedKeys.has(key) || existingKeys.has(key);
    const authors = (a.authors ?? []).slice(0,2).join(', ') + ((a.authors ?? []).length > 2 ? ' et al.' : '');
    const meta    = [a.year, a.journal].filter(Boolean).join(' · ');
    const last    = i === lastSearchResults.length - 1;
    return `
      <div style="display:flex;align-items:flex-start;gap:10px;padding:12px 14px;${last ? '' : 'border-bottom:1px solid #f0ece8'}">
        <div style="flex:1;min-width:0">
          <p class="sr-title" data-idx="${i}" style="font-size:14px;font-weight:600;color:#1a1a1a;line-height:1.35;margin:0 0 2px;cursor:pointer;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden" title="Click to read abstract">${esc(a.title || '(No title)')}</p>
          <p style="font-size:12px;color:#9e9e9e;margin:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(authors)}</p>
          <p style="font-size:11px;color:#b0a898;margin:2px 0 0">${esc(meta)}</p>
        </div>
        <button data-add-idx="${i}" data-add-key="${esc(key)}"
          style="flex-shrink:0;font-size:13px;font-weight:600;padding:4px 10px;border-radius:6px;border:none;cursor:${isAdded ? 'default' : 'pointer'};${isAdded ? 'color:#16a34a;background:#f0fdf4' : 'color:#c4622d;background:#fdf0ea'}">
          ${isAdded ? 'Added' : '+ add'}
        </button>
      </div>`;
  }).join('');
}

function addFromSearch(idx: number, key: string): void {
  const a = lastSearchResults[idx];
  if (!a) return;
  addedKeys.add(key);
  state.articles = [a, ...state.articles];
  saveArticles(state.articles);
  renderImportList();
  renderSearchResults();
}

function openAbstractModal(idx: number): void {
  const a = lastSearchResults[idx];
  if (!a) return;
  abstractTarget = a;
  el('abs-title').textContent = a.title || '(No title)';
  el('abs-meta').textContent  = [(a.authors ?? []).slice(0,3).join(', '), a.journal, a.year ? String(a.year) : ''].filter(Boolean).join(' · ');
  el('abs-body').textContent  = a.abstract || 'No abstract available.';
  const doi = el('abs-doi');
  doi.innerHTML = a.doi ? 'DOI: <a href="https://doi.org/' + esc(a.doi) + '" target="_blank" style="color:#c4622d;text-decoration:underline">' + esc(a.doi) + '</a>' : '';
  const key     = a.doi || a.title;
  const isAdded = addedKeys.has(key) || state.articles.some(x => (x.doi || x.title) === key);
  const addBtn  = el('btn-abstract-add') as HTMLButtonElement;
  addBtn.textContent   = isAdded ? 'Already Added' : '+ Add to Review';
  addBtn.disabled      = isAdded;
  addBtn.style.opacity = isAdded ? '0.5' : '1';
  el('abstract-modal').style.display = 'flex';
}

function removeFromImport(id: string): void {
  state.articles = state.articles.filter(a => a.id !== id);
  saveArticles(state.articles);
  renderImportList();
  if (lastSearchResults.length) renderSearchResults();
}

function startScreening(): void {
  if (!state.articles.length) return;
  showScreen('screening');
  renderAll();
  updateCriteriaStrip();
  autoSelectFirst();
}

function autoSelectFirst(): void {
  const first = state.articles.find(a => a.decision === 'unscreened') ?? state.articles[0];
  if (first) selectArticle(first.id);
}

function updateCriteriaStrip(): void {
  const inc   = localStorage.getItem('openreview_inclusion') || '';
  const strip = el('criteria-strip');
  const box   = el('screening-criteria-box');
  if (inc.trim()) {
    const txt = 'Inclusion criteria: ' + inc.trim().replace(/\n/g,' | ');
    strip.textContent = txt; strip.style.display = 'block';
    box.textContent   = txt; box.style.display   = 'block';
  } else {
    strip.style.display = 'none';
    box.style.display   = 'none';
  }
}

function selectArticle(id: string): void {
  state.currentId = id;
  renderArticleList(state);
  const a = state.articles.find(x => x.id === id);
  if (a) renderArticleDetail(a);
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

function navigate(dir: 'next' | 'previous'): void {
  if (!state.currentId) return;
  const a = dir === 'next'
    ? getNextArticle(state.articles, state.currentId)
    : getPreviousArticle(state.articles, state.currentId);
  if (a) selectArticle(a.id);
}

function undoLast(): void {
  clearSnackbar(state);
  const r = undoLastDecision(state.articles);
  state.articles = r.articles;
  saveArticles(state.articles);
  renderAll();
  if (r.reverted) selectArticle(r.reverted.id);
}

function undoSessionAll(): void {
  if (!confirm('Revert all session decisions?')) return;
  clearSnackbar(state);
  state.articles = undoSession(state.articles);
  saveArticles(state.articles);
  renderAll();
  autoSelectFirst();
}

function renderAll(): void {
  renderArticleList(state);
  renderStats(state.articles);
}

function refreshAnalysis(): void {
  const s = makeStats(state.articles);
  const set = (id: string, v: number) => { const e = document.getElementById(id); if (e) e.textContent = String(v); };
  set('a-total', s.total); set('a-included', s.included);
  set('a-excluded', s.excluded); set('a-maybe', s.maybe);
  set('p-total', s.total); set('p-screened', s.total - s.unscreened); set('p-included', s.included);
}

function openModal(id: string): void  { el(id).style.display = 'flex'; }
function closeModal(id: string): void { hide(id); }

export function openShortcutOverlay():  void { openModal('shortcut-overlay'); }
export function closeShortcutOverlay(): void { closeModal('shortcut-overlay'); }

function bindEvents(): void {
  el('nav-import')?.addEventListener('click',    () => showScreen('import'));
  el('nav-screening')?.addEventListener('click', () => { showScreen('screening'); renderAll(); });
  el('nav-analysis')?.addEventListener('click',  () => showScreen('analysis'));
  el('nav-export')?.addEventListener('click',    () => showScreen('export'));

  MODAL_FIELDS.forEach((id, i) => {
    const elem = document.getElementById(id);
    if (!elem) return;
    elem.addEventListener('keydown', (ev: Event) => {
      const ke = ev as KeyboardEvent;
      if (ke.key !== 'Enter') return;
      if (elem.tagName === 'TEXTAREA') { if (!ke.shiftKey) { ke.preventDefault(); submitCreateReview(); } return; }
      ke.preventDefault();
      const next = MODAL_FIELDS[i + 1];
      if (next) (document.getElementById(next) as HTMLElement)?.focus();
      else submitCreateReview();
    });
  });
  el('btn-create-review')?.addEventListener('click', () => submitCreateReview());

  el('file-input')?.addEventListener('change', (e) => {
    const inp = e.target as HTMLInputElement;
    if (inp.files && inp.files.length > 0) {
      enqueueFiles(inp.files);
      inp.value = '';
    }
  });

  const dz = el('drop-zone');
  dz?.addEventListener('dragover',  (e) => { e.preventDefault(); dz.classList.add('drop-zone-hover'); });
  dz?.addEventListener('dragleave', ()  => dz.classList.remove('drop-zone-hover'));
  dz?.addEventListener('drop',      (e) => {
    e.preventDefault();
    dz.classList.remove('drop-zone-hover');
    const files = (e as DragEvent).dataTransfer?.files;
    if (files && files.length > 0) enqueueFiles(files);
  });

  el('btn-crossref-search')?.addEventListener('click', () => { void searchPapers(); });
  el('crossref-input')?.addEventListener('keydown', (e) => { if ((e as KeyboardEvent).key === 'Enter') void searchPapers(); });

  el('crossref-results')?.addEventListener('click', (e) => {
    const addBtn  = (e.target as HTMLElement).closest<HTMLElement>('[data-add-idx]');
    const titleEl = (e.target as HTMLElement).closest<HTMLElement>('.sr-title');
    if (addBtn && addBtn.textContent?.trim() !== 'Added') {
      addFromSearch(parseInt(addBtn.dataset['addIdx']!), addBtn.dataset['addKey']!);
    } else if (titleEl) {
      openAbstractModal(parseInt(titleEl.dataset['idx']!));
    }
  });

  el('btn-close-abstract')?.addEventListener('click',   () => closeModal('abstract-modal'));
  el('btn-close-abstract-2')?.addEventListener('click', () => closeModal('abstract-modal'));
  el('abstract-modal')?.addEventListener('click', (e) => { if (e.target === el('abstract-modal')) closeModal('abstract-modal'); });
  el('btn-abstract-add')?.addEventListener('click', () => {
    if (!abstractTarget) return;
    addedKeys.add(abstractTarget.doi || abstractTarget.title);
    state.articles = [abstractTarget, ...state.articles];
    saveArticles(state.articles);
    renderImportList();
    if (lastSearchResults.length) renderSearchResults();
    closeModal('abstract-modal');
  });

  el('import-article-list')?.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-remove-import]');
    if (btn) removeFromImport(btn.dataset['removeImport']!);
  });

  el('btn-start-screening')?.addEventListener('click', () => startScreening());
  el('btn-manage-articles')?.addEventListener('click', () => {
    if (!state.articles.length) return;
    showScreen('screening'); renderAll(); autoSelectFirst();
  });
  el('btn-nav-prisma')?.addEventListener('click', () => showScreen('analysis'));

  el('btn-inclusion-criteria')?.addEventListener('click', () => {
    (el('criteria-inclusion') as HTMLTextAreaElement).value = localStorage.getItem('openreview_inclusion') || '';
    (el('criteria-exclusion') as HTMLTextAreaElement).value = localStorage.getItem('openreview_exclusion') || '';
    openModal('inclusion-modal');
  });
  el('btn-close-inclusion')?.addEventListener('click', () => closeModal('inclusion-modal'));
  el('btn-save-criteria')?.addEventListener('click', () => {
    localStorage.setItem('openreview_inclusion', (el('criteria-inclusion') as HTMLTextAreaElement).value);
    localStorage.setItem('openreview_exclusion', (el('criteria-exclusion') as HTMLTextAreaElement).value);
    closeModal('inclusion-modal');
  });

  el('btn-review-team')?.addEventListener('click', () => openModal('team-modal'));
  el('btn-close-team')?.addEventListener('click',  () => closeModal('team-modal'));

  el('article-list')?.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>('.article-btn');
    if (btn?.dataset['id']) selectArticle(btn.dataset['id']);
  });

  el('article-tags')?.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-remove-tag]');
    if (!btn || !state.currentId) return;
    state.articles = state.articles.map(a => a.id === state.currentId ? removeTag(a, btn.dataset['removeTag']!) : a);
    saveArticles(state.articles);
    const u = state.articles.find(a => a.id === state.currentId);
    if (u) renderArticleDetail(u);
  });

  el('tag-input')?.addEventListener('keydown', (e) => {
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

  el('notes-input')?.addEventListener('blur', (e) => {
    if (!state.currentId) return;
    state.articles = state.articles.map(a => a.id === state.currentId ? updateNotes(a, (e.target as HTMLTextAreaElement).value) : a);
    saveArticles(state.articles);
  });

  el('btn-include')?.addEventListener('click', () => decide('include'));
  el('btn-maybe')?.addEventListener('click',   () => decide('maybe'));
  el('btn-exclude')?.addEventListener('click', () => decide('exclude'));
  el('btn-next')?.addEventListener('click',     () => navigate('next'));
  el('btn-previous')?.addEventListener('click', () => navigate('previous'));
  el('btn-undo')?.addEventListener('click',         () => undoLast());
  el('btn-undo-session')?.addEventListener('click', () => undoSessionAll());

  el('btn-shortcuts')?.addEventListener('click',     () => openShortcutOverlay());
  el('btn-close-overlay')?.addEventListener('click', () => closeShortcutOverlay());
  el('btn-got-it')?.addEventListener('click',        () => closeShortcutOverlay());
  el('shortcut-overlay')?.addEventListener('click',  (e) => { if (e.target === el('shortcut-overlay')) closeShortcutOverlay(); });

  el('status-filter')?.addEventListener('change', (e) => {
    state.filters.status = (e.target as HTMLSelectElement).value;
    saveFilters(state.filters); renderArticleList(state);
  });
  el('search-input')?.addEventListener('input', (e) => {
    state.filters.query = (e.target as HTMLInputElement).value;
    saveFilters(state.filters); renderArticleList(state);
  });

  const doCSV  = () => exportCSV(state.articles);
  const doRIS  = () => exportRIS(state.articles, 'include');
  const doJSON = () => exportJSON(state.articles);
  el('btn-export-csv')?.addEventListener('click',   doCSV);
  el('btn-export-ris')?.addEventListener('click',   doRIS);
  el('btn-export-json')?.addEventListener('click',  doJSON);
  el('btn-export-csv-2')?.addEventListener('click',  doCSV);
  el('btn-export-ris-2')?.addEventListener('click',  doRIS);
  el('btn-export-json-2')?.addEventListener('click', doJSON);

  el('btn-clear')?.addEventListener('click', () => {
    if (!confirm('Delete all articles? This cannot be undone.')) return;
    clearArticles(); state.articles = []; state.currentId = null;
    showScreen('import'); renderImportList();
  });
}

function bindKeyboard(): void {
  document.addEventListener('keydown', (e: KeyboardEvent): void => {
    const active    = document.activeElement as HTMLElement;
    const modalOpen = el('create-review-overlay').style.display !== 'none';
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
