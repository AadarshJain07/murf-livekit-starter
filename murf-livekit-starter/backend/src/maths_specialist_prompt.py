"""Instructions for the Revora Maths Specialist agent (Day 9 handoff)."""

from __future__ import annotations

from specialist_prompts import (
    MATHS_SPECIALIST_PROMPT,
    build_specialist_instructions,
)


def build_maths_specialist_instructions(
    learner_request: str = "",
    topic: str = "",
    level: str = "Class 11",
    context_notes: str = "",
) -> str:
    """Compose specialist instructions with the safe handoff context."""
    return build_specialist_instructions(
        subject="Mathematics",
        base_prompt=MATHS_SPECIALIST_PROMPT,
        learner_request=learner_request,
        topic=topic,
        level=level,
        context_notes=context_notes,
    )
