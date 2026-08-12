"""Day 7 — teacher/human escalation store + Discord integration."""

from __future__ import annotations

import json
import random
import sqlite3
import string
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import requests
from dotenv import load_dotenv

load_dotenv(".env.local")

BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BASE_DIR / "Revora.db"
JSON_PATH = BASE_DIR / "escalations.json"

VALID_URGENCY = ("low", "medium", "high")

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
            created_at TEXT,
            phone_number TEXT
        )
        """
    )

    try:
        conn.execute("ALTER TABLE escalations ADD COLUMN phone_number TEXT")
    except sqlite3.OperationalError:
        pass  # Column already exists

    conn.commit()
    conn.close()


def generate_reference_id() -> str:
    """Generate a short human-speakable reference ID."""

    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

    for _ in range(20):
        candidate = "REV-" + "".join(
            random.choice(alphabet) for _ in range(5)
        )

        if get_escalation(candidate) is None:
            return candidate

    return "REV-" + "".join(
        random.choice(string.digits) for _ in range(6)
    )


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
            "phone_number": r[10] if len(r) > 10 else "",
        }
        for r in rows
    ]


def _select(where: str = "", params: tuple = ()) -> list[dict]:
    init_escalations()

    conn = _connect()

    cursor = conn.execute(
        f"""
        SELECT
            reference_id,
            student,
            reason,
            topic,
            tried,
            urgency,
            language_preference,
            follow_up_method,
            status,
            created_at,
            phone_number
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
    results = _select(
        "WHERE reference_id = ?",
        (reference_id,),
    )

    return results[0] if results else None


def list_escalations(
    status: Optional[str] = "open",
) -> list[dict]:

    if status:
        return _select(
            "WHERE status = ?",
            (status,),
        )

    return _select()


def _write_json_mirror() -> None:
    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "escalations": list_escalations(status=None),
    }

    JSON_PATH.write_text(
        json.dumps(payload, indent=2),
        encoding="utf-8",
    )


def _send_to_discord(record: dict) -> None:
    """
    Send a beautifully formatted escalation alert to the Revora teacher Discord channel.
    """

    webhook_url = os.getenv("DISCORD_TEACHER_WEBHOOK_URL")

    if not webhook_url:
        print("[DISCORD] DISCORD_TEACHER_WEBHOOK_URL is not configured.")
        return

    follow_up = (record.get("follow_up_method") or "").lower()
    is_call = "call" in follow_up or "phone" in follow_up
    urgency = (record.get("urgency") or "medium").lower()

    if is_call or urgency == "high":
        color = 0xEF4444  # Vibrant Red
        title_prefix = "☎️ IMMEDIATE TEACHER CALL REQUEST"
        urgency_label = "🔴 HIGH PRIORITY"
    elif urgency == "medium":
        color = 0xF59E0B  # Warm Amber
        title_prefix = "🚨 TEACHER SUPPORT REQUEST"
        urgency_label = "🟡 MEDIUM PRIORITY"
    else:
        color = 0x10B981  # Emerald Green
        title_prefix = "💬 TEACHER SUPPORT REQUEST"
        urgency_label = "🟢 LOW PRIORITY"

    # Unix timestamp calculation for Discord dynamic time tag
    created_dt = datetime.now(timezone.utc)
    unix_time = int(created_dt.timestamp())

    phone = record.get("phone_number") or ""
    if not phone and "call" in follow_up:
        phone = record.get("follow_up_method") or "Phone call requested"

    fields = [
        {
            "name": "🆔 Reference ID",
            "value": f"`{record['reference_id']}`",
            "inline": True,
        },
        {
            "name": "👤 Student Name",
            "value": f"**{record['student'] or 'Student'}**",
            "inline": True,
        },
        {
            "name": "⚡ Urgency",
            "value": urgency_label,
            "inline": True,
        },
        {
            "name": "📞 Contact / Method",
            "value": f"**{phone if phone else record['follow_up_method']}**",
            "inline": True,
        },
        {
            "name": "🌐 Language",
            "value": record.get("language_preference") or "English",
            "inline": True,
        },
        {
            "name": "⏰ Requested At",
            "value": f"<t:{unix_time}:F> (<t:{unix_time}:R>)",
            "inline": True,
        },
        {
            "name": "📚 Topic / Subject",
            "value": f"```{record.get('topic') or 'General Study Doubt'}```",
            "inline": False,
        },
        {
            "name": "❓ Reason for Request",
            "value": record.get("reason") or "Student requested human teacher assistance.",
            "inline": False,
        },
        {
            "name": "🛠️ What Revora Tried",
            "value": record.get("tried") or "Explained concept and asked for consent.",
            "inline": False,
        },
    ]

    message = {
        "username": "Revora Teacher Dispatch",
        "avatar_url": "https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/phone-call.png",
        "embeds": [
            {
                "title": title_prefix,
                "description": (
                    "**A student has requested teacher support via Revora AI.**\n"
                    "Please review the details below and follow up promptly."
                ),
                "color": color,
                "fields": fields,
                "footer": {
                    "text": "Revora AI • Voice Tutor Teacher Escalation Hub"
                },
                "timestamp": created_dt.isoformat(),
            }
        ],
    }

    try:
        response = requests.post(
            webhook_url,
            json=message,
            timeout=10,
        )

        response.raise_for_status()

        print(
            f"[DISCORD] Escalation {record['reference_id']} sent successfully."
        )

    except requests.RequestException as error:
        print(
            f"[DISCORD] Failed to send escalation "
            f"{record['reference_id']}: {error}"
        )


def create_escalation(
    student: str,
    reason: str,
    topic: str,
    tried: str,
    urgency: str = "medium",
    language_preference: str = "English",
    follow_up_method: str = "in-app message",
    phone_number: str = "",
) -> dict:
    """
    Create and persist one escalation request.

    Consent must already have been obtained by the agent.
    """

    init_escalations()

    normalized_urgency = (
        urgency or "medium"
    ).strip().lower()

    if normalized_urgency not in VALID_URGENCY:
        normalized_urgency = "medium"

    record = {
        "reference_id": generate_reference_id(),
        "student": _sanitize(
            student,
            120,
        ) or "unknown student",
        "reason": _sanitize(reason),
        "topic": _sanitize(topic, 160),
        "tried": _sanitize(tried),
        "urgency": normalized_urgency,
        "language_preference": _sanitize(
            language_preference,
            60,
        ) or "English",
        "follow_up_method": _sanitize(
            follow_up_method,
            60,
        ) or "in-app message",
        "phone_number": _sanitize(phone_number, 30),
        "status": "open",
        "created_at": datetime.now(
            timezone.utc
        ).isoformat(),
    }

    conn = _connect()

    conn.execute(
        """
        INSERT INTO escalations (
            reference_id,
            student,
            reason,
            topic,
            tried,
            urgency,
            language_preference,
            follow_up_method,
            status,
            created_at,
            phone_number
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
            record["phone_number"],
        ),
    )

    conn.commit()
    conn.close()

    # Keep the local JSON mirror for the Revora dashboard.
    _write_json_mirror()

    # Send the same safe summary to Discord.
    _send_to_discord(record)

    return record