"""Tests for export.py. Covers CSV, RIS, and JSON output correctness."""
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.export import export_csv, export_ris, export_json_string
from src.models import Article


def _sample_articles() -> list[Article]:
    """Returns a fixed list of articles for export testing."""
    return [
        Article(
            title="Exercise and Brain Health",
            abstract="Aerobic exercise improves cognition.",
            authors=["Smith, John", "Doe, Jane"],
            year=2023,
            journal="Journal of Neuroscience",
            doi="10.1234/jn.001",
            decision="include",
            tags=["neuroscience"],
            notes="Relevant to Chapter 2",
        ),
        Article(
            title="Sleep Disorders in Adults",
            abstract="Insomnia affects millions.",
            authors=["Brown, Alice"],
            year=2022,
            journal="Sleep Medicine",
            doi="10.1234/sm.002",
            decision="exclude",
            tags=[],
        ),
    ]


def test_export_csv_contains_header():
    csv = export_csv(_sample_articles())
    assert "title" in csv and "decision" in csv


def test_export_csv_contains_article_title():
    assert "Exercise and Brain Health" in export_csv(_sample_articles())


def test_export_csv_contains_all_articles():
    assert "Sleep Disorders in Adults" in export_csv(_sample_articles())


def test_export_csv_authors_joined():
    assert "Smith, John; Doe, Jane" in export_csv(_sample_articles())


def test_export_ris_contains_ty_tag():
    assert "TY  - JOUR" in export_ris(_sample_articles())


def test_export_ris_contains_title():
    assert "TI  - Exercise and Brain Health" in export_ris(_sample_articles())


def test_export_ris_contains_authors():
    assert "AU  - Smith, John" in export_ris(_sample_articles())


def test_export_ris_decision_filter_include_only():
    ris = export_ris(_sample_articles(), decision="include")
    assert "Exercise and Brain Health" in ris
    assert "Sleep Disorders in Adults" not in ris


def test_export_ris_decision_filter_exclude_only():
    ris = export_ris(_sample_articles(), decision="exclude")
    assert "Sleep Disorders in Adults" in ris
    assert "Exercise and Brain Health" not in ris


def test_export_json_is_valid_json():
    parsed = json.loads(export_json_string(_sample_articles()))
    assert isinstance(parsed, list) and len(parsed) == 2


def test_export_json_contains_all_fields():
    first = json.loads(export_json_string(_sample_articles()))[0]
    for field in ["title", "abstract", "authors", "decision", "tags"]:
        assert field in first


def test_export_json_title_correct():
    first = json.loads(export_json_string(_sample_articles()))[0]
    assert first["title"] == "Exercise and Brain Health"


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
