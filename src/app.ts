import { Article, AppState, Decision, makeFilter, makeArticle } from './models';
import { loadArticles, saveArticles, clearArticles, loadFilters, saveFilters } from './storage';
import { parseRIS, parseBibTeX, parsePdf, parseDocx } from './parser';
import { searchCrossref } from './crossref';

const state: AppState = { articles: [], currentId: null, filters: makeFilter(), snackbarFrame: null, snackbarTimer: null };
let lastSearchResults: Article[] = [];
let currentEngine = 'pubmed';

function el(id: string): HTMLElement { return document.getElementById(id)!; }
function esc(s: any): string { return s ? String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;') : ''; }

export function boot(): void {
  state.articles = loadArticles();
  bindEvents();
  setTimeout(() => { el('splash-screen').style.display = 'none'; el('main-app').classList.remove('hidden'); el('import-screen').style.display = 'block'; renderImportList(); }, 1000);
}

function renderImportList(): void {
  const list = el('import-article-list');
  if (!state.articles.length) { list.innerHTML = '<p style="text-align:center;padding:2rem;color:#999;">No articles yet.</p>'; return; }
  
  list.innerHTML = state.articles.map((a, i) => `
    <div style="display:flex;padding:12px;border-bottom:1px solid #f0ece8;">
      <div style="flex:1;">
        <p style="font-size:13px;font-weight:600;margin:0;">${esc(a.title)}</p>
        <p style="font-size:11px;color:#999;margin:0;">${esc(a.journal)}</p>
      </div>
    </div>
  `).join('');
}

async function handleUploads(files: FileList) {
  const fileArray = Array.from(files);
  const newlyParsed: Article[] = [];
  
  for (const file of fileArray) {
    let parsed: Article[] = [];
    if (file.name.endsWith('.pdf')) parsed = await parsePdf(file);
    else if (file.name.endsWith('.docx')) parsed = await parseDocx(file);
    
    parsed.forEach(p => { 
      p.id = Math.random().toString(36).substr(2, 9);
      if (!p.title) p.title = file.name;
      p.journal = file.name; 
    });
    newlyParsed.push(...parsed);
  }
  
  state.articles = [...newlyParsed, ...state.articles];
  saveArticles(state.articles);
  renderImportList();
}

async function search() {
  const query = (el('crossref-input') as HTMLInputElement).value;
  const resultsEl = el('crossref-results');
  resultsEl.innerHTML = '<p style="padding:2rem;text-align:center;">Searching ' + currentEngine + '...</p>';
  
  try {
    // We append the engine name to the query to guide the aggregator
    lastSearchResults = await searchCrossref(`${currentEngine} ${query}`);
    resultsEl.innerHTML = lastSearchResults.map((a, i) => `
      <div style="display:flex;padding:12px;border-bottom:1px solid #f0ece8;align-items:flex-start;gap:10px;">
        <div style="flex:1;">
          <p style="font-size:13px;font-weight:600;margin:0;">${esc(a.title)}</p>
          <p style="font-size:11px;color:#999;margin:0;">${esc(a.authors?.join(', '))}</p>
        </div>
        <button class="add-btn" data-idx="${i}" style="font-size:11px;padding:4px 8px;background:#fdf0ea;color:#c4622d;border-radius:4px;border:none;cursor:pointer;">+ add</button>
      </div>
    `).join('');
  } catch (e) { resultsEl.innerHTML = '<p style="padding:1rem;color:red;">Search failed.</p>'; }
}

function bindEvents() {
  el('btn-crossref-search').onclick = search;
  
  el('file-input').onchange = (e) => { 
    const files = (e.target as HTMLInputElement).files;
    if (files) handleUploads(files);
  };

  el('crossref-results').onclick = (e) => {
    const btn = (e.target as HTMLElement).closest('.add-btn') as HTMLButtonElement;
    if (btn) {
      const idx = parseInt(btn.dataset.idx!);
      const article = JSON.parse(JSON.stringify(lastSearchResults[idx]));
      article.id = Math.random().toString(36).substr(2, 9);
      state.articles = [article, ...state.articles];
      saveArticles(state.articles);
      renderImportList();
      btn.innerText = 'Added';
      btn.style.background = '#f0fdf4';
      btn.style.color = '#16a34a';
    }
  };

  document.querySelectorAll('.engine-btn').forEach(btn => {
    (btn as HTMLElement).onclick = () => {
      document.querySelectorAll('.engine-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentEngine = (btn as HTMLElement).dataset.engine!;
    };
  });
}
