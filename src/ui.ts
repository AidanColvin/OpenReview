/**
 * ui.ts
 * All DOM rendering. Reads from state and articles. Writes to DOM only.
 */
import { Article, AppState, makeStats } from './models';
import { applyFilters } from './filter';
import { CONFIG } from './config';

export function renderArticleList(state: AppState): void {
  const list    = document.getElementById('article-list')!;
  const visible = applyFilters(state.articles, state.filters);

  if (!visible.length) {
    list.innerHTML = '<p style="font-size:13px;color:#9e9e9e;text-align:center;padding:32px 16px">No articles match the current filters.</p>';
    return;
  }

  list.innerHTML = visible.map(a => {
    const active = a.id === state.currentId;
    const authors = a.authors.slice(0, 2).join(', ');
    return `
      <button data-id="${a.id}" class="article-btn"
        style="width:100%;text-align:left;padding:10px 14px;border:none;background:${active ? '#fdf0ea' : '#fff'};border-left:3px solid ${active ? '#c4622d' : 'transparent'};cursor:pointer;transition:background .1s;display:block">
        <p style="font-size:11px;font-weight:600;pointer-events:none;margin:0 0 2px;color:${decisionColor(a.decision)}">${decisionLabel(a.decision)}</p>
        <p style="font-size:13px;font-weight:500;pointer-events:none;margin:0 0 2px;line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(a.title || '(No title)')}</p>
        <p style="font-size:11px;color:#9e9e9e;pointer-events:none;margin:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(authors)}</p>
      </button>
    `;
  }).join('');
}

export function renderArticleDetail(article: Article): void {
  document.getElementById('article-empty')!.style.display = 'none';
  const detail = document.getElementById('article-detail')!;
  detail.style.display = 'flex';

  (document.getElementById('article-meta')     as HTMLElement).textContent = [article.journal, article.year].filter(Boolean).join(' · ');
  (document.getElementById('article-title')    as HTMLElement).textContent = article.title    || '(No title)';
  (document.getElementById('article-authors')  as HTMLElement).textContent = article.authors.join(', ');
  (document.getElementById('article-abstract') as HTMLElement).textContent = article.abstract || 'No abstract available.';
  (document.getElementById('notes-input')      as HTMLTextAreaElement).value = article.notes ?? '';

  document.getElementById('article-tags')!.innerHTML = article.tags.map(t => `
    <span style="display:inline-flex;align-items:center;gap:4px;background:#f5f2ee;color:#555;font-size:11px;border-radius:20px;padding:2px 8px">
      ${esc(t)}
      <button data-remove-tag="${esc(t)}" style="background:none;border:none;cursor:pointer;color:#9e9e9e;font-size:13px;line-height:1;padding:0">&#x2715;</button>
    </span>
  `).join('');
}

export function renderStats(articles: Article[]): void {
  const s     = makeStats(articles);
  const total = s.total || 1;
  document.getElementById('stats-label')!.textContent  = `${s.included} included · ${s.excluded} excluded · ${s.maybe} maybe · ${s.unscreened} unscreened`;
  document.getElementById('include-rate')!.textContent = `Include rate: ${(s.include_rate * 100).toFixed(1)}%`;
  (document.getElementById('bar-included') as HTMLElement).style.width = `${(s.included / total) * 100}%`;
  (document.getElementById('bar-excluded') as HTMLElement).style.width = `${(s.excluded / total) * 100}%`;
  (document.getElementById('bar-maybe')    as HTMLElement).style.width = `${(s.maybe    / total) * 100}%`;
}

export function showSnackbar(article: Article, state: AppState): void {
  clearSnackbar(state);
  const snackbar = document.getElementById('snackbar')!;
  const label    = article.title.length > 60 ? article.title.slice(0, 60) + '...' : article.title;
  document.getElementById('snackbar-text')!.textContent = `Excluded: ${label}`;
  snackbar.style.display = 'flex';

  const bar   = document.getElementById('snackbar-bar')!;
  const start = performance.now();
  const tick  = (now: number): void => {
    const pct = Math.max(0, 100 - ((now - start) / CONFIG.UNDO_DURATION_MS) * 100);
    bar.style.width = `${pct}%`;
    if (pct > 0) state.snackbarFrame = requestAnimationFrame(tick);
    else clearSnackbar(state);
  };
  state.snackbarFrame = requestAnimationFrame(tick);
}

export function clearSnackbar(state: AppState): void {
  if (state.snackbarFrame !== null) cancelAnimationFrame(state.snackbarFrame);
  if (state.snackbarTimer !== null) clearTimeout(state.snackbarTimer);
  state.snackbarFrame = null;
  state.snackbarTimer = null;
  document.getElementById('snackbar')!.style.display = 'none';
}

export function openShortcutOverlay():  void { document.getElementById('shortcut-overlay')!.style.display = 'flex'; }
export function closeShortcutOverlay(): void { document.getElementById('shortcut-overlay')!.style.display = 'none'; }
export function showScreeningScreen():  void {}
export function showImportScreen():     void {}
export function showImportError(_msg: string): void {}

function decisionLabel(d: string): string {
  return { include:'Included', exclude:'Excluded', maybe:'Maybe', unscreened:'Unscreened' }[d] ?? d;
}
function decisionColor(d: string): string {
  return { include:'#16a34a', exclude:'#dc2626', maybe:'#d97706', unscreened:'#9e9e9e' }[d] ?? '#9e9e9e';
}
function esc(s: string): string {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
