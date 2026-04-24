"""Tests for filter.py. Covers all filter and search functions."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.filter import apply_filters, filter_by_decision, filter_by_tag, search_articles, get_all_tags, add_tag, remove_tag
from models import Article, Filter


def _sample_articles() -> list[Article]:
    """Returns a fixed list of articles for testing."""
    return [
        Article(title="Exercise and Brain Health", abstract="Aerobic exercise improves cognition.", decision="include", tags=["neuroscience"]),
        Article(title="Sleep Disorders in Adults", abstract="Insomnia affects millions of adults.", decision="exclude", tags=["sleep"]),
        Article(title="Diet and Inflammation", abstract="Dietary patterns affect inflammatory markers.", decision="unscreened", tags=[]),
        Article(title="Mindfulness Interventions", abstract="Mindfulness reduces stress in clinical populations.", decision="maybe", tags=["mental health", "neuroscience"]),
    ]


def test_filter_by_decision_include():
    articles = _sample_articles()
    result = filter_by_decision(articles, "include")
    assert len(result) == 1
    assert result[0].title == "Exercise and Brain Health"


def test_filter_by_decision_exclude():
    articles = _sample_articles()
    result = filter_by_decision(articles, "exclude")
    assert len(result) == 1


def test_filter_by_decision_unscreened():
    articles = _sample_articles()
    result = filter_by_decision(articles, "unscreened")
    assert len(result) == 1


def test_filter_by_tag_exact_match():
    articles = _sample_articles()
    result = filter_by_tag(articles, "neuroscience")
    assert len(result) == 2


def test_filter_by_tag_no_match():
    articles = _sample_articles()
    result = filter_by_tag(articles, "cardiology")
    assert len(result) == 0


def test_filter_by_tag_case_insensitive():
    articles = _sample_articles()
    result = filter_by_tag(articles, "Neuroscience")
    assert len(result) == 2


def test_search_articles_title_match():
    articles = _sample_articles()
    result = search_articles(articles, "exercise")
    assert len(result) == 1
    assert result[0].title == "Exercise and Brain Health"


def test_search_articles_abstract_match():
    articles = _sample_articles()
    result = search_articles(articles, "insomnia")
    assert len(result) == 1


def test_search_articles_case_insensitive():
    articles = _sample_articles()
    result = search_articles(articles, "SLEEP")
    assert len(result) == 1


def test_search_articles_no_match():
    articles = _sample_articles()
    result = search_articles(articles, "zzznomatch")
    assert len(result) == 0


def test_search_articles_empty_query_returns_all():
    articles = _sample_articles()
    result = search_articles(articles, "")
    assert len(result) == len(articles)


def test_apply_filters_combined():
    articles = _sample_articles()
    filters = Filter(status="include", query="exercise")
    result = apply_filters(articles, filters)
    assert len(result) == 1


def test_get_all_tags_sorted():
    articles = _sample_articles()
    tags = get_all_tags(articles)
    assert tags == sorted(set(["neuroscience", "sleep", "mental health"]))


def test_add_tag_adds_new_tag():
    a = Article(title="Test")
    updated = add_tag(a, "new-tag")
    assert "new-tag" in updated.tags


def test_add_tag_skips_duplicate():
    a = Article(title="Test", tags=["existing"])
    updated = add_tag(a, "existing")
    assert updated.tags.count("existing") == 1


def test_remove_tag_removes_tag():
    a = Article(title="Test", tags=["keep", "remove"])
    updated = remove_tag(a, "remove")
    assert "remove" not in updated.tags
    assert "keep" in updated.tags


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
