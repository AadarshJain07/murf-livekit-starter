"""Unit tests for Revora Multi-Specialist Learning Router Architecture."""

import pytest
from unittest.mock import MagicMock, patch

from agent import Assistant
from maths_specialist import MathsSpecialist, build_maths_specialist
from prompt import MULTI_SPECIALIST_ROUTER_PROMPT, SYSTEM_PROMPT
from specialists import (
    BaseSpecialist,
    ChemistrySpecialist,
    PhysicsSpecialist,
    build_chemistry_specialist,
    build_physics_specialist,
)


def test_router_prompt_contains_all_domains():
    """Verify that the router prompt includes rules for all domains and return instructions."""
    assert "MULTI-SPECIALIST LEARNING ROUTER" in SYSTEM_PROMPT
    assert "handoff_to_maths_specialist" in SYSTEM_PROMPT
    assert "handoff_to_physics_specialist" in SYSTEM_PROMPT
    assert "handoff_to_chemistry_specialist" in SYSTEM_PROMPT
    assert "Maths Specialist" in SYSTEM_PROMPT
    assert "Physics Specialist" in SYSTEM_PROMPT
    assert "Chemistry Specialist" in SYSTEM_PROMPT
    assert "SPECIALIST LEARNING SUMMARY" in MULTI_SPECIALIST_ROUTER_PROMPT or "learning summary" in MULTI_SPECIALIST_ROUTER_PROMPT


def test_assistant_has_specialist_tools():
    """Verify Assistant has all three specialist handoff tools."""
    assistant = Assistant(user_id="test-user")
    tools = [tool.info.name for tool in assistant.tools]

    assert "handoff_to_maths_specialist" in tools
    assert "handoff_to_physics_specialist" in tools
    assert "handoff_to_chemistry_specialist" in tools
    assert "start_quest" in tools
    assert "record_quest_answer" in tools


@pytest.mark.asyncio
async def test_maths_specialist_creation_and_context():
    """Verify build_maths_specialist injects request, topic, and context cleanly."""
    assistant = Assistant(user_id="test-user")
    
    with patch("specialists.get_user_memory", return_value={"name": "Aarav", "language_preference": "English"}):
        specialist = build_maths_specialist(
            origin=assistant,
            learner_request="Can you help me factor x^2 - 5x + 6?",
            topic="Quadratic Equations",
            level="Class 11",
            context_notes="Student understands basic factoring",
        )

    assert isinstance(specialist, MathsSpecialist)
    assert isinstance(specialist, BaseSpecialist)
    assert specialist.user_id == "test-user"
    assert specialist.domain_name == "Maths"
    assert "Quadratic Equations" in specialist.instructions
    assert "Can you help me factor x^2 - 5x + 6?" in specialist.instructions
    assert "Aarav" in specialist.instructions
    assert "Student understands basic factoring" in specialist.instructions


@pytest.mark.asyncio
async def test_physics_specialist_creation_and_context():
    """Verify build_physics_specialist creates PhysicsSpecialist with domain prompt and context."""
    assistant = Assistant(user_id="test-user")
    
    with patch("specialists.get_user_memory", return_value={"name": "Priya"}):
        specialist = build_physics_specialist(
            origin=assistant,
            learner_request="I'm struggling with projectile motion range formula.",
            topic="Kinematics",
            level="Class 11",
        )

    assert isinstance(specialist, PhysicsSpecialist)
    assert specialist.domain_name == "Physics"
    assert "Kinematics" in specialist.instructions
    assert "projectile motion" in specialist.instructions
    assert "Priya" in specialist.instructions


@pytest.mark.asyncio
async def test_chemistry_specialist_creation_and_context():
    """Verify build_chemistry_specialist creates ChemistrySpecialist with domain prompt and context."""
    assistant = Assistant(user_id="test-user")
    
    specialist = build_chemistry_specialist(
        origin=assistant,
        learner_request="How do I calculate moles in 18g of water?",
        topic="Mole Concept",
        level="Class 11",
    )

    assert isinstance(specialist, ChemistrySpecialist)
    assert specialist.domain_name == "Chemistry"
    assert "Mole Concept" in specialist.instructions
    assert "18g of water" in specialist.instructions


@pytest.mark.asyncio
async def test_specialist_return_to_revora_structured_summary():
    """Verify return_to_revora builds a structured learning summary for Revora to resume."""
    origin_assistant = Assistant(user_id="test-user")
    specialist = build_physics_specialist(
        origin=origin_assistant,
        learner_request="Help with projectile motion",
        topic="Kinematics",
    )

    mock_context = MagicMock()
    res = await specialist.return_to_revora(
        context=mock_context,
        topic_covered="Projectile Motion",
        questions_attempted=5,
        correct_count=3,
        weak_concept="Horizontal velocity",
        recommended_next_action="3 targeted practice questions",
    )

    returned_agent, return_prompt = res
    assert returned_agent is origin_assistant
    assert "Topic: Projectile Motion" in return_prompt
    assert "Attempted: 5" in return_prompt
    assert "Correct: 3" in return_prompt
    assert "Weak concept: Horizontal velocity" in return_prompt
    assert "Recommendation: 3 targeted practice questions" in return_prompt
    assert "Do NOT ask the learner to repeat anything" in return_prompt


@pytest.mark.asyncio
async def test_specialist_blocks_duplicate_handoff():
    """Verify specialist refuses redundant handoff to itself."""
    origin_assistant = Assistant(user_id="test-user")
    maths_specialist = build_maths_specialist(origin=origin_assistant)

    mock_context = MagicMock()
    response = await maths_specialist.handoff_to_maths_specialist(context=mock_context)
    assert "already the Maths Specialist" in response
