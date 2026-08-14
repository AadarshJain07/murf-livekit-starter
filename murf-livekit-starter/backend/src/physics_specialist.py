"""Revora Physics Specialist agent — specialist handoff.

This module re-exports the PhysicsSpecialist from specialists.py for 100% backward
compatibility with existing imports and workflows.
"""

from __future__ import annotations

import logging

from livekit.agents import RunContext, function_tool

from agent import Assistant
from specialist_prompts import PHYSICS_SPECIALIST_PROMPT, build_specialist_instructions
from specialists import (
    BaseSpecialist,
    PhysicsSpecialist,
    build_physics_specialist,
)

logger = logging.getLogger("agent.physics_specialist")


def build_physics_specialist_instructions(
    learner_request: str = "",
    topic: str = "",
    level: str = "Class 11",
    context_notes: str = "",
) -> str:
    """Compose Physics specialist instructions with the safe handoff context."""
    return build_specialist_instructions(
        subject="Physics",
        base_prompt=PHYSICS_SPECIALIST_PROMPT,
        learner_request=learner_request,
        topic=topic,
        level=level,
        context_notes=context_notes,
    )


__all__ = [
    "BaseSpecialist",
    "PhysicsSpecialist",
    "build_physics_specialist",
    "build_physics_specialist_instructions",
]
