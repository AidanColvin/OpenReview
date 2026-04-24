"""FastAPI application entry point. Wires all modules into HTTP routes. No logic lives here."""
from __future__ import annotations
from contextlib import asynccontextmanager
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import FileResponse, Response
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

from src.config import APP_TITLE, APP_VERSION, HOST, PORT
from src.models import Article, DecisionRequest, Filter, TagRequest, NotesRequest, ImportResult
from src.parser import parse_ris, parse_bibtex, deduplicate_articles
from src.storage import (
    init_db, save_articles, load_all_articles,
    load_article, update_article, clear_all_articles, reset_session_flags,
)
from src.screening import (
    make_decision, undo_last_decision, undo_session,
    get_next_article, get_previous_article, compute_stats,
)
from src.filter import apply_filters, get_all_tags, add_tag, remove_tag, update_notes
from src.export import export_csv, export_ris, export_json_string

import uvicorn


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initializes the database on startup."""
    init_db()
    yield


app = FastAPI(title=APP_TITLE, version=APP_VERSION, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/")
def read_root() -> FileResponse:
    """Returns the frontend index.html."""
    return FileResponse("static/index.html")


@app.post("/import", response_model=ImportResult)
async def import_citations(file: UploadFile = File(...)) -> ImportResult:
    """Given an uploaded RIS or BibTeX file, parses and stores all citations."""
    content = await file.read()
    text = content.decode("utf-8")
    filename = file.filename or ""

    if filename.endswith(".ris"):
        articles = parse_ris(text)
    elif filename.endswith(".bib"):
        articles = parse_bibtex(text)
    else:
        raise HTTPException(status_code=400, detail="File must be .ris or .bib format.")

    unique, removed = deduplicate_articles(articles)
    save_articles(unique)

    return ImportResult(
        articles_imported=len(unique),
        duplicates_removed=len(removed),
        errors=[],
    )


@app.get("/articles", response_model=list[Article])
def get_articles(
    status: str | None = None,
    tag: str | None = None,
    query: str | None = None,
) -> list[Article]:
    """Returns all articles, optionally filtered by status, tag, or search query."""
    articles = load_all_articles()
    filters = Filter(status=status, tag=tag, query=query)
    return apply_filters(articles, filters)


@app.get("/articles/{article_id}", response_model=Article)
def get_article(article_id: str) -> Article:
    """Given an article ID, returns the matching article or 404."""
    article = load_article(article_id)
    if not article:
        raise HTTPException(status_code=404, detail="Article not found.")
    return article


@app.post("/articles/{article_id}/decision", response_model=Article)
def decide_article(article_id: str, body: DecisionRequest) -> Article:
    """Given an article ID and decision, applies the decision and returns the updated article."""
    articles = load_all_articles()
    updated_list = make_decision(article_id, body.decision, articles)
    article = next((a for a in updated_list if a.id == article_id), None)
    if not article:
        raise HTTPException(status_code=404, detail="Article not found.")
    update_article(article)
    return article


@app.post("/undo-last")
def undo_last() -> dict:
    """Reverts the most recent session decision and returns the reverted article."""
    articles = load_all_articles()
    updated_list, reverted = undo_last_decision(articles)
    if reverted:
        update_article(reverted)
        return {"reverted": reverted.model_dump()}
    return {"reverted": None}


@app.post("/undo-session")
def undo_all_session() -> dict:
    """Reverts all decisions made in the current session and returns a count."""
    articles = load_all_articles()
    reverted_list = undo_session(articles)
    count = sum(1 for a in reverted_list if not a.session_decision)
    for a in reverted_list:
        update_article(a)
    reset_session_flags()
    return {"reverted_count": count}


@app.get("/articles/{article_id}/next", response_model=Article | None)
def next_article(article_id: str) -> Article | None:
    """Given a current article ID, returns the next unscreened article."""
    articles = load_all_articles()
    return get_next_article(articles, article_id)


@app.get("/articles/{article_id}/previous", response_model=Article | None)
def previous_article(article_id: str) -> Article | None:
    """Given a current article ID, returns the previous unscreened article."""
    articles = load_all_articles()
    return get_previous_article(articles, article_id)


@app.post("/articles/{article_id}/tags", response_model=Article)
def tag_article(article_id: str, body: TagRequest) -> Article:
    """Given an article ID and tag, adds the tag and returns the updated article."""
    article = load_article(article_id)
    if not article:
        raise HTTPException(status_code=404, detail="Article not found.")
    updated = add_tag(article, body.tag)
    update_article(updated)
    return updated


@app.delete("/articles/{article_id}/tags/{tag}", response_model=Article)
def untag_article(article_id: str, tag: str) -> Article:
    """Given an article ID and tag, removes the tag and returns the updated article."""
    article = load_article(article_id)
    if not article:
        raise HTTPException(status_code=404, detail="Article not found.")
    updated = remove_tag(article, tag)
    update_article(updated)
    return updated


@app.post("/articles/{article_id}/notes", response_model=Article)
def update_article_notes(article_id: str, body: NotesRequest) -> Article:
    """Given an article ID and notes text, updates the notes and returns the article."""
    article = load_article(article_id)
    if not article:
        raise HTTPException(status_code=404, detail="Article not found.")
    updated = update_notes(article, body.notes)
    update_article(updated)
    return updated


@app.get("/stats")
def get_stats() -> dict:
    """Returns current screening progress statistics."""
    articles = load_all_articles()
    return compute_stats(articles)


@app.get("/tags", response_model=list[str])
def get_tags() -> list[str]:
    """Returns all unique tags in use across all articles."""
    articles = load_all_articles()
    return get_all_tags(articles)


@app.get("/export/csv")
def download_csv() -> Response:
    """Returns a CSV download of all articles."""
    articles = load_all_articles()
    content = export_csv(articles)
    return Response(
        content=content,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=openreview_export.csv"},
    )


@app.get("/export/ris")
def download_ris(decision: str | None = None) -> Response:
    """Returns a RIS download of articles, optionally filtered by decision."""
    articles = load_all_articles()
    content = export_ris(articles, decision)
    return Response(
        content=content,
        media_type="text/plain",
        headers={"Content-Disposition": "attachment; filename=openreview_export.ris"},
    )


@app.get("/export/json")
def download_json() -> Response:
    """Returns a JSON download of all article data."""
    articles = load_all_articles()
    content = export_json_string(articles)
    return Response(
        content=content,
        media_type="application/json",
        headers={"Content-Disposition": "attachment; filename=openreview_export.json"},
    )


@app.delete("/articles")
def delete_all() -> dict:
    """Deletes all articles from the database. This action cannot be undone."""
    clear_all_articles()
    return {"deleted": True}


if __name__ == "__main__":
    uvicorn.run("app:app", host=HOST, port=PORT, reload=True)
