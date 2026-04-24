"""Generates CSV, RIS, and JSON output from article data. No database access. No side effects."""
from __future__ import annotations
import csv
import json
import os
from io import StringIO
from .models import Article
from .config import EXPORT_DIR


def export_csv(articles: list[Article]) -> str:
    """Given an articles list, returns a CSV string containing all fields."""
    buffer = StringIO()
    writer = csv.writer(buffer)
    writer.writerow([
        "id", "title", "abstract", "authors", "year",
        "journal", "doi", "decision", "tags", "notes", "screened_at",
    ])
    for a in articles:
        writer.writerow([
            a.id,
            a.title,
            a.abstract,
            "; ".join(a.authors),
            a.year if a.year else "",
            a.journal,
            a.doi,
            a.decision,
            "; ".join(a.tags),
            a.notes,
            a.screened_at if a.screened_at else "",
        ])
    return buffer.getvalue()


def export_ris(articles: list[Article], decision: str | None = None) -> str:
    """Given an articles list and an optional decision filter, returns a RIS-format string."""
    if decision:
        articles = [a for a in articles if a.decision == decision]

    lines: list[str] = []
    for a in articles:
        lines.append("TY  - JOUR")
        if a.title:
            lines.append(f"TI  - {a.title}")
        for author in a.authors:
            lines.append(f"AU  - {author}")
        if a.abstract:
            lines.append(f"AB  - {a.abstract}")
        if a.year:
            lines.append(f"PY  - {a.year}")
        if a.journal:
            lines.append(f"JO  - {a.journal}")
        if a.doi:
            lines.append(f"DO  - {a.doi}")
        lines.append("ER  - ")
        lines.append("")

    return "\n".join(lines)


def export_json_string(articles: list[Article]) -> str:
    """Given an articles list, returns a JSON string of all article data."""
    return json.dumps([a.model_dump() for a in articles], indent=2)


def write_export_file(content: str, filename: str) -> str:
    """Given content and a filename, writes the file to the export directory and returns the path."""
    os.makedirs(EXPORT_DIR, exist_ok=True)
    path = os.path.join(EXPORT_DIR, filename)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    return path
