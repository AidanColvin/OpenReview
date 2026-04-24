"""Application-wide constants for OpenReview. All magic values live here."""

DB_PATH: str = "openreview.db"
EXPORT_DIR: str = "exports"

DECISION_STATES: list[str] = ["include", "exclude", "maybe", "unscreened"]
SUPPORTED_IMPORT_FORMATS: list[str] = [".ris", ".bib"]

UNDO_WINDOW_SECONDS: int = 8
MIN_TITLE_LENGTH: int = 1
MAX_YEAR: int = 2100
MIN_YEAR: int = 1000

HOST: str = "0.0.0.0"
PORT: int = 8000
APP_TITLE: str = "OpenReview"
APP_VERSION: str = "1.0.0"
