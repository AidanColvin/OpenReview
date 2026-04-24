# OpenReview

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)]()
[![UX-Evaluation](https://img.shields.io/badge/UX-Heuristic%20Validated-blue)]()
[![GitHub Pages](https://img.shields.io/badge/Deployed-GitHub%20Pages-222222.svg?logo=github)](https://aidancolvin.github.io/OpenReview)
[![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)]()
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-38B2AC?logo=tailwind-css&logoColor=white)]()
[![Figma](https://img.shields.io/badge/Figma-F24E1E?logo=figma&logoColor=white)]()
[![Nielsen Heuristics](https://img.shields.io/badge/Framework-Nielsen%2010%20Heuristics-9cf)]()

A heuristic-driven, open-source systematic review screener designed to optimize research synthesis efficiency by addressing usability gaps in existing tools like Rayyan.

---

## Table of Contents

- [Background](#background)
- [Project Goals](#project-goals)
- [Scope](#scope)
- [Methodology](#methodology)
- [Phase 1: Heuristic Audit](#phase-1-heuristic-audit)
- [Phase 2: High-Fidelity Redesign](#phase-2-high-fidelity-redesign)
- [Phase 3: Portfolio Case Study Site](#phase-3-portfolio-case-study-site)
- [Evaluation Results](#evaluation-results)
- [Redesign Specifications](#redesign-specifications)
- [Component Breakdown](#component-breakdown)
- [Repository Structure](#repository-structure)
- [Setup and Local Development](#setup-and-local-development)
- [Deployment](#deployment)
- [References](#references)
- [Author](#author)

---

## Background

Systematic reviews require researchers to screen hundreds to thousands of citations for relevance against defined inclusion and exclusion criteria. This process is time-intensive, cognitively demanding, and error-sensitive. A single misclassification at the screening stage can distort downstream synthesis results and, in clinical contexts, affect evidence-based guidelines and policy decisions.

Rayyan is one of the most widely adopted tools for this workflow. It offers collaborative screening, tagging, and export features used across academic and clinical research institutions. Despite its adoption, Rayyan's screening interface contains documented usability problems that increase cognitive load, raise error rates, and reduce reviewer throughput.

OpenReview addresses this gap in two ways. First, it delivers a structured, reproducible heuristic evaluation of Rayyan's screening workflow. Second, it proposes and documents targeted interface improvements grounded in usability research. The full evaluation and redesign are presented as an interactive case study hosted on GitHub Pages.

---

## Project Goals

1. Identify and rate the highest-severity usability problems in Rayyan's article screening workflow using a structured evaluation framework.
2. Produce concrete, implementable redesign proposals for each high-severity finding.
3. Document the full evaluation process in a professional, publicly accessible portfolio case study.
4. Demonstrate applied UX research methodology in the context of academic informatics tooling.

---

## Scope

### In Scope

- Citation import workflow (RIS, BibTeX file upload and processing)
- Article screening dashboard (include, exclude, maybe decisions)
- Progress monitoring and review status indicators
- Search and filter functionality within a citation set
- Keyboard shortcut discoverability and behavior

### Out of Scope

- Mobile application interface
- Team and collaborator management
- Citation export and report generation
- Rayyan API or integration behavior
- Account creation and onboarding flow

The evaluation was conducted against the live Rayyan web application in April 2026 using a simulated review session of 200 imported records.

---

## Methodology

### Evaluation Framework

This project uses Nielsen's 10 Usability Heuristics (1994) as the primary evaluation rubric. The heuristics are a well-validated, widely adopted framework for expert usability review. They do not require user participants and are designed to surface systematic design problems through structured expert inspection.

The 10 heuristics evaluated are:

1. Visibility of System Status
2. Match Between System and the Real World
3. User Control and Freedom
4. Consistency and Standards
5. Error Prevention
6. Recognition Rather Than Recall
7. Flexibility and Efficiency of Use
8. Aesthetic and Minimalist Design
9. Help Users Recognize, Diagnose, and Recover from Errors
10. Help and Documentation

### Severity Rating Scale

Each identified problem was assigned a severity rating using Nielsen's 0 to 4 scale.

| Rating | Meaning |
|--------|---------|
| 0 | Not a usability problem |
| 1 | Cosmetic issue; fix only if time permits |
| 2 | Minor usability problem; low-priority fix |
| 3 | Major usability problem; high-priority fix |
| 4 | Usability catastrophe; must fix before release |

Severity ratings account for the frequency of the problem (how often does it occur), the impact on users when it does occur, and the persistence of the problem (does it affect one step or the entire workflow).

### Audit Procedure

The audit followed a structured protocol across three sessions.

**Session 1 -- Familiarization (30 minutes):** Free exploration of the application without evaluation. The goal was to build familiarity with the interface before applying the framework.

**Session 2 -- Heuristic Inspection (60 minutes):** Each of the 10 heuristics was applied systematically to each in-scope workflow. Problems were logged in a structured issue list with heuristic mapping, description, and evidence.

**Session 3 -- Severity Rating and Prioritization (30 minutes):** Each logged issue was assigned a severity rating. Issues were grouped by heuristic and ranked for redesign prioritization.

---

## Phase 1: Heuristic Audit

**Duration:** 60 minutes  
**Output:** Structured issue list with severity ratings

### Step 1.1 -- Environment Setup

Log into the live Rayyan web application at rayyan.ai. Create a new review project. Prepare a sample citation set of at least 200 records in RIS or BibTeX format. A publicly available PubMed export on any well-defined topic works for this purpose. Verify that the import interface accepts the file before beginning the formal audit session.

### Step 1.2 -- Import Simulation

Upload the citation file using Rayyan's import interface. Observe and document the following:

- Upload progress indicators and the specificity of feedback during processing
- Time elapsed between upload submission and availability of records for screening
- Error handling behavior if the file format is unexpected or malformed
- Clarity of the confirmation state after a successful import completes

### Step 1.3 -- Screening Session

Screen at least 100 articles using include, exclude, and maybe decisions. Intentionally introduce a small number of accidental exclusions to test recovery paths. Document the following:

- Decision action affordances and their visual feedback after each click
- Availability and behavior of undo or correction flows
- Keyboard shortcut discoverability and consistency with documented behavior
- Progress feedback displayed during and after decisions

### Step 1.4 -- Filter and Search Behavior

Apply at least three different filter combinations using keyword, tag, and decision status filters. Navigate away from the filtered view and return. Document the following:

- Filter state persistence across navigation events
- Clarity of the active filter indicator in the interface
- Ease of clearing individual filters versus clearing all filters at once

### Step 1.5 -- Issue Logging

For each problem found, log the following fields in a structured issue list:

- Heuristic violated (one primary heuristic per issue)
- Workflow step where the issue occurs
- Description of the problem in plain language
- Evidence observed during the session
- Preliminary severity estimate on the 0 to 4 scale

### Step 1.6 -- Severity Rating

Review all logged issues. Assign a final severity rating on the 0 to 4 scale to each. Identify the three to five issues with the highest severity scores. These become the redesign candidates for Phase 2.

---

## Phase 2: High-Fidelity Redesign

**Duration:** 60 minutes  
**Tool:** Figma  
**Output:** Before and after mockups for each redesign candidate

The redesign is scoped to the three highest-severity findings identified in Phase 1. Full application redesign is not the goal. Each change is targeted and justified by a specific heuristic finding.

### Step 2.1 -- Screenshot Capture

Take annotated screenshots of the current interface for each area targeted by a redesign. Annotations should call out the specific problem visible in the screenshot. Export at 2x resolution for use in the portfolio site. Save all screenshots to `assets/screenshots/`.

### Step 2.2 -- Before Mockup

In Figma, reproduce the current interface at high fidelity for each target area. Annotate problem points using Figma's comment or annotation components. The before mockup documents the current state and makes the problem visible to readers who have not used Rayyan.

### Step 2.3 -- After Mockup

Create a redesigned version of the same interface area in Figma. The after mockup must directly address the finding it targets. Document the design decisions using a Figma annotation layer. Each annotation should reference the heuristic it addresses and explain the design choice in one or two sentences.

### Step 2.4 -- Interaction Specification

For each redesign, write a short interaction spec that defines the following:

- Trigger condition (what user action initiates the behavior)
- System response (what happens visually and functionally)
- Edge cases (what happens if the user does not interact, or interacts unexpectedly)
- Heuristic addressed (which finding this resolves)

### Step 2.5 -- Asset Export

Export all before and after images as PNG files at 2x resolution. Save them to `assets/mockups/`. Name files using the pattern `finding-N-before.png` and `finding-N-after.png` where N is the finding number from the Phase 1 audit.

---

## Phase 3: Portfolio Case Study Site

**Duration:** 60 minutes  
**Output:** Responsive single-page site deployed to GitHub Pages

The case study site presents the full evaluation and redesign to a non-technical audience. It is built as a static HTML page using Tailwind CSS and requires no backend or build toolchain.

### Step 3.1 -- Page Structure

Create `index.html` with the following sections in order:

- Navigation bar with project title and GitHub repository link
- Hero section with project title, one-sentence description, and tech stack badges
- Methodology section summarizing the heuristic framework and audit procedure
- Usability audit section with the full severity table
- Findings section with deep-dive writeups for the three highest-severity issues
- Redesign section with before and after image pairs for each finding
- Conclusion section with summary of impact and next steps
- References section with full citations

### Step 3.2 -- Severity Table

Build the severity table as a responsive HTML table. Include columns for finding number, heuristic violated, issue description, and severity rating. Use Tailwind utility classes to color-code severity: red for 4, orange for 3, yellow for 2, and default for 1. Ensure the table scrolls horizontally on narrow viewports using `overflow-x-auto`.

### Step 3.3 -- Before and After Image Layout

For each finding with a redesign, display the before and after mockups side by side using a two-column CSS grid. The before column uses a neutral border. The after column uses a blue border to visually distinguish the proposed state. Include a caption below each image identifying it as before or after and naming the finding it addresses.

### Step 3.4 -- Responsive Layout

The page must be readable on both desktop and mobile viewports. Use Tailwind's responsive prefixes (`md:`, `lg:`) to collapse two-column layouts to single column on narrow viewports. Test at 375px and 1280px viewport widths before deploying.

### Step 3.5 -- Accessibility Check

Verify the following before deployment:

- All images have descriptive `alt` attributes
- Color is not the only means of conveying severity information
- Heading levels are used in logical order (h1, h2, h3)
- All links have visible focus states

---

## Evaluation Results

Seven usability issues were identified across six heuristics. The three highest-severity findings are documented in full below.

### Finding 1 -- Error Prevention

**Heuristic:** Error Prevention  
**Severity:** 4 / 4  
**Workflow Step:** Article screening (exclude action)

**Description:** The exclude action executes on a single click with no confirmation dialog and no time-limited undo. In a citation set of 5,000 records, a misclick silently moves an article into the excluded pile. The reviewer receives no visible feedback that the action occurred and has no recovery path other than a manual search through the excluded list followed by a reclassification. This is a critical data integrity risk. Errors at this stage propagate into the final included set and can affect the validity of the entire review.

**Evidence:** Three accidental exclusions occurred during a 200-article test session using a standard mouse on a 15-inch display. None triggered any visible feedback. Recovery required navigating to the excluded tab and manually searching for the affected article.

| Attribute | Assessment |
|-----------|------------|
| Frequency | High. Any user screening more than 50 articles per session is likely to encounter this. |
| Impact | Catastrophic. An undetected misclassification can exclude relevant evidence from a published review. |
| Persistence | Affects every screening session for every user on every dataset size. |

---

### Finding 2 -- Visibility of System Status

**Heuristic:** Visibility of System Status  
**Severity:** 3 / 4  
**Workflow Step:** Progress monitoring during and between screening sessions

**Description:** The progress indicator displays a total article count and a screened count. It does not break down screened articles by decision type. Reviewers cannot determine the current include rate, exclude rate, or ratio of maybe decisions without navigating to a separate statistics panel that is not visible from the screening view. Teams working on large reviews have no way to monitor decision drift or detect systematic errors in real time.

**Evidence:** During a 200-article session, the ratio of included to excluded articles was not determinable from the screening dashboard without leaving the current view. The statistics panel is accessible only via a separate navigation item and does not update live during a session.

| Attribute | Assessment |
|-----------|------------|
| Frequency | Medium. Affects all users who need to monitor progress in real time, which is the majority of multi-session reviewers. |
| Impact | Moderate to high. Without real-time decision breakdown, systematic errors go undetected until an audit. |
| Persistence | Affects every screening session. |

---

### Finding 3 -- Consistency and Standards

**Heuristic:** Consistency and Standards  
**Severity:** 3 / 4  
**Workflow Step:** Keyboard-driven article screening

**Description:** Keyboard shortcuts are available in the web interface but are not documented within the interface itself. No shortcut overlay, tooltip, or onboarding hint is shown on first use. The available shortcuts differ between the web and mobile interfaces with no explanation of the discrepancy. New users discover shortcuts only through external help documentation or community forums. Experienced users who switch between platforms encounter inconsistent behavior with no in-app reference.

**Evidence:** No shortcut hint or overlay was displayed during the first session or any subsequent session. A "?" key press did not trigger any help overlay. The keyboard shortcut set was found only by navigating to an external help article linked from the Rayyan homepage.

| Attribute | Assessment |
|-----------|------------|
| Frequency | High. Affects all new users and any user who works across web and mobile. |
| Impact | Moderate. Users who do not discover shortcuts rely on mouse-only interaction, increasing screening time for large citation sets. |
| Persistence | Permanent until shortcuts are documented in the interface. |

---

### Full Severity Table

| # | Heuristic | Issue | Severity |
|---|-----------|-------|----------|
| 1 | Error Prevention | Single-click exclusion with no undo | 4 |
| 2 | Visibility of System Status | Progress bar lacks decision-type breakdown | 3 |
| 3 | Consistency and Standards | Keyboard shortcuts undocumented and platform-inconsistent | 3 |
| 4 | User Control and Freedom | No bulk undo for multi-select exclusions | 3 |
| 5 | Recognition Rather Than Recall | Filter state not persisted between sessions | 2 |
| 6 | Help and Documentation | In-app help links point to outdated external docs | 2 |
| 7 | Aesthetic and Minimalist Design | Redundant action buttons in sidebar duplicate header controls | 1 |

---

## Redesign Specifications

The redesign targets the three severity-3 and severity-4 findings. No changes are proposed outside the screening dashboard. Each specification is written to be directly implementable by a frontend engineer without further clarification.

### Redesign 1 -- Persistent Undo Snackbar

**Addresses:** Finding 1 (Error Prevention, Severity 4)

**Description:** A transient snackbar component appears at the bottom center of the screen immediately after any exclude action. The snackbar displays the title of the excluded article truncated to 60 characters and a single "Undo" button. The user has 8 seconds to click undo before the exclusion is committed. A visible countdown indicator shows the remaining time.

**Interaction Specification:**

| Property | Value |
|----------|-------|
| Trigger | User clicks or keyboard-shortcuts to exclude an article |
| Snackbar position | Bottom center, 24px above viewport edge |
| Display duration | 8 seconds |
| Countdown indicator | Linear progress bar depleting left to right |
| Undo action | Restores article to unscreened state, returns it to top of queue |
| Auto-dismiss | Snackbar fades out, exclusion committed |
| Stacking behavior | Only one snackbar visible at a time; rapid exclusions reset the 8-second timer |
| Keyboard access | Focus moves to snackbar on appearance; Enter or Space activates undo; Escape dismisses |

**Design rationale:** This pattern is established in Material Design and used in Gmail, Google Drive, and other high-frequency-action interfaces. It introduces zero friction for users who do not need undo and provides a reliable recovery path for those who do. An 8-second window is long enough for intentional recovery and short enough that the commit feels immediate.

---

### Redesign 2 -- Segmented Decision Progress Bar

**Addresses:** Finding 2 (Visibility of System Status, Severity 3)

**Description:** The existing single-segment progress bar is replaced with a four-segment bar that displays the proportion of articles in each decision state: included, excluded, maybe, and unscreened. Each segment displays its article count on hover. The bar updates in real time after each decision without a page reload. A secondary stat line below the bar displays the current include rate as a percentage and the estimated number of articles remaining at the reviewer's current pace.

**Interaction Specification:**

| Property | Value |
|----------|-------|
| Segments | Included (#22C55E green), Excluded (#EF4444 red), Maybe (#F59E0B amber), Unscreened (#D1D5DB gray) |
| Segment width | Proportional to article count in each state |
| Hover tooltip | Displays count and percentage for the hovered segment |
| Update trigger | Real-time after each decision action |
| Secondary stat line | "Include rate: X% | Estimated remaining: N articles at current pace" |
| Minimum segment width | 4px for any non-zero state, to ensure visibility at small proportions |

**Design rationale:** Reviewers working on large datasets need to monitor decision patterns to catch criteria drift early. Displaying the decision breakdown in the persistent progress bar eliminates the need to navigate away from the screening view to access this information.

---

### Redesign 3 -- In-App Keyboard Shortcut Overlay

**Addresses:** Finding 3 (Consistency and Standards, Severity 3)

**Description:** A modal overlay displays all available keyboard shortcuts the first time a user accesses the screening view. The overlay can be re-opened at any time using the "?" key or a persistent help button in the bottom-right corner of the interface. Shortcuts are grouped into three categories: Decision Actions, Navigation, and Filters. Where a shortcut differs between web and mobile, both are shown in the same row with a platform label.

**Interaction Specification:**

| Property | Value |
|----------|-------|
| First display | Triggered on first visit to screening view, per user account |
| Re-open trigger | "?" key press or persistent "?" icon button (bottom-right, 48x48px) |
| Dismiss | Escape key, click outside overlay, or explicit "Got it" button |
| Persistence | First-time display suppressed after acknowledgment; stored in user preferences |
| Shortcut groups | Decision Actions, Navigation, Filters |
| Platform columns | Web shortcut and Mobile shortcut side by side where different |
| Overlay size | Max-width 560px, centered, with backdrop |

**Shortcut Reference Displayed in Overlay:**

| Action | Web Shortcut | Mobile Shortcut |
|--------|-------------|----------------|
| Include article | I | Swipe right |
| Exclude article | E | Swipe left |
| Mark as maybe | M | Tap Maybe button |
| Next article | Right arrow or J | Swipe up |
| Previous article | Left arrow or K | Swipe down |
| Open filter panel | F | Tap filter icon |
| Clear all filters | Shift + F | Not supported |
| Open shortcut overlay | ? | Tap help icon |

**Design rationale:** Keyboard shortcuts reduce mouse travel time significantly in high-volume screening sessions. Making shortcuts discoverable inside the interface converts a hidden power-user feature into a standard workflow tool available to all users from their first session.

---

## Component Breakdown

The following components make up the full deliverable set for this project.

### Audit Deliverables

| Component | Description | Location |
|-----------|-------------|----------|
| Issue log | All seven findings with heuristic mapping, evidence, and severity rating | This README and `index.html` |
| Session screenshots | Annotated screenshots from the live audit session | `assets/screenshots/` |
| Severity table | Full ranked table of all findings | `index.html` and this README |

### Redesign Deliverables

| Component | Description | Location |
|-----------|-------------|----------|
| Finding 1 before mockup | Current exclude-action interface, annotated | `assets/mockups/finding-1-before.png` |
| Finding 1 after mockup | Undo snackbar design with countdown indicator | `assets/mockups/finding-1-after.png` |
| Finding 2 before mockup | Current single-segment progress bar | `assets/mockups/finding-2-before.png` |
| Finding 2 after mockup | Segmented four-state progress bar with stat line | `assets/mockups/finding-2-after.png` |
| Finding 3 before mockup | Screening view with no shortcut documentation visible | `assets/mockups/finding-3-before.png` |
| Finding 3 after mockup | Shortcut overlay design with grouped action categories | `assets/mockups/finding-3-after.png` |
| Figma source file | Editable Figma file with all before and after frames | Linked in `index.html` |

### Site Deliverables

| Component | Description | Location |
|-----------|-------------|----------|
| `index.html` | Responsive single-page portfolio case study | Root |
| `css/custom.css` | Supplemental styles not covered by Tailwind CDN | `css/` |
| Deployed site | Live GitHub Pages site | https://aidancolvin.github.io/OpenReview |

---

## Repository Structure

```
OpenReview/
├── index.html                    # Portfolio case study (rendered on GitHub Pages)
├── assets/
│   ├── screenshots/              # Annotated screenshots from the live audit session
│   │   ├── import-flow.png
│   │   ├── screening-dashboard.png
│   │   ├── progress-bar-current.png
│   │   └── no-shortcut-overlay.png
│   └── mockups/                  # Figma exports of before and after designs
│       ├── finding-1-before.png
│       ├── finding-1-after.png
│       ├── finding-2-before.png
│       ├── finding-2-after.png
│       ├── finding-3-before.png
│       └── finding-3-after.png
├── css/
│   └── custom.css                # Supplemental styles beyond Tailwind CDN
└── README.md                     # This file
```

---

## Setup and Local Development

No build step is required. The case study site is static HTML with a Tailwind CDN import.

**Clone the repository:**

```bash
git clone https://github.com/AidanColvin/OpenReview.git
cd OpenReview
```

**Open locally:**

```bash
open index.html
```

**Serve with a local static server:**

```bash
npx serve .
```

The site requires no environment variables, API keys, or backend services. Internet access is required only to load the Tailwind CDN script.

**To run without an internet connection**, download the Tailwind CSS production build and reference it as a local file:

```bash
curl -o css/tailwind.min.css https://cdn.tailwindcss.com/tailwind.min.css
```

Then replace the `<script src="https://cdn.tailwindcss.com">` tag in `index.html` with a `<link rel="stylesheet" href="css/tailwind.min.css">` tag.

---

## Deployment

The site deploys automatically to GitHub Pages from the `main` branch root on every push.

**Initial setup:**

1. Push all files to the `main` branch of a GitHub repository named `OpenReview`.
2. In the repository, go to Settings > Pages.
3. Under "Build and deployment," select "Deploy from a branch."
4. Set the branch to `main` and the folder to `/` (root).
5. Click Save.

The site will be available at `https://aidancolvin.github.io/OpenReview` within 60 to 90 seconds of the first push.

**Subsequent deployments:** Any push to `main` triggers an automatic redeploy. No additional configuration is required.

**Custom domain (optional):** Add a `CNAME` file to the repository root containing your domain name, then configure your DNS provider to point the domain to `aidancolvin.github.io`.

---

## References

Nielsen, J. (1994). *10 Usability Heuristics for User Interface Design*. Nielsen Norman Group. https://www.nngroup.com/articles/ten-usability-heuristics/

Nielsen, J. (1994). *Severity Ratings for Usability Problems*. Nielsen Norman Group. https://www.nngroup.com/articles/how-to-rate-the-severity-of-usability-problems/

Nielsen, J., and Molich, R. (1990). Heuristic evaluation of user interfaces. *Proceedings of the ACM CHI 90 Human Factors in Computing Systems Conference*, 249-256.

Yu, F., Liu, C., and Sharmin, S. (2022). Performance, usability, and user experience of Rayyan for systematic reviews. *Proceedings of the Association for Information Science and Technology*, 59(1), 598-600.

Ouzzani, M., Hammady, H., Fedorowicz, Z., and Elmagarmid, A. (2016). Rayyan -- a web and mobile app for systematic reviews. *Systematic Reviews*, 5(1), 210.

Rayyan Systems Inc. (2024). *Rayyan -- Intelligent Systematic Review*. https://www.rayyan.ai

---

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

## Author

Aidan Colvin  
MS Biomedical and Health Informatics, UNC Chapel Hill  
[github.com/AidanColvin](https://github.com/AidanColvin)
