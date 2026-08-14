"""Revora Maths Specialist agent (Day 9 — specialist handoff).

The specialist reuses Revora's existing `Assistant` class so the live voice
pipeline, user ID, call analytics session and existing tools keep working
exactly as before. Only the instructions are narrowed to Mathematics, plus a
`return_to_revora` tool to hand the learner back.
"""

import logging

from livekit.agents import RunContext, function_tool

from agent import Assistant
from maths_specialist_prompt import build_maths_specialist_instructions

logger = logging.getLogger("agent.maths_specialist")


class MathsSpecialist(Assistant):
    """Focused Class 11 Mathematics tutor handed the learner by Revora."""

    def __init__(self, origin: Assistant, instructions: str) -> None:
        self._origin = origin
        super().__init__(
            user_id=origin.user_id,
            instructions=instructions,
            ctx=origin.ctx,
            outbound=origin.outbound,
            call_session_id=origin.call_session_id,
        )

    @function_tool
    async def handoff_to_maths_specialist(
        self,
        context: RunContext,
        learner_request: str = "",
        topic: str = "",
        level: str = "Class 11",
        context_notes: str = "",
    ) -> str:
        """Do not use: the Maths Specialist is already speaking with the learner."""
        return (
            "You are already the Maths Specialist. Continue helping with "
            "Mathematics yourself."
        )

    @function_tool
    async def return_to_revora(
        self,
        context: RunContext,
        summary: str = "",
    ):
        """
        Hand the learner back to Revora, the main learning agent.

        Use this when the learner moves away from Mathematics — another
        subject, general tutoring, quests, their history, or casual chat.
        Pass a one-line summary of what you covered (no private details).
        """
        logger.info("Maths Specialist handing back to Revora: %s", summary)
        return (
            self._origin,
            "Bringing Revora back in for that. Continue the conversation "
            "naturally without asking the learner to repeat themselves."
            + (f" Maths session summary: {summary}" if summary else ""),
        )


def build_maths_specialist(
    origin: Assistant,
    learner_request: str = "",
    topic: str = "",
    level: str = "Class 11",
    context_notes: str = "",
) -> MathsSpecialist:
    """Create the specialist with safe handoff context injected."""
    return MathsSpecialist(
        origin=origin,
        instructions=build_maths_specialist_instructions(
            learner_request=learner_request,
            topic=topic,
            level=level,
            context_notes=context_notes,
        ),
    )
