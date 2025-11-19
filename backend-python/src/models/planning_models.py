"""
Data models for AI-assisted transition planning.

This module defines Pydantic models for:
- Planning questions and responses
- Task and milestone recommendations
- Planning session state
"""

from datetime import datetime
from enum import Enum
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, validator
from uuid import UUID


class TransitionType(str, Enum):
    """Enum for transition types matching database schema."""
    CONTRACT = "Contract"
    PERSONNEL = "Personnel"
    SYSTEM = "System"


class ExecutionMode(str, Enum):
    """Enum for AI execution modes."""
    DIRECT_LLM = "DirectLLM"
    N8N_WORKFLOW = "N8NWorkflow"


class QuestionType(str, Enum):
    """Types of questions the AI can ask."""
    TEXT = "text"
    SELECT = "select"
    MULTI_SELECT = "multi_select"
    DATE = "date"
    NUMBER = "number"
    BOOLEAN = "boolean"


class TaskPriority(str, Enum):
    """Task priority levels."""
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"
    CRITICAL = "Critical"


class TaskStatus(str, Enum):
    """Task status values."""
    NOT_STARTED = "Not Started"
    IN_PROGRESS = "In Progress"
    COMPLETED = "Completed"
    BLOCKED = "Blocked"


class MilestoneStatus(str, Enum):
    """Milestone status values."""
    NOT_STARTED = "Not Started"
    IN_PROGRESS = "In Progress"
    COMPLETED = "Completed"
    AT_RISK = "At Risk"


class PlanningQuestion(BaseModel):
    """Represents a single planning question."""
    question_id: str = Field(..., description="Unique identifier for the question")
    text: str = Field(..., description="The question text")
    question_type: QuestionType = Field(..., description="Type of input expected")
    options: Optional[List[str]] = Field(None, description="Options for select/multi-select questions")
    required: bool = Field(True, description="Whether the question must be answered")
    help_text: Optional[str] = Field(None, description="Additional context or help text")
    default_value: Optional[Any] = Field(None, description="Default answer value")

    @validator("options")
    def validate_options(cls, v, values):
        """Ensure options are provided for select-type questions."""
        question_type = values.get("question_type")
        if question_type in [QuestionType.SELECT, QuestionType.MULTI_SELECT] and not v:
            raise ValueError(f"Options required for {question_type} questions")
        return v


class PlanningResponse(BaseModel):
    """Represents a user's response to a planning question."""
    question_id: str = Field(..., description="ID of the question being answered")
    answer: Any = Field(..., description="The user's answer")
    answered_at: datetime = Field(default_factory=datetime.utcnow)


class PlanningContext(BaseModel):
    """Analyzed context from user responses."""
    transition_type: TransitionType
    scope: str = Field(..., description="Scope of the transition")
    scale: str = Field(..., description="Scale/size of the transition")
    timeline_weeks: int = Field(..., description="Expected duration in weeks")
    team_size: int = Field(..., description="Number of team members")
    risk_factors: List[str] = Field(default_factory=list)
    special_requirements: List[str] = Field(default_factory=list)
    key_deliverables: List[str] = Field(default_factory=list)

    @validator("timeline_weeks")
    def validate_timeline(cls, v):
        """Ensure timeline is reasonable."""
        if v < 1 or v > 260:  # 1 week to 5 years
            raise ValueError("Timeline must be between 1 and 260 weeks")
        return v


class TaskRecommendation(BaseModel):
    """Represents an AI-generated task recommendation."""
    title: str = Field(..., max_length=255)
    description: str = Field(..., description="Detailed task description")
    priority: TaskPriority = Field(default=TaskPriority.MEDIUM)
    status: TaskStatus = Field(default=TaskStatus.NOT_STARTED)
    assigned_role: str = Field(..., description="Role that should handle this task")
    estimated_hours: Optional[int] = Field(None, ge=0, le=1000)
    days_from_start: int = Field(..., ge=0, description="When task should start (days from transition start)")
    duration_days: int = Field(..., ge=1, description="Expected duration in days")
    dependencies: List[str] = Field(default_factory=list, description="Task titles this depends on")
    tags: List[str] = Field(default_factory=list)

    @validator("title")
    def validate_title(cls, v):
        """Ensure title is not empty."""
        if not v or not v.strip():
            raise ValueError("Title cannot be empty")
        return v.strip()


class MilestoneRecommendation(BaseModel):
    """Represents an AI-generated milestone recommendation."""
    title: str = Field(..., max_length=255)
    description: str = Field(..., description="Milestone description")
    days_from_start: int = Field(..., ge=0, description="Target date (days from transition start)")
    priority: TaskPriority = Field(default=TaskPriority.MEDIUM)
    status: MilestoneStatus = Field(default=MilestoneStatus.NOT_STARTED)
    assigned_role: Optional[str] = Field(None, description="Role responsible for milestone")
    success_criteria: List[str] = Field(default_factory=list, description="How to measure completion")

    @validator("title")
    def validate_title(cls, v):
        """Ensure title is not empty."""
        if not v or not v.strip():
            raise ValueError("Title cannot be empty")
        return v.strip()


class PlanningSessionCreate(BaseModel):
    """Request model for creating a new planning session."""
    transition_id: str = Field(..., description="UUID of the transition")
    transition_type: TransitionType
    execution_mode: ExecutionMode = Field(default=ExecutionMode.DIRECT_LLM)
    user_id: str = Field(..., description="UUID of the user creating the session")


class PlanningSessionState(BaseModel):
    """Complete state of a planning session."""
    session_id: str
    transition_id: str
    transition_type: TransitionType
    execution_mode: ExecutionMode
    created_by: str
    session_started_at: datetime
    session_completed_at: Optional[datetime] = None
    questions_asked: List[PlanningQuestion] = Field(default_factory=list)
    responses_collected: List[PlanningResponse] = Field(default_factory=list)
    tasks_generated: List[TaskRecommendation] = Field(default_factory=list)
    milestones_generated: List[MilestoneRecommendation] = Field(default_factory=list)
    tasks_accepted: List[str] = Field(default_factory=list, description="Task titles accepted by user")
    milestones_accepted: List[str] = Field(default_factory=list, description="Milestone titles accepted by user")
    recommendations_rejected: Optional[Dict[str, str]] = Field(None, description="Rejected items with reasons")
    llm_model_used: Optional[str] = None
    is_complete: bool = False


class GenerateRecommendationsRequest(BaseModel):
    """Request to generate task/milestone recommendations."""
    session_id: str


class AcceptRecommendationsRequest(BaseModel):
    """Request to accept AI recommendations."""
    session_id: str
    task_ids: List[str] = Field(default_factory=list, description="Indices or titles of tasks to accept")
    milestone_ids: List[str] = Field(default_factory=list, description="Indices or titles of milestones to accept")
    edits: Dict[str, Dict[str, Any]] = Field(default_factory=dict, description="Edits to apply before accepting")


class RejectRecommendationsRequest(BaseModel):
    """Request to reject AI recommendations."""
    session_id: str
    reason: Optional[str] = Field(None, description="Optional reason for rejection")


class GenerateRecommendationsResponse(BaseModel):
    """Response containing generated recommendations."""
    session_id: str
    tasks: List[TaskRecommendation]
    milestones: List[MilestoneRecommendation]
    success: bool = True


class AcceptRecommendationsResponse(BaseModel):
    """Response after accepting recommendations."""
    session_id: str
    tasks_created: int
    milestones_created: int
    success: bool = True
