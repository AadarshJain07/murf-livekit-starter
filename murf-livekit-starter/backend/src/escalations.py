"""Day 7 — teacher/human escalation store.

Escalation requests are persisted twice:

1. SQLite (`Revora.db`, table `escalations`) — durable local storage.
2. `escalations.json` next to the database — a plain JSON mirror that the
   web support dashboard can read without a database driver.

Only learning-support information is stored. Never store passwords, OTPs,
PINs, account numbers, or any other sensitive personal data.
"""

import json
import random
import sqlite3
import string
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BASE_DIR / "Revora.db"
JSON_PATH = BASE_DIR / "escalations.json"

VALID_URGENCY = ("low", "medium", "high")

# Fields that must never be stored, even if a model tries to pass them along.
BLOCKED_KEYWORDS = (
    "password",
    "otp",
    "pin",
    "cvv",
    "account number",
    "aadhaar",
    "aadhar",
    "credit card",
    "debit card",
    "upi pin",
)


def _connect() -> sqlite3.Connection:
    return sqlite3.connect(DB_PATH)


def init_escalations() -> None:
    conn = _connect()
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS escalations (
            reference_id TEXT PRIMARY KEY,
            student TEXT,
            reason TEXT,
            topic TEXT,
            tried TEXT,
            urgency TEXT,
            language_preference TEXT,
            follow_up_method TEXT,
            status TEXT,
            created_at TEXT
        )
        """
    )
    conn.commit()
    conn.close()


def generate_reference_id() -> str:
    """Short human-speakable reference such as REV-7F42A."""
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    for _ in range(20):
        candidate = "REV-" + "".join(random.choice(alphabet) for _ in range(5))
        if get_escalation(candidate) is None:
            return candidate
    # Extremely unlikely fallback.
    return "REV-" + "".join(random.choice(string.digits) for _ in range(6))


def _sanitize(value: Optional[str], limit: int = 400) -> str:
    text = (value or "").strip()
    lowered = text.lower()
    for keyword in BLOCKED_KEYWORDS:
        if keyword in lowered:
            return "[removed: sensitive information must not be shared]"
    return text[:limit]


def _rows_to_dicts(rows) -> list[dict]:
    return [
        {
            "reference_id": r[0],
            "student": r[1],
            "reason": r[2],
            "topic": r[3],
            "tried": r[4],
            "urgency": r[5],
            "language_preference": r[6],
            "follow_up_method": r[7],
            "status": r[8],
            "created_at": r[9],
        }
        for r in rows
    ]


def _select(where: str = "", params: tuple = ()) -> list[dict]:
    init_escalations()
    conn = _connect()
    cursor = conn.execute(
        f"""
        SELECT reference_id, student, reason, topic, tried, urgency,
               language_preference, follow_up_method, status, created_at
        FROM escalations
        {where}
        ORDER BY created_at DESC
        """,
        params,
    )
    rows = cursor.fetchall()
    conn.close()
    return _rows_to_dicts(rows)


def get_escalation(reference_id: str) -> Optional[dict]:
    results = _select("WHERE reference_id = ?", (reference_id,))
    return results[0] if results else None


def list_escalations(status: Optional[str] = "open") -> list[dict]:
    if status:
        return _select("WHERE status = ?", (status,))
    return _select()


def _write_json_mirror() -> None:
    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "escalations": list_escalations(status=None),
    }
    JSON_PATH.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def create_escalation(
    student: str,
    reason: str,
    topic: str,
    tried: str,
    urgency: str = "medium",
    language_preference: str = "English",
    follow_up_method: str = "in-app message",
) -> dict:
    """Create and persist one escalation request. Consent must already be given."""
    init_escalations()

    normalized_urgency = (urgency or "medium").strip().lower()
    if normalized_urgency not in VALID_URGENCY:
        normalized_urgency = "medium"

    record = {
        "reference_id": generate_reference_id(),
        "student": _sanitize(student, 120) or "unknown student",
        "reason": _sanitize(reason),
        "topic": _sanitize(topic, 160),
        "tried": _sanitize(tried),
        "urgency": normalized_urgency,
        "language_preference": _sanitize(language_preference, 60) or "English",
        "follow_up_method": _sanitize(follow_up_method, 60) or "in-app message",
        "status": "open",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    conn = _connect()
    conn.execute(
        """
        INSERT INTO escalations (
            reference_id, student, reason, topic, tried, urgency,
            language_preference, follow_up_method, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            record["reference_id"],
            record["student"],
            record["reason"],
            record["topic"],
            record["tried"],
            record["urgency"],
            record["language_preference"],
            record["follow_up_method"],
            record["status"],
            record["created_at"],
        ),
    )
    conn.commit()
    conn.close()

    _write_json_mirror()
    return record
