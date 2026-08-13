"""Revora Voice Quest — gamified learning progression store (Day 8).

Reuses the existing Revora.db SQLite database (same file as memory.py and
escalations.py) and mirrors an aggregated read-model to quest_state.json so the
web dashboard can render real analytics without touching SQLite.

Nothing here stores private data: only learning topics, concepts, difficulty
and correctness. Free-text is sanitized the same way escalations are.
"""

from __future__ import annotations

import json
import re
import sqlite3
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional

BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BASE_DIR / "Revora.db"
JSON_PATH = BASE_DIR / "quest_state.json"

DEFAULT_USER = "demo-student-001"

# ---------------------------------------------------------------------------
# Curriculum — subject worlds and their topic nodes
# ---------------------------------------------------------------------------

WORLDS: dict[str, list[str]] = {
    "Physics": [
        "Kinematics",
        "Laws of Motion",
        "Work & Energy",
        "Gravitation",
    ],
    "Chemistry": [
        "Structure of Atom",
        "Periodic Table",
        "Chemical Bonding",
    ],
    "Mathematics": [
        "Sets",
        "Functions",
        "Trigonometry",
        "Complex Numbers",
    ],
    "Biology": [
        "Cell",
        "Biomolecules",
        "Plant Physiology",
    ],
}

BOSSES: dict[str, str] = {
    "Physics": "NEWTON",
    "Chemistry": "MENDELEEV",
    "Mathematics": "EULER",
    "Biology": "DARWIN",
}

DIFFICULTIES = ("easy", "medium", "hard")

XP_FOR_CORRECT = {"easy": 25, "medium": 35, "hard": 50}
XP_QUEST_COMPLETE = 100
XP_BOSS_DEFEATED = 250
XP_TEACH_BACK = 150
DAMAGE_FOR_CORRECT = {"easy": 15, "medium": 25, "hard": 40}
XP_PER_LEVEL = 250

BLOCKED_PATTERNS = re.compile(
    r"(password|otp|\bpin\b|cvv|aadhaar|aadhar|account number|credit card|debit card)",
    re.IGNORECASE,
)


def _sanitize(value: Optional[str], limit: int = 120) -> str:
    text = (value or "").strip()
    text = BLOCKED_PATTERNS.sub("[removed]", text)
    text = re.sub(r"\s+", " ", text)
    return text[:limit]


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_quest() -> None:
    conn = _connect()

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS quest_sessions (
            session_id TEXT PRIMARY KEY,
            user_id TEXT,
            subject TEXT,
            topic TEXT,
            channel TEXT,
            outcome TEXT,
            xp_earned INTEGER DEFAULT 0,
            started_at TEXT,
            ended_at TEXT
        )
        """
    )

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS quest_attempts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT,
            session_id TEXT,
            subject TEXT,
            topic TEXT,
            concept TEXT,
            difficulty TEXT,
            correct INTEGER,
            attempts INTEGER DEFAULT 1,
            kind TEXT DEFAULT 'question',
            xp_earned INTEGER DEFAULT 0,
            created_at TEXT
        )
        """
    )

    conn.commit()
    conn.close()


# ---------------------------------------------------------------------------
# Writes
# ---------------------------------------------------------------------------


def start_session(
    user_id: str = DEFAULT_USER,
    subject: str = "",
    topic: str = "",
    channel: str = "browser",
) -> dict:
    """Open a quest session. Outcome starts as 'incomplete'."""

    init_quest()

    session_id = "QST-" + uuid.uuid4().hex[:8].upper()

    conn = _connect()
    conn.execute(
        """
        INSERT INTO quest_sessions (
            session_id, user_id, subject, topic, channel,
            outcome, xp_earned, started_at, ended_at
        ) VALUES (?, ?, ?, ?, ?, 'incomplete', 0, ?, NULL)
        """,
        (
            session_id,
            user_id,
            _sanitize(subject, 40),
            _sanitize(topic, 80),
            _sanitize(channel, 20) or "browser",
            _now(),
        ),
    )
    conn.commit()
    conn.close()

    _write_json_mirror(user_id)
    return {"session_id": session_id, "subject": subject, "topic": topic}


def _latest_open_session(conn: sqlite3.Connection, user_id: str) -> Optional[str]:
    row = conn.execute(
        """
        SELECT session_id FROM quest_sessions
        WHERE user_id = ? AND ended_at IS NULL
        ORDER BY started_at DESC LIMIT 1
        """,
        (user_id,),
    ).fetchone()
    return row["session_id"] if row else None


def record_attempt(
    user_id: str = DEFAULT_USER,
    session_id: str = "",
    subject: str = "",
    topic: str = "",
    concept: str = "",
    correct: bool = False,
    difficulty: str = "medium",
    attempts: int = 1,
    kind: str = "question",
) -> dict:
    """Record one voice-combat answer and return XP / damage / next difficulty."""

    init_quest()

    difficulty = difficulty.strip().lower()
    if difficulty not in DIFFICULTIES:
        difficulty = "medium"

    if kind == "teach_back":
        xp = XP_TEACH_BACK if correct else 40
        damage = 60 if correct else 0
    elif kind == "boss":
        xp = XP_BOSS_DEFEATED if correct else 0
        damage = 100 if correct else 0
    else:
        xp = XP_FOR_CORRECT[difficulty] if correct else 5
        damage = DAMAGE_FOR_CORRECT[difficulty] if correct else 0

    conn = _connect()

    resolved_session = session_id or _latest_open_session(conn, user_id) or ""

    conn.execute(
        """
        INSERT INTO quest_attempts (
            user_id, session_id, subject, topic, concept,
            difficulty, correct, attempts, kind, xp_earned, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            user_id,
            resolved_session,
            _sanitize(subject, 40),
            _sanitize(topic, 80),
            _sanitize(concept, 80),
            difficulty,
            1 if correct else 0,
            max(1, int(attempts or 1)),
            _sanitize(kind, 20) or "question",
            xp,
            _now(),
        ),
    )

    if resolved_session:
        conn.execute(
            "UPDATE quest_sessions SET xp_earned = xp_earned + ? WHERE session_id = ?",
            (xp, resolved_session),
        )

    conn.commit()
    conn.close()

    state = _write_json_mirror(user_id)

    next_difficulty = _next_difficulty(difficulty, correct)
    topic_mastery = 0
    for entry in state["mastery"]:
        if entry["topic"].lower() == _sanitize(topic, 80).lower():
            topic_mastery = entry["mastery"]

    return {
        "xp_awarded": xp,
        "damage": damage,
        "correct": bool(correct),
        "next_difficulty": next_difficulty,
        "topic_mastery": topic_mastery,
        "total_xp": state["xp"],
        "level": state["level"],
        "session_id": resolved_session,
        "should_hint": (not correct),
    }


def _next_difficulty(current: str, correct: bool) -> str:
    index = DIFFICULTIES.index(current)
    index = min(index + 1, 2) if correct else max(index - 1, 0)
    return DIFFICULTIES[index]


def end_session(
    user_id: str = DEFAULT_USER,
    session_id: str = "",
    outcome: str = "success",
    subject: str = "",
    topic: str = "",
) -> dict:
    """Close a session as 'success' (objective completed) or 'failed'."""

    init_quest()

    outcome = "success" if outcome.strip().lower() in ("success", "successful", "completed") else "failed"

    conn = _connect()
    resolved_session = session_id or _latest_open_session(conn, user_id)

    if not resolved_session:
        conn.close()
        return {"ok": False, "reason": "no open session"}

    bonus = XP_QUEST_COMPLETE if outcome == "success" else 0

    conn.execute(
        """
        UPDATE quest_sessions
        SET outcome = ?, ended_at = ?, xp_earned = xp_earned + ?,
            subject = COALESCE(NULLIF(?, ''), subject),
            topic = COALESCE(NULLIF(?, ''), topic)
        WHERE session_id = ?
        """,
        (
            outcome,
            _now(),
            bonus,
            _sanitize(subject, 40),
            _sanitize(topic, 80),
            resolved_session,
        ),
    )
    conn.commit()
    conn.close()

    state = _write_json_mirror(user_id)

    return {
        "ok": True,
        "session_id": resolved_session,
        "outcome": outcome,
        "bonus_xp": bonus,
        "total_xp": state["xp"],
        "level": state["level"],
        "next_quest": state["next_quest"],
    }


# ---------------------------------------------------------------------------
# Reads / aggregation
# ---------------------------------------------------------------------------


def _mastery_from(correct: int, total: int, hard_correct: int) -> int:
    if total == 0:
        return 0
    accuracy = correct / total
    confidence = min(1.0, total / 6)
    bonus = min(0.08, 0.02 * hard_correct)
    return max(0, min(100, round((accuracy * (0.62 + 0.38 * confidence) + bonus) * 100)))


def _streak(dates: list[str]) -> int:
    days = sorted({d[:10] for d in dates if d}, reverse=True)
    if not days:
        return 0
    today = datetime.now(timezone.utc).date()
    first = datetime.fromisoformat(days[0]).date()
    if (today - first).days > 1:
        return 0
    streak = 1
    cursor = first
    for value in days[1:]:
        day = datetime.fromisoformat(value).date()
        if (cursor - day).days == 1:
            streak += 1
            cursor = day
        elif (cursor - day).days == 0:
            continue
        else:
            break
    return streak


def get_state(user_id: str = DEFAULT_USER) -> dict:
    init_quest()

    conn = _connect()

    sessions = [
        dict(row)
        for row in conn.execute(
            """
            SELECT session_id, subject, topic, channel, outcome,
                   xp_earned, started_at, ended_at
            FROM quest_sessions WHERE user_id = ?
            ORDER BY started_at DESC
            """,
            (user_id,),
        ).fetchall()
    ]

    attempts = [
        dict(row)
        for row in conn.execute(
            """
            SELECT subject, topic, concept, difficulty, correct, kind,
                   xp_earned, created_at
            FROM quest_attempts WHERE user_id = ?
            ORDER BY created_at ASC
            """,
            (user_id,),
        ).fetchall()
    ]

    conn.close()

    xp = sum(int(s["xp_earned"] or 0) for s in sessions)
    level = xp // XP_PER_LEVEL + 1
    level_floor = (level - 1) * XP_PER_LEVEL
    level_ceiling = level * XP_PER_LEVEL

    total = len(sessions)
    successful = sum(1 for s in sessions if s["outcome"] == "success")
    failed = sum(1 for s in sessions if s["outcome"] == "failed")
    success_rate = round(successful / total * 100) if total else 0

    # --- per-topic mastery -------------------------------------------------
    topic_stats: dict[tuple[str, str], dict] = {}
    concept_stats: dict[tuple[str, str, str], dict] = {}

    for a in attempts:
        subject = a["subject"] or ""
        topic = a["topic"] or ""
        if topic:
            key = (subject, topic)
            entry = topic_stats.setdefault(
                key,
                {"correct": 0, "total": 0, "hard_correct": 0, "last": a["created_at"]},
            )
            entry["total"] += 1
            entry["correct"] += int(a["correct"] or 0)
            if a["correct"] and a["difficulty"] == "hard":
                entry["hard_correct"] += 1
            entry["last"] = a["created_at"]

        concept = a["concept"] or ""
        if concept:
            ckey = (subject, topic, concept)
            centry = concept_stats.setdefault(
                ckey, {"correct": 0, "total": 0, "misses": 0, "last": a["created_at"]}
            )
            centry["total"] += 1
            if a["correct"]:
                centry["correct"] += 1
            else:
                centry["misses"] += 1
            centry["last"] = a["created_at"]

    mastery: list[dict] = []
    for (subject, topic), entry in topic_stats.items():
        score = _mastery_from(entry["correct"], entry["total"], entry["hard_correct"])
        mastery.append(
            {
                "subject": subject or "General",
                "topic": topic,
                "mastery": score,
                "attempts": entry["total"],
                "correct": entry["correct"],
                "status": "mastered" if score >= 80 else "in-progress",
                "last_practiced": entry["last"],
            }
        )
    mastery.sort(key=lambda m: m["mastery"], reverse=True)

    mastery_index = {m["topic"].lower(): m for m in mastery}

    worlds = []
    for subject, topics in WORLDS.items():
        world_topics = []
        for topic in topics:
            found = mastery_index.get(topic.lower())
            if found:
                world_topics.append(
                    {
                        "topic": topic,
                        "mastery": found["mastery"],
                        "attempts": found["attempts"],
                        "status": found["status"],
                    }
                )
            else:
                world_topics.append(
                    {"topic": topic, "mastery": 0, "attempts": 0, "status": "locked"}
                )
        attempted = [t for t in world_topics if t["attempts"] > 0]
        world_mastery = (
            round(sum(t["mastery"] for t in attempted) / len(attempted)) if attempted else 0
        )
        worlds.append(
            {
                "subject": subject,
                "boss": BOSSES.get(subject, "THE ARCHON"),
                "mastery": world_mastery,
                "topics": world_topics,
                "boss_unlocked": sum(1 for t in world_topics if t["mastery"] >= 60) >= 2,
            }
        )
    worlds.sort(key=lambda w: w["mastery"], reverse=True)

    # --- weaknesses --------------------------------------------------------
    weaknesses = []
    for (subject, topic, concept), entry in concept_stats.items():
        accuracy = entry["correct"] / entry["total"]
        if entry["misses"] >= 2 and accuracy < 0.7:
            weaknesses.append(
                {
                    "subject": subject or "General",
                    "topic": topic or "General",
                    "concept": concept,
                    "misses": entry["misses"],
                    "attempts": entry["total"],
                    "accuracy": round(accuracy * 100),
                    "last_practiced": entry["last"],
                }
            )
    weaknesses.sort(key=lambda w: (-w["misses"], w["accuracy"]))

    overall_mastery = (
        round(sum(m["mastery"] for m in mastery) / len(mastery)) if mastery else 0
    )

    open_session = next((s for s in sessions if not s["ended_at"]), None)
    last_session = sessions[0] if sessions else None

    current_quest = None
    if open_session:
        current_quest = {
            "subject": open_session["subject"] or "Physics",
            "topic": open_session["topic"] or "Kinematics",
            "session_id": open_session["session_id"],
            "status": "active",
        }
    elif last_session:
        current_quest = {
            "subject": last_session["subject"] or "Physics",
            "topic": last_session["topic"] or "Kinematics",
            "session_id": last_session["session_id"],
            "status": last_session["outcome"],
        }

    state = {
        "user_id": user_id,
        "xp": xp,
        "level": level,
        "level_progress": {
            "current": xp - level_floor,
            "needed": level_ceiling - level_floor,
            "percent": round((xp - level_floor) / XP_PER_LEVEL * 100),
            "next_level_xp": level_ceiling,
        },
        "streak": _streak([s["started_at"] for s in sessions]),
        "sessions": {
            "total": total,
            "successful": successful,
            "failed": failed,
            "in_progress": total - successful - failed,
            "success_rate": success_rate,
        },
        "overall_mastery": overall_mastery,
        "mastery": mastery,
        "worlds": worlds,
        "weaknesses": weaknesses[:6],
        "current_quest": current_quest,
        "recent_sessions": [
            {
                "session_id": s["session_id"],
                "subject": s["subject"] or "General",
                "topic": s["topic"] or "Open doubt session",
                "channel": s["channel"] or "browser",
                "outcome": s["outcome"],
                "xp_earned": int(s["xp_earned"] or 0),
                "started_at": s["started_at"],
                "ended_at": s["ended_at"],
                "duration_seconds": _duration(s["started_at"], s["ended_at"]),
            }
            for s in sessions[:8]
        ],
        "next_quest": recommend_next_quest(mastery, weaknesses, worlds),
        "updated_at": _now(),
    }

    return state


def _duration(started: Optional[str], ended: Optional[str]) -> Optional[int]:
    if not started or not ended:
        return None
    try:
        delta = datetime.fromisoformat(ended) - datetime.fromisoformat(started)
        return max(0, int(delta.total_seconds()))
    except ValueError:
        return None


def recommend_next_quest(
    mastery: list[dict],
    weaknesses: list[dict],
    worlds: list[dict],
) -> dict:
    """Pick the next challenge from real performance data."""

    if weaknesses:
        weak = weaknesses[0]
        return {
            "subject": weak["subject"],
            "topic": weak["topic"],
            "title": f"{weak['topic']} — {weak['concept']}",
            "difficulty": "medium",
            "type": "weakness",
            "boss": None,
            "reason": (
                f"You've missed {weak['concept']} {weak['misses']} times "
                f"({weak['accuracy']}% accuracy). This quest targets exactly that."
            ),
            "prompt": (
                f"Start a Revora Voice Quest on {weak['topic']} in {weak['subject']} "
                f"and target my weak concept: {weak['concept']}."
            ),
        }

    for world in worlds:
        if world["boss_unlocked"]:
            weakest = min(
                (t for t in world["topics"] if t["attempts"] > 0),
                key=lambda t: t["mastery"],
                default=None,
            )
            if weakest and weakest["mastery"] < 80:
                break
            return {
                "subject": world["subject"],
                "topic": world["subject"] + " World",
                "title": f"BOSS BATTLE: {world['boss']}",
                "difficulty": "hard",
                "type": "boss",
                "boss": world["boss"],
                "reason": (
                    f"You've reached {world['mastery']}% mastery in {world['subject']}. "
                    f"{world['boss']} will combine everything you've learned."
                ),
                "prompt": (
                    f"Start the {world['boss']} boss battle for {world['subject']} "
                    "and include my historical weak concepts."
                ),
            }

    in_progress = [m for m in mastery if m["mastery"] < 80]
    if in_progress:
        target = in_progress[-1]
        return {
            "subject": target["subject"],
            "topic": target["topic"],
            "title": f"{target['topic']} — Level Up",
            "difficulty": "medium",
            "type": "topic",
            "boss": None,
            "reason": (
                f"{target['topic']} is at {target['mastery']}% mastery — "
                "the lowest topic you have started."
            ),
            "prompt": f"Start a Revora Voice Quest on {target['topic']}.",
        }

    return {
        "subject": "Physics",
        "topic": "Kinematics",
        "title": "Kinematics — First Quest",
        "difficulty": "easy",
        "type": "topic",
        "boss": None,
        "reason": "You haven't started any quest yet. Kinematics unlocks the Physics World.",
        "prompt": "Start my first Revora Voice Quest on Kinematics.",
    }


def build_boss_plan(user_id: str = DEFAULT_USER, subject: str = "Physics") -> dict:
    """Boss questions must come from the learner's real history, not randomness."""

    state = get_state(user_id)

    subject_l = subject.strip().lower()
    weak = [w for w in state["weaknesses"] if w["subject"].lower() == subject_l]
    learned = [
        m
        for m in state["mastery"]
        if m["subject"].lower() == subject_l and m["attempts"] > 0
    ]

    return {
        "boss": BOSSES.get(subject.title(), "THE ARCHON"),
        "subject": subject.title(),
        "target_weak_concepts": [w["concept"] for w in weak][:3],
        "topics_learned": [m["topic"] for m in learned][:5],
        "unlocked": any(
            w["subject"].lower() == subject_l and w["boss_unlocked"]
            for w in state["worlds"]
        ),
        "level": state["level"],
    }


def _write_json_mirror(user_id: str = DEFAULT_USER) -> dict:
    state = get_state(user_id)
    try:
        JSON_PATH.write_text(json.dumps(state, indent=2), encoding="utf-8")
    except OSError as error:  # never break a live voice session over a file write
        print(f"[QUEST] Could not write {JSON_PATH}: {error}")
    return state


def log_event(event: str, **fields) -> None:
    detail = " ".join(f"{k}={v}" for k, v in fields.items())
    print(f"[QUEST] {event} {detail}".rstrip())


if __name__ == "__main__":
    print(json.dumps(_write_json_mirror(), indent=2))
