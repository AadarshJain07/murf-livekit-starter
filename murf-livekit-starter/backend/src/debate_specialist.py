"""Revora Debate Specialist agent — specialist handoff.

This module re-exports the DebateSpecialist from specialists.py for 100% backward
compatibility with existing imports and workflows.
"""

from __future__ import annotations

import logging

from livekit.agents import RunContext, function_tool

from agent import Assistant
from specialist_prompts import DEBATE_SPECIALIST_PROMPT, build_specialist_instructions
from specialists import (
    BaseSpecialist,
    DEBATE_SPECIALIST_VOICE,
    DebateSpecialist,
    build_debate_specialist,
)

logger = logging.getLogger("agent.debate_specialist")


def build_debate_specialist_instructions(
    topic: str = "",
    learner_position: str = "",
    context_notes: str = "",
) -> str:
    """Compose Debate specialist instructions with the safe handoff context."""
    return build_specialist_instructions(
        subject="Debate",
        base_prompt=DEBATE_SPECIALIST_PROMPT,
        learner_request=learner_position or topic,
        topic=topic,
        level="Debate Mode",
        context_notes=context_notes,
    )


__all__ = [
    "BaseSpecialist",
    "DebateSpecialist",
    "DEBATE_SPECIALIST_VOICE",
    "build_debate_specialist",
    "build_debate_specialist_instructions",
]
