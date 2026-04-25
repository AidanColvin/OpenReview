import { Article, AppState, Decision, makeFilter, makeArticle } from './models';
import { loadArticles, saveArticles, clearArticles, loadFilters, saveFilters } from './storage';
import { parseRIS, parseBibTeX, parsePdf, parseDocx } from './parser';
import { searchCrossref } from './crossref';

const state: AppState = { articles: [], currentId: null, filters: makeFilter(), snackbarFrame: null, snackbarTimer: null };
let currentEngine = 'pubmed';
let lastSearchResults: Article[] = [];

function el(id: string): HTMLElement { return document.getElementById(id)!; }
function esc(s: any): string { return s ? String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;') : ''; }

export function boot(): void {
  state.articles = loadArticles();
  bindEvents();
  setTimeout(() => { el('splash-screen').style.display = 'none'; el('main-app').classList.remove('hidden'); showScreen('import'); renderImportList(); renderCriteriaUI(); }, 1000);
}

function showScreen(s: string): void {
  ['import','screening','analysis','export'].forEach(id => el(id + '-screen').style.display = (id === s ? 'block' : 'none'));
  document.querySelectorAll('.nav-tab').forEach(btn => btn.classList.toggle('active', btn.id === 'nav-' + s));
}

function renderImportList(): void {
  const list = el('import-article-list');
  if (!state.articles.length) { list.innerHTML = '<p style="text-align:center;padding:2rem;color:#999;">No articles yet.</p>'; return; }
  list.innerHTML = state.articles.map(a => `
    <div style="display:flex;padding:12px;border-bottom:1px solid #f0ece8;">
      <div style="flex:1;">
        <p style="font-size:13px;font-weight:600;margin:0;">${esc(a.title)}</p>
        <p style="font-size:11px;color:#999;margin:0;">${esc(a.journal || a.authors?.[0])}</p>
      </div>
    </div>
  `).join('');
}

function renderCriteriaUI() {
  ['inclusion', 'exclusion'].forEach(type => {
    const listEl = el('list-' + type);
    const data = localStorage.getItem('openreview_' + type) || '';
    const items = data.split('\n').filter(Boolean);
    listEl.innerHTML = items.map(item => `<div style="background:#fff; border:1px solid #e8e4df; padding:0.5rem; border-radius:6px; font-size:0.8rem; color:#000;">${esc(item)}</div>`).join('');
  });
}

async function handleUploads(files: FileList) {
  for (const file of Array.from(files)) {
    let parsed: Article[] = [];
    if (file.name.endsWith('.pdf')) parsed = await parsePdf(file);
    else if (file.name.endsWith('.docx')) parsed = await parseDocx(file);
    parsed.forEach(p => { p.id = Math.random().toString(36).substr(2, 9); p.title = p.title || file.name; p.journal = file.name; });
    state.articles = [...parsed, ...state.articles];
  }
  saveArticles(state.articles); renderImportList();
}

function bindEvents(): void {
  ['import','screening','analysis','export'].forEach(s => el('nav-' + s).onclick = () => showScreen(s));

  el('file-input').onchange = (e) => { const f = (e.target as HTMLInputElement).files; if (f) handleUploads(f); };

  el('btn-crossref-search').onclick = async () => {
    const query = (el('crossref-input') as HTMLInputElement).value;
    el('crossref-results').innerHTML = '<p style="padding:1rem;">Searching...</p>';
    lastSearchResults = await searchCrossref(`${currentEngine} ${query}`);
    el('crossref-results').innerHTML = lastSearchResults.map((a, i) => `
      <div style="display:flex;padding:10px;border-bottom:1px solid #eee;align-items:center;">
        <div style="flex:1;"><p style="font-size:12px;font-weight:600;margin:0;">${esc(a.title)}</p></div>
        <button class="add-btn" data-idx="${i}" style="font-size:11px;background:#fdf0ea;color:#c4622d;border:none;padding:4px 8px;border-radius:4px;cursor:pointer;">+ add</button>
      </div>
    `).join('');
  };

  el('crossref-results').onclick = (e) => {
    const btn = (e.target as HTMLElement).closest('.add-btn') as HTMLButtonElement;
    if (btn) {
      const art = JSON.parse(JSON.stringify(lastSearchResults[parseInt(btn.dataset.idx!)]));
      art.id = Math.random().toString(36).substr(2, 9);
      state.articles = [art, ...state.articles];
      saveArticles(state.articles); renderImportList();
      btn.innerText = 'Added'; btn.style.background = '#f0fdf4'; btn.style.color = '#16a34a';
    }
  };

  document.querySelectorAll('.engine-btn').forEach(b => {
    (b as HTMLElement).onclick = () => {
      document.querySelectorAll('.engine-btn').forEach(btn => btn.classList.remove('active'));
      b.classList.add('active'); currentEngine = (b as HTMLElement).dataset.engine!;
    };
  });

  ['inclusion', 'exclusion'].forEach(type => {
    el('input-' + type).onkeydown = (e) => {
      if (e.key === 'Enter' || e.key === 'Tab') {
        const input = el('input-' + type) as HTMLInputElement;
        const val = input.value.trim();
        if (val) {
          const cur = localStorage.getItem('openreview_' + type) || '';
          localStorage.setItem('openreview_' + type, val + '\n' + cur);
          input.value = ''; renderCriteriaUI();
        }
        if (e.key === 'Enter') e.preventDefault();
      }
    };
  });
}
