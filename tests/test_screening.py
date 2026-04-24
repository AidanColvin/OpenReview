"""Tests for screening.py. Covers decisions, undo, navigation, and stats."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.screening import (
    make_decision, undo_last_decision, undo_session,
    get_next_article, get_previous_article, compute_stats,
)
from src.models import Article


def _make_articles(n: int) -> list[Article]:
    """Given a count n, returns a list of n unscreened articles."""
    return [Article(title=f"Article {i}") for i in range(n)]


def test_make_decision_include():
    articles = _make_articles(3)
    updated = make_decision(articles[0].id, "include", articles)
    assert updated[0].decision == "include"


def test_make_decision_exclude():
    articles = _make_articles(3)
    updated = make_decision(articles[1].id, "exclude", articles)
    assert updated[1].decision == "exclude"


def test_make_decision_sets_screened_at():
    articles = _make_articles(1)
    updated = make_decision(articles[0].id, "include", articles)
    assert updated[0].screened_at is not None


def test_make_decision_sets_session_flag():
    articles = _make_articles(1)
    updated = make_decision(articles[0].id, "include", articles)
    assert updated[0].session_decision is True


def test_make_decision_invalid_raises():
    articles = _make_articles(1)
    try:
        make_decision(articles[0].id, "invalid", articles)
        assert False, "Should have raised ValueError"
    except ValueError:
        pass


def test_undo_last_reverts_most_recent():
    articles = _make_articles(2)
    articles = make_decision(articles[0].id, "include", articles)
    articles = make_decision(articles[1].id, "exclude", articles)
    updated, reverted = undo_last_decision(articles)
    assert reverted is not None
    assert reverted.decision == "unscreened"


def test_undo_last_no_session_decisions():
    articles = _make_articles(2)
    updated, reverted = undo_last_decision(articles)
    assert reverted is None


def test_undo_session_clears_all():
    articles = _make_articles(3)
    for a in articles:
        articles = make_decision(a.id, "include", articles)
    reverted = undo_session(articles)
    assert all(a.decision == "unscreened" for a in reverted)


def test_get_next_article_returns_next():
    articles = _make_articles(3)
    second = get_next_article(articles, articles[0].id)
    assert second is not None
    assert second.id == articles[1].id


def test_get_next_article_none_when_all_screened():
    articles = _make_articles(2)
    for a in articles:
        articles = make_decision(a.id, "include", articles)
    result = get_next_article(articles, articles[0].id)
    assert result is None


def test_get_previous_article_returns_previous():
    articles = _make_articles(3)
    prev = get_previous_article(articles, articles[2].id)
    assert prev is not None
    assert prev.id == articles[1].id


def test_compute_stats_totals():
    articles = _make_articles(4)
    articles = make_decision(articles[0].id, "include", articles)
    articles = make_decision(articles[1].id, "exclude", articles)
    stats = compute_stats(articles)
    assert stats["total"] == 4
    assert stats["included"] == 1
    assert stats["excluded"] == 1
    assert stats["unscreened"] == 2


def test_compute_stats_include_rate():
    articles = _make_articles(4)
    articles = make_decision(articles[0].id, "include", articles)
    articles = make_decision(articles[1].id, "include", articles)
    articles = make_decision(articles[2].id, "exclude", articles)
    stats = compute_stats(articles)
    assert stats["include_rate"] == round(2 / 3, 4)


if __name__ == "__main__":
    tests = [(k, v) for k, v in globals().items() if k.startswith("test_")]
    passed = failed = 0
    for name, fn in tests:
        try:
            fn()
            print(f"  PASS  {name}")
            passed += 1
        except Exception as e:
            print(f"  FAIL  {name}: {e}")
            failed += 1
    print(f"\n{passed} passed, {failed} failed")
