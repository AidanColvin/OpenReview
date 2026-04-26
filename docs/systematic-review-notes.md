# Rayyan: Complete Technical & User Notes
> Goal: Understand every facet of Rayyan — how it works, who uses it, what they do, what they love, and where it breaks down. This doc is a build-from-scratch reference.

---

## 1. What Rayyan Is

Rayyan is a **web and mobile application** for conducting **systematic literature reviews**.

A systematic review is a formal research process. A researcher picks a question (e.g., "Does Vitamin D help COVID outcomes?"). They then search every major database, pull thousands of papers, and sort them down to only the papers that actually answer the question. This process is methodical, auditable, and slow. Rayyan exists to make it faster.

**The one-sentence version:** Rayyan turns 10,000 messy citations into a clean, sorted, defensible list.

**The three metaphors that explain it best:**
- **The Magnet:** It pulls the right papers up out of a haystack.
- **Tinder for Research:** Swipe right = keep. Swipe left = trash.
- **Prep Cook:** It does all the chopping and cleaning so the lead researcher (the Chef) can focus on the final analysis.

**Primary domains:**
- Healthcare and clinical research
- Public health and epidemiology
- Evidence-based medicine
- Academic meta-analyses

---

## 2. Who Uses It

### User Types

| User Type | Use Case | Pain Point Rayyan Solves |
|---|---|---|
| Graduate students | Thesis systematic reviews | Too many papers, no time |
| Academic researchers | Published meta-analyses | Manual Excel tracking is error-prone |
| Clinical teams | Evidence synthesis for guidelines | Bias risk with manual blind review |
| Librarians | Supporting research teams | Coordinating multi-person workflows |
| Healthcare policymakers | Reviewing clinical evidence | Speed — decisions can't wait months |

### What Users Actually Do (Day-to-Day Tasks)

1. Search PubMed, Cochrane, Scopus, EMBASE, etc. for papers
2. Export those results as a file (`.RIS`, `.BIB`, `.CSV`, `.NBIB`)
3. Upload the file into Rayyan
4. Let Rayyan remove duplicates
5. Screen each paper's title + abstract: **Include, Exclude, or Maybe**
6. Apply labels and filters to organize decisions
7. Use the AI ranking to prioritize what to read next
8. Resolve disagreements with co-reviewers
9. Export the final list for full-text review or data extraction

---

## 3. The Full Workflow — Step by Step

### Step 1: Import

**What happens:** The user exports their search results from a database (PubMed, Zotero, EndNote, etc.) and uploads the file into Rayyan.

**Supported formats:**
- `.RIS` — most common, from PubMed/Zotero
- `.NBIB` — PubMed's native format
- `.BIB` — BibTeX, used in LaTeX workflows
- `.CSV` — flat spreadsheet format

**What Rayyan parses from each record:**
- Title
- Abstract
- Authors
- Journal name
- Publication year
- DOI
- MeSH Terms (Medical Subject Headings — critical for medical research)
- Language

**Key UX moment:** The user sees a count of how many papers were imported. This is the "starting pile."

**Metaphor:** Dumping all your groceries onto the kitchen table before sorting them.

---

### Step 2: Deduplication

**What happens:** Rayyan scans the entire imported set and finds papers that appear more than once. This is common because researchers search multiple databases and the same paper gets indexed in several.

**How the algorithm works:**
- Compares the string: `Title + Year + Author`
- Uses **fuzzy matching** — calculates a "Similarity Score" (e.g., 95% match)
- 100% match → auto-merges
- 80–99% match → flags for human review
- Below 80% → treated as unique

**Why this matters:** Without deduplication, a researcher could review the same paper three times across three databases and not realize it.

**Limitation:** On very large datasets (50,000+ records), the deduplication misses some duplicates — especially when author formatting differs (e.g., "J. Smith" vs. "John Smith").

**Best practice for users:** Always manually spot-check the flagged "maybe duplicates" before proceeding.

**Metaphor:** Removing duplicate contacts from your phone — same person, different phone numbers.

---

### Step 3: Screening (The Core Feature)

**What happens:** The user reads each paper's title and abstract, then makes a decision.

**Three decision states:**
- ✅ **Include** — this paper fits the review's scope
- ❌ **Exclude** — this paper does not fit
- 🤷 **Maybe** — unsure; needs a second look

**When excluding, users can assign a reason (Exclusion Enum):**
- Wrong population
- Wrong intervention
- Wrong outcome
- Wrong study design
- Duplicate
- Not peer-reviewed
- Language barrier

This exclusion reason data is critical for PRISMA reporting (see below).

**Web UI for screening:**
- 3-pane layout:
  - **Left pane:** Filters (by keyword, author, journal, inclusion status, AI score)
  - **Center pane:** High-density list of titles + years
  - **Right pane:** Full abstract reader with keyword highlights

**Keyword highlighting (critical UX feature):**
- Words associated with past "Include" decisions → highlighted **green**
- Words associated with past "Exclude" decisions → highlighted **red**
- This lets users scan faster without reading every word

**Mobile UI for screening:**
- Swipe **right** → Include
- Swipe **left** → Exclude
- **Double tap** → Maybe
- Goal: let researchers clear 500 papers while standing in a coffee line

**Bulk actions:** Users can select multiple papers at once and apply the same decision. Used when a filter isolates a clearly irrelevant group (e.g., all papers in French when the review only includes English).

---

### Step 4: AI Assistance (The Classifier)

**What happens:** The AI watches the user's decisions and learns patterns. It then ranks the remaining unscreened papers from most to least likely to be relevant.

**The algorithm Rayyan uses:** Support Vector Machine (SVM)

**How the SVM works:**
- It treats every word (unigram) and word pair (bigram) in the title + abstract as a feature
- It learns which words appear most in "Include" decisions vs. "Exclude" decisions
- It assigns a weight to each word
- Example: If "randomized controlled trial" appears in 90% of Includes, it gets a very high positive weight
- It then scores every unscreened paper and ranks them

**The trigger conditions:**
- Minimum 50 decisions made
- At least 5 "Include" decisions
- At least 5 "Exclude" decisions
- Without this minimum, the model has nothing to learn from

**The output:**
- Each paper gets a 1–5 star rating OR a probability score (e.g., 87% likely relevant)
- The list re-sorts so high-probability papers appear first

**Effect on workflow:** Users can stop screening when they've seen enough relevant papers. The AI helps identify when the remaining papers are unlikely to be relevant — enabling early stopping.

**Claimed time savings:** Up to 90% reduction in screening time (Rayyan's own figures). Real-world user reports are more modest: months → weeks.

**Critical limitation:** Users report the AI suggestions are "wrong more than right" in early stages. The model needs a large enough training set of decisions before it becomes reliable. On small reviews (<200 papers), the AI adds little value.

**Metaphor:** Like Netflix recommending shows — useful after it learns your taste, but bad on day one.

---

### Step 5: Filtering and Tagging

**What happens:** Users apply labels to papers and use filters to navigate large datasets quickly.

**Labels (tags) users can add:**
- Study design: "RCT", "Cohort", "Case Study"
- Topic: "Intervention A", "Pediatric", "ICU"
- Status: "Needs full text", "Sent to co-reviewer"
- Custom: anything the user defines

**Filter options in the sidebar:**
- By inclusion/exclusion status
- By label
- By keyword (extracted automatically from titles)
- By author
- By journal
- By AI prediction score
- By publication year range
- By language

**Limitation:** Labels are hard to change after being set up. If you rename a label mid-review, it can break consistency across decisions.

**Metaphor:** Gmail labels + search — works great when organized upfront, messy if you change the system halfway through.

---

### Step 6: Collaboration (Blind Mode)

**What happens:** Multiple reviewers screen the same list of papers simultaneously, without seeing each other's decisions. This is called "Blind Mode."

**Why blind mode matters:** In research methodology, a single reviewer introduces bias. If Reviewer A sees that Reviewer B already excluded a paper, A is influenced. Blind mode prevents this entirely.

**How it works technically:**
- `Review.blind_mode = True` hides all other users' decisions in the database query
- Each user only sees their own decisions until blind mode is turned off

**Conflict resolution flow:**
1. Both reviewers finish screening
2. Admin turns off blind mode
3. System generates a "Conflicts" view — only shows papers where decisions differ
4. Reviewers discuss and pick a final answer
5. Conflicts are resolved one by one

**Collaboration features:**
- In-app comments on individual papers
- Shared labels
- Reviewer-level decision tracking (who decided what, and when)
- Audit log of all decisions with timestamps

**Metaphor:** Google Docs for research — multiple people working on the same document, version-controlled.

---

### Step 7: Export

**What happens:** After screening is done, the user exports the final "Included" list.

**Export formats:**
- `.RIS` → back into Zotero or EndNote for citation management
- `.CSV` → into Excel or Covidence for data extraction
- `.BIB` → for LaTeX workflows
- **PRISMA Diagram** (paid only) → auto-generated flowchart showing how many papers were found, deduplicated, screened, and included

**PRISMA (Preferred Reporting Items for Systematic reviews and Meta-Analyses):**
This is the international standard format for reporting a systematic review. Journals require it. Rayyan's paid tier generates this automatically. The free tier requires you to build it manually.

---

## 4. The Data Model (For Builders)

Understanding the data model is key to rebuilding this tool.

### Core Objects

**Review Object** (the parent container)
```
Review {
  id: UUID
  title: string
  description: string
  field: string
  blind_mode: boolean
  created_by: UserID
  created_at: timestamp
  status: enum [Active, Archived, Completed]
}
```

**Citation Object** (one paper)
```
Citation {
  id: UUID
  review_id: UUID (FK)
  title: string
  abstract: text
  authors: string[]
  journal: string
  year: integer
  doi: string
  mesh_terms: string[]
  language: string
  source_file: string
  raw_metadata: JSONB  ← use flexible schema for inconsistent imports
}
```

**Decision Object** (many-to-many: users ↔ citations)
```
Decision {
  id: UUID
  user_id: UUID (FK)
  citation_id: UUID (FK)
  review_id: UUID (FK)
  decision: enum [Include, Exclude, Maybe, Undecided]
  exclusion_reason: enum [WrongPop, WrongIntervention, WrongOutcome, WrongDesign, Duplicate, Language, NotPeerReviewed]
  timestamp: datetime
}
```

**Label Object**
```
Label {
  id: UUID
  review_id: UUID
  name: string
  color: hex string
  citations: UUID[]
}
```

---

## 5. The AI Classifier — Technical Detail

**Model type:** Support Vector Machine (SVM) — a binary classifier trained per review

**Feature extraction:**
- Tokenize title + abstract
- Generate unigrams ("randomized") and bigrams ("randomized trial")
- Remove stopwords ("the", "a", "is")
- Apply TF-IDF weighting (words rare in the corpus but common in Includes get high weight)

**Training trigger:** 50+ decisions with balanced classes (5+ Include, 5+ Exclude)

**Retraining:** The model retrains after every N new decisions (approximate, not real-time)

**Output:** Probability score per paper → rendered as 1–5 stars in the UI

**What the AI does NOT do:**
- It does not read full-text PDFs
- It does not extract structured data (sample sizes, p-values, etc.)
- It does not explain why it ranked a paper highly
- It does not work cross-review (each review trains its own model)

**The early-stopping use case:** Once AI scores plateau (no more 5-star papers in the unscreened pile), reviewers can stop. This is the biggest time-saver.

---

## 6. User Experience — What Users Actually Feel

### What They Love

**Speed:** The biggest single win. Bulk actions + AI ranking + filters eliminate the manual slog. Users describe going from months to weeks.

**The 3-pane workbench:** Once learned, it is fast. Filters on the left let you isolate subsets instantly. The keyword highlights in the right pane let eyes scan without reading full sentences.

**Mobile screening:** Huge for productivity. Commutes, waiting rooms, idle time — all become screening time.

**Blind mode enforcement:** Researchers trust the output more because the process is rigorous. Journals trust it too.

**Audit trail:** Every decision is logged. If a journal asks "why did you exclude this paper?", the answer is in the system.

---

### What They Dislike

**AI quality in early stages:** The SVM needs enough training data to be useful. On small reviews or reviews with broad topics, the AI suggestions are frequently wrong. Users say "wrong more than right" before the model matures.

**Deduplication gaps:** Large datasets with inconsistent author formatting or slightly different titles cause misses. Users still find manual duplicates after auto-dedup.

**Label inflexibility:** Can't rename or restructure labels after starting. This causes organizational problems mid-review.

**Workflow fragmentation:** Rayyan sits in the middle of a larger process. Users still need:
- PubMed / Scopus / EMBASE → to search
- Zotero / EndNote → to manage citations
- Rayyan → to screen
- Excel / Covidence / RevMan → to extract data and synthesize
Every tool switch adds friction and risk of error.

**Paywall on critical features:** PRISMA diagrams and AI PICO extraction are paid-only. These are not "nice to haves" — they are often required for publication.

**No full-text support (free):** The free tier only links to PDFs. It does not store, parse, or extract from full texts.

**Cost for teams:** Individual pricing is reasonable (~$60–100/year). For a team of 10 at a university, it becomes expensive fast.

---

## 7. Free vs. Paid — Exact Breakdown

| Feature | Free | Essential (Paid) | Advanced (Paid) |
|---|---|---|---|
| Active reviews | 3 | 9 | Unlimited |
| Collaborators per review | 2 | 5 | 10+ |
| Duplicate detection | Basic (manual confirm) | Auto-resolve | Auto-resolve |
| AI predictor | Basic | Full SVM ranking | Full SVM ranking |
| PICO extraction (AI) | ❌ | ✅ | ✅ |
| PRISMA diagram | Manual | Auto-generated | Auto-generated |
| Mobile app | ✅ | ✅ | ✅ |
| Bulk screening tools | Limited | Full | Full |
| PDF management | Link only | Link only | Full PDF storage |
| Export formats | RIS, CSV | RIS, CSV, BIB | All formats |
| Price (individual/year) | $0 | ~$60 | ~$100 |

**The real free tier use case:** A single grad student running one systematic review. Good for learning. Not good for serious publication-ready research.

**The real paid tier use case:** A clinical research team of 3–5 running multiple reviews simultaneously for a journal submission.

---

## 8. PICO — Why It Matters

PICO is the standard framework for formulating systematic review questions:

- **P** — Population (who are the patients/subjects?)
- **I** — Intervention (what is being tested?)
- **C** — Comparison (compared to what?)
- **O** — Outcome (what are we measuring?)

Rayyan's paid AI extracts PICO elements directly from abstracts and highlights them. This tells a reviewer instantly whether a paper fits the review criteria without reading every sentence.

For an open-source builder: PICO extraction is a prime LLM use case. A local LLM (Llama 3, Mistral) can extract PICO from an abstract with a simple prompt and zero API cost.

---

## 9. The PRISMA Diagram

PRISMA is the reporting standard required by most journals for systematic reviews. It is a flowchart that shows:

```
Records identified via database searching (n = 8,000)
        ↓
Records after duplicates removed (n = 6,200)
        ↓
Records screened (n = 6,200)
Records excluded (n = 5,900)
        ↓
Full-text articles assessed (n = 300)
Full-text excluded with reasons (n = 250)
        ↓
Studies included in review (n = 50)
```

Rayyan generates this automatically (paid). Free users must build it in PowerPoint or a separate tool.

**For builders:** Generate this as an SVG from the decision data. Every number in the diagram comes directly from the database. It is a pure data visualization problem.

---

## 10. What a "Better" Version Needs

These are the gaps Rayyan leaves open. An open-source tool wins by filling them — all for free.

### Gap 1: Full-Text Extraction
**Rayyan does:** Abstract screening only.
**Better version does:** Uploads the PDF. An LLM reads it. Extracts structured data into a table — sample size, p-values, intervention details, outcome measures.

### Gap 2: Integrated Database Search
**Rayyan does:** Requires the user to leave, search PubMed, export a file, come back, upload.
**Better version does:** Has a built-in PubMed / arXiv / Semantic Scholar API search. User searches without leaving the app.

### Gap 3: Local AI
**Rayyan does:** Runs its SVM on their servers. User data leaves the system.
**Better version does:** Runs the classifier in-browser using WebGPU (ONNX.js). Zero server cost. Total data privacy.

### Gap 4: Better Deduplication
**Rayyan does:** Title + Year + Author fuzzy match. Misses edge cases.
**Better version does:** Uses DOI-first matching (DOIs are unique identifiers). Falls back to fuzzy text only when DOI is missing. Achieves near-100% accuracy.

### Gap 5: Hierarchical Labels
**Rayyan does:** Flat label list. No nesting.
**Better version does:** Labels within labels. Example: `Study Design > RCT > Parallel-arm RCT`.

### Gap 6: Built-in PRISMA Export
**Rayyan does:** Paid only. Manual for free users.
**Better version does:** Native SVG PRISMA diagram auto-generated from decision data. Free. Always.

### Gap 7: Risk of Bias Tools
**Rayyan does:** Nothing.
**Better version does:** Built-in Risk of Bias (RoB 2.0) assessment forms per included study. Generates summary charts (traffic light plots, bar charts) directly in the app.

### Gap 8: Forest Plots
**Rayyan does:** Nothing.
**Better version does:** Takes extracted numerical data and generates forest plots for meta-analysis directly in the browser.

---

## 11. Recommended Tech Stack (For Builders)

| Layer | Choice | Reason |
|---|---|---|
| Frontend | React + Next.js | Fast re-renders for high-density lists |
| Styling | Tailwind CSS | Utility-first, fast to build with |
| Backend | FastAPI (Python) or Node/Express | Python preferred for ML integration |
| Database | PostgreSQL | Flexible JSONB for inconsistent metadata |
| Search | Elasticsearch or Meilisearch | Full-text search across 100K+ records |
| AI Classifier | scikit-learn SVM | Direct equivalent to Rayyan's approach |
| Full-text AI | Llama 3 / Mistral via Ollama | Local, free, privacy-safe |
| File Parsing | pybtex (BIB), rispy (RIS), pandas (CSV) | Handles all input formats |
| PDF Parsing | PyMuPDF + pytesseract (OCR) | Extracts text from both digital and scanned PDFs |
| PRISMA Export | SVG generated server-side | Pure data visualization |
| Mobile | React Native or PWA | Code reuse from web frontend |

---

## 12. The Competitive Landscape

| Tool | Strength | Weakness vs. Your Tool |
|---|---|---|
| Rayyan | Screening UX, mobile | Paywalled features, no full-text AI |
| Covidence | Full pipeline, data extraction | Expensive, no free tier |
| ASReview | Strong active learning AI | No collaboration, no mobile |
| RevMan | PRISMA + forest plots | Old UI, no AI, Cochrane-specific |
| Zotero | Citation management | Not a screener at all |
| Excel | Familiar, free | Manual everything, no AI, no blind mode |

**Your position:** All-in-one. Free. Open source. Full pipeline from search → screen → extract → PRISMA → forest plot.

---

## 13. Summary: Rayyan in One Table

| Dimension | Detail |
|---|---|
| What it is | Web + mobile systematic review screener |
| Core task | Title/abstract screening with AI ranking |
| Users | Grad students, clinical researchers, librarians |
| AI method | SVM trained on user decisions (unigrams + bigrams) |
| Collaboration | Blind mode + conflict resolution |
| Import formats | RIS, NBIB, BIB, CSV |
| Export formats | RIS, CSV, BIB, PRISMA (paid) |
| Free limits | 3 reviews, 2 collaborators, no PICO AI, no PRISMA |
| Paid cost | $60–100/year individual |
| Biggest strength | Speed of screening + mobile UX |
| Biggest weakness | Not a full pipeline, AI weak early, labels inflexible |
| What to beat it with | Free PRISMA, LLM full-text extraction, built-in search |