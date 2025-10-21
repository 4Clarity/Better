"""
Unit tests for TransitionPlanningAgent.

Tests cover:
- Question generation for all transition types
- Response processing and context extraction
- Task generation (with mocked LLM)
- Milestone generation (with mocked LLM)
- Fallback behavior when AI fails
- Error handling
"""

import pytest
from unittest.mock import Mock, AsyncMock, patch
from datetime import datetime

# Import the agent and models
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../src')))

from models.planning_models import (
    TransitionType,
    PlanningQuestion,
    PlanningResponse,
    PlanningContext,
    TaskRecommendation,
    MilestoneRecommendation,
    QuestionType,
    TaskPriority
)
from services.transition_planning_agent import TransitionPlanningAgent


class TestTransitionPlanningAgent:
    """Test suite for TransitionPlanningAgent."""

    def setup_method(self):
        """Setup test fixtures."""
        self.agent = TransitionPlanningAgent(
            model_name="llama2",
            ollama_url="http://localhost:11434"
        )

    def test_agent_initialization(self):
        """Test agent initializes correctly."""
        assert self.agent.model_name == "llama2"
        assert self.agent.ollama_url == "http://localhost:11434"
        assert self.agent.model is not None

    # Question Generation Tests

    def test_generate_contract_questions(self):
        """Test generating questions for Contract transitions."""
        questions = self.agent.generate_questions(TransitionType.CONTRACT)

        assert isinstance(questions, list)
        assert len(questions) > 0
        assert all(isinstance(q, PlanningQuestion) for q in questions)

        # Verify expected question IDs are present
        question_ids = [q.question_id for q in questions]
        assert "contract_type" in question_ids
        assert "contract_value" in question_ids
        assert "deliverables_count" in question_ids

    def test_generate_personnel_questions(self):
        """Test generating questions for Personnel transitions."""
        questions = self.agent.generate_questions(TransitionType.PERSONNEL)

        assert isinstance(questions, list)
        assert len(questions) > 0
        assert all(isinstance(q, PlanningQuestion) for q in questions)

        # Verify expected question IDs are present
        question_ids = [q.question_id for q in questions]
        assert "transition_reason" in question_ids
        assert "role_criticality" in question_ids
        assert "notice_period" in question_ids

    def test_generate_system_questions(self):
        """Test generating questions for System transitions."""
        questions = self.agent.generate_questions(TransitionType.SYSTEM)

        assert isinstance(questions, list)
        assert len(questions) > 0
        assert all(isinstance(q, PlanningQuestion) for q in questions)

        # Verify expected question IDs are present
        question_ids = [q.question_id for q in questions]
        assert "transition_type" in question_ids
        assert "system_criticality" in question_ids
        assert "user_count" in question_ids

    def test_generate_questions_invalid_type(self):
        """Test generating questions with invalid transition type."""
        with pytest.raises(ValueError):
            self.agent.generate_questions("InvalidType")

    # Response Processing Tests

    def test_process_contract_responses(self):
        """Test processing responses for Contract transitions."""
        responses = [
            PlanningResponse(question_id="contract_type", answer="New Contract Award"),
            PlanningResponse(question_id="contract_value", answer="$1M - $10M (Large)"),
            PlanningResponse(question_id="deliverables_count", answer=5),
            PlanningResponse(question_id="contractor_personnel", answer=10),
            PlanningResponse(question_id="timeline_weeks", answer=12)
        ]

        context = self.agent.process_responses(TransitionType.CONTRACT, responses)

        assert isinstance(context, PlanningContext)
        assert context.transition_type == TransitionType.CONTRACT
        assert context.timeline_weeks == 12
        assert context.team_size == 10

    def test_process_personnel_responses(self):
        """Test processing responses for Personnel transitions."""
        responses = [
            PlanningResponse(question_id="transition_reason", answer="New hire onboarding"),
            PlanningResponse(question_id="role_criticality", answer="High"),
            PlanningResponse(question_id="notice_period", answer=4),
            PlanningResponse(question_id="direct_reports", answer=5)
        ]

        context = self.agent.process_responses(TransitionType.PERSONNEL, responses)

        assert isinstance(context, PlanningContext)
        assert context.transition_type == TransitionType.PERSONNEL
        assert context.timeline_weeks == 4
        assert context.team_size == 6  # 5 direct reports + 1

    def test_process_system_responses(self):
        """Test processing responses for System transitions."""
        responses = [
            PlanningResponse(question_id="transition_type", answer="System migration"),
            PlanningResponse(question_id="system_criticality", answer="High"),
            PlanningResponse(question_id="user_count", answer=500),
            PlanningResponse(question_id="timeline_weeks", answer=16)
        ]

        context = self.agent.process_responses(TransitionType.SYSTEM, responses)

        assert isinstance(context, PlanningContext)
        assert context.transition_type == TransitionType.SYSTEM
        assert context.timeline_weeks == 16

    def test_extract_scope(self):
        """Test scope extraction from responses."""
        responses = {"contract_type": "New Contract Award"}
        scope = self.agent._extract_scope(responses, TransitionType.CONTRACT)
        assert scope == "New Contract Award"

    def test_extract_scale(self):
        """Test scale extraction from responses."""
        responses = {"contract_value": "$1M - $10M (Large)"}
        scale = self.agent._extract_scale(responses, TransitionType.CONTRACT)
        assert scale == "$1M - $10M (Large)"

    def test_extract_timeline_with_default(self):
        """Test timeline extraction with default fallback."""
        responses = {}
        timeline = self.agent._extract_timeline(responses)
        assert timeline == 12  # Default value

    def test_extract_timeline_from_responses(self):
        """Test timeline extraction from explicit response."""
        responses = {"timeline_weeks": 8}
        timeline = self.agent._extract_timeline(responses)
        assert timeline == 8

    def test_extract_risk_factors(self):
        """Test risk factor extraction."""
        responses = {"risk_factors": ["Tight timeline", "Complex dependencies"]}
        risks = self.agent._extract_risk_factors(responses)
        assert len(risks) == 2
        assert "Tight timeline" in risks

    # Task Generation Tests

    @pytest.mark.asyncio
    async def test_generate_tasks_with_fallback(self):
        """Test task generation falls back when AI fails."""
        responses = [
            PlanningResponse(question_id="contract_type", answer="New Contract Award"),
            PlanningResponse(question_id="contract_value", answer="$1M - $10M (Large)"),
            PlanningResponse(question_id="deliverables_count", answer=5),
            PlanningResponse(question_id="contractor_personnel", answer=10)
        ]

        # Mock the Agent.run to raise an exception to trigger fallback
        with patch('pydantic_ai.Agent.run', side_effect=Exception("AI service unavailable")):
            tasks = await self.agent.generate_tasks(TransitionType.CONTRACT, responses)

            assert isinstance(tasks, list)
            assert len(tasks) > 0
            assert all(isinstance(t, TaskRecommendation) for t in tasks)

    @pytest.mark.asyncio
    async def test_generate_tasks_validates_output(self):
        """Test that generated tasks meet validation requirements."""
        responses = [
            PlanningResponse(question_id="contract_type", answer="Contract Renewal"),
            PlanningResponse(question_id="contractor_personnel", answer=5)
        ]

        tasks = await self.agent.generate_tasks(TransitionType.CONTRACT, responses)

        for task in tasks:
            assert task.title
            assert task.description
            assert task.assigned_role
            assert task.days_from_start >= 0
            assert task.duration_days >= 1
            assert isinstance(task.priority, TaskPriority)

    # Milestone Generation Tests

    @pytest.mark.asyncio
    async def test_generate_milestones_with_fallback(self):
        """Test milestone generation falls back when AI fails."""
        responses = [
            PlanningResponse(question_id="contract_type", answer="New Contract Award"),
            PlanningResponse(question_id="timeline_weeks", answer=12)
        ]

        # Mock the Agent.run to raise an exception to trigger fallback
        with patch('pydantic_ai.Agent.run', side_effect=Exception("AI service unavailable")):
            milestones = await self.agent.generate_milestones(TransitionType.CONTRACT, responses)

            assert isinstance(milestones, list)
            assert len(milestones) > 0
            assert all(isinstance(m, MilestoneRecommendation) for m in milestones)

    @pytest.mark.asyncio
    async def test_generate_milestones_validates_output(self):
        """Test that generated milestones meet validation requirements."""
        responses = [
            PlanningResponse(question_id="transition_reason", answer="New hire onboarding"),
            PlanningResponse(question_id="notice_period", answer=4)
        ]

        milestones = await self.agent.generate_milestones(TransitionType.PERSONNEL, responses)

        for milestone in milestones:
            assert milestone.title
            assert milestone.description
            assert milestone.days_from_start >= 0
            assert len(milestone.success_criteria) > 0

    # Fallback Behavior Tests

    def test_fallback_tasks_contract(self):
        """Test fallback tasks for Contract transitions."""
        context = PlanningContext(
            transition_type=TransitionType.CONTRACT,
            scope="Contract Award",
            scale="Large",
            timeline_weeks=12,
            team_size=10
        )

        tasks = self.agent._get_fallback_tasks(TransitionType.CONTRACT, context)

        assert len(tasks) > 0
        assert any("Contract" in t.title for t in tasks)

    def test_fallback_milestones(self):
        """Test fallback milestones generation."""
        context = PlanningContext(
            transition_type=TransitionType.CONTRACT,
            scope="Contract Award",
            scale="Large",
            timeline_weeks=12,
            team_size=10
        )

        milestones = self.agent._get_fallback_milestones(TransitionType.CONTRACT, context)

        assert len(milestones) > 0
        assert any("Planning Complete" in m.title for m in milestones)
        assert any("Transition Complete" in m.title for m in milestones)

    # Edge Case Tests

    def test_empty_responses_handling(self):
        """Test handling of empty response list."""
        responses = []
        context = self.agent.process_responses(TransitionType.CONTRACT, responses)

        assert isinstance(context, PlanningContext)
        assert context.timeline_weeks == 12  # Default

    def test_minimal_responses_handling(self):
        """Test handling of minimal responses."""
        responses = [
            PlanningResponse(question_id="contract_type", answer="Contract Award")
        ]

        context = self.agent.process_responses(TransitionType.CONTRACT, responses)
        assert isinstance(context, PlanningContext)

    @pytest.mark.asyncio
    async def test_generate_tasks_with_provided_context(self):
        """Test task generation with pre-computed context."""
        context = PlanningContext(
            transition_type=TransitionType.SYSTEM,
            scope="Cloud Migration",
            scale="High",
            timeline_weeks=20,
            team_size=15
        )

        responses = [
            PlanningResponse(question_id="transition_type", answer="Cloud migration")
        ]

        tasks = await self.agent.generate_tasks(
            TransitionType.SYSTEM,
            responses,
            context=context
        )

        assert len(tasks) > 0

    def test_question_types_validation(self):
        """Test that questions have valid types and required fields."""
        for transition_type in [TransitionType.CONTRACT, TransitionType.PERSONNEL, TransitionType.SYSTEM]:
            questions = self.agent.generate_questions(transition_type)

            for question in questions:
                assert question.question_id
                assert question.text
                assert question.question_type in QuestionType

                # Verify select questions have options
                if question.question_type in [QuestionType.SELECT, QuestionType.MULTI_SELECT]:
                    assert question.options is not None
                    assert len(question.options) > 0

    def test_extract_team_size_calculations(self):
        """Test team size calculations for different transition types."""
        # Contract
        responses = {"contractor_personnel": 8}
        team_size = self.agent._extract_team_size(responses, TransitionType.CONTRACT)
        assert team_size == 8

        # Personnel
        responses = {"direct_reports": 3}
        team_size = self.agent._extract_team_size(responses, TransitionType.PERSONNEL)
        assert team_size == 4  # 3 + 1

        # System - based on user count
        responses = {"user_count": 50}
        team_size = self.agent._extract_team_size(responses, TransitionType.SYSTEM)
        assert team_size == 5

        responses = {"user_count": 5000}
        team_size = self.agent._extract_team_size(responses, TransitionType.SYSTEM)
        assert team_size == 20


# Test Fixtures

@pytest.fixture
def sample_contract_responses():
    """Sample responses for a contract transition."""
    return [
        PlanningResponse(question_id="contract_type", answer="New Contract Award"),
        PlanningResponse(question_id="contract_value", answer="$1M - $10M (Large)"),
        PlanningResponse(question_id="deliverables_count", answer=5),
        PlanningResponse(question_id="contractor_personnel", answer=10),
        PlanningResponse(question_id="knowledge_transfer", answer=True),
        PlanningResponse(question_id="security_clearance", answer=True),
        PlanningResponse(question_id="technical_complexity", answer="High"),
        PlanningResponse(question_id="critical_systems", answer=True),
        PlanningResponse(question_id="timeline_weeks", answer=12)
    ]


@pytest.fixture
def sample_personnel_responses():
    """Sample responses for a personnel transition."""
    return [
        PlanningResponse(question_id="transition_reason", answer="New hire onboarding"),
        PlanningResponse(question_id="role_criticality", answer="High"),
        PlanningResponse(question_id="notice_period", answer=4),
        PlanningResponse(question_id="overlap_possible", answer=True),
        PlanningResponse(question_id="system_access_count", answer=8),
        PlanningResponse(question_id="security_clearance_level", answer="Secret"),
        PlanningResponse(question_id="supervisory_role", answer=True),
        PlanningResponse(question_id="direct_reports", answer=5)
    ]


@pytest.fixture
def sample_system_responses():
    """Sample responses for a system transition."""
    return [
        PlanningResponse(question_id="transition_type", answer="Cloud migration"),
        PlanningResponse(question_id="system_criticality", answer="High"),
        PlanningResponse(question_id="user_count", answer=500),
        PlanningResponse(question_id="acceptable_downtime", answer="4-8 hours"),
        PlanningResponse(question_id="data_volume", answer="1 TB - 10 TB"),
        PlanningResponse(question_id="data_sensitivity", answer="Classified (Secret)"),
        PlanningResponse(question_id="dependent_systems", answer=12),
        PlanningResponse(question_id="technical_complexity", answer="Very High"),
        PlanningResponse(question_id="timeline_weeks", answer=20)
    ]
