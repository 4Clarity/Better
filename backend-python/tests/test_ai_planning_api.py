"""
Integration tests for AI Planning API endpoints.

Tests all API endpoints:
- POST /api/ai-planning/sessions/start
- POST /api/ai-planning/sessions/:id/respond
- GET /api/ai-planning/sessions/:id
- POST /api/ai-planning/sessions/:id/generate
- POST /api/ai-planning/sessions/:id/accept
- POST /api/ai-planning/sessions/:id/reject
- GET /api/ai-planning/health
"""

import pytest
from fastapi.testclient import TestClient
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../src')))

from main import app
from models.planning_models import TransitionType, ExecutionMode


# Test client
client = TestClient(app)

# Test headers for auth bypass
TEST_HEADERS = {"x-auth-bypass": "true"}


class TestAIPlanningAPI:
    """Integration tests for AI Planning API."""

    def test_health_check(self):
        """Test health check endpoint."""
        response = client.get("/api/ai-planning/health")

        assert response.status_code == 200
        data = response.json()
        assert data["service"] == "AI Planning"
        assert data["status"] == "healthy"
        assert "agent_model" in data

    def test_start_session_contract(self):
        """Test starting a planning session for Contract transition."""
        payload = {
            "transition_id": "test-transition-123",
            "transition_type": "Contract",
            "execution_mode": "DirectLLM",
            "user_id": "test-user-123"
        }

        response = client.post(
            "/api/ai-planning/sessions/start",
            json=payload,
            headers=TEST_HEADERS
        )

        assert response.status_code == 200
        data = response.json()
        assert "session_id" in data
        assert data["transition_id"] == "test-transition-123"
        assert data["transition_type"] == "Contract"
        assert len(data["questions_asked"]) > 0
        assert data["is_complete"] == False

        # Verify questions have proper structure
        question = data["questions_asked"][0]
        assert "question_id" in question
        assert "text" in question
        assert "question_type" in question

        # Return session_id for use in other tests
        return data["session_id"]

    def test_start_session_personnel(self):
        """Test starting a planning session for Personnel transition."""
        payload = {
            "transition_id": "test-transition-456",
            "transition_type": "Personnel",
            "execution_mode": "DirectLLM",
            "user_id": "test-user-456"
        }

        response = client.post(
            "/api/ai-planning/sessions/start",
            json=payload,
            headers=TEST_HEADERS
        )

        assert response.status_code == 200
        data = response.json()
        assert data["transition_type"] == "Personnel"
        assert len(data["questions_asked"]) > 0

    def test_start_session_system(self):
        """Test starting a planning session for System transition."""
        payload = {
            "transition_id": "test-transition-789",
            "transition_type": "System",
            "execution_mode": "DirectLLM",
            "user_id": "test-user-789"
        }

        response = client.post(
            "/api/ai-planning/sessions/start",
            json=payload,
            headers=TEST_HEADERS
        )

        assert response.status_code == 200
        data = response.json()
        assert data["transition_type"] == "System"
        assert len(data["questions_asked"]) > 0

    def test_start_session_unauthorized(self):
        """Test starting a session without authorization."""
        payload = {
            "transition_id": "test-transition-123",
            "transition_type": "Contract",
            "execution_mode": "DirectLLM",
            "user_id": "test-user-123"
        }

        response = client.post(
            "/api/ai-planning/sessions/start",
            json=payload
            # No auth headers
        )

        assert response.status_code == 401

    def test_submit_responses(self):
        """Test submitting responses to a planning session."""
        # First, create a session
        start_payload = {
            "transition_id": "test-transition-submit",
            "transition_type": "Contract",
            "execution_mode": "DirectLLM",
            "user_id": "test-user-submit"
        }

        start_response = client.post(
            "/api/ai-planning/sessions/start",
            json=start_payload,
            headers=TEST_HEADERS
        )
        session_id = start_response.json()["session_id"]

        # Submit responses
        responses_payload = [
            {
                "question_id": "contract_type",
                "answer": "New Contract Award",
                "answered_at": "2025-10-14T10:00:00Z"
            },
            {
                "question_id": "contract_value",
                "answer": "$1M - $10M (Large)",
                "answered_at": "2025-10-14T10:00:00Z"
            }
        ]

        response = client.post(
            f"/api/ai-planning/sessions/{session_id}/respond",
            json=responses_payload,
            headers=TEST_HEADERS
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data["responses_collected"]) == 2

    def test_submit_responses_nonexistent_session(self):
        """Test submitting responses to non-existent session."""
        responses_payload = [
            {
                "question_id": "contract_type",
                "answer": "New Contract Award"
            }
        ]

        response = client.post(
            "/api/ai-planning/sessions/nonexistent-session/respond",
            json=responses_payload,
            headers=TEST_HEADERS
        )

        assert response.status_code == 404

    def test_get_session(self):
        """Test retrieving a planning session."""
        # First, create a session
        start_payload = {
            "transition_id": "test-transition-get",
            "transition_type": "Contract",
            "execution_mode": "DirectLLM",
            "user_id": "test-user-get"
        }

        start_response = client.post(
            "/api/ai-planning/sessions/start",
            json=start_payload,
            headers=TEST_HEADERS
        )
        session_id = start_response.json()["session_id"]

        # Get the session
        response = client.get(
            f"/api/ai-planning/sessions/{session_id}",
            headers=TEST_HEADERS
        )

        assert response.status_code == 200
        data = response.json()
        assert data["session_id"] == session_id
        assert data["transition_id"] == "test-transition-get"

    def test_get_nonexistent_session(self):
        """Test retrieving a non-existent session."""
        response = client.get(
            "/api/ai-planning/sessions/nonexistent-session",
            headers=TEST_HEADERS
        )

        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_generate_recommendations(self):
        """Test generating recommendations."""
        # Create a session
        start_payload = {
            "transition_id": "test-transition-gen",
            "transition_type": "Contract",
            "execution_mode": "DirectLLM",
            "user_id": "test-user-gen"
        }

        start_response = client.post(
            "/api/ai-planning/sessions/start",
            json=start_payload,
            headers=TEST_HEADERS
        )
        session_id = start_response.json()["session_id"]
        questions = start_response.json()["questions_asked"]

        # Submit complete responses for all required questions
        required_questions = [q for q in questions if q["required"]]
        responses_payload = []
        for q in required_questions:
            if q["question_type"] == "select":
                answer = q["options"][0] if q.get("options") else "Unknown"
            elif q["question_type"] == "number":
                answer = 5
            elif q["question_type"] == "boolean":
                answer = True
            elif q["question_type"] == "multi_select":
                answer = [q["options"][0]] if q.get("options") else []
            else:
                answer = "Test answer"

            responses_payload.append({
                "question_id": q["question_id"],
                "answer": answer
            })

        # Submit responses
        client.post(
            f"/api/ai-planning/sessions/{session_id}/respond",
            json=responses_payload,
            headers=TEST_HEADERS
        )

        # Generate recommendations
        response = client.post(
            f"/api/ai-planning/sessions/{session_id}/generate",
            headers=TEST_HEADERS
        )

        assert response.status_code == 200
        data = response.json()
        assert "tasks" in data
        assert "milestones" in data
        assert len(data["tasks"]) > 0
        assert len(data["milestones"]) > 0

    def test_generate_recommendations_incomplete_session(self):
        """Test generating recommendations with incomplete responses."""
        # Create a session but don't submit all responses
        start_payload = {
            "transition_id": "test-transition-incomplete",
            "transition_type": "Contract",
            "execution_mode": "DirectLLM",
            "user_id": "test-user-incomplete"
        }

        start_response = client.post(
            "/api/ai-planning/sessions/start",
            json=start_payload,
            headers=TEST_HEADERS
        )
        session_id = start_response.json()["session_id"]

        # Try to generate without submitting responses
        response = client.post(
            f"/api/ai-planning/sessions/{session_id}/generate",
            headers=TEST_HEADERS
        )

        assert response.status_code == 400
        assert "answer all required questions" in response.json()["detail"].lower()

    def test_accept_recommendations(self):
        """Test accepting recommendations."""
        # Create a session
        start_payload = {
            "transition_id": "test-transition-accept",
            "transition_type": "Contract",
            "execution_mode": "DirectLLM",
            "user_id": "test-user-accept"
        }

        start_response = client.post(
            "/api/ai-planning/sessions/start",
            json=start_payload,
            headers=TEST_HEADERS
        )
        session_id = start_response.json()["session_id"]

        # Accept recommendations
        accept_payload = {
            "session_id": session_id,
            "task_ids": ["task-1", "task-2"],
            "milestone_ids": ["milestone-1"],
            "edits": {}
        }

        response = client.post(
            f"/api/ai-planning/sessions/{session_id}/accept",
            json=accept_payload,
            headers=TEST_HEADERS
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["tasks_created"] == 2
        assert data["milestones_created"] == 1

    def test_reject_recommendations(self):
        """Test rejecting recommendations."""
        # Create a session
        start_payload = {
            "transition_id": "test-transition-reject",
            "transition_type": "Contract",
            "execution_mode": "DirectLLM",
            "user_id": "test-user-reject"
        }

        start_response = client.post(
            "/api/ai-planning/sessions/start",
            json=start_payload,
            headers=TEST_HEADERS
        )
        session_id = start_response.json()["session_id"]

        # Reject recommendations
        reject_payload = {
            "session_id": session_id,
            "reason": "Recommendations not suitable for this transition"
        }

        response = client.post(
            f"/api/ai-planning/sessions/{session_id}/reject",
            json=reject_payload,
            headers=TEST_HEADERS
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True

    def test_complete_workflow(self):
        """Test complete AI planning workflow from start to accept."""
        # 1. Start session
        start_payload = {
            "transition_id": "test-transition-workflow",
            "transition_type": "Personnel",
            "execution_mode": "DirectLLM",
            "user_id": "test-user-workflow"
        }

        start_response = client.post(
            "/api/ai-planning/sessions/start",
            json=start_payload,
            headers=TEST_HEADERS
        )
        assert start_response.status_code == 200
        session_id = start_response.json()["session_id"]
        questions = start_response.json()["questions_asked"]

        # 2. Submit responses
        required_questions = [q for q in questions if q["required"]]
        responses_payload = []
        for q in required_questions:
            if q["question_type"] == "select":
                answer = q["options"][0] if q.get("options") else "Unknown"
            elif q["question_type"] == "number":
                answer = 5
            elif q["question_type"] == "boolean":
                answer = True
            elif q["question_type"] == "multi_select":
                answer = [q["options"][0]] if q.get("options") else []
            else:
                answer = "Test answer"

            responses_payload.append({
                "question_id": q["question_id"],
                "answer": answer
            })

        respond_response = client.post(
            f"/api/ai-planning/sessions/{session_id}/respond",
            json=responses_payload,
            headers=TEST_HEADERS
        )
        assert respond_response.status_code == 200

        # 3. Get session to verify responses
        get_response = client.get(
            f"/api/ai-planning/sessions/{session_id}",
            headers=TEST_HEADERS
        )
        assert get_response.status_code == 200
        assert get_response.json()["is_complete"] == True

        # 4. Generate recommendations
        generate_response = client.post(
            f"/api/ai-planning/sessions/{session_id}/generate",
            headers=TEST_HEADERS
        )
        assert generate_response.status_code == 200
        tasks = generate_response.json()["tasks"]
        milestones = generate_response.json()["milestones"]

        # 5. Accept recommendations
        accept_payload = {
            "session_id": session_id,
            "task_ids": [f"task-{i}" for i in range(len(tasks))],
            "milestone_ids": [f"milestone-{i}" for i in range(len(milestones))],
            "edits": {}
        }

        accept_response = client.post(
            f"/api/ai-planning/sessions/{session_id}/accept",
            json=accept_payload,
            headers=TEST_HEADERS
        )
        assert accept_response.status_code == 200
        assert accept_response.json()["success"] == True
