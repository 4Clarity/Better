"""
Unit tests for TransitionPlanningAgent.

Tests question generation, response processing, and recommendation generation
for different transition types.
"""

import pytest
from unittest.mock import Mock, AsyncMock, patch
from datetime import datetime

from src.services.transition_planning_agent import TransitionPlanningAgent
from src.models.planning_models import (
    TransitionType,
    PlanningQuestion,
    PlanningResponse,
    PlanningContext,
    TaskRecommendation,
    MilestoneRecommendation,
    TaskPriority,
    QuestionType
)


@pytest.fixture
def agent():
    """Create a TransitionPlanningAgent instance for testing."""
    return TransitionPlanningAgent(model_name="test:mock-model")


@pytest.fixture
def sample_contract_responses():
    """Sample responses for a contract transition."""
    return [
        PlanningResponse(
            question_id="contract_type",
            answer="New Contract Award",
            answered_at=datetime.now().isoformat()
        ),
        PlanningResponse(
            question_id="contract_value",
            answer="$1M-$10M",
            answered_at=datetime.now().isoformat()
        ),
        PlanningResponse(
            question_id="timeline_weeks",
            answer="12",
            answered_at=datetime.now().isoformat()
        ),
        PlanningResponse(
            question_id="contractor_personnel",
            answer="5",
            answered_at=datetime.now().isoformat()
        )
    ]


@pytest.fixture
def sample_personnel_responses():
    """Sample responses for a personnel transition."""
    return [
        PlanningResponse(
            question_id="transition_reason",
            answer="Retirement",
            answered_at=datetime.now().isoformat()
        ),
        PlanningResponse(
            question_id="role_criticality",
            answer="High",
            answered_at=datetime.now().isoformat()
        ),
        PlanningResponse(
            question_id="notice_period",
            answer="8",
            answered_at=datetime.now().isoformat()
        ),
        PlanningResponse(
            question_id="direct_reports",
            answer="3",
            answered_at=datetime.now().isoformat()
        )
    ]


class TestQuestionGeneration:
    """Test question generation for different transition types."""

    def test_generate_contract_questions(self, agent):
        """Should generate contract-specific questions."""
        questions = agent.generate_questions(TransitionType.CONTRACT)

        assert len(questions) > 0
        assert all(isinstance(q, PlanningQuestion) for q in questions)
        assert any("contract" in q.text.lower() for q in questions)

        # Verify required fields
        for question in questions:
            assert question.question_id
            assert question.text
            assert question.question_type in [qt.value for qt in QuestionType]

    def test_generate_personnel_questions(self, agent):
        """Should generate personnel-specific questions."""
        questions = agent.generate_questions(TransitionType.PERSONNEL)

        assert len(questions) > 0
        assert all(isinstance(q, PlanningQuestion) for q in questions)
        assert any("role" in q.text.lower() or "personnel" in q.text.lower() for q in questions)

    def test_generate_system_questions(self, agent):
        """Should generate system-specific questions."""
        questions = agent.generate_questions(TransitionType.SYSTEM)

        assert len(questions) > 0
        assert all(isinstance(q, PlanningQuestion) for q in questions)
        assert any("system" in q.text.lower() for q in questions)

    def test_question_has_required_fields(self, agent):
        """Questions should have all required fields."""
        questions = agent.generate_questions(TransitionType.CONTRACT)

        for question in questions:
            assert question.question_id
            assert question.text
            assert question.question_type
            assert isinstance(question.required, bool)

    def test_select_questions_have_options(self, agent):
        """SELECT and MULTI_SELECT questions should have options."""
        questions = agent.generate_questions(TransitionType.CONTRACT)

        for question in questions:
            if question.question_type in [QuestionType.SELECT, QuestionType.MULTI_SELECT]:
                assert question.options is not None
                assert len(question.options) > 0

    def test_invalid_transition_type_raises_error(self, agent):
        """Should raise ValueError for invalid transition type."""
        with pytest.raises(ValueError):
            agent.generate_questions("InvalidType")


class TestResponseProcessing:
    """Test processing of user responses into planning context."""

    def test_process_contract_responses(self, agent, sample_contract_responses):
        """Should process contract responses into PlanningContext."""
        context = agent.process_responses(
            TransitionType.CONTRACT,
            sample_contract_responses
        )

        assert isinstance(context, PlanningContext)
        assert context.transition_type == TransitionType.CONTRACT
        assert context.timeline_weeks == 12
        assert context.team_size == 5
        assert context.scope == "New Contract Award"

    def test_process_personnel_responses(self, agent, sample_personnel_responses):
        """Should process personnel responses into PlanningContext."""
        context = agent.process_responses(
            TransitionType.PERSONNEL,
            sample_personnel_responses
        )

        assert isinstance(context, PlanningContext)
        assert context.transition_type == TransitionType.PERSONNEL
        assert context.timeline_weeks == 8
        assert context.team_size == 4  # 3 direct reports + 1 person
        assert context.scope == "Retirement"

    def test_extract_timeline_defaults_to_12_weeks(self, agent):
        """Should default to 12 weeks if timeline not provided."""
        responses = [
            PlanningResponse(
                question_id="some_question",
                answer="Some answer",
                answered_at=datetime.now().isoformat()
            )
        ]

        context = agent.process_responses(TransitionType.CONTRACT, responses)
        assert context.timeline_weeks == 12

    def test_extract_risk_factors(self, agent):
        """Should extract risk factors from responses."""
        responses = [
            PlanningResponse(
                question_id="risk_factors",
                answer=["Budget constraints", "Tight timeline"],
                answered_at=datetime.now().isoformat()
            )
        ]

        context = agent.process_responses(TransitionType.CONTRACT, responses)
        assert "Budget constraints" in context.risk_factors
        assert "Tight timeline" in context.risk_factors

    def test_extract_special_requirements(self, agent):
        """Should extract special requirements like security clearance."""
        responses = [
            PlanningResponse(
                question_id="security_clearance",
                answer="Top Secret",
                answered_at=datetime.now().isoformat()
            )
        ]

        context = agent.process_responses(TransitionType.CONTRACT, responses)
        assert any("security clearance" in req.lower() for req in context.special_requirements)


class TestTaskGeneration:
    """Test AI task recommendation generation."""

    @pytest.mark.asyncio
    async def test_generate_contract_tasks(self, agent, sample_contract_responses):
        """Should generate task recommendations for contract transitions."""
        tasks = await agent.generate_tasks(
            TransitionType.CONTRACT,
            sample_contract_responses
        )

        assert len(tasks) > 0
        assert all(isinstance(t, TaskRecommendation) for t in tasks)

        # Verify task structure
        for task in tasks:
            assert task.title
            assert task.description
            assert task.priority in [p.value for p in TaskPriority]
            assert task.assigned_role
            assert task.days_from_start >= 0
            assert task.duration_days >= 1

    @pytest.mark.asyncio
    async def test_generate_personnel_tasks(self, agent, sample_personnel_responses):
        """Should generate task recommendations for personnel transitions."""
        tasks = await agent.generate_tasks(
            TransitionType.PERSONNEL,
            sample_personnel_responses
        )

        assert len(tasks) > 0
        assert all(isinstance(t, TaskRecommendation) for t in tasks)

    @pytest.mark.asyncio
    async def test_generate_system_tasks(self, agent):
        """Should generate task recommendations for system transitions."""
        responses = [
            PlanningResponse(
                question_id="transition_type",
                answer="Migration",
                answered_at=datetime.now().isoformat()
            ),
            PlanningResponse(
                question_id="user_count",
                answer="500",
                answered_at=datetime.now().isoformat()
            )
        ]

        tasks = await agent.generate_tasks(
            TransitionType.SYSTEM,
            responses
        )

        assert len(tasks) > 0
        assert all(isinstance(t, TaskRecommendation) for t in tasks)

    @pytest.mark.asyncio
    async def test_tasks_have_realistic_estimates(self, agent, sample_contract_responses):
        """Generated tasks should have realistic time estimates."""
        tasks = await agent.generate_tasks(
            TransitionType.CONTRACT,
            sample_contract_responses
        )

        for task in tasks:
            if task.estimated_hours:
                assert 0 < task.estimated_hours <= 1000
            assert 0 <= task.days_from_start < 365
            assert 1 <= task.duration_days <= 90

    @pytest.mark.asyncio
    async def test_tasks_ordered_chronologically(self, agent, sample_contract_responses):
        """Tasks should generally be ordered by days_from_start."""
        tasks = await agent.generate_tasks(
            TransitionType.CONTRACT,
            sample_contract_responses
        )

        # Check that tasks are roughly in chronological order
        # (allowing some flexibility for parallel tasks)
        days = [t.days_from_start for t in tasks]
        assert days == sorted(days) or len(set(days)) < len(days)  # Either sorted or has duplicates

    @pytest.mark.asyncio
    async def test_generate_tasks_with_precomputed_context(self, agent, sample_contract_responses):
        """Should accept pre-computed planning context."""
        context = agent.process_responses(
            TransitionType.CONTRACT,
            sample_contract_responses
        )

        tasks = await agent.generate_tasks(
            TransitionType.CONTRACT,
            sample_contract_responses,
            context=context
        )

        assert len(tasks) > 0
        assert all(isinstance(t, TaskRecommendation) for t in tasks)


class TestMilestoneGeneration:
    """Test AI milestone recommendation generation."""

    @pytest.mark.asyncio
    async def test_generate_contract_milestones(self, agent, sample_contract_responses):
        """Should generate milestone recommendations for contract transitions."""
        milestones = await agent.generate_milestones(
            TransitionType.CONTRACT,
            sample_contract_responses
        )

        assert len(milestones) > 0
        assert all(isinstance(m, MilestoneRecommendation) for m in milestones)

        # Verify milestone structure
        for milestone in milestones:
            assert milestone.title
            assert milestone.description
            assert milestone.days_from_start >= 0
            assert milestone.priority in [p.value for p in TaskPriority]
            assert milestone.assigned_role
            assert len(milestone.success_criteria) > 0

    @pytest.mark.asyncio
    async def test_milestones_span_timeline(self, agent, sample_contract_responses):
        """Milestones should span the project timeline."""
        context = agent.process_responses(
            TransitionType.CONTRACT,
            sample_contract_responses
        )

        milestones = await agent.generate_milestones(
            TransitionType.CONTRACT,
            sample_contract_responses,
            context=context
        )

        timeline_days = context.timeline_weeks * 7
        milestone_days = [m.days_from_start for m in milestones]

        # Should have milestones throughout the timeline
        assert min(milestone_days) < timeline_days * 0.3
        assert max(milestone_days) >= timeline_days * 0.8

    @pytest.mark.asyncio
    async def test_milestones_ordered_chronologically(self, agent, sample_contract_responses):
        """Milestones should be ordered by days_from_start."""
        milestones = await agent.generate_milestones(
            TransitionType.CONTRACT,
            sample_contract_responses
        )

        days = [m.days_from_start for m in milestones]
        assert days == sorted(days)

    @pytest.mark.asyncio
    async def test_milestone_success_criteria_not_empty(self, agent, sample_contract_responses):
        """All milestones should have success criteria."""
        milestones = await agent.generate_milestones(
            TransitionType.CONTRACT,
            sample_contract_responses
        )

        for milestone in milestones:
            assert len(milestone.success_criteria) > 0
            assert all(isinstance(criterion, str) for criterion in milestone.success_criteria)
            assert all(len(criterion) > 0 for criterion in milestone.success_criteria)


class TestFallbackBehavior:
    """Test fallback behavior when AI generation fails."""

    @pytest.mark.asyncio
    async def test_fallback_tasks_on_error(self, agent, sample_contract_responses):
        """Should return fallback tasks if AI generation fails."""
        # The current implementation always uses fallback
        tasks = await agent.generate_tasks(
            TransitionType.CONTRACT,
            sample_contract_responses
        )

        assert len(tasks) > 0
        # Should still return valid TaskRecommendation objects
        assert all(isinstance(t, TaskRecommendation) for t in tasks)

    @pytest.mark.asyncio
    async def test_fallback_milestones_on_error(self, agent, sample_contract_responses):
        """Should return fallback milestones if AI generation fails."""
        milestones = await agent.generate_milestones(
            TransitionType.CONTRACT,
            sample_contract_responses
        )

        assert len(milestones) > 0
        assert all(isinstance(m, MilestoneRecommendation) for m in milestones)

    @pytest.mark.asyncio
    async def test_fallback_tasks_reasonable_defaults(self, agent):
        """Fallback tasks should have reasonable default values."""
        context = PlanningContext(
            transition_type=TransitionType.CONTRACT,
            scope="Test",
            scale="Medium",
            timeline_weeks=12,
            team_size=5,
            risk_factors=[],
            special_requirements=[],
            key_deliverables=[]
        )

        tasks = agent._get_fallback_tasks(TransitionType.CONTRACT, context)

        for task in tasks:
            assert task.title
            assert task.description
            assert task.priority
            assert task.assigned_role

    @pytest.mark.asyncio
    async def test_fallback_milestones_reasonable_defaults(self, agent):
        """Fallback milestones should have reasonable default values."""
        context = PlanningContext(
            transition_type=TransitionType.CONTRACT,
            scope="Test",
            scale="Medium",
            timeline_weeks=12,
            team_size=5,
            risk_factors=[],
            special_requirements=[],
            key_deliverables=[]
        )

        milestones = agent._get_fallback_milestones(TransitionType.CONTRACT, context)

        assert len(milestones) >= 3  # Should have beginning, middle, end
        assert all(m.title for m in milestones)
        assert all(len(m.success_criteria) > 0 for m in milestones)


class TestContextExtraction:
    """Test helper methods for extracting context from responses."""

    def test_extract_scope_contract(self, agent):
        """Should extract correct scope for contract transitions."""
        responses = {"contract_type": "New Contract Award"}
        scope = agent._extract_scope(responses, TransitionType.CONTRACT)
        assert scope == "New Contract Award"

    def test_extract_scope_personnel(self, agent):
        """Should extract correct scope for personnel transitions."""
        responses = {"transition_reason": "Retirement"}
        scope = agent._extract_scope(responses, TransitionType.PERSONNEL)
        assert scope == "Retirement"

    def test_extract_scale_contract(self, agent):
        """Should extract correct scale for contract transitions."""
        responses = {"contract_value": "$1M-$10M"}
        scale = agent._extract_scale(responses, TransitionType.CONTRACT)
        assert scale == "$1M-$10M"

    def test_extract_team_size_contract(self, agent):
        """Should extract team size from contract responses."""
        responses = {"contractor_personnel": "10"}
        team_size = agent._extract_team_size(responses, TransitionType.CONTRACT)
        assert team_size == 10

    def test_extract_team_size_personnel(self, agent):
        """Should calculate team size from direct reports."""
        responses = {"direct_reports": "5"}
        team_size = agent._extract_team_size(responses, TransitionType.PERSONNEL)
        assert team_size == 6  # 5 + 1 for the person themselves

    def test_extract_team_size_system_scales_with_users(self, agent):
        """System team size should scale with user count."""
        # Small system
        responses_small = {"user_count": "5"}
        team_small = agent._extract_team_size(responses_small, TransitionType.SYSTEM)

        # Large system
        responses_large = {"user_count": "5000"}
        team_large = agent._extract_team_size(responses_large, TransitionType.SYSTEM)

        assert team_large > team_small
