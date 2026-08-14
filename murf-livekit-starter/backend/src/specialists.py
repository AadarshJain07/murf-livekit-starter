"""Revora Multi-Specialist Learning Router Architecture.

Provides domain specialists for Mathematics, Physics, and Chemistry.
Each specialist inherits from Assistant to retain all core voice, tool,
quest, memory, and analytics capabilities, while focusing on domain pedagogy.
"""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING, Optional

from livekit.agents import RunContext, function_tool, tokenize
from livekit.plugins import murf

from agent import Assistant
from memory import get_user_memory
from quest import get_state
from specialist_prompts import (
    CHEMISTRY_SPECIALIST_PROMPT,
    DEBATE_SPECIALIST_PROMPT,
    MATHS_SPECIALIST_PROMPT,
    PHYSICS_SPECIALIST_PROMPT,
    build_specialist_instructions,
)

logger = logging.getLogger("agent.specialists")

# Specialist Voice Configurations (Murf TTS)
MATHS_SPECIALIST_VOICE = "samar"
PHYSICS_SPECIALIST_VOICE = "pooja"
CHEMISTRY_SPECIALIST_VOICE = "abhinav"
DEBATE_SPECIALIST_VOICE = "marcus"


class SpecialistAssistant:
    """Base class mixin / wrapper logic for Revora domain specialists."""
    pass


class BaseSpecialist(Assistant):
    """Common base for domain specialists handed off by Revora."""

    def __init__(
        self,
        origin: Assistant,
        instructions: str,
        domain_name: str,
        voice: str | None = None,
    ) -> None:
        self._origin = origin
        self.domain_name = domain_name
        self.voice = voice

        specialist_tts = None
        if voice:
            try:
                specialist_tts = murf.TTS(
                    voice=voice,
                    style="Conversation",
                    tokenizer=tokenize.basic.SentenceTokenizer(
                        min_sentence_len=2
                    ),
                    text_pacing=True,
                )
            except Exception as err:
                logger.warning(
                    "Could not initialize custom TTS for %s specialist (%s): %s",
                    domain_name,
                    voice,
                    err,
                )

        super().__init__(
            user_id=origin.user_id,
            instructions=instructions,
            ctx=origin.ctx,
            outbound=origin.outbound,
            call_session_id=origin.call_session_id,
            tts=specialist_tts,
        )

    @function_tool
    async def return_to_revora(
        self,
        context: RunContext,
        topic_covered: str = "",
        questions_attempted: int = 0,
        correct_count: int = 0,
        weak_concept: str = "",
        recommended_next_action: str = "",
        summary: str = "",
    ):
        """
        Hand the learner back to Revora, the main learning agent and router.

        Call this when:
        1. The student finishes the current practice or concept.
        2. The student switches subjects (e.g. from Physics to Chemistry or general doubt).
        3. The student asks for their stats, next quest, or platform features.

        Provide the structured learning summary so Revora can continue seamlessly
        and propose targeted follow-ups.
        """
        summary_lines = []
        if topic_covered:
            summary_lines.append(f"Topic: {topic_covered}")
        elif summary:
            summary_lines.append(f"Topic/Summary: {summary}")

        if questions_attempted > 0:
            summary_lines.append(f"Attempted: {questions_attempted}")
        if correct_count > 0 or questions_attempted > 0:
            summary_lines.append(f"Correct: {correct_count}")
        if weak_concept:
            summary_lines.append(f"Weak concept: {weak_concept}")
        if recommended_next_action:
            summary_lines.append(f"Recommendation: {recommended_next_action}")

        learning_summary = "\n".join(summary_lines) if summary_lines else summary or "Session concluded."

        logger.info(
            "%s Specialist handing back to Revora with summary: %s",
            self.domain_name,
            learning_summary.replace("\n", " | "),
        )

        return_prompt = (
            f"You are Revora, the main learning agent and coach. "
            f"The learner has just returned from a dedicated session with the {self.domain_name} Specialist.\n\n"
            f"SPECIALIST LEARNING SUMMARY:\n"
            f"{learning_summary}\n\n"
            f"INSTRUCTIONS FOR RESUMING:\n"
            f"1. Welcome the learner back warmly in one brief sentence.\n"
            f"2. Acknowledge what they practiced with the {self.domain_name} Specialist.\n"
            f"3. If a weak concept was detected or a next action was recommended, "
            f"mention it naturally and offer to start a targeted practice quest or continue exploring.\n"
            f"4. Do NOT ask the learner to repeat anything they just did."
        )

        return (
            self._origin,
            return_prompt,
        )


class MathsSpecialist(BaseSpecialist):
    """Focused Class 11 Mathematics tutor handed the learner by Revora."""

    def __init__(self, origin: Assistant, instructions: str) -> None:
        super().__init__(
            origin=origin,
            instructions=instructions,
            domain_name="Maths",
            voice=MATHS_SPECIALIST_VOICE,
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
        """Already speaking with the Maths Specialist."""
        return "You are already the Maths Specialist. Continue helping with Mathematics yourself."


class PhysicsSpecialist(BaseSpecialist):
    """Focused Class 11 Physics tutor handed the learner by Revora."""

    def __init__(self, origin: Assistant, instructions: str) -> None:
        super().__init__(
            origin=origin,
            instructions=instructions,
            domain_name="Physics",
            voice=PHYSICS_SPECIALIST_VOICE,
        )

    @function_tool
    async def handoff_to_physics_specialist(
        self,
        context: RunContext,
        learner_request: str = "",
        topic: str = "",
        level: str = "Class 11",
        context_notes: str = "",
    ) -> str:
        """Already speaking with the Physics Specialist."""
        return "You are already the Physics Specialist. Continue helping with Physics yourself."


class ChemistrySpecialist(BaseSpecialist):
    """Focused Class 11 Chemistry tutor handed the learner by Revora."""

    def __init__(self, origin: Assistant, instructions: str) -> None:
        super().__init__(
            origin=origin,
            instructions=instructions,
            domain_name="Chemistry",
            voice=CHEMISTRY_SPECIALIST_VOICE,
        )

    @function_tool
    async def handoff_to_chemistry_specialist(
        self,
        context: RunContext,
        learner_request: str = "",
        topic: str = "",
        level: str = "Class 11",
        context_notes: str = "",
    ) -> str:
        """Already speaking with the Chemistry Specialist."""
        return "You are already the Chemistry Specialist. Continue helping with Chemistry yourself."


class DebateSpecialist(BaseSpecialist):
    """Intellectual sparring partner and debate coach handed the learner by Revora."""

    def __init__(self, origin: Assistant, instructions: str) -> None:
        super().__init__(
            origin=origin,
            instructions=instructions,
            domain_name="Debate",
            voice=DEBATE_SPECIALIST_VOICE,
        )

    @function_tool
    async def handoff_to_debate_specialist(
        self,
        context: RunContext,
        topic: str = "",
        learner_position: str = "",
        context_notes: str = "",
    ) -> str:
        """Already in Debate Mode with the Debate Specialist."""
        return "You are already in Debate Mode with the Debate Specialist. Continue the debate."


def _extract_student_context(origin: Assistant, subject: str, topic: str) -> dict:
    """Helper to safely retrieve memory and subject mastery from Supabase/Quest state."""
    student_name = ""
    language_pref = ""
    weakness_info = ""
    mastery_info = ""

    try:
        mem = get_user_memory(origin.user_id)
        if mem:
            student_name = mem.get("name") or ""
            language_pref = mem.get("language_preference") or ""
            if mem.get("common_mistakes"):
                weakness_info = f"Known common mistakes: {mem.get('common_mistakes')}"
    except Exception as err:
        logger.debug("Could not fetch user memory for handoff: %s", err)

    try:
        state = get_state(origin.user_id)
        if state:
            subj_weaknesses = [
                f"{w.get('concept')} ({w.get('accuracy', 0)}% accuracy in {w.get('topic')})"
                for w in state.get("weaknesses", [])
                if (w.get("subject", "").lower() == subject.lower())
            ]
            if subj_weaknesses:
                weakness_info += (" | " if weakness_info else "") + "Detected weak concepts: " + ", ".join(subj_weaknesses)

            for m in state.get("mastery", []):
                if m.get("subject", "").lower() == subject.lower() and (not topic or topic.lower() in m.get("topic", "").lower()):
                    mastery_info = f"Topic '{m.get('topic')}' mastery is {m.get('mastery')}% ({m.get('status')})"
                    break
    except Exception as err:
        logger.debug("Could not fetch quest state for handoff: %s", err)

    return {
        "student_name": student_name,
        "language_preference": language_pref,
        "mastery_info": mastery_info,
        "weakness_info": weakness_info,
    }


def build_maths_specialist(
    origin: Assistant,
    learner_request: str = "",
    topic: str = "",
    level: str = "Class 11",
    context_notes: str = "",
) -> MathsSpecialist:
    """Create the Maths specialist with safe handoff context injected."""
    ctx_data = _extract_student_context(origin, "Mathematics", topic)
    instructions = build_specialist_instructions(
        subject="Mathematics",
        base_prompt=MATHS_SPECIALIST_PROMPT,
        learner_request=learner_request,
        topic=topic,
        level=level,
        student_name=ctx_data["student_name"],
        language_preference=ctx_data["language_preference"],
        mastery_info=ctx_data["mastery_info"],
        weakness_info=ctx_data["weakness_info"],
        context_notes=context_notes,
    )
    return MathsSpecialist(
        origin=origin,
        instructions=instructions,
    )


def build_physics_specialist(
    origin: Assistant,
    learner_request: str = "",
    topic: str = "",
    level: str = "Class 11",
    context_notes: str = "",
) -> PhysicsSpecialist:
    """Create the Physics specialist with safe handoff context injected."""
    ctx_data = _extract_student_context(origin, "Physics", topic)
    instructions = build_specialist_instructions(
        subject="Physics",
        base_prompt=PHYSICS_SPECIALIST_PROMPT,
        learner_request=learner_request,
        topic=topic,
        level=level,
        student_name=ctx_data["student_name"],
        language_preference=ctx_data["language_preference"],
        mastery_info=ctx_data["mastery_info"],
        weakness_info=ctx_data["weakness_info"],
        context_notes=context_notes,
    )
    return PhysicsSpecialist(
        origin=origin,
        instructions=instructions,
    )


def build_chemistry_specialist(
    origin: Assistant,
    learner_request: str = "",
    topic: str = "",
    level: str = "Class 11",
    context_notes: str = "",
) -> ChemistrySpecialist:
    """Create the Chemistry specialist with safe handoff context injected."""
    ctx_data = _extract_student_context(origin, "Chemistry", topic)
    instructions = build_specialist_instructions(
        subject="Chemistry",
        base_prompt=CHEMISTRY_SPECIALIST_PROMPT,
        learner_request=learner_request,
        topic=topic,
        level=level,
        student_name=ctx_data["student_name"],
        language_preference=ctx_data["language_preference"],
        mastery_info=ctx_data["mastery_info"],
        weakness_info=ctx_data["weakness_info"],
        context_notes=context_notes,
    )
    return ChemistrySpecialist(
        origin=origin,
        instructions=instructions,
    )


def build_debate_specialist(
    origin: Assistant,
    topic: str = "",
    learner_position: str = "",
    context_notes: str = "",
) -> DebateSpecialist:
    """Create the Debate specialist with safe handoff context injected."""
    ctx_data = _extract_student_context(origin, "Debate", topic)
    instructions = build_specialist_instructions(
        subject="Debate",
        base_prompt=DEBATE_SPECIALIST_PROMPT,
        learner_request=learner_position or topic,
        topic=topic,
        level="Debate Mode",
        student_name=ctx_data["student_name"],
        language_preference=ctx_data["language_preference"],
        mastery_info=ctx_data["mastery_info"],
        weakness_info=ctx_data["weakness_info"],
        context_notes=context_notes,
    )
    return DebateSpecialist(
        origin=origin,
        instructions=instructions,
    )


__all__ = [
    "BaseSpecialist",
    "MathsSpecialist",
    "PhysicsSpecialist",
    "ChemistrySpecialist",
    "DebateSpecialist",
    "MATHS_SPECIALIST_VOICE",
    "PHYSICS_SPECIALIST_VOICE",
    "CHEMISTRY_SPECIALIST_VOICE",
    "DEBATE_SPECIALIST_VOICE",
    "build_maths_specialist",
    "build_physics_specialist",
    "build_chemistry_specialist",
    "build_debate_specialist",
]
