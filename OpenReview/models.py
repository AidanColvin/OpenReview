"""Pydantic data models for OpenReview. One model per concept."""
from __future__ import annotations
from pydantic import BaseModel, Field
from typing import Optional
import uuid


class Article(BaseModel):
    """Represents a single citation in the review set."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str = ""
    abstract: str = ""
    authors: list[str] = []
    year: Optional[int] = None
    journal: str = ""
    doi: str = ""
    decision: str = "unscreened"
    tags: list[str] = []
    notes: str = ""
    screened_at: Optional[str] = None
    session_decision: bool = False


class Filter(BaseModel):
    """Represents the active filter state for the article list."""
    status: Optional[str] = None
    tag: Optional[str] = None
    query: Optional[str] = None


class DecisionRequest(BaseModel):
    """Request body for a decision action on an article."""
    decision: str


class TagRequest(BaseModel):
    """Request body for adding a tag to an article."""
    tag: str


class NotesRequest(BaseModel):
    """Request body for updating the notes field on an article."""
    notes: str


class ImportResult(BaseModel):
    """Result returned after a citation file import."""
    articles_imported: int
    duplicates_removed: int
    errors: list[str]


class ScreeningStats(BaseModel):
    """Snapshot of screening progress counts and rates."""
    total: int
    included: int
    excluded: int
    maybe: int
    unscreened: int
    include_rate: float
    session_decisions: int
