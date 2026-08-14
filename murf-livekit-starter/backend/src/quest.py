"""Revora Voice Quest — gamified learning progression store (Supabase PostgreSQL).

All state is persisted directly to Supabase tables:
- `quest_sessions`
- `quest_attempts`

Nothing here stores private data: only learning topics, concepts, difficulty
and correctness. Free-text is sanitized the same way escalations are.
"""

from __future__ import annotations

import re
import uuid
from datetime import datetime, timezone
from typing import Optional

from supabase_client import get_supabase

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


def init_quest() -> None:
    """Compatibility helper. Supabase migrations manage schemas."""
    pass


# ---------------------------------------------------------------------------
# Writes
# ---------------------------------------------------------------------------


def _latest_open_session(user_id: str = DEFAULT_USER) -> Optional[str]:
    """Find the most recent unfinished session ID for this user in Supabase."""
    supabase = get_supabase()
    response = (
        supabase.table("quest_sessions")
        .select("session_id")
        .eq("user_id", user_id)
        .is_("ended_at", "null")
        .order("started_at", desc=True)
        .limit(1)
        .execute()
    )
    if response.data:
        return response.data[0]["session_id"]
    return None


def start_session(
    user_id: str = DEFAULT_USER,
    subject: str = "",
    topic: str = "",
    channel: str = "browser",
    session_id: str = "",
) -> dict:
    """Open (or re-use) the call session for this user.

    Analytics represent CALLS, not questions. One live call = one row. The call
    session row is created once when the call connects
    (``log_conversation_start``); starting a quest inside that same call must
    therefore UPDATE that row instead of inserting a second one.
    """
    supabase = get_supabase()
    existing = session_id or _latest_open_session(user_id)

    if existing:
        updates: dict[str, str] = {}
        if subject:
            updates["subject"] = _sanitize(subject, 40)
        if topic:
            updates["topic"] = _sanitize(topic, 80)
        if channel:
            updates["channel"] = _sanitize(channel, 20)

        if updates:
            supabase.table("quest_sessions").update(updates).eq(
                "session_id", existing
            ).execute()

        return {"session_id": existing, "subject": subject, "topic": topic}

    new_session_id = "QST-" + uuid.uuid4().hex[:8].upper()

    row = {
        "session_id": new_session_id,
        "user_id": user_id,
        "subject": _sanitize(subject, 40),
        "topic": _sanitize(topic, 80),
        "channel": _sanitize(channel, 20) or "browser",
        "outcome": "incomplete",
        "xp_earned": 0,
        "started_at": _now(),
        "ended_at": None,
    }
    supabase.table("quest_sessions").insert(row).execute()

    return {"session_id": new_session_id, "subject": subject, "topic": topic}


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

    supabase = get_supabase()
    resolved_session = session_id or _latest_open_session(user_id) or ""

    attempt_row = {
        "user_id": user_id,
        "session_id": resolved_session or None,
        "subject": _sanitize(subject, 40),
        "topic": _sanitize(topic, 80),
        "concept": _sanitize(concept, 80),
        "difficulty": difficulty,
        "correct": bool(correct),
        "attempts": max(1, int(attempts or 1)),
        "kind": _sanitize(kind, 20) or "question",
        "xp_earned": xp,
        "created_at": _now(),
    }
    supabase.table("quest_attempts").insert(attempt_row).execute()

    if resolved_session:
        sess_res = (
            supabase.table("quest_sessions")
            .select("xp_earned")
            .eq("session_id", resolved_session)
            .limit(1)
            .execute()
        )
        if sess_res.data:
            current_xp = int(sess_res.data[0].get("xp_earned") or 0)
            supabase.table("quest_sessions").update(
                {"xp_earned": current_xp + xp}
            ).eq("session_id", resolved_session).execute()

    state = get_state(user_id)

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
    outcome = (
        "success"
        if outcome.strip().lower() in ("success", "successful", "completed")
        else "failed"
    )

    supabase = get_supabase()
    resolved_session = session_id or _latest_open_session(user_id)

    if not resolved_session:
        return {"ok": False, "reason": "no open session"}

    bonus = XP_QUEST_COMPLETE if outcome == "success" else 0

    sess_res = (
        supabase.table("quest_sessions")
        .select("xp_earned, subject, topic")
        .eq("session_id", resolved_session)
        .limit(1)
        .execute()
    )
    current_xp = int(sess_res.data[0].get("xp_earned") or 0) if sess_res.data else 0
    existing_subj = sess_res.data[0].get("subject") if sess_res.data else ""
    existing_topic = sess_res.data[0].get("topic") if sess_res.data else ""

    updates = {
        "outcome": outcome,
        "ended_at": _now(),
        "xp_earned": current_xp + bonus,
        "subject": _sanitize(subject, 40) or existing_subj or "",
        "topic": _sanitize(topic, 80) or existing_topic or "",
    }
    supabase.table("quest_sessions").update(updates).eq(
        "session_id", resolved_session
    ).execute()

    state = get_state(user_id)

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
    try:
        first = datetime.fromisoformat(days[0]).date()
    except ValueError:
        return 0
    if (today - first).days > 1:
        return 0
    streak = 1
    cursor = first
    for value in days[1:]:
        try:
            day = datetime.fromisoformat(value).date()
        except ValueError:
            continue
        if (cursor - day).days == 1:
            streak += 1
            cursor = day
        elif (cursor - day).days == 0:
            continue
        else:
            break
    return streak


def get_state(user_id: str = DEFAULT_USER) -> dict:
    """Read aggregated quest state live from Supabase."""
    supabase = get_supabase()

    sessions_res = (
        supabase.table("quest_sessions")
        .select(
            "session_id, subject, topic, channel, outcome, xp_earned, started_at, ended_at"
        )
        .eq("user_id", user_id)
        .order("started_at", desc=True)
        .execute()
    )
    sessions = sessions_res.data or []

    attempts_res = (
        supabase.table("quest_attempts")
        .select(
            "subject, topic, concept, difficulty, correct, kind, xp_earned, created_at"
        )
        .eq("user_id", user_id)
        .order("created_at", desc=False)
        .execute()
    )
    attempts = attempts_res.data or []

    xp = sum(int(s.get("xp_earned") or 0) for s in sessions)
    level = xp // XP_PER_LEVEL + 1
    level_floor = (level - 1) * XP_PER_LEVEL
    level_ceiling = level * XP_PER_LEVEL

    total = len(sessions)
    successful = sum(1 for s in sessions if s.get("outcome") == "success")
    failed = sum(1 for s in sessions if s.get("outcome") == "failed")
    success_rate = round(successful / total * 100) if total else 0

    # --- per-topic mastery -------------------------------------------------
    topic_stats: dict[tuple[str, str], dict] = {}
    concept_stats: dict[tuple[str, str, str], dict] = {}

    for a in attempts:
        subject = a.get("subject") or ""
        topic = a.get("topic") or ""
        if topic:
            key = (subject, topic)
            entry = topic_stats.setdefault(
                key,
                {"correct": 0, "total": 0, "hard_correct": 0, "last": a.get("created_at")},
            )
            entry["total"] += 1
            entry["correct"] += 1 if a.get("correct") else 0
            if a.get("correct") and a.get("difficulty") == "hard":
                entry["hard_correct"] += 1
            entry["last"] = a.get("created_at")

        concept = a.get("concept") or ""
        if concept:
            ckey = (subject, topic, concept)
            centry = concept_stats.setdefault(
                ckey, {"correct": 0, "total": 0, "misses": 0, "last": a.get("created_at")}
            )
            centry["total"] += 1
            if a.get("correct"):
                centry["correct"] += 1
            else:
                centry["misses"] += 1
            centry["last"] = a.get("created_at")

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

    open_session = next((s for s in sessions if not s.get("ended_at")), None)
    last_session = sessions[0] if sessions else None

    current_quest = None
    if open_session:
        current_quest = {
            "subject": open_session.get("subject") or "Physics",
            "topic": open_session.get("topic") or "Kinematics",
            "session_id": open_session.get("session_id"),
            "status": "active",
        }
    elif last_session:
        current_quest = {
            "subject": last_session.get("subject") or "Physics",
            "topic": last_session.get("topic") or "Kinematics",
            "session_id": last_session.get("session_id"),
            "status": last_session.get("outcome"),
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
        "streak": _streak([s.get("started_at") for s in sessions if s.get("started_at")]),
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
                "session_id": s.get("session_id"),
                "subject": s.get("subject") or "General",
                "topic": s.get("topic") or "Open doubt session",
                "channel": s.get("channel") or "browser",
                "outcome": s.get("outcome"),
                "xp_earned": int(s.get("xp_earned") or 0),
                "started_at": s.get("started_at"),
                "ended_at": s.get("ended_at"),
                "duration_seconds": _duration(s.get("started_at"), s.get("ended_at")),
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


def log_event(event: str, **fields) -> None:
    detail = " ".join(f"{k}={v}" for k, v in fields.items())
    print(f"[QUEST] {event} {detail}".rstrip())


# ---------------------------------------------------------------------------
# Conversation-level session tracking (normal, non-quest calls)
# ---------------------------------------------------------------------------


def log_conversation_start(
    user_id: str = DEFAULT_USER, channel: str = "browser"
) -> str:
    """Create a session row for a normal voice conversation (no quest).

    Returns the generated session ID so the caller can close it later.
    The row uses the same ``quest_sessions`` table; a ``CONV-`` prefix
    distinguishes it from quest rows (``QST-``).
    """
    session_id = "CONV-" + uuid.uuid4().hex[:8].upper()

    supabase = get_supabase()
    row = {
        "session_id": session_id,
        "user_id": user_id,
        "subject": "conversation",
        "topic": "general",
        "channel": _sanitize(channel, 20) or "browser",
        "outcome": "incomplete",
        "xp_earned": 0,
        "started_at": _now(),
        "ended_at": None,
    }
    supabase.table("quest_sessions").insert(row).execute()

    log_event("conversation_start", session_id=session_id, channel=channel)
    return session_id


def log_conversation_end(
    user_id: str = DEFAULT_USER,
    session_id: str = "",
    outcome: str = "failed",
) -> None:
    """Close the call session opened by ``log_conversation_start``.

    Only a met success condition (``complete_quest`` -> ``end_session``) marks a
    call ``success``; that call already sets ``ended_at``, so this UPDATE is a
    no-op for it. Any call that ends without meeting the success condition is
    therefore recorded as ``failed``.
    """
    if not session_id:
        log_event("conversation_end_skipped", reason="no session_id")
        return

    safe_outcome = (
        "success"
        if outcome.strip().lower() in ("success", "successful", "completed")
        else "failed"
    )

    supabase = get_supabase()
    supabase.table("quest_sessions").update(
        {
            "outcome": safe_outcome,
            "ended_at": _now(),
        }
    ).eq("session_id", session_id).is_("ended_at", "null").execute()

    log_event("conversation_end", session_id=session_id, outcome=safe_outcome)


if __name__ == "__main__":
    import json

    print(json.dumps(get_state(), indent=2))
