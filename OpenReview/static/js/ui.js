/**
 * ui.js
 * All DOM rendering, API calls, and event binding for OpenReview.
 * No logic lives here that belongs in the backend.
 */

const API = "";
const SNACKBAR_DURATION_MS = 8000;

let state = {
  articles: [],
  currentId: null,
  filters: { status: "", tag: "", query: "" },
  snackbarTimer: null,
  snackbarAnimFrame: null,
};

/* ---------- Bootstrap ---------- */

window.addEventListener("DOMContentLoaded", () => {
  UI.bindKeyboardShortcuts();
  const shown = localStorage.getItem("or_shortcuts_shown");
  if (!shown) {
    UI.openShortcutOverlay();
    localStorage.setItem("or_shortcuts_shown", "1");
  }
  _tryRestoreSession();
});

async function _tryRestoreSession() {
  const articles = await _fetchArticles();
  if (articles.length > 0) {
    state.articles = articles;
    _showScreeningScreen();
    _renderArticleList();
    await _refreshStats();
    const first = articles.find(a => a.decision === "unscreened") || articles[0];
    if (first) UI.selectArticle(first.id);
  }
}

/* ---------- Public UI namespace ---------- */

const UI = {

  /** Handles file input change event. Uploads file and starts session. */
  async handleFileUpload(input) {
    const file = input.files[0];
    if (!file) return;
    _setUploadLabel(`Importing ${file.name}...`);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${API}/import`, { method: "POST", body: form });
    if (!res.ok) {
      const err = await res.json();
      _showImportError(err.detail || "Import failed.");
      _setUploadLabel("Drop file here or click to upload");
      return;
    }
    const result = await res.json();
    state.articles = await _fetchArticles();
    _showScreeningScreen();
    _renderArticleList();
    await _refreshStats();
    const first = state.articles.find(a => a.decision === "unscreened") || state.articles[0];
    if (first) UI.selectArticle(first.id);
  },

  /** Selects and renders an article in the detail panel. */
  async selectArticle(id) {
    state.currentId = id;
    _renderArticleList();
    const article = state.articles.find(a => a.id === id);
    if (!article) return;
    _renderArticleDetail(article);
  },

  /** Sends a decision for the current article to the backend. */
  async decide(decision) {
    if (!state.currentId) return;
    const res = await fetch(`${API}/articles/${state.currentId}/decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision }),
    });
    if (!res.ok) return;
    const updated = await res.json();
    state.articles = state.articles.map(a => a.id === updated.id ? updated : a);

    if (decision === "exclude") {
      _showSnackbar(updated);
    }

    _renderArticleList();
    _renderArticleDetail(updated);
    await _refreshStats();
    await UI.navigate("next");
  },

  /** Navigates to the next or previous article. */
  async navigate(direction) {
    if (!state.currentId) return;
    const endpoint = direction === "next"
      ? `/articles/${state.currentId}/next`
      : `/articles/${state.currentId}/previous`;
    const res = await fetch(`${API}${endpoint}`);
    if (!res.ok) return;
    const article = await res.json();
    if (article) UI.selectArticle(article.id);
  },

  /** Undoes the most recent session decision. */
  async undoLast() {
    _clearSnackbar();
    const res = await fetch(`${API}/undo-last`, { method: "POST" });
    if (!res.ok) return;
    const data = await res.json();
    if (data.reverted) {
      state.articles = state.articles.map(a => a.id === data.reverted.id ? data.reverted : a);
      _renderArticleList();
      await _refreshStats();
      UI.selectArticle(data.reverted.id);
    }
  },

  /** Reverts all decisions made in the current session. */
  async undoSession() {
    if (!confirm("Revert all decisions made this session?")) return;
    _clearSnackbar();
    await fetch(`${API}/undo-session`, { method: "POST" });
    state.articles = await _fetchArticles();
    _renderArticleList();
    await _refreshStats();
    const first = state.articles.find(a => a.decision === "unscreened") || state.articles[0];
    if (first) UI.selectArticle(first.id);
  },

  /** Adds a tag to the current article when Enter is pressed. */
  async onTagKeydown(event) {
    if (event.key !== "Enter") return;
    const input = document.getElementById("tag-input");
    const tag = input.value.trim();
    if (!tag || !state.currentId) return;
    const res = await fetch(`${API}/articles/${state.currentId}/tags`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tag }),
    });
    if (!res.ok) return;
    const updated = await res.json();
    state.articles = state.articles.map(a => a.id === updated.id ? updated : a);
    input.value = "";
    _renderArticleDetail(updated);
  },

  /** Removes a tag from the current article. */
  async removeTag(tag) {
    if (!state.currentId) return;
    const encoded = encodeURIComponent(tag);
    const res = await fetch(`${API}/articles/${state.currentId}/tags/${encoded}`, { method: "DELETE" });
    if (!res.ok) return;
    const updated = await res.json();
    state.articles = state.articles.map(a => a.id === updated.id ? updated : a);
    _renderArticleDetail(updated);
  },

  /** Saves notes for the current article on blur. */
  async saveNotes(value) {
    if (!state.currentId) return;
    const res = await fetch(`${API}/articles/${state.currentId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: value }),
    });
    if (!res.ok) return;
    const updated = await res.json();
    state.articles = state.articles.map(a => a.id === updated.id ? updated : a);
  },

  /** Filters articles by decision status. */
  onStatusFilter(value) {
    state.filters.status = value;
    _applyLocalFilters();
  },

  /** Filters articles by search query. */
  onSearch(value) {
    state.filters.query = value;
    _applyLocalFilters();
  },

  /** Downloads an export file. */
  exportFile(format, decision = "") {
    const url = decision
      ? `${API}/export/${format}?decision=${decision}`
      : `${API}/export/${format}`;
    window.location.href = url;
  },

  /** Confirms and clears all articles. */
  async confirmClear() {
    if (!confirm("Delete all articles? This cannot be undone.")) return;
    await fetch(`${API}/articles`, { method: "DELETE" });
    state.articles = [];
    state.currentId = null;
    _showImportScreen();
  },

  /** Opens the keyboard shortcut overlay. */
  openShortcutOverlay() {
    document.getElementById("shortcut-overlay").classList.remove("hidden");
  },

  /** Closes the shortcut overlay. Handles backdrop click. */
  closeShortcutOverlay(event) {
    if (event && event.target !== document.getElementById("shortcut-overlay")) return;
    document.getElementById("shortcut-overlay").classList.add("hidden");
  },

  /** Binds all keyboard shortcuts. */
  bindKeyboardShortcuts() {
    document.addEventListener("keydown", (e) => {
      const tag = document.activeElement.tagName.toLowerCase();
      if (tag === "input" || tag === "textarea") return;

      switch (e.key) {
        case "i": case "I": UI.decide("include"); break;
        case "e": case "E": UI.decide("exclude"); break;
        case "m": case "M": UI.decide("maybe"); break;
        case "j": case "ArrowRight": UI.navigate("next"); break;
        case "k": case "ArrowLeft": UI.navigate("previous"); break;
        case "z": if (e.ctrlKey || e.metaKey) UI.undoLast(); break;
        case "?": UI.openShortcutOverlay(); break;
        case "Escape": document.getElementById("shortcut-overlay").classList.add("hidden"); break;
      }
    });
  },
};

/* ---------- Private rendering functions ---------- */

function _renderArticleList() {
  const list = document.getElementById("article-list");
  const filtered = _localFilter(state.articles);
  list.innerHTML = filtered.map(a => `
    <button onclick="UI.selectArticle('${a.id}')"
      class="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${a.id === state.currentId ? 'bg-blue-50 border-l-2 border-blue-500' : ''}">
      <p class="text-xs font-semibold truncate ${_decisionColor(a.decision)}">${_decisionLabel(a.decision)}</p>
      <p class="text-sm leading-snug mt-0.5 truncate">${a.title || "(No title)"}</p>
      <p class="text-xs text-gray-400 mt-0.5 truncate">${(a.authors || []).slice(0, 2).join(", ")}</p>
    </button>
  `).join("");
}

function _renderArticleDetail(article) {
  document.getElementById("article-empty").classList.add("hidden");
  const detail = document.getElementById("article-detail");
  detail.classList.remove("hidden");

  document.getElementById("article-meta").textContent =
    [article.journal, article.year].filter(Boolean).join(" · ");
  document.getElementById("article-title").textContent = article.title || "(No title)";
  document.getElementById("article-authors").textContent = (article.authors || []).join(", ");
  document.getElementById("article-abstract").textContent = article.abstract || "No abstract available.";
  document.getElementById("notes-input").value = article.notes || "";

  const tagsEl = document.getElementById("article-tags");
  tagsEl.innerHTML = (article.tags || []).map(t => `
    <span class="bg-gray-100 text-gray-700 text-xs rounded-full px-2 py-0.5 flex items-center gap-1">
      ${t}
      <button onclick="UI.removeTag('${t}')" class="text-gray-400 hover:text-red-400 leading-none">✕</button>
    </span>
  `).join("");
}

async function _refreshStats() {
  const res = await fetch(`${API}/stats`);
  if (!res.ok) return;
  const s = await res.json();
  const total = s.total || 1;

  document.getElementById("stats-label").textContent =
    `${s.included} included · ${s.excluded} excluded · ${s.maybe} maybe · ${s.unscreened} unscreened`;
  document.getElementById("include-rate").textContent =
    `Include rate: ${(s.include_rate * 100).toFixed(1)}%`;

  document.getElementById("bar-included").style.width = `${(s.included / total) * 100}%`;
  document.getElementById("bar-excluded").style.width = `${(s.excluded / total) * 100}%`;
  document.getElementById("bar-maybe").style.width    = `${(s.maybe    / total) * 100}%`;
}

function _showSnackbar(article) {
  _clearSnackbar();
  const snackbar = document.getElementById("snackbar");
  document.getElementById("snackbar-text").textContent =
    `Excluded: ${(article.title || "").slice(0, 60)}${article.title?.length > 60 ? "..." : ""}`;

  snackbar.classList.remove("hidden");

  const bar = document.getElementById("snackbar-bar");
  bar.style.width = "100%";

  const start = performance.now();
  function tick(now) {
    const elapsed = now - start;
    const pct = Math.max(0, 100 - (elapsed / SNACKBAR_DURATION_MS) * 100);
    bar.style.width = `${pct}%`;
    if (elapsed < SNACKBAR_DURATION_MS) {
      state.snackbarAnimFrame = requestAnimationFrame(tick);
    } else {
      _clearSnackbar();
    }
  }
  state.snackbarAnimFrame = requestAnimationFrame(tick);
}

function _clearSnackbar() {
  if (state.snackbarAnimFrame) cancelAnimationFrame(state.snackbarAnimFrame);
  if (state.snackbarTimer) clearTimeout(state.snackbarTimer);
  document.getElementById("snackbar").classList.add("hidden");
}

function _localFilter(articles) {
  let result = articles;
  if (state.filters.status) result = result.filter(a => a.decision === state.filters.status);
  if (state.filters.query) {
    const q = state.filters.query.toLowerCase();
    result = result.filter(a =>
      (a.title || "").toLowerCase().includes(q) ||
      (a.abstract || "").toLowerCase().includes(q)
    );
  }
  return result;
}

function _applyLocalFilters() {
  _renderArticleList();
}

async function _fetchArticles() {
  const res = await fetch(`${API}/articles`);
  if (!res.ok) return [];
  return res.json();
}

function _showScreeningScreen() {
  document.getElementById("import-screen").classList.add("hidden");
  document.getElementById("screening-screen").classList.remove("hidden");
}

function _showImportScreen() {
  document.getElementById("screening-screen").classList.add("hidden");
  document.getElementById("import-screen").classList.remove("hidden");
}

function _setUploadLabel(text) {
  document.getElementById("upload-label").textContent = text;
}

function _showImportError(text) {
  const el = document.getElementById("import-error");
  el.textContent = text;
  el.classList.remove("hidden");
}

function _decisionLabel(decision) {
  return { include: "Included", exclude: "Excluded", maybe: "Maybe", unscreened: "Unscreened" }[decision] || decision;
}

function _decisionColor(decision) {
  return {
    include: "text-green-600",
    exclude: "text-red-500",
    maybe: "text-amber-500",
    unscreened: "text-gray-400",
  }[decision] || "text-gray-400";
}
