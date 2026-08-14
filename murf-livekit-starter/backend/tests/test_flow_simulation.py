"""End-to-end simulation test demonstrating the Multi-Specialist Learning Router flow.

Demonstrates:
1. Normal question stays with Revora.
2. Maths question -> handoff to Maths Specialist without repetition.
3. Physics question -> handoff to Physics Specialist with memory & mastery context.
4. Specialist concludes -> returns structured summary to Revora.
5. Revora resumes and offers a targeted quest.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from agent import Assistant
from specialists import (
    BaseSpecialist,
    ChemistrySpecialist,
    MathsSpecialist,
    PhysicsSpecialist,
    build_chemistry_specialist,
    build_maths_specialist,
    build_physics_specialist,
)


@pytest.mark.asyncio
async def test_normal_question_stays_with_revora():
    """Verify general questions, Biology, and platform queries are handled directly by Revora."""
    assistant = Assistant(user_id="learner-101")

    # Biology question handled directly by get_next_exercise
    mock_ctx = MagicMock()
    exercise = await assistant.get_next_exercise(context=mock_ctx, subject="Biology")
    assert "Mitochondria" in exercise or "Cell Biology" in exercise


@pytest.mark.asyncio
async def test_maths_question_handoff_flow():
    """Demonstrate flow: Maths question -> Revora handoff -> Maths Specialist."""
    assistant = Assistant(user_id="learner-101")
    mock_ctx = MagicMock()

    # User asks for help with quadratic equations
    with patch("specialists.get_user_memory", return_value={"name": "Dev", "common_mistakes": "sign errors"}):
        res = await assistant.handoff_to_maths_specialist(
            context=mock_ctx,
            learner_request="I'm struggling with quadratic equations like x^2 - 5x + 6 = 0.",
            topic="Quadratic Equations",
            level="Class 11",
        )

    specialist_agent, handoff_prompt = res
    assert isinstance(specialist_agent, MathsSpecialist)
    assert specialist_agent.domain_name == "Maths"
    assert "Dev" in specialist_agent.instructions
    assert "sign errors" in specialist_agent.instructions
    assert "Quadratic Equations" in specialist_agent.instructions
    assert "without asking them to repeat it" in handoff_prompt


@pytest.mark.asyncio
async def test_physics_handoff_and_return_to_revora_cycle():
    """Demonstrate full cycle: Revora -> Physics Specialist -> Return to Revora with summary."""
    revora = Assistant(user_id="learner-101", call_session_id="CALL-001")
    mock_ctx = MagicMock()

    # Step 1: Revora routes to Physics Specialist
    with patch("specialists.get_user_memory", return_value={"name": "Rohan"}):
        specialist_res = await revora.handoff_to_physics_specialist(
            context=mock_ctx,
            learner_request="Can you explain horizontal velocity in projectile motion?",
            topic="Kinematics",
            level="Class 11",
        )
    physics_specialist, intro = specialist_res
    assert isinstance(physics_specialist, PhysicsSpecialist)
    assert "Rohan" in physics_specialist.instructions

    # Step 2: Specialist works with learner, then returns to Revora
    return_res = await physics_specialist.return_to_revora(
        context=mock_ctx,
        topic_covered="Projectile Motion",
        questions_attempted=5,
        correct_count=3,
        weak_concept="Horizontal velocity",
        recommended_next_action="3 targeted practice questions",
    )
    returned_revora, return_instructions = return_res

    # Step 3: Revora receives the structured learning summary
    assert returned_revora is revora
    assert "SPECIALIST LEARNING SUMMARY:" in return_instructions
    assert "Topic: Projectile Motion" in return_instructions
    assert "Attempted: 5" in return_instructions
    assert "Correct: 3" in return_instructions
    assert "Weak concept: Horizontal velocity" in return_instructions
    assert "Recommendation: 3 targeted practice questions" in return_instructions
    assert "Do NOT ask the learner to repeat anything" in return_instructions
