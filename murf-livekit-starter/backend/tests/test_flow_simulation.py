"""End-to-end simulation test demonstrating the Multi-Specialist Learning Router flow.

Demonstrates:
1. Normal Maths question -> Revora answers directly (stays active).
2. Normal Physics question -> Revora answers directly (stays active).
3. Normal Chemistry question -> Revora answers directly (stays active).
4. Explicit Maths specialist request -> Maths Specialist (Voice: Samar).
5. Explicit Physics specialist request -> Physics Specialist (Voice: Pooja).
6. Explicit Chemistry specialist request -> Chemistry Specialist (Voice: Abhinav).
7. Explicit Debate request -> Debate Specialist (Debate Mode).
8. Revora announces every handoff before switching.
9. Specialist receives existing conversation context without asking student to repeat.
10. Revora's current voice remains unchanged.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from agent import Assistant, build_session
from debate_specialist import DebateSpecialist
from prompt import MULTI_SPECIALIST_ROUTER_PROMPT
from specialists import (
    BaseSpecialist,
    ChemistrySpecialist,
    DebateSpecialist,
    MathsSpecialist,
    PhysicsSpecialist,
    build_chemistry_specialist,
    build_debate_specialist,
    build_maths_specialist,
    build_physics_specialist,
)


@pytest.mark.asyncio
async def test_normal_questions_stay_with_revora():
    """Verify normal Maths, Physics, Chemistry, and Biology questions are answered directly by Revora."""
    assistant = Assistant(user_id="learner-101")
    mock_ctx = MagicMock()

    # Normal Maths question handled by get_next_exercise / Revora directly
    maths_exercise = await assistant.get_next_exercise(context=mock_ctx, subject="Maths")
    assert "Quadratic Equations" in maths_exercise

    # Normal Physics question handled by get_next_exercise / Revora directly
    physics_exercise = await assistant.get_next_exercise(context=mock_ctx, subject="Physics")
    assert "Newton's Laws" in physics_exercise

    # Normal Chemistry question handled by get_next_exercise / Revora directly
    chem_exercise = await assistant.get_next_exercise(context=mock_ctx, subject="Chemistry")
    assert "Mole Concept" in chem_exercise

    # Normal Biology question handled by get_next_exercise / Revora directly
    bio_exercise = await assistant.get_next_exercise(context=mock_ctx, subject="Biology")
    assert "Cell Biology" in bio_exercise


@pytest.mark.asyncio
async def test_explicit_maths_specialist_handoff_and_voice():
    """Verify explicit Maths specialist request activates Maths Specialist with Samar voice."""
    revora = Assistant(user_id="learner-101")
    mock_ctx = MagicMock()

    # Explicit request: "Connect me to the Maths Specialist"
    with patch("specialists.get_user_memory", return_value={"name": "Dev", "common_mistakes": "sign errors"}):
        res = await revora.handoff_to_maths_specialist(
            context=mock_ctx,
            learner_request="I don't understand this. Connect me to the Maths Specialist.",
            topic="Quadratic Equations",
            level="Class 11",
        )

    specialist_agent, handoff_prompt = res
    assert isinstance(specialist_agent, MathsSpecialist)
    assert specialist_agent.domain_name == "Maths"
    assert specialist_agent.voice == "samar"
    assert "Dev" in specialist_agent.instructions
    assert "sign errors" in specialist_agent.instructions
    assert "Quadratic Equations" in specialist_agent.instructions
    assert "without asking them to repeat it" in handoff_prompt


@pytest.mark.asyncio
async def test_explicit_physics_specialist_handoff_and_voice():
    """Verify explicit Physics specialist request activates Physics Specialist with Pooja voice."""
    revora = Assistant(user_id="learner-101")
    mock_ctx = MagicMock()

    # Explicit request: "I want to talk to the Physics Specialist."
    with patch("specialists.get_user_memory", return_value={"name": "Rohan"}):
        specialist_res = await revora.handoff_to_physics_specialist(
            context=mock_ctx,
            learner_request="I want to talk to the Physics Specialist.",
            topic="Kinematics",
            level="Class 11",
        )
    physics_specialist, intro = specialist_res
    assert isinstance(physics_specialist, PhysicsSpecialist)
    assert physics_specialist.domain_name == "Physics"
    assert physics_specialist.voice == "pooja"
    assert "Rohan" in physics_specialist.instructions
    assert "without asking them to repeat it" in intro


@pytest.mark.asyncio
async def test_explicit_chemistry_specialist_handoff_and_voice():
    """Verify explicit Chemistry specialist request activates Chemistry Specialist with Abhinav voice."""
    revora = Assistant(user_id="learner-101")
    mock_ctx = MagicMock()

    # Explicit request: "Connect me to the Chemistry Specialist."
    with patch("specialists.get_user_memory", return_value={"name": "Ananya"}):
        specialist_res = await revora.handoff_to_chemistry_specialist(
            context=mock_ctx,
            learner_request="Connect me to the Chemistry Specialist.",
            topic="Chemical Bonding",
            level="Class 11",
        )
    chem_specialist, intro = specialist_res
    assert isinstance(chem_specialist, ChemistrySpecialist)
    assert chem_specialist.domain_name == "Chemistry"
    assert chem_specialist.voice == "abhinav"
    assert "Ananya" in chem_specialist.instructions
    assert "without asking them to repeat it" in intro


@pytest.mark.asyncio
async def test_explicit_debate_mode_handoff():
    """Verify explicit debate request activates Debate Specialist."""
    revora = Assistant(user_id="learner-101")
    mock_ctx = MagicMock()

    # Explicit request: "I want to debate whether AI should replace homework."
    specialist_res = await revora.handoff_to_debate_specialist(
        context=mock_ctx,
        topic="AI in Homework",
        learner_position="AI should replace traditional homework completely",
    )
    debate_specialist, intro = specialist_res
    assert isinstance(debate_specialist, DebateSpecialist)
    assert debate_specialist.domain_name == "Debate"
    assert "AI in Homework" in debate_specialist.instructions
    assert "AI should replace traditional homework completely" in debate_specialist.instructions
    assert "without asking them to repeat it" in intro


@pytest.mark.asyncio
async def test_handoff_announcements_in_router_prompt():
    """Verify that mandatory announcements before handoff are documented in router prompt."""
    assert "Sure, I'll connect you to our Maths Specialist." in MULTI_SPECIALIST_ROUTER_PROMPT
    assert "Sure, I'll connect you to our Physics Specialist." in MULTI_SPECIALIST_ROUTER_PROMPT
    assert "Sure, I'll connect you to our Chemistry Specialist." in MULTI_SPECIALIST_ROUTER_PROMPT
    assert "Absolutely. I'll switch you to Debate Mode." in MULTI_SPECIALIST_ROUTER_PROMPT
    assert "MANDATORY HANDOFF ANNOUNCEMENT" in MULTI_SPECIALIST_ROUTER_PROMPT


def test_revora_default_voice_unchanged():
    """Verify Revora's baseline session voice is Anisha."""
    mock_ctx = MagicMock()
    mock_ctx.proc.userdata = {"vad": MagicMock()}
    with patch("agent.MultilingualModel", return_value=MagicMock()):
        session = build_session(mock_ctx)
    assert session.tts._opts.voice == "anisha"


@pytest.mark.asyncio
async def test_full_specialist_and_return_cycle():
    """Demonstrate full cycle: Revora -> Physics Specialist -> Return to Revora with summary."""
    revora = Assistant(user_id="learner-101", call_session_id="CALL-001")
    mock_ctx = MagicMock()

    with patch("specialists.get_user_memory", return_value={"name": "Rohan"}):
        specialist_res = await revora.handoff_to_physics_specialist(
            context=mock_ctx,
            learner_request="Can you explain horizontal velocity in projectile motion?",
            topic="Kinematics",
            level="Class 11",
        )
    physics_specialist, intro = specialist_res
    assert isinstance(physics_specialist, PhysicsSpecialist)

    # Specialist works with learner, then returns to Revora
    return_res = await physics_specialist.return_to_revora(
        context=mock_ctx,
        topic_covered="Projectile Motion",
        questions_attempted=5,
        correct_count=3,
        weak_concept="Horizontal velocity",
        recommended_next_action="3 targeted practice questions",
    )
    returned_revora, return_instructions = return_res

    assert returned_revora is revora
    assert "SPECIALIST LEARNING SUMMARY:" in return_instructions
    assert "Topic: Projectile Motion" in return_instructions
    assert "Attempted: 5" in return_instructions
    assert "Correct: 3" in return_instructions
    assert "Weak concept: Horizontal velocity" in return_instructions
    assert "Recommendation: 3 targeted practice questions" in return_instructions
    assert "Do NOT ask the learner to repeat anything" in return_instructions
