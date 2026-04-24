"""Search and filter logic for article lists. All functions are pure with no side effects."""
from __future__ import annotations
from .models import Article, Filter


def apply_filters(articles: list[Article], filters: Filter) -> list[Article]:
    """Given an articles list and a Filter object, returns the filtered list."""
    result = articles

    if filters.status:
        result = filter_by_decision(result, filters.status)

    if filters.tag:
        result = filter_by_tag(result, filters.tag)

    if filters.query:
        result = search_articles(result, filters.query)

    return result


def filter_by_decision(articles: list[Article], decision: str) -> list[Article]:
    """Given an articles list and a decision string, returns articles matching that decision."""
    return [a for a in articles if a.decision == decision]


def filter_by_tag(articles: list[Article], tag: str) -> list[Article]:
    """Given an articles list and a tag string, returns articles containing that exact tag."""
    tag_lower = tag.strip().lower()
    return [a for a in articles if any(t.lower() == tag_lower for t in a.tags)]


def search_articles(articles: list[Article], query: str) -> list[Article]:
    """Given an articles list and a query string, returns articles matching title or abstract."""
    q = query.strip().lower()
    if not q:
        return articles
    return [
        a for a in articles
        if q in a.title.lower() or q in a.abstract.lower()
    ]


def get_all_tags(articles: list[Article]) -> list[str]:
    """Given an articles list, returns a sorted list of all unique tags currently in use."""
    tags: set[str] = set()
    for article in articles:
        tags.update(article.tags)
    return sorted(tags)


def add_tag(article: Article, tag: str) -> Article:
    """Given an article and a tag string, returns the article with that tag added if not already present."""
    tag = tag.strip()
    if tag and tag not in article.tags:
        return article.model_copy(update={"tags": article.tags + [tag]})
    return article


def remove_tag(article: Article, tag: str) -> Article:
    """Given an article and a tag string, returns the article with that tag removed."""
    return article.model_copy(update={"tags": [t for t in article.tags if t != tag]})


def update_notes(article: Article, notes: str) -> Article:
    """Given an article and a notes string, returns the article with its notes field updated."""
    return article.model_copy(update={"notes": notes})
