"""Revora Maths Specialist agent (Day 9 — specialist handoff).

This module re-exports the MathsSpecialist from specialists.py for 100% backward
compatibility with existing imports and workflows.
"""

from __future__ import annotations

import logging

from livekit.agents import RunContext, function_tool

from agent import Assistant
from maths_specialist_prompt import build_maths_specialist_instructions
from specialists import (
    BaseSpecialist,
    MathsSpecialist,
    build_maths_specialist,
)

logger = logging.getLogger("agent.maths_specialist")

__all__ = [
    "BaseSpecialist",
    "MathsSpecialist",
    "build_maths_specialist",
]
