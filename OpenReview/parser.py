"""Parses RIS and BibTeX citation files into Article objects. No I/O or side effects."""
from __future__ import annotations
import re
from models import Article
from config import MIN_YEAR, MAX_YEAR

RIS_FIELD_MAP: dict[str, str] = {
    "TI": "title",
    "T1": "title",
    "AB": "abstract",
    "PY": "year",
    "Y1": "year",
    "JO": "journal",
    "JF": "journal",
    "T2": "journal",
    "SO": "journal",
    "DO": "doi",
    "AU": "authors",
    "A1": "authors",
    "A2": "authors",
}


def parse_ris(text: str) -> list[Article]:
    """Given raw RIS file text, returns a list of Article objects."""
    articles: list[Article] = []
    current: dict = {}

    for line in text.splitlines():
        line = line.strip()
        if not line:
            continue

        if line.startswith("ER"):
            if current:
                articles.append(_build_article(current))
                current = {}
            continue

        if len(line) < 6:
            continue

        tag = line[:2].strip()
        separator = line[2:6]
        value = line[6:].strip()

        if "  - " not in separator and "-" not in line[2:6]:
            continue

        if not tag or not value:
            continue

        field = RIS_FIELD_MAP.get(tag)
        if not field:
            continue

        if field == "authors":
            current.setdefault("authors", []).append(value)
        elif field == "year":
            parsed = _parse_year(value)
            if parsed:
                current["year"] = parsed
        else:
            if field not in current:
                current[field] = value

    if current:
        articles.append(_build_article(current))

    return articles


def parse_bibtex(text: str) -> list[Article]:
    """Given raw BibTeX file text, returns a list of Article objects."""
    articles: list[Article] = []
    entries = re.findall(r"@\w+\s*\{[^@]+?\n\}", text, re.DOTALL)

    if not entries:
        entries = re.findall(r"@\w+\s*\{.+?\}", text, re.DOTALL)

    for entry in entries:
        data: dict = {}

        title = _bibtex_field(entry, r"title")
        abstract = _bibtex_field(entry, r"abstract")
        journal = _bibtex_field(entry, r"(?:journal|booktitle|publisher)")
        doi = _bibtex_field(entry, r"doi")
        year_raw = _bibtex_field(entry, r"year")
        author_raw = _bibtex_field(entry, r"author")

        if title:
            data["title"] = _clean_bibtex(title)
        if abstract:
            data["abstract"] = _clean_bibtex(abstract)
        if journal:
            data["journal"] = _clean_bibtex(journal)
        if doi:
            data["doi"] = doi.strip()
        if year_raw:
            parsed = _parse_year(year_raw)
            if parsed:
                data["year"] = parsed
        if author_raw:
            raw = _clean_bibtex(author_raw)
            data["authors"] = [a.strip() for a in re.split(r"\s+and\s+", raw, flags=re.IGNORECASE)]

        articles.append(_build_article(data))

    return articles


def deduplicate_articles(articles: list[Article]) -> tuple[list[Article], list[str]]:
    """Given a list of articles, returns a deduplicated list and a list of removed identifiers."""
    seen_dois: set[str] = set()
    seen_titles: set[str] = set()
    unique: list[Article] = []
    removed: list[str] = []

    for article in articles:
        doi_key = article.doi.strip().lower()
        title_key = article.title.strip().lower()

        if doi_key and doi_key in seen_dois:
            removed.append(article.doi)
            continue

        if title_key and title_key in seen_titles:
            removed.append(article.title)
            continue

        if doi_key:
            seen_dois.add(doi_key)
        if title_key:
            seen_titles.add(title_key)

        unique.append(article)

    return unique, removed


def validate_article(article: Article) -> dict[str, list[str]]:
    """Given an Article, returns a dict mapping field names to validation error messages."""
    errors: dict[str, list[str]] = {}

    if len(article.title.strip()) < 1:
        errors.setdefault("title", []).append("Title is required.")

    if article.year is not None and not (MIN_YEAR <= article.year <= MAX_YEAR):
        errors.setdefault("year", []).append(f"Year must be between {MIN_YEAR} and {MAX_YEAR}.")

    if article.decision not in ["include", "exclude", "maybe", "unscreened"]:
        errors.setdefault("decision", []).append("Decision must be include, exclude, maybe, or unscreened.")

    return errors


def _build_article(data: dict) -> Article:
    """Given a raw field dict, returns a constructed Article object."""
    return Article(
        title=data.get("title", ""),
        abstract=data.get("abstract", ""),
        authors=data.get("authors", []),
        year=data.get("year"),
        journal=data.get("journal", ""),
        doi=data.get("doi", ""),
    )


def _parse_year(value: str) -> int | None:
    """Given a year string, returns an integer year or None if unparseable."""
    match = re.search(r"\d{4}", value)
    if match:
        y = int(match.group())
        if MIN_YEAR <= y <= MAX_YEAR:
            return y
    return None


def _bibtex_field(entry: str, pattern: str) -> str | None:
    """Given an entry string and a field pattern, returns the matched field value or None."""
    match = re.search(
        pattern + r"\s*=\s*\{(.*?)\}",
        entry,
        re.IGNORECASE | re.DOTALL,
    )
    if match:
        return match.group(1)
    match = re.search(
        pattern + r'\s*=\s*"(.*?)"',
        entry,
        re.IGNORECASE | re.DOTALL,
    )
    return match.group(1) if match else None


def _clean_bibtex(value: str) -> str:
    """Given a raw BibTeX field value, returns a cleaned plain-text string."""
    value = re.sub(r"\{|\}", "", value)
    value = re.sub(r"\s+", " ", value)
    return value.strip()
