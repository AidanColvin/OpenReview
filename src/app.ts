import { Article, AppState, makeFilter, makeArticle } from './models';
import { loadArticles, saveArticles } from './storage';
import { parsePdf, parseDocx, parseRIS, parseBibTeX } from './parser';
import { searchCrossref } from './crossref';

declare global { interface Window { selectArticle: (i: number) => void; addFromSearch: (idx: number, btn: HTMLElement) => void; lastResults: Article[]; } }

const state: AppState = { articles: [], currentId: null, filters: makeFilter(), snackbarFrame: null, snackbarTimer: null };
let currentEngine = 'pubmed';
let selectedIdx = 0;

function el(id: string): HTMLElement { return document.getElementById(id)!; }
function esc(s: any): string { return s ? String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;') : ''; }

export function boot(): void {
  state.articles = loadArticles();
  bindEvents();
  setTimeout(() => { 
    el('splash-screen').style.display = 'none'; el('main-app').classList.remove('hidden'); 
    const saved = localStorage.getItem('openreview_review_title');
    if (saved) { el('review-title-display').textContent = saved; showScreen('import'); renderImportList(); }
    else { el('home-screen').style.display = 'flex'; }
  }, 800);
}

function showScreen(s: string): void {
  ['import','screening','analysis','export'].forEach(id => { const scr = el(id + '-screen'); if (scr) scr.style.display = (id === s ? 'block' : 'none'); });
  el('home-screen').style.display = 'none';
  document.querySelectorAll('.nav-tab').forEach(btn => btn.classList.toggle('active', btn.id === 'nav-' + s));
  if (s === 'screening') renderScreeningUI();
}

function renderImportList(): void {
  const list = el('import-article-list');
  el('stat-articles').textContent = String(state.articles.length);
  list.innerHTML = state.articles.map(a => `<div style="padding:10px; border-bottom:1px solid #eee;"><p style="font-size:12px; font-weight:600;">${esc(a.title)}</p></div>`).join('');
}

function renderScreeningUI() {
  const list = el('screening-article-list');
  list.innerHTML = state.articles.map((a, i) => `
    <div class="article-card ${i === selectedIdx ? 'selected' : ''}" onclick="selectArticle(${i})">
      <span class="status-pill status-${a.decision}">${a.decision}</span>
      <p style="font-size:0.85rem; font-weight:600; margin:0;">${esc(a.title)}</p>
    </div>
  `).join('');
  const curr = state.articles[selectedIdx];
  if (curr) {
    el('reader-empty').classList.add('hidden'); el('reader-content').classList.remove('hidden');
    el('reader-title').textContent = curr.title;
    el('reader-meta').textContent = `${curr.authors?.join(', ') || 'No authors'} • ${curr.journal || 'Journal'} • ${curr.year || ''}`;
    el('reader-abstract').textContent = curr.abstract || "No abstract available.";
    el('reader-status-box').innerHTML = `<span class="status-pill status-${curr.decision}">${curr.decision}</span>`;
  }
}

window.selectArticle = (i: number) => { selectedIdx = i; renderScreeningUI(); };
window.addFromSearch = (idx: number, btn: HTMLElement) => {
  const art = JSON.parse(JSON.stringify(window.lastResults[idx]));
  art.id = Math.random().toString(36).substr(2, 9);
  state.articles = [art, ...state.articles];
  saveArticles(state.articles); renderImportList();
  btn.innerText = 'Added'; btn.style.background = '#e6f9f0'; btn.style.color = '#1a6b42';
};

async function handleSearch() {
  const q = (el('crossref-input') as HTMLInputElement).value.trim(); if (!q) return;
  el('crossref-results').innerHTML = '<p style="padding:1rem;text-align:center;">Searching...</p>';
  const res = await searchCrossref(q, currentEngine);
  window.lastResults = res;
  el('crossref-results').innerHTML = res.map((a, i) => `
    <div style="display:flex;padding:10px;border-bottom:1px solid #eee;align-items:center;gap:10px;">
      <div style="flex:1;"><p style="font-size:12px;font-weight:600;">${esc(a.title)}</p></div>
      <button onclick="addFromSearch(${i}, this)" style="font-size:10px; font-weight:700; background:#fff; color:#c4622d; border:1px solid #c4622d; padding:4px 8px; border-radius:4px; cursor:pointer;">+ add</button>
    </div>
  `).join('');
}

function bindEvents(): void {
  ['import','screening','analysis','export'].forEach(s => el('nav-' + s).onclick = () => showScreen(s));
  el('btn-create-review').onclick = () => {
    const t = (el('input-review-title') as HTMLInputElement).value.trim(); if (!t) return;
    localStorage.setItem('openreview_review_title', t);
    el('review-title-display').textContent = t; showScreen('import');
  };
  el('input-review-title').onkeydown = (e) => { if (e.key === 'Enter') el('btn-create-review').click(); };
  el('btn-crossref-search').onclick = handleSearch;
  el('crossref-input').onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); handleSearch(); } };
  el('btn-start-screening').onclick = () => showScreen('screening');
  document.querySelectorAll('.engine-btn').forEach(b => {
    (b as HTMLElement).onclick = () => { document.querySelectorAll('.engine-btn').forEach(btn => btn.classList.remove('active')); b.classList.add('active'); currentEngine = (b as HTMLElement).dataset.engine!; };
  });
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
}
