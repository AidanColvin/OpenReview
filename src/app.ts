import { Article, AppState, makeFilter, makeArticle } from './models';
import { loadArticles, saveArticles } from './storage';
import { parsePdf, parseDocx, parseRIS, parseBibTeX } from './parser';
import { searchCrossref } from './crossref';

const state: AppState = { articles: [], currentId: null, filters: makeFilter(), snackbarFrame: null, snackbarTimer: null };
let currentEngine = 'pubmed';
let selectedIdx = 0;
let lastDecision: { id: string, status: string } | null = null;

// Keyword Association Maps
let includeWeights: Record<string, number> = {};
let excludeWeights: Record<string, number> = {};

function el(id: string): HTMLElement { return document.getElementById(id)!; }
function esc(s: any): string { return s ? String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;') : ''; }

export function boot(): void {
  state.articles = loadArticles();
  bindEvents();
  setTimeout(() => { 
    el('splash-screen').style.display = 'none'; 
    el('main-app').classList.remove('hidden'); 
    const savedTitle = localStorage.getItem('openreview_review_title');
    if (savedTitle) {
      el('review-title-display').textContent = savedTitle;
      showScreen('import'); renderImportList();
    } else {
      el('home-screen').style.display = 'flex';
    }
  }, 1000);
}

function showScreen(s: string): void {
  ['import','screening','analysis','export'].forEach(id => {
    const scr = el(id + '-screen'); if (scr) scr.style.display = (id === s ? 'block' : 'none');
  });
  el('home-screen').style.display = 'none';
  document.querySelectorAll('.nav-tab').forEach(btn => btn.classList.toggle('active', btn.id === 'nav-' + s));
  if (s === 'screening') renderScreeningUI();
}

function updateKeywordWeights(text: string, decision: string) {
  const words = text.toLowerCase().match(/\b(\w{4,})\b/g) || [];
  const targetMap = decision === 'included' ? includeWeights : excludeWeights;
  words.forEach(w => targetMap[w] = (targetMap[w] || 0) + 1);
}

function getHighlightedAbstract(text: string): string {
  if (!text) return "";
  const words = text.split(/(\s+)/);
  return words.map(w => {
    const clean = w.toLowerCase().trim().replace(/[^\w]/g, '');
    if (clean.length < 4) return esc(w);
    if (includeWeights[clean] > (excludeWeights[clean] || 0)) return `<span class="highlight-include">${esc(w)}</span>`;
    if (excludeWeights[clean] > (includeWeights[clean] || 0)) return `<span class="highlight-exclude">${esc(w)}</span>`;
    return esc(w);
  }).join('');
}

function renderScreeningUI() {
  const list = el('screening-article-list');
  list.innerHTML = state.articles.map((a, i) => `
    <div class="article-card ${i === selectedIdx ? 'selected' : ''}" onclick="selectArticle(${i})">
      <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
        <span class="status-pill status-${a.decision}">${a.decision}</span>
        <span style="font-size:0.75rem; color:#9e9e9e;">${a.year || ''}</span>
      </div>
      <p style="font-size:0.9rem; font-weight:600; line-height:1.3; color:#1a1a1a;">${esc(a.title)}</p>
    </div>
  `).join('');
  
  const current = state.articles[selectedIdx];
  if (current) {
    el('reader-empty').classList.add('hidden');
    el('reader-content').classList.remove('hidden');
    el('reader-title').textContent = current.title;
    el('reader-meta').textContent = `${current.journal || 'Unknown Journal'} • ${current.year || 'No Year'}`;
    el('reader-status').innerHTML = `<span class="status-pill status-${current.decision}">${current.decision}</span>`;
    el('reader-abstract').innerHTML = getHighlightedAbstract(current.abstract || "No abstract available.");
  }
}

window.selectArticle = (i: number) => { selectedIdx = i; renderScreeningUI(); };

function makeDecision(decision: string) {
  const art = state.articles[selectedIdx];
  if (!art) return;
  lastDecision = { id: art.id, status: art.decision };
  art.decision = decision;
  if (art.abstract) updateKeywordWeights(art.abstract, decision);
  
  saveArticles(state.articles);
  if (selectedIdx < state.articles.length - 1) selectedIdx++;
  renderScreeningUI();
  
  // POST to backend (Optimistic)
  fetch('http://localhost:8000/api/decisions', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ citation_id: art.id, decision, timestamp: Date.now() })
  }).catch(() => console.warn("Decision sync pending..."));
}

function undoDecision() {
  if (!lastDecision) return;
  const art = state.articles.find(a => a.id === lastDecision!.id);
  if (art) {
    art.decision = lastDecision!.status;
    saveArticles(state.articles);
    renderScreeningUI();
  }
  lastDecision = null;
}

function bindEvents(): void {
  ['import','screening','analysis','export'].forEach(s => el('nav-' + s).onclick = () => showScreen(s));
  el('btn-create-review').onclick = () => {
    const t = (el('input-review-title') as HTMLInputElement).value.trim();
    if (!t) { el('modal-error').classList.remove('hidden'); return; }
    localStorage.setItem('openreview_review_title', t);
    el('review-title-display').textContent = t; showScreen('import');
  };
  el('btn-start-screening').onclick = () => showScreen('screening');
  el('btn-undo').onclick = undoDecision;

  // KEYBOARD SHORTCUTS
  window.onkeydown = (e) => {
    const activeEl = document.activeElement?.tagName;
    if (activeEl === 'INPUT' || activeEl === 'TEXTAREA') return;

    if (e.key.toLowerCase() === 'i') makeDecision('included');
    if (e.key.toLowerCase() === 'e') makeDecision('excluded');
    if (e.key.toLowerCase() === 'm') makeDecision('maybe');
    if (e.key === 'ArrowDown') { e.preventDefault(); if (selectedIdx < state.articles.length -1) selectedIdx++; renderScreeningUI(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); if (selectedIdx > 0) selectedIdx--; renderScreeningUI(); }
    if ((e.metaKey || e.ctrlKey) && e.key === 'z') { e.preventDefault(); undoDecision(); }
  };

  // Import functionality (Preserved)
  el('file-input').onchange = async (e) => {
    const f = (e.target as HTMLInputElement).files;
    if (f) {
      for (const file of Array.from(f)) {
        let p = file.name.endsWith('.pdf') ? await parsePdf(file) : await parseDocx(file);
        p.forEach(art => { art.id = Math.random().toString(36).substr(2, 9); art.journal = file.name; });
        state.articles = [...p, ...state.articles];
      }
      saveArticles(state.articles); renderImportList();
    }
  };
  
  el('btn-crossref-search').onclick = async () => {
    const q = (el('crossref-input') as HTMLInputElement).value.trim(); if (!q) return;
    const res = await searchCrossref(q, currentEngine);
    el('crossref-results').innerHTML = res.map((a, i) => `<div style="display:flex;padding:10px;border-bottom:1px solid #eee;align-items:center;gap:10px;"><div style="flex:1;"><p style="font-size:12px;font-weight:600;margin:0;">${esc(a.title)}</p></div><button onclick="addFromSearch(${i})" style="font-size:11px;background:#fdf0ea;color:#c4622d;border:none;padding:4px 8px;border-radius:4px;cursor:pointer;">+ add</button></div>`).join('');
    window.lastResults = res;
  };
}

window.addFromSearch = (idx: number) => {
  const art = window.lastResults[idx];
  art.id = Math.random().toString(36).substr(2, 9);
  state.articles = [art, ...state.articles];
  saveArticles(state.articles); renderImportList();
};

function renderImportList() {
  const list = el('import-article-list');
  el('stat-articles').textContent = String(state.articles.length);
  list.innerHTML = state.articles.map(a => `<div style="padding:10px; border-bottom:1px solid #eee;"><p style="font-size:13px; font-weight:600;">${esc(a.title)}</p></div>`).join('');
}
