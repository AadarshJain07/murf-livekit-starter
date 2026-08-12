import sqlite3
from pathlib import Path
from datetime import datetime, timezone
from typing import Optional


DB_PATH = Path(__file__).resolve().parent.parent / "Revora.db"


def get_connection():
    return sqlite3.connect(DB_PATH)


def init_database():
    conn = get_connection()

    conn.execute("""
        CREATE TABLE IF NOT EXISTS users (
            user_id TEXT PRIMARY KEY,
            name TEXT,
            language_preference TEXT,
            current_level TEXT,
            topics_covered TEXT,
            common_mistakes TEXT,
            last_interaction TEXT
        )
    """)

    conn.commit()
    conn.close()


def get_user_memory(user_id: str) -> Optional[dict]:
    """Retrieve saved memory for a student."""
    init_database()

    conn = get_connection()
    cursor = conn.execute(
        """
        SELECT
            user_id,
            name,
            language_preference,
            current_level,
            topics_covered,
            common_mistakes,
            last_interaction
        FROM users
        WHERE user_id = ?
        """,
        (user_id,),
    )

    row = cursor.fetchone()
    conn.close()

    if not row:
        return None

    return {
        "user_id": row[0],
        "name": row[1],
        "language_preference": row[2],
        "current_level": row[3],
        "topics_covered": row[4],
        "common_mistakes": row[5],
        "last_interaction": row[6],
    }


def save_user_memory(
    user_id: str,
    name: str | None = None,
    language_preference: str | None = None,
    current_level: str | None = None,
    topics_covered: str | None = None,
    common_mistakes: str | None = None,
):
    """Save or update a student's memory."""
    init_database()

    existing = get_user_memory(user_id)

    now = datetime.now(timezone.utc).isoformat()

    if existing:
        name = name if name is not None else existing["name"]
        language_preference = (
            language_preference
            if language_preference is not None
            else existing["language_preference"]
        )
        current_level = (
            current_level
            if current_level is not None
            else existing["current_level"]
        )
        topics_covered = (
            topics_covered
            if topics_covered is not None
            else existing["topics_covered"]
        )
        common_mistakes = (
            common_mistakes
            if common_mistakes is not None
            else existing["common_mistakes"]
        )

    conn = get_connection()

    conn.execute(
        """
        INSERT INTO users (
            user_id,
            name,
            language_preference,
            current_level,
            topics_covered,
            common_mistakes,
            last_interaction
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id)
        DO UPDATE SET
            name = excluded.name,
            language_preference = excluded.language_preference,
            current_level = excluded.current_level,
            topics_covered = excluded.topics_covered,
            common_mistakes = excluded.common_mistakes,
            last_interaction = excluded.last_interaction
        """,
        (
            user_id,
            name,
            language_preference,
            current_level,
            topics_covered,
            common_mistakes,
            now,
        ),
    )

    conn.commit()
    conn.close()