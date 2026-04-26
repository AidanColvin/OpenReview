import { Article, AppState, makeFilter, makeArticle } from './models';
import { loadArticles, saveArticles } from './storage';
import { parsePdf, parseDocx, parseRIS, parseBibTeX } from './parser';
import { searchCrossref } from './crossref';

const state: AppState = { articles: [], currentId: null, filters: makeFilter(), snackbarFrame: null, snackbarTimer: null };
let currentEngine = 'pubmed';
let currentVisibility = 'Private';
let lastSearchResults: Article[] = [];

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
      showScreen('import');
      renderImportList();
      renderCriteriaUI();
    } else {
      el('home-screen').style.display = 'flex';
    }
  }, 1000);
}

function showScreen(s: string): void {
  ['import','screening','analysis','export'].forEach(id => {
    const scr = el(id + '-screen');
    if (scr) scr.style.display = (id === s ? 'block' : 'none');
  });
  el('home-screen').style.display = 'none';
  document.querySelectorAll('.nav-tab').forEach(btn => btn.classList.toggle('active', btn.id === 'nav-' + s));
}

function submitCreateReview(): void {
  const titleInput = el('input-review-title') as HTMLInputElement;
  const title = titleInput.value.trim();
  if (!title) { el('modal-error').style.display = 'block'; return; }
  
  localStorage.setItem('openreview_review_title', title);
  localStorage.setItem('openreview_visibility', currentVisibility);
  el('review-title-display').textContent = title;
  showScreen('import');
  renderImportList();
  renderCriteriaUI();
}

function renderImportList(): void {
  const list = el('import-article-list');
  const statCount = el('stat-articles');
  if (statCount) statCount.textContent = String(state.articles.length);
  if (!state.articles.length) { list.innerHTML = '<p style="text-align:center;padding:2rem;color:#999;">No articles yet.</p>'; return; }
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
      <div style="background:#fff; border:1px solid #e8e4df; padding:0.6rem; border-radius:6px; font-size:0.85rem; color:#1a1a1a; display:flex; align-items:center;">
        ${esc(item)}
      </div>
    `).join('');
  });
}

async function handleUploads(files: FileList) {
  const fileArray = Array.from(files);
  const newlyParsed: Article[] = [];
  for (const file of fileArray) {
    let p: Article[] = [];
    try {
        if (file.name.endsWith('.pdf')) p = await parsePdf(file);
        else if (file.name.endsWith('.docx')) p = await parseDocx(file);
        else {
           const text = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onload = (e) => resolve(e.target?.result as string);
              reader.readAsText(file);
           });
           if (file.name.endsWith('.ris')) p = parseRIS(text);
           else if (file.name.endsWith('.bib')) p = parseBibTeX(text);
           else p = [makeArticle({title: file.name, abstract: 'Imported', journal: file.name})];
        }
    } catch (e) {
        p = [makeArticle({title: file.name, abstract: 'Could not extract', journal: file.name})];
    }
    
    p.forEach(art => {
      art.id = Math.random().toString(36).substr(2, 9);
      art.journal = file.name;
      if (!art.title) art.title = file.name;
    });
    newlyParsed.push(...p);
  }
  state.articles = [...newlyParsed, ...state.articles];
  saveArticles(state.articles); 
  renderImportList();
}

async function triggerSearch() {
  const input = el('crossref-input') as HTMLInputElement;
  const query = input.value.trim();
  if (!query) return;
  const resultsEl = el('crossref-results');
  resultsEl.innerHTML = '<p style="padding:1rem;text-align:center;">Searching ' + currentEngine + '...</p>';
  try {
    lastSearchResults = await searchCrossref(query, currentEngine);
    if (!lastSearchResults.length) { 
      resultsEl.innerHTML = '<p style="padding:1rem;text-align:center;color:#999;">No results found.</p>'; 
      return; 
    }
    resultsEl.innerHTML = lastSearchResults.map((a, i) => `
      <div style="display:flex;padding:10px;border-bottom:1px solid #eee;align-items:center;gap:10px;">
        <div style="flex:1;"><p style="font-size:12px;font-weight:600;margin:0;">${esc(a.title)}</p></div>
        <button class="add-btn" data-idx="${i}" style="font-size:11px;background:#fdf0ea;color:#c4622d;border:none;padding:4px 8px;border-radius:4px;cursor:pointer;">+ add</button>
      </div>
    `).join('');
  } catch (e) { 
    resultsEl.innerHTML = '<p style="padding:1rem;color:red;text-align:center;">Search failed. Please try again.</p>'; 
  }
}

function bindEvents(): void {
  ['import','screening','analysis','export'].forEach(s => { const navBtn = el('nav-' + s); if (navBtn) navBtn.onclick = () => showScreen(s); });
  
  el('btn-create-review').onclick = submitCreateReview;

  // Visibility Selectors
  document.querySelectorAll('.vis-btn').forEach(b => {
    (b as HTMLElement).onclick = () => {
      document.querySelectorAll('.vis-btn').forEach(btn => btn.classList.remove('active'));
      b.classList.add('active');
      currentVisibility = (b as HTMLElement).dataset.vis!;
    };
  });

  const fileInput = el('file-input') as HTMLInputElement;
  if (fileInput) {
    fileInput.onchange = async (e) => {
      const f = (e.target as HTMLInputElement).files;
      if (f && f.length > 0) {
        await handleUploads(f);
        fileInput.value = ''; 
      }
    };
  }

  el('btn-crossref-search').onclick = triggerSearch;
  (el('crossref-input') as HTMLInputElement).onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); triggerSearch(); } };

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
          e.preventDefault();
          const val = input.value.trim();
          if (val) {
            const cur = localStorage.getItem('openreview_' + type) || '';
            localStorage.setItem('openreview_' + type, val + (cur ? '\n' + cur : ''));
            input.value = '';
            renderCriteriaUI();
          }
        }
      };
    }
  });
}
