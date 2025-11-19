"""
AI Chat API Routes
RESTful endpoints for AI chat functionality
Story: 1.5 - Roadmap UI Complete Implementation
"""

from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
import uuid

from ..services.chat_service import chat_service

router = APIRouter(prefix="/chat", tags=["chat"])

# Request/Response models
class CreateSessionRequest(BaseModel):
    """Request to create a new chat session"""
    user_id: str = Field(..., description="User ID")
    context: Optional[Dict[str, Any]] = Field(default=None, description="Session context (role, transitionId, etc.)")

class CreateSessionResponse(BaseModel):
    """Response for creating a chat session"""
    session_id: str
    user_id: str
    context: Dict[str, Any]
    created_at: str
    message: str

class SendMessageRequest(BaseModel):
    """Request to send a message"""
    message: str = Field(..., description="User message", min_length=1)
    stream: bool = Field(default=False, description="Whether to stream the response")

class SendMessageResponse(BaseModel):
    """Response for sending a message"""
    success: bool
    session_id: str
    message: Dict[str, Any]
    conversation_length: int

class ChatMessage(BaseModel):
    """Chat message model"""
    role: str
    content: str
    timestamp: str

class SessionHistoryResponse(BaseModel):
    """Response for getting session history"""
    session_id: str
    user_id: str
    messages: List[Dict[str, Any]]
    created_at: str
    updated_at: str

# Routes

@router.post("/sessions", response_model=CreateSessionResponse, status_code=201)
async def create_chat_session(request: CreateSessionRequest):
    """
    Create a new chat session

    Creates a new chat session for a user with optional context (role, transition ID, etc.)
    """
    try:
        session_id = str(uuid.uuid4())
        session = chat_service.create_session(
            session_id=session_id,
            user_id=request.user_id,
            context=request.context or {}
        )

        return CreateSessionResponse(
            session_id=session.session_id,
            user_id=session.user_id,
            context=session.context,
            created_at=session.created_at.isoformat(),
            message="Chat session created successfully"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create session: {str(e)}")

@router.get("/sessions/{session_id}", response_model=SessionHistoryResponse)
async def get_session_history(session_id: str, limit: Optional[int] = None):
    """
    Get chat session history

    Retrieves the conversation history for a specific session
    """
    try:
        history = chat_service.get_session_history(session_id, limit)
        return SessionHistoryResponse(**history)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get session history: {str(e)}")

@router.post("/sessions/{session_id}/messages", response_model=SendMessageResponse)
async def send_message(session_id: str, request: SendMessageRequest):
    """
    Send a message to the AI assistant

    Sends a user message and receives an AI-generated response
    """
    try:
        response = await chat_service.send_message(
            session_id=session_id,
            message=request.message,
            stream=request.stream
        )

        if not response.get("success"):
            raise HTTPException(
                status_code=500,
                detail=response.get("error", "Failed to generate response")
            )

        return SendMessageResponse(**response)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send message: {str(e)}")

@router.delete("/sessions/{session_id}", status_code=204)
async def delete_session(session_id: str):
    """
    Delete a chat session

    Deletes a chat session and all its history
    """
    try:
        success = chat_service.delete_session(session_id)
        if not success:
            raise HTTPException(status_code=404, detail="Session not found")
        return None
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete session: {str(e)}")

@router.get("/users/{user_id}/sessions")
async def list_user_sessions(user_id: str):
    """
    List all chat sessions for a user

    Returns all chat sessions associated with a user
    """
    try:
        sessions = chat_service.list_user_sessions(user_id)
        return {
            "user_id": user_id,
            "sessions": sessions,
            "count": len(sessions)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list sessions: {str(e)}")

@router.get("/health")
async def health_check():
    """
    Health check endpoint

    Returns the status of the chat service
    """
    return {
        "status": "healthy",
        "service": "AI Chat Service",
        "model": chat_service.model_name,
        "active_sessions": len(chat_service.sessions)
    }
