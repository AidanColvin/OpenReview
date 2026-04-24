"""Decision logic for article screening. Pure functions only. No I/O or side effects."""
from __future__ import annotations
from datetime import datetime, timezone
from .models import Article
from .config import DECISION_STATES


def make_decision(article_id: str, decision: str, articles: list[Article]) -> list[Article]:
    """Given an article ID, a decision string, and an articles list, returns the updated list."""
    if decision not in DECISION_STATES:
        raise ValueError(f"Decision must be one of {DECISION_STATES}.")
    return [
        _apply_decision(a, decision) if a.id == article_id else a
        for a in articles
    ]


def undo_last_decision(articles: list[Article]) -> tuple[list[Article], Article | None]:
    """Given an articles list, returns the list with the most recent session decision reversed."""
    session_articles = [a for a in articles if a.session_decision and a.screened_at]
    if not session_articles:
        return articles, None

    last = max(session_articles, key=lambda a: a.screened_at or "")
    reverted = _revert_decision(last)
    updated = [reverted if a.id == last.id else a for a in articles]
    return updated, reverted


def undo_session(articles: list[Article]) -> list[Article]:
    """Given an articles list, returns the list with all session decisions reverted to unscreened."""
    return [_revert_decision(a) if a.session_decision else a for a in articles]


def get_next_article(articles: list[Article], current_id: str) -> Article | None:
    """Given an articles list and a current article ID, returns the next unscreened article."""
    unscreened = [a for a in articles if a.decision == "unscreened"]
    if not unscreened:
        return None
    ids = [a.id for a in unscreened]
    if current_id in ids:
        idx = ids.index(current_id)
        if idx + 1 < len(unscreened):
            return unscreened[idx + 1]
    return unscreened[0]


def get_previous_article(articles: list[Article], current_id: str) -> Article | None:
    """Given an articles list and a current article ID, returns the previous unscreened article."""
    unscreened = [a for a in articles if a.decision == "unscreened"]
    if not unscreened:
        return None
    ids = [a.id for a in unscreened]
    if current_id in ids:
        idx = ids.index(current_id)
        if idx - 1 >= 0:
            return unscreened[idx - 1]
    return unscreened[-1]


def compute_stats(articles: list[Article]) -> dict:
    """Given an articles list, returns a dict of current screening progress statistics."""
    total = len(articles)
    included = sum(1 for a in articles if a.decision == "include")
    excluded = sum(1 for a in articles if a.decision == "exclude")
    maybe = sum(1 for a in articles if a.decision == "maybe")
    unscreened = sum(1 for a in articles if a.decision == "unscreened")
    screened = total - unscreened
    session_decisions = sum(1 for a in articles if a.session_decision)
    include_rate = round(included / screened, 4) if screened > 0 else 0.0

    return {
        "total": total,
        "included": included,
        "excluded": excluded,
        "maybe": maybe,
        "unscreened": unscreened,
        "include_rate": include_rate,
        "session_decisions": session_decisions,
    }


def _apply_decision(article: Article, decision: str) -> Article:
    """Given an article and a decision string, returns a new article with the decision applied."""
    return article.model_copy(update={
        "decision": decision,
        "screened_at": datetime.now(timezone.utc).isoformat(),
        "session_decision": True,
    })


def _revert_decision(article: Article) -> Article:
    """Given an article, returns a new article with its decision cleared to unscreened."""
    return article.model_copy(update={
        "decision": "unscreened",
        "screened_at": None,
        "session_decision": False,
    })
