"""SQLite persistence layer. All database access lives exclusively in this module."""
from __future__ import annotations
import sqlite3
import json
from .models import Article
from .config import DB_PATH


def init_db() -> None:
    """Given nothing, creates the articles table if it does not already exist."""
    conn = _connect()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS articles (
            id              TEXT PRIMARY KEY,
            title           TEXT NOT NULL DEFAULT '',
            abstract        TEXT DEFAULT '',
            authors         TEXT DEFAULT '[]',
            year            INTEGER,
            journal         TEXT DEFAULT '',
            doi             TEXT DEFAULT '',
            decision        TEXT DEFAULT 'unscreened',
            tags            TEXT DEFAULT '[]',
            notes           TEXT DEFAULT '',
            screened_at     TEXT,
            session_decision INTEGER DEFAULT 0
        )
    """)
    conn.commit()
    conn.close()


def save_article(article: Article) -> None:
    """Given an Article, inserts or replaces it in the database."""
    conn = _connect()
    conn.execute(
        """
        INSERT OR REPLACE INTO articles
        (id, title, abstract, authors, year, journal, doi,
         decision, tags, notes, screened_at, session_decision)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        _to_row(article),
    )
    conn.commit()
    conn.close()


def save_articles(articles: list[Article]) -> None:
    """Given a list of Articles, inserts all into the database in a single transaction."""
    conn = _connect()
    conn.executemany(
        """
        INSERT OR REPLACE INTO articles
        (id, title, abstract, authors, year, journal, doi,
         decision, tags, notes, screened_at, session_decision)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        [_to_row(a) for a in articles],
    )
    conn.commit()
    conn.close()


def load_all_articles() -> list[Article]:
    """Given nothing, returns all articles from the database ordered by rowid."""
    conn = _connect()
    rows = conn.execute("SELECT * FROM articles ORDER BY rowid").fetchall()
    conn.close()
    return [_row_to_article(row) for row in rows]


def load_article(article_id: str) -> Article | None:
    """Given an article ID, returns the matching Article or None if not found."""
    conn = _connect()
    row = conn.execute(
        "SELECT * FROM articles WHERE id = ?", (article_id,)
    ).fetchone()
    conn.close()
    return _row_to_article(row) if row else None


def update_article(article: Article) -> None:
    """Given an Article, updates its record in the database."""
    save_article(article)


def delete_article(article_id: str) -> None:
    """Given an article ID, removes that record from the database."""
    conn = _connect()
    conn.execute("DELETE FROM articles WHERE id = ?", (article_id,))
    conn.commit()
    conn.close()


def clear_all_articles() -> None:
    """Given nothing, deletes every article from the database."""
    conn = _connect()
    conn.execute("DELETE FROM articles")
    conn.commit()
    conn.close()


def reset_session_flags() -> None:
    """Given nothing, sets session_decision to false on all articles."""
    conn = _connect()
    conn.execute("UPDATE articles SET session_decision = 0")
    conn.commit()
    conn.close()


def _connect() -> sqlite3.Connection:
    """Given nothing, returns a SQLite connection with row factory enabled."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def _to_row(article: Article) -> tuple:
    """Given an Article, returns a tuple matching the database column order."""
    return (
        article.id,
        article.title,
        article.abstract,
        json.dumps(article.authors),
        article.year,
        article.journal,
        article.doi,
        article.decision,
        json.dumps(article.tags),
        article.notes,
        article.screened_at,
        int(article.session_decision),
    )


def _row_to_article(row: sqlite3.Row) -> Article:
    """Given a SQLite row, returns a fully constructed Article object."""
    return Article(
        id=row["id"],
        title=row["title"],
        abstract=row["abstract"],
        authors=json.loads(row["authors"]),
        year=row["year"],
        journal=row["journal"],
        doi=row["doi"],
        decision=row["decision"],
        tags=json.loads(row["tags"]),
        notes=row["notes"],
        screened_at=row["screened_at"],
        session_decision=bool(row["session_decision"]),
    )
