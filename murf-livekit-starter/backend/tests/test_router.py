"""Unit tests for Revora Multi-Specialist Learning Router Architecture."""

import pytest
from unittest.mock import MagicMock, patch

from agent import Assistant
from debate_specialist import DebateSpecialist, build_debate_specialist
from maths_specialist import MathsSpecialist, build_maths_specialist
from physics_specialist import PhysicsSpecialist, build_physics_specialist
from chemistry_specialist import ChemistrySpecialist, build_chemistry_specialist
from prompt import MULTI_SPECIALIST_ROUTER_PROMPT, SYSTEM_PROMPT
from specialists import (
    CHEMISTRY_SPECIALIST_VOICE,
    DEBATE_SPECIALIST_VOICE,
    MATHS_SPECIALIST_VOICE,
    PHYSICS_SPECIALIST_VOICE,
    BaseSpecialist,
)


def test_router_prompt_contains_all_domains_and_explicit_rules():
    """Verify that the router prompt includes rules for all domains, voices, and explicit triggers."""
    assert "MULTI-SPECIALIST LEARNING ROUTER" in SYSTEM_PROMPT
    assert "handoff_to_maths_specialist" in SYSTEM_PROMPT
    assert "handoff_to_physics_specialist" in SYSTEM_PROMPT
    assert "handoff_to_chemistry_specialist" in SYSTEM_PROMPT
    assert "handoff_to_debate_specialist" in SYSTEM_PROMPT
    assert "Maths Specialist" in SYSTEM_PROMPT
    assert "Physics Specialist" in SYSTEM_PROMPT
    assert "Chemistry Specialist" in SYSTEM_PROMPT
    assert "Debate Specialist" in SYSTEM_PROMPT
    assert "Samar" in SYSTEM_PROMPT
    assert "Pooja" in SYSTEM_PROMPT
    assert "Abhinav" in SYSTEM_PROMPT
    assert "ONLY ON EXPLICIT REQUEST" in MULTI_SPECIALIST_ROUTER_PROMPT
    assert "WHEN NOT TO HAND OFF" in MULTI_SPECIALIST_ROUTER_PROMPT


def test_assistant_has_all_specialist_tools():
    """Verify Assistant has all specialist handoff tools."""
    assistant = Assistant(user_id="test-user")
    tools = [tool.info.name for tool in assistant.tools]

    assert "handoff_to_maths_specialist" in tools
    assert "handoff_to_physics_specialist" in tools
    assert "handoff_to_chemistry_specialist" in tools
    assert "handoff_to_debate_specialist" in tools
    assert "start_quest" in tools
    assert "record_quest_answer" in tools


def test_specialist_voices_configuration():
    """Verify exact specialist voices as required."""
    assert MATHS_SPECIALIST_VOICE == "samar"
    assert PHYSICS_SPECIALIST_VOICE == "pooja"
    assert CHEMISTRY_SPECIALIST_VOICE == "abhinav"
    assert DEBATE_SPECIALIST_VOICE == "marcus"


@pytest.mark.asyncio
async def test_maths_specialist_creation_voice_and_context():
    """Verify build_maths_specialist injects request, topic, voice (Samar), and context cleanly."""
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
    assert specialist.voice == "samar"
    assert "Quadratic Equations" in specialist.instructions
    assert "Can you help me factor x^2 - 5x + 6?" in specialist.instructions
    assert "Aarav" in specialist.instructions
    assert "Student understands basic factoring" in specialist.instructions


@pytest.mark.asyncio
async def test_physics_specialist_creation_voice_and_context():
    """Verify build_physics_specialist creates PhysicsSpecialist with Pooja voice and context."""
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
    assert specialist.voice == "pooja"
    assert "Kinematics" in specialist.instructions
    assert "projectile motion" in specialist.instructions
    assert "Priya" in specialist.instructions


@pytest.mark.asyncio
async def test_chemistry_specialist_creation_voice_and_context():
    """Verify build_chemistry_specialist creates ChemistrySpecialist with Abhinav voice and context."""
    assistant = Assistant(user_id="test-user")
    
    specialist = build_chemistry_specialist(
        origin=assistant,
        learner_request="How do I calculate moles in 18g of water?",
        topic="Mole Concept",
        level="Class 11",
    )

    assert isinstance(specialist, ChemistrySpecialist)
    assert specialist.domain_name == "Chemistry"
    assert specialist.voice == "abhinav"
    assert "Mole Concept" in specialist.instructions
    assert "18g of water" in specialist.instructions


@pytest.mark.asyncio
async def test_debate_specialist_creation_and_context():
    """Verify build_debate_specialist creates DebateSpecialist with debate prompt and stance."""
    assistant = Assistant(user_id="test-user")

    specialist = build_debate_specialist(
        origin=assistant,
        topic="AI in education",
        learner_position="AI should replace traditional homework",
        context_notes="Student enjoys philosophy and tech",
    )

    assert isinstance(specialist, DebateSpecialist)
    assert specialist.domain_name == "Debate"
    assert specialist.voice == "marcus"
    assert "AI in education" in specialist.instructions
    assert "AI should replace traditional homework" in specialist.instructions
    assert "Debate Mode" in specialist.instructions


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

    debate_specialist = build_debate_specialist(origin=origin_assistant)
    debate_response = await debate_specialist.handoff_to_debate_specialist(context=mock_context)
    assert "already in Debate Mode" in debate_response
