import { Article, AppState, makeFilter, makeArticle } from './models';
import { loadArticles, saveArticles } from './storage';
import { parsePdf, parseDocx, parseRIS, parseBibTeX } from './parser';
import { searchCrossref } from './crossref';

declare global {
  interface Window {
    selectArticle: (i: number) => void;
    addFromSearch: (idx: number) => void;
    lastResults: Article[];
  }
}

const state: AppState = { articles: [], currentId: null, filters: makeFilter(), snackbarFrame: null, snackbarTimer: null };
let currentEngine = 'pubmed';
let currentVisibility = 'Private';
let selectedIdx = 0;

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
      showScreen('import'); renderImportList(); renderCriteriaUI();
    } else {
      el('home-screen').style.display = 'flex';
    }
  }, 800);
}

function showScreen(s: string): void {
  ['import','screening','analysis','export'].forEach(id => {
    const scr = el(id + '-screen'); if (scr) scr.style.display = (id === s ? 'block' : 'none');
  });
  el('home-screen').style.display = 'none';
  document.querySelectorAll('.nav-tab').forEach(btn => btn.classList.toggle('active', btn.id === 'nav-' + s));
  if (s === 'screening') renderScreeningUI();
}

function renderImportList(): void {
  const list = el('import-article-list');
  const statCount = el('stat-articles');
  if (statCount) statCount.textContent = String(state.articles.length);
  list.innerHTML = state.articles.map(a => `<div style="padding:10px; border-bottom:1px solid #eee;"><p style="font-size:13px; font-weight:600;">${esc(a.title)}</p></div>`).join('');
}

function renderCriteriaUI() {
  ['inclusion', 'exclusion'].forEach(type => {
    const listEl = el('list-' + type); if (!listEl) return;
    const data = localStorage.getItem('openreview_' + type) || '';
    listEl.innerHTML = data.split('\n').filter(Boolean).map(item => `<div style="background:#fff; border:1px solid #e8e4df; padding:0.5rem; border-radius:6px; font-size:0.8rem; color:#1a1a1a; margin-bottom:0.25rem;">${esc(item)}</div>`).join('');
  });
}

function renderScreeningUI() {
  const list = el('screening-article-list');
  list.innerHTML = state.articles.map((a, i) => `
    <div class="article-card ${i === selectedIdx ? 'selected' : ''}" onclick="selectArticle(${i})">
      <span class="status-pill status-${a.decision}">${a.decision}</span>
      <p style="font-size:0.9rem; font-weight:600;">${esc(a.title)}</p>
    </div>
  `).join('');
  
  const current = state.articles[selectedIdx];
  if (current) {
    el('reader-empty').classList.add('hidden');
    el('reader-content').classList.remove('hidden');
    el('reader-title').textContent = current.title;
    el('reader-abstract').textContent = current.abstract || "No abstract available.";
  }
}

window.selectArticle = (i: number) => { selectedIdx = i; renderScreeningUI(); };

window.addFromSearch = (idx: number) => {
  const art = window.lastResults[idx];
  art.id = Math.random().toString(36).substr(2, 9);
  state.articles = [art, ...state.articles];
  saveArticles(state.articles); renderImportList();
};

function bindEvents(): void {
  ['import','screening','analysis','export'].forEach(s => el('nav-' + s).onclick = () => showScreen(s));
  
  el('btn-create-review').onclick = () => {
    const t = (el('input-review-title') as HTMLInputElement).value.trim();
    if (!t) { el('modal-error').classList.remove('hidden'); return; }
    localStorage.setItem('openreview_review_title', t);
    localStorage.setItem('openreview_visibility', currentVisibility);
    el('review-title-display').textContent = t; showScreen('import');
  };

  document.querySelectorAll('.vis-btn').forEach(b => {
    (b as HTMLElement).onclick = () => {
      document.querySelectorAll('.vis-btn').forEach(btn => btn.classList.remove('active'));
      b.classList.add('active'); currentVisibility = (b as HTMLElement).dataset.vis!;
    };
  });

  el('btn-crossref-search').onclick = async () => {
    const q = (el('crossref-input') as HTMLInputElement).value.trim(); if (!q) return;
    el('crossref-results').innerHTML = '<p style="padding:1rem;text-align:center;">Searching...</p>';
    const res = await searchCrossref(q, currentEngine);
    window.lastResults = res;
    el('crossref-results').innerHTML = res.map((a, i) => `
      <div style="display:flex;padding:10px;border-bottom:1px solid #eee;align-items:center;gap:10px;">
        <div style="flex:1;"><p style="font-size:12px;font-weight:600;margin:0;">${esc(a.title)}</p></div>
        <button onclick="addFromSearch(${i})" style="font-size:11px;background:#fdf0ea;color:#c4622d;border:none;padding:4px 8px;border-radius:4px;cursor:pointer;">+ add</button>
      </div>
    `).join('');
  };

  document.querySelectorAll('.engine-btn').forEach(b => {
    (b as HTMLElement).onclick = () => {
      document.querySelectorAll('.engine-btn').forEach(btn => btn.classList.remove('active'));
      b.classList.add('active'); currentEngine = (b as HTMLElement).dataset.engine!;
    };
  });
}
