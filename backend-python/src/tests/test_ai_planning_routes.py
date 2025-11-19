"""
Unit tests for AI Planning API routes.

Tests all FastAPI endpoints for the AI planning workflow.
"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import Mock, AsyncMock, patch
from datetime import datetime
import json

from src.main import app
from src.models.planning_models import (
    TransitionType,
    ExecutionMode,
    PlanningQuestion,
    QuestionType,
    TaskPriority
)


@pytest.fixture
def client():
    """Create a test client for the FastAPI app."""
    return TestClient(app)


@pytest.fixture
def mock_planning_agent():
    """Create a mock planning agent."""
    with patch('src.routes.ai_planning.planning_agent') as mock_agent:
        yield mock_agent


class TestHealthEndpoint:
    """Test health check endpoint."""

    def test_health_check(self, client):
        """Should return service health status."""
        response = client.get("/api/ai-planning/health")

        assert response.status_code == 200
        data = response.json()
        assert data["service"] == "AI Planning Service"
        assert data["status"] == "healthy"


class TestStartPlanningSession:
    """Test starting a new planning session."""

    def test_start_session_contract_transition(self, client, mock_planning_agent):
        """Should start a new planning session for contract transition."""
        mock_planning_agent.generate_questions.return_value = [
            PlanningQuestion(
                question_id="q1",
                text="Test question?",
                question_type=QuestionType.TEXT,
                required=True
            )
        ]

        response = client.post(
            "/api/ai-planning/sessions/start",
            json={
                "transition_id": "trans-123",
                "transition_type": "Contract",
                "execution_mode": "DirectLLM",
                "user_id": "user-456"
            },
            headers={"x-auth-bypass": "true"}
        )

        assert response.status_code == 200
        data = response.json()

        assert data["transition_id"] == "trans-123"
        assert data["transition_type"] == "Contract"
        assert data["execution_mode"] == "DirectLLM"
        assert data["status"] == "started"
        assert data["current_step"] == 0
        assert len(data["questions_asked"]) == 1
        assert data["questions_asked"][0]["question_id"] == "q1"

    def test_start_session_personnel_transition(self, client, mock_planning_agent):
        """Should start a new planning session for personnel transition."""
        mock_planning_agent.generate_questions.return_value = [
            PlanningQuestion(
                question_id="p1",
                text="Personnel question?",
                question_type=QuestionType.SELECT,
                options=["Option A", "Option B"],
                required=True
            )
        ]

        response = client.post(
            "/api/ai-planning/sessions/start",
            json={
                "transition_id": "trans-456",
                "transition_type": "Personnel",
                "user_id": "user-123"
            },
            headers={"x-auth-bypass": "true"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["transition_type"] == "Personnel"

    def test_start_session_system_transition(self, client, mock_planning_agent):
        """Should start a new planning session for system transition."""
        mock_planning_agent.generate_questions.return_value = []

        response = client.post(
            "/api/ai-planning/sessions/start",
            json={
                "transition_id": "trans-789",
                "transition_type": "System",
                "user_id": "user-789"
            },
            headers={"x-auth-bypass": "true"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["transition_type"] == "System"

    def test_start_session_generates_session_id(self, client, mock_planning_agent):
        """Should generate a unique session ID."""
        mock_planning_agent.generate_questions.return_value = []

        response = client.post(
            "/api/ai-planning/sessions/start",
            json={
                "transition_id": "trans-123",
                "transition_type": "Contract",
                "user_id": "user-123"
            },
            headers={"x-auth-bypass": "true"}
        )

        assert response.status_code == 200
        data = response.json()
        assert "session_id" in data
        assert len(data["session_id"]) > 0

    def test_start_session_invalid_transition_type(self, client):
        """Should return 422 for invalid transition type."""
        response = client.post(
            "/api/ai-planning/sessions/start",
            json={
                "transition_id": "trans-123",
                "transition_type": "InvalidType",
                "user_id": "user-123"
            },
            headers={"x-auth-bypass": "true"}
        )

        assert response.status_code == 422


class TestGetPlanningSession:
    """Test retrieving a planning session."""

    def test_get_existing_session(self, client, mock_planning_agent):
        """Should retrieve an existing session."""
        mock_planning_agent.generate_questions.return_value = []

        # Create a session first
        create_response = client.post(
            "/api/ai-planning/sessions/start",
            json={
                "transition_id": "trans-123",
                "transition_type": "Contract",
                "user_id": "user-123"
            },
            headers={"x-auth-bypass": "true"}
        )
        session_id = create_response.json()["session_id"]

        # Retrieve the session
        response = client.get(
            f"/api/ai-planning/sessions/{session_id}",
            headers={"x-auth-bypass": "true"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["session_id"] == session_id

    def test_get_nonexistent_session(self, client):
        """Should return 404 for nonexistent session."""
        response = client.get(
            "/api/ai-planning/sessions/nonexistent-id",
            headers={"x-auth-bypass": "true"}
        )

        assert response.status_code == 404


class TestSubmitResponses:
    """Test submitting user responses."""

    def test_submit_responses(self, client, mock_planning_agent):
        """Should accept and store user responses."""
        mock_planning_agent.generate_questions.return_value = [
            PlanningQuestion(
                question_id="q1",
                text="Question 1?",
                question_type=QuestionType.TEXT,
                required=True
            )
        ]

        # Create session
        create_response = client.post(
            "/api/ai-planning/sessions/start",
            json={
                "transition_id": "trans-123",
                "transition_type": "Contract",
                "user_id": "user-123"
            },
            headers={"x-auth-bypass": "true"}
        )
        session_id = create_response.json()["session_id"]

        # Submit responses
        response = client.post(
            f"/api/ai-planning/sessions/{session_id}/responses",
            json={
                "responses": [
                    {
                        "question_id": "q1",
                        "answer": "My answer",
                        "answered_at": datetime.now().isoformat()
                    }
                ]
            },
            headers={"x-auth-bypass": "true"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "responses_collected"
        assert data["current_step"] == 1
        assert len(data["responses_collected"]) == 1

    def test_submit_responses_nonexistent_session(self, client):
        """Should return 404 for nonexistent session."""
        response = client.post(
            "/api/ai-planning/sessions/nonexistent-id/responses",
            json={"responses": []},
            headers={"x-auth-bypass": "true"}
        )

        assert response.status_code == 404

    def test_submit_multiple_responses(self, client, mock_planning_agent):
        """Should handle multiple responses."""
        mock_planning_agent.generate_questions.return_value = [
            PlanningQuestion(
                question_id="q1",
                text="Question 1?",
                question_type=QuestionType.TEXT,
                required=True
            ),
            PlanningQuestion(
                question_id="q2",
                text="Question 2?",
                question_type=QuestionType.SELECT,
                options=["A", "B"],
                required=True
            )
        ]

        # Create session
        create_response = client.post(
            "/api/ai-planning/sessions/start",
            json={
                "transition_id": "trans-123",
                "transition_type": "Contract",
                "user_id": "user-123"
            },
            headers={"x-auth-bypass": "true"}
        )
        session_id = create_response.json()["session_id"]

        # Submit multiple responses
        response = client.post(
            f"/api/ai-planning/sessions/{session_id}/responses",
            json={
                "responses": [
                    {
                        "question_id": "q1",
                        "answer": "Answer 1",
                        "answered_at": datetime.now().isoformat()
                    },
                    {
                        "question_id": "q2",
                        "answer": "A",
                        "answered_at": datetime.now().isoformat()
                    }
                ]
            },
            headers={"x-auth-bypass": "true"}
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data["responses_collected"]) == 2


class TestGenerateRecommendations:
    """Test generating AI recommendations."""

    @pytest.mark.asyncio
    async def test_generate_recommendations(self, client, mock_planning_agent):
        """Should generate task and milestone recommendations."""
        mock_planning_agent.generate_questions.return_value = []
        mock_planning_agent.generate_tasks = AsyncMock(return_value=[
            Mock(
                title="Task 1",
                description="Description 1",
                priority=TaskPriority.HIGH,
                assigned_role="PM",
                estimated_hours=8,
                days_from_start=0,
                duration_days=2,
                dependencies=[],
                tags=["test"],
                model_dump=lambda: {
                    "title": "Task 1",
                    "description": "Description 1",
                    "priority": "High",
                    "assigned_role": "PM",
                    "estimated_hours": 8,
                    "days_from_start": 0,
                    "duration_days": 2,
                    "dependencies": [],
                    "tags": ["test"]
                }
            )
        ])
        mock_planning_agent.generate_milestones = AsyncMock(return_value=[
            Mock(
                title="Milestone 1",
                description="Milestone Description",
                days_from_start=10,
                priority=TaskPriority.HIGH,
                assigned_role="PM",
                success_criteria=["Criterion 1"],
                model_dump=lambda: {
                    "title": "Milestone 1",
                    "description": "Milestone Description",
                    "days_from_start": 10,
                    "priority": "High",
                    "assigned_role": "PM",
                    "success_criteria": ["Criterion 1"]
                }
            )
        ])

        # Create session
        create_response = client.post(
            "/api/ai-planning/sessions/start",
            json={
                "transition_id": "trans-123",
                "transition_type": "Contract",
                "user_id": "user-123"
            },
            headers={"x-auth-bypass": "true"}
        )
        session_id = create_response.json()["session_id"]

        # Submit responses
        client.post(
            f"/api/ai-planning/sessions/{session_id}/responses",
            json={
                "responses": [
                    {
                        "question_id": "q1",
                        "answer": "Answer",
                        "answered_at": datetime.now().isoformat()
                    }
                ]
            },
            headers={"x-auth-bypass": "true"}
        )

        # Generate recommendations
        response = client.post(
            f"/api/ai-planning/sessions/{session_id}/generate",
            headers={"x-auth-bypass": "true"}
        )

        assert response.status_code == 200
        data = response.json()
        assert "tasks" in data
        assert "milestones" in data
        assert len(data["tasks"]) > 0
        assert len(data["milestones"]) > 0

    def test_generate_recommendations_nonexistent_session(self, client):
        """Should return 404 for nonexistent session."""
        response = client.post(
            "/api/ai-planning/sessions/nonexistent-id/generate",
            headers={"x-auth-bypass": "true"}
        )

        assert response.status_code == 404


class TestUpdateRecommendations:
    """Test updating generated recommendations."""

    def test_update_task_recommendation(self, client, mock_planning_agent):
        """Should update a task recommendation."""
        mock_planning_agent.generate_questions.return_value = []

        # Create session
        create_response = client.post(
            "/api/ai-planning/sessions/start",
            json={
                "transition_id": "trans-123",
                "transition_type": "Contract",
                "user_id": "user-123"
            },
            headers={"x-auth-bypass": "true"}
        )
        session_id = create_response.json()["session_id"]

        # Update recommendation
        response = client.put(
            f"/api/ai-planning/sessions/{session_id}/recommendations",
            json={
                "recommendation_type": "task",
                "recommendation_index": 0,
                "updates": {
                    "title": "Updated Task Title",
                    "description": "Updated description"
                }
            },
            headers={"x-auth-bypass": "true"}
        )

        assert response.status_code == 200

    def test_update_milestone_recommendation(self, client, mock_planning_agent):
        """Should update a milestone recommendation."""
        mock_planning_agent.generate_questions.return_value = []

        # Create session
        create_response = client.post(
            "/api/ai-planning/sessions/start",
            json={
                "transition_id": "trans-123",
                "transition_type": "Contract",
                "user_id": "user-123"
            },
            headers={"x-auth-bypass": "true"}
        )
        session_id = create_response.json()["session_id"]

        # Update recommendation
        response = client.put(
            f"/api/ai-planning/sessions/{session_id}/recommendations",
            json={
                "recommendation_type": "milestone",
                "recommendation_index": 0,
                "updates": {
                    "title": "Updated Milestone",
                    "success_criteria": ["New criterion"]
                }
            },
            headers={"x-auth-bypass": "true"}
        )

        assert response.status_code == 200


class TestAcceptRecommendations:
    """Test accepting recommendations."""

    def test_accept_recommendations(self, client, mock_planning_agent):
        """Should mark selected recommendations as accepted."""
        mock_planning_agent.generate_questions.return_value = []

        # Create session
        create_response = client.post(
            "/api/ai-planning/sessions/start",
            json={
                "transition_id": "trans-123",
                "transition_type": "Contract",
                "user_id": "user-123"
            },
            headers={"x-auth-bypass": "true"}
        )
        session_id = create_response.json()["session_id"]

        # Accept recommendations
        response = client.post(
            f"/api/ai-planning/sessions/{session_id}/accept",
            json={
                "accepted_task_indices": [0, 1],
                "accepted_milestone_indices": [0],
                "task_edits": {},
                "milestone_edits": {}
            },
            headers={"x-auth-bypass": "true"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "completed"
        assert data["current_step"] == 3

    def test_accept_partial_recommendations(self, client, mock_planning_agent):
        """Should accept only selected recommendations."""
        mock_planning_agent.generate_questions.return_value = []

        # Create session
        create_response = client.post(
            "/api/ai-planning/sessions/start",
            json={
                "transition_id": "trans-123",
                "transition_type": "Contract",
                "user_id": "user-123"
            },
            headers={"x-auth-bypass": "true"}
        )
        session_id = create_response.json()["session_id"]

        # Accept only one task, no milestones
        response = client.post(
            f"/api/ai-planning/sessions/{session_id}/accept",
            json={
                "accepted_task_indices": [0],
                "accepted_milestone_indices": [],
                "task_edits": {},
                "milestone_edits": {}
            },
            headers={"x-auth-bypass": "true"}
        )

        assert response.status_code == 200


class TestCompleteSession:
    """Test completing a planning session."""

    def test_complete_session(self, client, mock_planning_agent):
        """Should mark session as completed."""
        mock_planning_agent.generate_questions.return_value = []

        # Create session
        create_response = client.post(
            "/api/ai-planning/sessions/start",
            json={
                "transition_id": "trans-123",
                "transition_type": "Contract",
                "user_id": "user-123"
            },
            headers={"x-auth-bypass": "true"}
        )
        session_id = create_response.json()["session_id"]

        # Complete session
        response = client.post(
            f"/api/ai-planning/sessions/{session_id}/complete",
            headers={"x-auth-bypass": "true"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "completed"
        assert "completed_at" in data

    def test_complete_nonexistent_session(self, client):
        """Should return 404 for nonexistent session."""
        response = client.post(
            "/api/ai-planning/sessions/nonexistent-id/complete",
            headers={"x-auth-bypass": "true"}
        )

        assert response.status_code == 404
