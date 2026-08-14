"""Student memory persistence powered by Supabase PostgreSQL."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from supabase_client import get_supabase


def init_database() -> None:
    """Compatibility helper. Supabase migrations manage schemas."""
    pass


def get_user_memory(user_id: str) -> Optional[dict]:
    """Retrieve saved memory for a student from Supabase."""
    supabase = get_supabase()

    response = (
        supabase.table("user_memory")
        .select(
            "user_id, name, language_preference, current_level, topics_covered, common_mistakes, last_interaction"
        )
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )

    if not response.data:
        return None

    row = response.data[0]
    return {
        "user_id": row.get("user_id"),
        "name": row.get("name"),
        "language_preference": row.get("language_preference"),
        "current_level": row.get("current_level"),
        "topics_covered": row.get("topics_covered"),
        "common_mistakes": row.get("common_mistakes"),
        "last_interaction": row.get("last_interaction"),
    }


def save_user_memory(
    user_id: str,
    name: str | None = None,
    language_preference: str | None = None,
    current_level: str | None = None,
    topics_covered: str | None = None,
    common_mistakes: str | None = None,
) -> None:
    """Save or update a student's memory in Supabase."""
    existing = get_user_memory(user_id)
    now = datetime.now(timezone.utc).isoformat()

    if existing:
        name = name if name is not None else existing.get("name")
        language_preference = (
            language_preference
            if language_preference is not None
            else existing.get("language_preference")
        )
        current_level = (
            current_level
            if current_level is not None
            else existing.get("current_level")
        )
        topics_covered = (
            topics_covered
            if topics_covered is not None
            else existing.get("topics_covered")
        )
        common_mistakes = (
            common_mistakes
            if common_mistakes is not None
            else existing.get("common_mistakes")
        )

    supabase = get_supabase()
    record = {
        "user_id": user_id,
        "name": name,
        "language_preference": language_preference,
        "current_level": current_level,
        "topics_covered": topics_covered,
        "common_mistakes": common_mistakes,
        "last_interaction": now,
    }

    supabase.table("user_memory").upsert(record, on_conflict="user_id").execute()