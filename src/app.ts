import { Article, AppState, makeFilter, makeArticle } from './models';
import { loadArticles, saveArticles, clearArticles } from './storage';
import { parsePdf, parseDocx, parseRIS, parseBibTeX } from './parser';
import { searchCrossref } from './crossref';

const state: AppState = { articles: [], currentId: null, filters: makeFilter(), snackbarFrame: null, snackbarTimer: null };
let currentEngine = 'pubmed';
let lastSearchResults: Article[] = [];

function el(id: string): HTMLElement { return document.getElementById(id)!; }
function esc(s: any): string { return s ? String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;') : ''; }

export function boot(): void {
  state.articles = loadArticles();
  bindEvents();
  setTimeout(() => { 
    el('splash-screen').style.display = 'none'; 
    el('main-app').classList.remove('hidden'); 
    showScreen('import'); 
    renderImportList(); 
    renderCriteriaUI(); 
  }, 1000);
}

function showScreen(s: string): void {
  ['import','screening','analysis','export'].forEach(id => {
    const screen = el(id + '-screen');
    if (screen) screen.style.display = (id === s ? 'block' : 'none');
  });
  document.querySelectorAll('.nav-tab').forEach(btn => btn.classList.toggle('active', btn.id === 'nav-' + s));
}

function renderImportList(): void {
  const list = el('import-article-list');
  const statCount = el('stat-articles');
  if (statCount) statCount.textContent = String(state.articles.length);
  
  if (!state.articles.length) { 
    list.innerHTML = '<p style="text-align:center;padding:2rem;color:#999;">No articles yet.</p>'; 
    return; 
  }
  
  list.innerHTML = state.articles.map(a => `
    <div style="display:flex;padding:12px;border-bottom:1px solid #f0ece8;">
      <div style="flex:1;">
        <p style="font-size:13px;font-weight:600;margin:0;color:#1a1a1a;">${esc(a.title)}</p>
        <p style="font-size:11px;color:#9e9e9e;margin:0;">${esc(a.journal || a.authors?.[0])}</p>
      </div>
    </div>
  `).join('');
}

function renderCriteriaUI() {
  ['inclusion', 'exclusion'].forEach(type => {
    const listEl = el('list-' + type);
    if (!listEl) return;
    const data = localStorage.getItem('openreview_' + type) || '';
    const items = data.split('\n').filter(Boolean);
    listEl.innerHTML = items.map(item => `
      <div style="background:#fff; border:1px solid #e8e4df; padding:0.6rem; border-radius:6px; font-size:0.85rem; color:#1a1a1a; display:flex; justify-content:space-between; align-items:center;">
        <span>${esc(item)}</span>
      </div>
    `).join('');
  });
}

async function handleUploads(files: FileList) {
  const allNew: Article[] = [];
  for (const file of Array.from(files)) {
    let p: Article[] = [];
    if (file.name.endsWith('.pdf')) p = await parsePdf(file);
    else if (file.name.endsWith('.docx')) p = await parseDocx(file);
    
    p.forEach(art => {
      art.id = Math.random().toString(36).substr(2, 9);
      art.journal = file.name;
      if (!art.title) art.title = file.name;
    });
    allNew.push(...p);
  }
  state.articles = [...allNew, ...state.articles];
  saveArticles(state.articles);
  renderImportList();
}

function bindEvents(): void {
  ['import','screening','analysis','export'].forEach(s => {
    const navBtn = el('nav-' + s);
    if (navBtn) navBtn.onclick = () => showScreen(s);
  });

  const fileInput = el('file-input') as HTMLInputElement;
  if (fileInput) {
    fileInput.onchange = (e) => {
      const f = (e.target as HTMLInputElement).files;
      if (f) handleUploads(f);
    };
  }

  const searchBtn = el('btn-crossref-search');
  if (searchBtn) {
    searchBtn.onclick = async () => {
      const input = el('crossref-input') as HTMLInputElement;
      const resultsEl = el('crossref-results');
      resultsEl.innerHTML = '<p style="padding:1rem;text-align:center;">Searching...</p>';
      try {
        lastSearchResults = await searchCrossref(`${currentEngine} ${input.value}`);
        resultsEl.innerHTML = lastSearchResults.map((a, i) => `
          <div style="display:flex;padding:10px;border-bottom:1px solid #eee;align-items:center;gap:10px;">
            <div style="flex:1;"><p style="font-size:12px;font-weight:600;margin:0;">${esc(a.title)}</p></div>
            <button class="add-btn" data-idx="${i}" style="font-size:11px;background:#fdf0ea;color:#c4622d;border:none;padding:4px 8px;border-radius:4px;cursor:pointer;">+ add</button>
          </div>
        `).join('');
      } catch (e) {
        resultsEl.innerHTML = '<p style="padding:1rem;color:red;">Search failed.</p>';
      }
    };
  }

  el('crossref-results').onclick = (e) => {
    const btn = (e.target as HTMLElement).closest('.add-btn') as HTMLButtonElement;
    if (btn) {
      const art = JSON.parse(JSON.stringify(lastSearchResults[parseInt(btn.dataset.idx!)]));
      art.id = Math.random().toString(36).substr(2, 9);
      state.articles = [art, ...state.articles];
      saveArticles(state.articles);
      renderImportList();
      btn.innerText = 'Added'; btn.style.background = '#f0fdf4'; btn.style.color = '#16a34a';
    }
  };

  document.querySelectorAll('.engine-btn').forEach(b => {
    (b as HTMLElement).onclick = () => {
      document.querySelectorAll('.engine-btn').forEach(btn => btn.classList.remove('active'));
      b.classList.add('active');
      currentEngine = (b as HTMLElement).dataset.engine!;
    };
  });

  ['inclusion', 'exclusion'].forEach(type => {
    const input = el('input-' + type) as HTMLInputElement;
    if (input) {
      input.onkeydown = (e) => {
        if (e.key === 'Enter' || e.key === 'Tab') {
          const val = input.value.trim();
          if (val) {
            const cur = localStorage.getItem('openreview_' + type) || '';
            localStorage.setItem('openreview_' + type, val + '\n' + cur);
            input.value = '';
            renderCriteriaUI();
          }
          if (e.key === 'Enter') e.preventDefault();
        }
      };
    }
  });
}
