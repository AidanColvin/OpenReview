# OpenReview

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)]()
[![UX-Evaluation](https://img.shields.io/badge/UX-Heuristic%20Validated-blue)]()
[![Open Source](https://img.shields.io/badge/Open%20Source-Yes-brightgreen.svg)]()
[![GitHub Pages](https://img.shields.io/badge/Deployed-GitHub%20Pages-222222.svg?logo=github)](https://aidancolvin.github.io/OpenReview)
[![No Backend](https://img.shields.io/badge/Backend-None%20Required-lightgrey)]()
[![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)]()
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-38B2AC?logo=tailwind-css&logoColor=white)]()
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6%2B-F7DF1E?logo=javascript&logoColor=black)]()
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)]()

A heuristic-driven, open-source systematic review screener designed to optimize research synthesis efficiency by addressing usability gaps in existing tools.

**Free. No account required. No backend. Runs entirely in your browser.**

This project is currently a work in progress and is not yet a final product.
---

## Table of Contents

- [What Is OpenReview](#what-is-openreview)
- [Why OpenReview Exists](#why-openreview-exists)
- [Live Demo](#live-demo)
- [Feature Set](#feature-set)
- [UX Design Principles](#ux-design-principles)
- [Architecture](#architecture)
- [Component Breakdown](#component-breakdown)
- [Repository Structure](#repository-structure)
- [Roadmap](#roadmap)
- [Setup and Local Development](#setup-and-local-development)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [References](#references)
- [License](#license)
- [Author](#author)

---

## What Is OpenReview

OpenReview is a fully client-side, zero-cost systematic review screening tool that runs in any modern browser with no installation, no account, and no subscription. Researchers upload a citation set, screen each article for inclusion or exclusion, monitor their progress in real time, and export results in standard formats.

Everything runs in the browser using the Web Storage API for persistence. No data leaves the user's machine. No server is involved at any point in the workflow.

---

## Why OpenReview Exists

The systematic review workflow is a cornerstone of evidence-based research. Existing tools that support this workflow are either paywalled, institutionally gated, or free with significant usability problems that slow reviewers down and introduce preventable errors.

OpenReview was designed from the ground up using Nielsen's 10 Usability Heuristics as the primary design framework. Every interface decision maps back to a specific heuristic. The most common failure modes in competing tools were studied and corrected before a single line of code was written.

The three design priorities driving every feature decision are:

1. **Error prevention over error recovery.** Actions with irreversible consequences must be undoable. The cost of a misclassification in a systematic review is high.
2. **Visibility of system status at all times.** Reviewers must never have to navigate away from the screening view to understand their progress.
3. **Efficiency for experienced users.** Full keyboard shortcut support is a first-class feature, not an afterthought.

---

## Live Demo

The production build is deployed at:

**https://aidancolvin.github.io/OpenReview**

No login. No setup. Upload a RIS or BibTeX file and start screening.

---

## Feature Set

### Citation Import

- Drag-and-drop or click-to-upload interface for RIS and BibTeX files
- Client-side parsing with no file upload to any server
- Import validation with clear error messages for malformed files
- Support for PubMed, Scopus, and Web of Science export formats
- Deduplication detection on import with reviewer confirmation before removal

### Screening Dashboard

- One-at-a-time article review with full title, abstract, authors, year, and journal displayed
- Three decision states: Include, Exclude, and Maybe
- Full keyboard shortcut support for all decision and navigation actions (see Keyboard Shortcuts section below)
- 8-second undo snackbar after every exclusion action with a visible countdown timer
- Bulk decision support for multi-selected articles
- Bulk undo for all decisions made in the current session

### Progress Monitoring

- Segmented progress bar showing Include, Exclude, Maybe, and Unscreened article counts in real time
- Include rate percentage displayed below the progress bar and updated after each decision
- Estimated articles remaining calculated from the reviewer's current average pace
- No navigation required to access any progress metric; all data is visible from the screening view

### Search and Filter

- Full-text search across title and abstract fields
- Filter by decision status (include, exclude, maybe, unscreened)
- Filter by tag
- Filter state persisted in localStorage across sessions and browser restarts
- Individual filter removal without clearing the full filter state
- Active filter indicator visible at all times in the screening view

### Tagging and Annotation

- Reviewers can add free-text tags to any article
- Tags are searchable and filterable
- Notes field available on each article for inline annotation
- All tags and notes persisted in localStorage

### Export

- Export full citation set with decisions as CSV
- Export included articles only as RIS for downstream reference management
- Export screening summary as JSON for programmatic use
- All exports are client-side file downloads with no server involvement

### Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Include article | I |
| Exclude article | E |
| Mark as maybe | M |
| Next article | Right arrow or J |
| Previous article | Left arrow or K |
| Undo last decision | Ctrl + Z |
| Open filter panel | F |
| Clear all filters | Shift + F |
| Open tag editor | T |
| Open notes editor | N |
| Open shortcut overlay | ? |

The shortcut overlay is displayed on first use of the screening dashboard and can be reopened at any time with the "?" key or the help button in the bottom-right corner of the interface.

### Data Privacy

- No data is transmitted to any server at any point
- All review data is stored in the browser's localStorage
- Data can be exported and deleted entirely from the browser at any time
- No tracking, no analytics, no cookies beyond localStorage

---

## UX Design Principles

OpenReview was designed using Nielsen's 10 Usability Heuristics as the evaluation and design framework. The following table maps each core feature to the heuristic it addresses.

| Heuristic | Implementation |
|-----------|----------------|
| Visibility of System Status | Segmented real-time progress bar with include rate and pace estimate |
| User Control and Freedom | 8-second undo snackbar on all exclusions; bulk session undo |
| Consistency and Standards | Keyboard shortcuts match established conventions (J/K navigation, Ctrl+Z undo) |
| Error Prevention | Undo snackbar prevents accidental permanent exclusion |
| Recognition Rather Than Recall | Shortcut overlay visible on first use; filter state indicator always visible |
| Flexibility and Efficiency of Use | Full keyboard shortcut coverage for experienced users |
| Aesthetic and Minimalist Design | Single-column screening view with no redundant controls |
| Help and Documentation | In-app shortcut overlay; inline validation messages; no external documentation required for basic use |

### Severity Audit

Before implementation, a structured heuristic audit was conducted on the screening workflow to identify the highest-priority design problems in existing tools. The audit used Nielsen's 0 to 4 severity rating scale.

| # | Heuristic | Problem Identified in Existing Tools | Severity | OpenReview Solution |
|---|-----------|---------------------------------------|----------|---------------------|
| 1 | Error Prevention | Single-click exclusion with no undo | 4 | 8-second undo snackbar on every exclusion |
| 2 | Visibility of System Status | Progress bar shows total count only, no decision breakdown | 3 | Segmented four-state progress bar, always visible |
| 3 | Consistency and Standards | Keyboard shortcuts undocumented inside the interface | 3 | First-use overlay, persistent "?" button |
| 4 | User Control and Freedom | No bulk undo for multi-select exclusions | 3 | Session-level bulk undo |
| 5 | Recognition Rather Than Recall | Filter state not persisted between sessions | 2 | Filter state saved to localStorage on change |
| 6 | Help and Documentation | Help links point to outdated external documentation | 2 | All help is inline; no external links required |
| 7 | Aesthetic and Minimalist Design | Redundant action buttons in sidebar duplicate header controls | 1 | Single action surface; no duplicated controls |

---

## Architecture

OpenReview is a fully static single-page application. There is no backend, no build system, and no package manager required to run it. The entire application is shipped as a single `index.html` file with inlined or CDN-referenced CSS and JavaScript.

### Technology Decisions

| Layer | Technology | Reason |
|-------|------------|--------|
| Markup | HTML5 | No framework overhead; deployable as a static file |
| Styling | Tailwind CSS (CDN) | Utility-first; no build step required for CDN usage |
| Logic | Vanilla ES6+ JavaScript | No dependencies; runs in any modern browser |
| Persistence | Web Storage API (localStorage) | Client-side only; no server; survives browser restarts |
| File parsing | Custom JS parser | Handles RIS and BibTeX without a library dependency |
| File export | Blob API + anchor download | Client-side file generation; no server required |
| Hosting | GitHub Pages | Free static hosting; deploys on push to main |

### Data Model

All review data is stored as a single JSON object in localStorage under the key `openreview_data`. The schema is as follows:

```json
{
  "review": {
    "id": "string",
    "title": "string",
    "created_at": "ISO8601",
    "updated_at": "ISO8601"
  },
  "articles": [
    {
      "id": "string",
      "title": "string",
      "abstract": "string",
      "authors": ["string"],
      "year": "number",
      "journal": "string",
      "doi": "string",
      "decision": "include | exclude | maybe | unscreened",
      "tags": ["string"],
      "notes": "string",
      "screened_at": "ISO8601 | null"
    }
  ],
  "filters": {
    "status": "string | null",
    "tag": "string | null",
    "query": "string | null"
  },
  "session": {
    "decisions_this_session": "number",
    "session_start": "ISO8601"
  }
}
```

### State Management

Application state is managed through a single global state object in JavaScript. State changes trigger a re-render of the affected UI component. No virtual DOM or reactive framework is used. All DOM manipulation is direct.

The state object is written to localStorage on every change. On page load, state is read from localStorage and used to restore the previous session in full, including filter state, scroll position, and the current article in queue.

---

## Component Breakdown

The following components make up the complete application.

### Parser Module (`js/parser.js`)

Responsible for reading RIS and BibTeX files and converting them into the internal article schema.

| Function | Input | Output |
|----------|-------|--------|
| `parseRIS(text)` | Raw RIS file content as string | Array of article objects |
| `parseBibTeX(text)` | Raw BibTeX file content as string | Array of article objects |
| `deduplicateArticles(articles)` | Array of article objects | Deduplicated array with conflict report |
| `validateArticle(article)` | Single article object | Validation result with field-level errors |

### Storage Module (`js/storage.js`)

Responsible for reading from and writing to localStorage.

| Function | Input | Output |
|----------|-------|--------|
| `loadState()` | None | Full state object or null |
| `saveState(state)` | Full state object | void |
| `clearState()` | None | void |
| `exportJSON(state)` | Full state object | JSON file download |

### Screening Module (`js/screening.js`)

Responsible for the article decision workflow.

| Function | Input | Output |
|----------|-------|--------|
| `makeDecision(articleId, decision)` | Article ID, decision string | Updated state |
| `undoLastDecision(state)` | Full state object | State with last decision reversed |
| `undoSession(state)` | Full state object | State with all session decisions reversed |
| `getNextArticle(state)` | Full state object | Next article object in queue |
| `getPreviousArticle(state)` | Full state object | Previous article object in queue |

### Filter Module (`js/filter.js`)

Responsible for search and filter logic.

| Function | Input | Output |
|----------|-------|--------|
| `applyFilters(articles, filters)` | Articles array, filters object | Filtered articles array |
| `searchArticles(articles, query)` | Articles array, search string | Filtered articles array |
| `saveFilters(filters)` | Filters object | void (writes to localStorage) |
| `loadFilters()` | None | Filters object from localStorage |

### Export Module (`js/export.js`)

Responsible for generating export files.

| Function | Input | Output |
|----------|-------|--------|
| `exportCSV(articles)` | Articles array | CSV file download |
| `exportRIS(articles, decision)` | Articles array, decision filter string | RIS file download |
| `exportJSON(state)` | Full state object | JSON file download |

### UI Module (`js/ui.js`)

Responsible for all DOM rendering and event binding.

| Function | Responsibility |
|----------|----------------|
| `renderProgressBar(state)` | Draws segmented progress bar with current decision counts |
| `renderArticle(article)` | Renders current article title, abstract, and metadata |
| `renderSnackbar(article)` | Shows undo snackbar with 8-second countdown |
| `renderFilterPanel(filters)` | Draws filter panel with current active state |
| `renderShortcutOverlay()` | Renders keyboard shortcut reference modal |
| `bindKeyboardShortcuts(state)` | Attaches all keyboard event listeners |

---

## Repository Structure

```
OpenReview/
├── index.html                    # Application entry point (GitHub Pages root)
├── js/
│   ├── app.js                    # Application bootstrap and state initialization
│   ├── parser.js                 # RIS and BibTeX file parsing
│   ├── storage.js                # localStorage read/write and JSON export
│   ├── screening.js              # Decision logic and undo stack
│   ├── filter.js                 # Search and filter logic
│   ├── export.js                 # CSV, RIS, and JSON export generation
│   └── ui.js                    # DOM rendering and event binding
├── css/
│   └── custom.css                # Supplemental styles beyond Tailwind CDN
├── assets/
│   └── screenshots/              # UI screenshots for documentation
├── tests/
│   └── parser.test.js            # Unit tests for the parser module
├── CONTRIBUTING.md               # Contribution guidelines
├── LICENSE                       # MIT License
└── README.md                     # This file
```

---

## Roadmap

### v1.0 -- Core Screener (Current)

- RIS and BibTeX import
- Include, Exclude, Maybe decisions
- 8-second undo snackbar
- Segmented progress bar
- Keyboard shortcut overlay
- localStorage persistence
- CSV, RIS, and JSON export

### v1.1 -- Collaboration

- Shareable review state via URL-encoded JSON or exported file
- Conflict resolution view for disagreements between two independent screeners
- Inter-rater agreement calculation (Cohen's kappa) displayed in the progress panel

### v1.2 -- PRISMA Flow Diagram

- Auto-generated PRISMA 2020 flow diagram based on screening decisions
- Exportable as SVG or PNG
- Counts populated automatically from the current review state

### v1.3 -- Abstract Highlighting

- Keyword highlighting in the abstract view based on user-defined inclusion and exclusion terms
- Terms saved per review and persisted across sessions

### v2.0 -- AI-Assisted Screening

- Optional Claude API integration for abstract-level relevance scoring
- AI suggestions displayed alongside the abstract with a confidence score
- Reviewer retains full decision authority; AI suggestions are advisory only
- API key entered by the user and stored in localStorage; not transmitted to any OpenReview server

---

## Setup and Local Development

No build step is required. The application is plain HTML, CSS, and JavaScript.

**Clone the repository:**

```bash
git clone https://github.com/AidanColvin/OpenReview.git
cd OpenReview
```

**Open locally:**

```bash
open index.html
```

**Serve with a local static server (recommended for localStorage to function correctly across reloads):**

```bash
npx serve .
```

**Run parser unit tests:**

```bash
node tests/parser.test.js
```

No environment variables, API keys, or package installation is required for core functionality.

---

## Deployment

The application deploys automatically to GitHub Pages from the `main` branch on every push.

**Initial setup:**

1. Fork or clone this repository.
2. Push all files to the `main` branch of a GitHub repository.
3. Go to Settings > Pages.
4. Under "Build and deployment," select "Deploy from a branch."
5. Set the branch to `main` and the folder to `/` (root).
6. Click Save.

The application will be live at `https://<your-username>.github.io/OpenReview` within 60 to 90 seconds of the first push.

**Subsequent deployments:** Any push to `main` triggers an automatic redeploy. No additional configuration is required.

There is no build process, no CI pipeline, and no environment configuration. The deployment is the repository.

---

## Contributing

OpenReview is open source under the MIT License. Contributions are welcome.

**To contribute:**

1. Fork the repository.
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Make your changes. Add tests for any new logic in `tests/`.
4. Commit with a descriptive message: `git commit -m "Add BibTeX deduplication on import"`
5. Push to your fork: `git push origin feature/your-feature-name`
6. Open a pull request against the `main` branch of this repository.

**Contribution guidelines:**

- All JavaScript must be ES6+ with no build step or transpilation required.
- New modules must follow the function signature format documented in the Component Breakdown section.
- All user-facing strings must be written in plain language. No jargon.
- All new UI components must pass the accessibility checklist in `CONTRIBUTING.md`.
- Pull requests that introduce a backend dependency will not be accepted. The zero-backend constraint is a core design requirement.

Bug reports and feature requests can be filed as GitHub Issues using the provided templates.

---

## References

Nielsen, J. (1994). *10 Usability Heuristics for User Interface Design*. Nielsen Norman Group. https://www.nngroup.com/articles/ten-usability-heuristics/

Nielsen, J. (1994). *Severity Ratings for Usability Problems*. Nielsen Norman Group. https://www.nngroup.com/articles/how-to-rate-the-severity-of-usability-problems/

Nielsen, J., and Molich, R. (1990). Heuristic evaluation of user interfaces. *Proceedings of the ACM CHI 90 Human Factors in Computing Systems Conference*, 249-256.

Page, M. J., McKenzie, J. E., Bossuyt, P. M., Boutron, I., Hoffmann, T. C., Mulrow, C. D., and Moher, D. (2021). The PRISMA 2020 statement: an updated guideline for reporting systematic reviews. *BMJ*, 372, n71.

Higgins, J. P. T., Thomas, J., Chandler, J., Cumpston, M., Li, T., Page, M. J., and Welch, V. A. (Eds.) (2023). *Cochrane Handbook for Systematic Reviews of Interventions* (version 6.4). Cochrane. https://training.cochrane.org/handbook

---

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for full terms.

You are free to use, copy, modify, merge, publish, distribute, sublicense, and sell copies of this software. Attribution is appreciated but not required.

---

## Author

Aidan Colvin  
MS Biomedical and Health Informatics, UNC Chapel Hill  
[github.com/AidanColvin](https://github.com/AidanColvin)
