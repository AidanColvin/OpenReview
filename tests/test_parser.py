"""Tests for parser.py. Covers RIS parsing, BibTeX parsing, deduplication, and validation."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.parser import parse_ris, parse_bibtex, deduplicate_articles, validate_article
from src.models import Article

SAMPLE_RIS = """TY  - JOUR
TI  - Effects of Exercise on Cognition
AU  - Smith, John
AU  - Doe, Jane
AB  - This study examined the relationship between exercise and cognitive function.
PY  - 2023
JO  - Journal of Neuroscience
DO  - 10.1234/jn.2023.001
ER  - 
"""

SAMPLE_BIBTEX = """@article{smith2023,
  title = {Effects of Exercise on Cognition},
  author = {Smith, John and Doe, Jane},
  abstract = {This study examined the relationship between exercise and cognitive function.},
  year = {2023},
  journal = {Journal of Neuroscience},
  doi = {10.1234/jn.2023.001}
}
"""


def test_parse_ris_returns_one_article():
    articles = parse_ris(SAMPLE_RIS)
    assert len(articles) == 1


def test_parse_ris_title():
    articles = parse_ris(SAMPLE_RIS)
    assert articles[0].title == "Effects of Exercise on Cognition"


def test_parse_ris_authors():
    articles = parse_ris(SAMPLE_RIS)
    assert "Smith, John" in articles[0].authors
    assert "Doe, Jane" in articles[0].authors


def test_parse_ris_year():
    articles = parse_ris(SAMPLE_RIS)
    assert articles[0].year == 2023


def test_parse_ris_doi():
    articles = parse_ris(SAMPLE_RIS)
    assert articles[0].doi == "10.1234/jn.2023.001"


def test_parse_ris_empty_returns_empty_list():
    assert parse_ris("") == []


def test_parse_ris_multiple_entries():
    two_records = SAMPLE_RIS + "\n" + SAMPLE_RIS.replace("001", "002")
    articles = parse_ris(two_records)
    assert len(articles) == 2


def test_parse_bibtex_returns_one_article():
    articles = parse_bibtex(SAMPLE_BIBTEX)
    assert len(articles) == 1


def test_parse_bibtex_title():
    articles = parse_bibtex(SAMPLE_BIBTEX)
    assert articles[0].title == "Effects of Exercise on Cognition"


def test_parse_bibtex_year():
    articles = parse_bibtex(SAMPLE_BIBTEX)
    assert articles[0].year == 2023


def test_parse_bibtex_empty_returns_empty_list():
    assert parse_bibtex("") == []


def test_deduplicate_removes_duplicate_doi():
    a1 = Article(title="Article One", doi="10.1234/test")
    a2 = Article(title="Article Two", doi="10.1234/test")
    unique, removed = deduplicate_articles([a1, a2])
    assert len(unique) == 1
    assert len(removed) == 1


def test_deduplicate_removes_duplicate_title():
    a1 = Article(title="Same Title Here", doi="")
    a2 = Article(title="Same Title Here", doi="")
    unique, removed = deduplicate_articles([a1, a2])
    assert len(unique) == 1


def test_deduplicate_keeps_different_articles():
    a1 = Article(title="First Article", doi="10.1/a")
    a2 = Article(title="Second Article", doi="10.1/b")
    unique, removed = deduplicate_articles([a1, a2])
    assert len(unique) == 2
    assert len(removed) == 0


def test_validate_article_empty_title():
    a = Article(title="")
    errors = validate_article(a)
    assert "title" in errors


def test_validate_article_invalid_year_low():
    a = Article(title="Valid", year=500)
    errors = validate_article(a)
    assert "year" in errors


def test_validate_article_invalid_year_high():
    a = Article(title="Valid", year=2200)
    errors = validate_article(a)
    assert "year" in errors


def test_validate_article_valid():
    a = Article(title="Valid Title", year=2023, doi="10.1/test")
    errors = validate_article(a)
    assert errors == {}


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
