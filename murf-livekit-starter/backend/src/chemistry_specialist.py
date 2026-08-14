"""Revora Chemistry Specialist agent — specialist handoff.

This module re-exports the ChemistrySpecialist from specialists.py for 100% backward
compatibility with existing imports and workflows.
"""

from __future__ import annotations

import logging

from livekit.agents import RunContext, function_tool

from agent import Assistant
from specialist_prompts import CHEMISTRY_SPECIALIST_PROMPT, build_specialist_instructions
from specialists import (
    BaseSpecialist,
    ChemistrySpecialist,
    build_chemistry_specialist,
)

logger = logging.getLogger("agent.chemistry_specialist")


def build_chemistry_specialist_instructions(
    learner_request: str = "",
    topic: str = "",
    level: str = "Class 11",
    context_notes: str = "",
) -> str:
    """Compose Chemistry specialist instructions with the safe handoff context."""
    return build_specialist_instructions(
        subject="Chemistry",
        base_prompt=CHEMISTRY_SPECIALIST_PROMPT,
        learner_request=learner_request,
        topic=topic,
        level=level,
        context_notes=context_notes,
    )


__all__ = [
    "BaseSpecialist",
    "ChemistrySpecialist",
    "build_chemistry_specialist",
    "build_chemistry_specialist_instructions",
]
