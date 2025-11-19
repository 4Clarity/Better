"""
FastAPI routes for AI-assisted transition planning.

Provides REST API endpoints for:
- Starting planning sessions
- Submitting responses
- Generating recommendations
- Accepting/rejecting recommendations
"""

import logging
from typing import Optional
from uuid import UUID, uuid4
from datetime import datetime

from fastapi import APIRouter, HTTPException, Depends, Header
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from ..models.planning_models import (
    TransitionType,
    ExecutionMode,
    PlanningSessionCreate,
    PlanningSessionState,
    PlanningResponse,
    GenerateRecommendationsRequest,
    GenerateRecommendationsResponse,
    AcceptRecommendationsRequest,
    AcceptRecommendationsResponse,
    RejectRecommendationsRequest
)
from ..services.transition_planning_agent import TransitionPlanningAgent


# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/api/ai-planning", tags=["AI Planning"])

# Initialize planning agent (singleton)
# Using Ollama (local LLM) by default for faster responses
# Set LLM_MODEL env var to override (e.g., "gemini-2.5-flash", "claude-3-5-sonnet")
import os
planning_agent = TransitionPlanningAgent(
    model_name=os.getenv("LLM_MODEL", None)  # None uses Ollama from OLLAMA_DEFAULT_MODEL
)

# In-memory session storage (for MVP - replace with database in production)
planning_sessions: dict[str, PlanningSessionState] = {}


# Dependency for authentication/authorization
async def verify_program_manager(x_auth_bypass: Optional[str] = Header(None)) -> str:
    """
    Verify user is a Program Manager.

    In production, this would check JWT token and role.
    For now, accepts x-auth-bypass header for development.

    Returns:
        user_id: ID of authenticated user

    Raises:
        HTTPException: If user is not authorized
    """
    # Development bypass
    if x_auth_bypass == "true":
        return "dev-user-id"

    # In production: verify JWT token, check role, return user ID
    raise HTTPException(
        status_code=401,
        detail="Unauthorized - Program Manager role required for AI planning"
    )


@router.post("/sessions/start", response_model=PlanningSessionState)
async def start_planning_session(
    request: PlanningSessionCreate,
    user_id: str = Depends(verify_program_manager)
) -> PlanningSessionState:
    """
    Initialize a new AI planning session.

    Creates a session and generates initial questions based on transition type.

    Args:
        request: Session creation parameters
        user_id: Authenticated user ID (from dependency)

    Returns:
        PlanningSessionState with initial questions

    Raises:
        HTTPException: If session creation fails
    """
    try:
        logger.info(f"Starting planning session for transition {request.transition_id}")

        # Generate session ID
        session_id = str(uuid4())

        # Generate questions based on transition type
        questions = planning_agent.generate_questions(request.transition_type)

        # Create session state
        session = PlanningSessionState(
            session_id=session_id,
            transition_id=request.transition_id,
            transition_type=request.transition_type,
            execution_mode=request.execution_mode,
            created_by=user_id,
            session_started_at=datetime.utcnow(),
            questions_asked=questions,
            llm_model_used=planning_agent.model_name
        )

        # Store session
        planning_sessions[session_id] = session

        logger.info(f"Created session {session_id} with {len(questions)} questions")
        return session

    except Exception as e:
        logger.error(f"Failed to start planning session: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to start planning session: {str(e)}"
        )


@router.post("/sessions/{session_id}/respond", response_model=PlanningSessionState)
async def submit_responses(
    session_id: str,
    responses: list[PlanningResponse],
    user_id: str = Depends(verify_program_manager)
) -> PlanningSessionState:
    """
    Submit user responses to planning questions.

    Stores responses and returns updated session state.
    May generate follow-up questions based on responses.

    Args:
        session_id: UUID of the planning session
        responses: List of user responses to questions
        user_id: Authenticated user ID

    Returns:
        Updated PlanningSessionState

    Raises:
        HTTPException: If session not found or unauthorized
    """
    try:
        # Verify session exists
        if session_id not in planning_sessions:
            raise HTTPException(status_code=404, detail="Planning session not found")

        session = planning_sessions[session_id]

        # Verify user owns this session
        if session.created_by != user_id:
            raise HTTPException(
                status_code=403,
                detail="You can only respond to your own planning sessions"
            )

        # Add responses to session
        session.responses_collected.extend(responses)

        # Check if all required questions have been answered
        required_question_ids = {
            q.question_id for q in session.questions_asked if q.required
        }
        answered_question_ids = {r.question_id for r in session.responses_collected}

        if required_question_ids.issubset(answered_question_ids):
            session.is_complete = True
            logger.info(f"Session {session_id} questionnaire complete")

        # Update session
        planning_sessions[session_id] = session

        logger.info(f"Stored {len(responses)} responses for session {session_id}")
        return session

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to submit responses: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to submit responses: {str(e)}"
        )


@router.get("/sessions/{session_id}", response_model=PlanningSessionState)
async def get_session(
    session_id: str,
    user_id: str = Depends(verify_program_manager)
) -> PlanningSessionState:
    """
    Get current planning session state.

    Args:
        session_id: UUID of the planning session
        user_id: Authenticated user ID

    Returns:
        Current PlanningSessionState

    Raises:
        HTTPException: If session not found or unauthorized
    """
    # Verify session exists
    if session_id not in planning_sessions:
        raise HTTPException(status_code=404, detail="Planning session not found")

    session = planning_sessions[session_id]

    # Verify user owns this session
    if session.created_by != user_id:
        raise HTTPException(
            status_code=403,
            detail="You can only view your own planning sessions"
        )

    return session


@router.post("/sessions/{session_id}/generate", response_model=GenerateRecommendationsResponse)
async def generate_recommendations(
    session_id: str,
    user_id: str = Depends(verify_program_manager)
) -> GenerateRecommendationsResponse:
    """
    Generate task and milestone recommendations based on collected responses.

    Uses AI agent to analyze responses and create tailored recommendations.

    Args:
        session_id: UUID of the planning session
        user_id: Authenticated user ID

    Returns:
        GenerateRecommendationsResponse with tasks and milestones

    Raises:
        HTTPException: If session not found, incomplete, or generation fails
    """
    try:
        # Verify session exists
        if session_id not in planning_sessions:
            raise HTTPException(status_code=404, detail="Planning session not found")

        session = planning_sessions[session_id]

        # Verify user owns this session
        if session.created_by != user_id:
            raise HTTPException(
                status_code=403,
                detail="You can only generate recommendations for your own sessions"
            )

        # Verify all required questions answered
        if not session.is_complete:
            raise HTTPException(
                status_code=400,
                detail="Cannot generate recommendations - please answer all required questions"
            )

        logger.info(f"Generating recommendations for session {session_id}")

        # Generate tasks using AI agent
        tasks = await planning_agent.generate_tasks(
            session.transition_type,
            session.responses_collected
        )

        # Generate milestones using AI agent
        milestones = await planning_agent.generate_milestones(
            session.transition_type,
            session.responses_collected
        )

        # Store recommendations in session
        session.tasks_generated = tasks
        session.milestones_generated = milestones
        planning_sessions[session_id] = session

        logger.info(f"Generated {len(tasks)} tasks and {len(milestones)} milestones")

        return GenerateRecommendationsResponse(
            session_id=session_id,
            tasks=tasks,
            milestones=milestones
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to generate recommendations: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate recommendations: {str(e)}"
        )


@router.post("/sessions/{session_id}/accept", response_model=AcceptRecommendationsResponse)
async def accept_recommendations(
    session_id: str,
    request: AcceptRecommendationsRequest,
    user_id: str = Depends(verify_program_manager)
) -> AcceptRecommendationsResponse:
    """
    Accept AI-generated recommendations.

    Marks selected tasks and milestones as accepted. The Node.js backend
    will create these in the database.

    Args:
        session_id: UUID of the planning session
        request: IDs of tasks/milestones to accept with optional edits
        user_id: Authenticated user ID

    Returns:
        AcceptRecommendationsResponse with counts

    Raises:
        HTTPException: If session not found or unauthorized
    """
    try:
        # Verify session exists
        if session_id not in planning_sessions:
            raise HTTPException(status_code=404, detail="Planning session not found")

        session = planning_sessions[session_id]

        # Verify user owns this session
        if session.created_by != user_id:
            raise HTTPException(
                status_code=403,
                detail="You can only accept recommendations for your own sessions"
            )

        # Store accepted items
        session.tasks_accepted = request.task_ids
        session.milestones_accepted = request.milestone_ids

        # Mark session as completed
        session.session_completed_at = datetime.utcnow()

        # Update session
        planning_sessions[session_id] = session

        logger.info(
            f"Session {session_id} accepted {len(request.task_ids)} tasks "
            f"and {len(request.milestone_ids)} milestones"
        )

        return AcceptRecommendationsResponse(
            session_id=session_id,
            tasks_created=len(request.task_ids),
            milestones_created=len(request.milestone_ids)
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to accept recommendations: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to accept recommendations: {str(e)}"
        )


@router.post("/sessions/{session_id}/reject")
async def reject_recommendations(
    session_id: str,
    request: RejectRecommendationsRequest,
    user_id: str = Depends(verify_program_manager)
) -> JSONResponse:
    """
    Reject AI-generated recommendations.

    Records rejection with optional reason for future model improvement.

    Args:
        session_id: UUID of the planning session
        request: Rejection request with optional reason
        user_id: Authenticated user ID

    Returns:
        Success confirmation

    Raises:
        HTTPException: If session not found or unauthorized
    """
    try:
        # Verify session exists
        if session_id not in planning_sessions:
            raise HTTPException(status_code=404, detail="Planning session not found")

        session = planning_sessions[session_id]

        # Verify user owns this session
        if session.created_by != user_id:
            raise HTTPException(
                status_code=403,
                detail="You can only reject recommendations for your own sessions"
            )

        # Store rejection reason
        session.recommendations_rejected = {
            "rejected_at": datetime.utcnow().isoformat(),
            "reason": request.reason or "No reason provided"
        }

        # Mark session as completed (but with rejection)
        session.session_completed_at = datetime.utcnow()

        # Update session
        planning_sessions[session_id] = session

        logger.info(f"Session {session_id} recommendations rejected: {request.reason}")

        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "message": "Recommendations rejected. You can proceed with manual planning."
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to reject recommendations: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to reject recommendations: {str(e)}"
        )


@router.get("/health")
async def health_check() -> JSONResponse:
    """
    Health check endpoint for AI planning service.

    Returns:
        Service health status
    """
    return JSONResponse(
        status_code=200,
        content={
            "service": "AI Planning",
            "status": "healthy",
            "agent_model": planning_agent.model_name
        }
    )
