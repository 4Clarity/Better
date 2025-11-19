"""
Audit logging for AI Planning operations.

Tracks all security-relevant events for compliance and security monitoring.
"""

import logging
import json
from datetime import datetime
from typing import Any, Dict, Optional
from enum import Enum


class AuditEventType(str, Enum):
    """Types of audit events."""
    # Session events
    SESSION_CREATED = "session_created"
    SESSION_ACCESSED = "session_accessed"
    SESSION_UPDATED = "session_updated"
    SESSION_COMPLETED = "session_completed"
    SESSION_CANCELLED = "session_cancelled"
    SESSION_DELETED = "session_deleted"

    # Response events
    RESPONSES_SUBMITTED = "responses_submitted"
    RESPONSES_VALIDATED = "responses_validated"

    # Recommendation events
    RECOMMENDATIONS_GENERATED = "recommendations_generated"
    RECOMMENDATIONS_UPDATED = "recommendations_updated"
    RECOMMENDATIONS_ACCEPTED = "recommendations_accepted"
    RECOMMENDATIONS_REJECTED = "recommendations_rejected"

    # Security events
    AUTH_SUCCESS = "auth_success"
    AUTH_FAILURE = "auth_failure"
    AUTHORIZATION_DENIED = "authorization_denied"
    INVALID_INPUT_DETECTED = "invalid_input_detected"
    RATE_LIMIT_EXCEEDED = "rate_limit_exceeded"

    # AI events
    AI_GENERATION_STARTED = "ai_generation_started"
    AI_GENERATION_COMPLETED = "ai_generation_completed"
    AI_GENERATION_FAILED = "ai_generation_failed"
    FALLBACK_USED = "fallback_used"


class AuditSeverity(str, Enum):
    """Severity levels for audit events."""
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


# Configure audit logger (separate from application logger)
audit_logger = logging.getLogger("ai_planning.audit")
audit_logger.setLevel(logging.INFO)

# Create separate handler for audit logs
# In production, this should write to a separate file or service
audit_handler = logging.StreamHandler()
audit_handler.setFormatter(
    logging.Formatter(
        '{"timestamp": "%(asctime)s", "level": "%(levelname)s", "audit_event": %(message)s}',
        datefmt='%Y-%m-%dT%H:%M:%S%z'
    )
)
audit_logger.addHandler(audit_handler)


class AuditEvent:
    """Represents an audit event."""

    def __init__(
        self,
        event_type: AuditEventType,
        user_id: str,
        severity: AuditSeverity = AuditSeverity.INFO,
        session_id: Optional[str] = None,
        transition_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ):
        """
        Create an audit event.

        Args:
            event_type: Type of event that occurred
            user_id: User who triggered the event
            severity: Severity level
            session_id: Planning session ID (if applicable)
            transition_id: Transition ID (if applicable)
            details: Additional event details
            ip_address: Client IP address
            user_agent: Client user agent
        """
        self.timestamp = datetime.utcnow().isoformat()
        self.event_type = event_type
        self.user_id = user_id
        self.severity = severity
        self.session_id = session_id
        self.transition_id = transition_id
        self.details = details or {}
        self.ip_address = ip_address
        self.user_agent = user_agent

    def to_dict(self) -> Dict[str, Any]:
        """Convert event to dictionary for logging."""
        return {
            "timestamp": self.timestamp,
            "event_type": self.event_type.value,
            "user_id": self.user_id,
            "severity": self.severity.value,
            "session_id": self.session_id,
            "transition_id": self.transition_id,
            "details": self.details,
            "ip_address": self.ip_address,
            "user_agent": self.user_agent
        }

    def log(self):
        """Write event to audit log."""
        log_data = self.to_dict()

        # Log at appropriate level based on severity
        if self.severity == AuditSeverity.INFO:
            audit_logger.info(json.dumps(log_data))
        elif self.severity == AuditSeverity.WARNING:
            audit_logger.warning(json.dumps(log_data))
        elif self.severity == AuditSeverity.ERROR:
            audit_logger.error(json.dumps(log_data))
        elif self.severity == AuditSeverity.CRITICAL:
            audit_logger.critical(json.dumps(log_data))


def log_audit_event(
    event_type: AuditEventType,
    user_id: str,
    severity: AuditSeverity = AuditSeverity.INFO,
    **kwargs
) -> None:
    """
    Convenience function to log an audit event.

    Args:
        event_type: Type of event
        user_id: User ID
        severity: Severity level
        **kwargs: Additional event details (session_id, transition_id, details, etc.)
    """
    event = AuditEvent(
        event_type=event_type,
        user_id=user_id,
        severity=severity,
        **kwargs
    )
    event.log()


def log_session_created(
    user_id: str,
    session_id: str,
    transition_id: str,
    transition_type: str,
    execution_mode: str,
    ip_address: Optional[str] = None
) -> None:
    """Log creation of a new planning session."""
    log_audit_event(
        event_type=AuditEventType.SESSION_CREATED,
        user_id=user_id,
        session_id=session_id,
        transition_id=transition_id,
        details={
            "transition_type": transition_type,
            "execution_mode": execution_mode
        },
        ip_address=ip_address
    )


def log_session_accessed(
    user_id: str,
    session_id: str,
    ip_address: Optional[str] = None
) -> None:
    """Log access to an existing session."""
    log_audit_event(
        event_type=AuditEventType.SESSION_ACCESSED,
        user_id=user_id,
        session_id=session_id,
        ip_address=ip_address
    )


def log_responses_submitted(
    user_id: str,
    session_id: str,
    response_count: int,
    ip_address: Optional[str] = None
) -> None:
    """Log submission of user responses."""
    log_audit_event(
        event_type=AuditEventType.RESPONSES_SUBMITTED,
        user_id=user_id,
        session_id=session_id,
        details={"response_count": response_count},
        ip_address=ip_address
    )


def log_recommendations_generated(
    user_id: str,
    session_id: str,
    task_count: int,
    milestone_count: int,
    generation_time_ms: int,
    used_fallback: bool = False,
    ip_address: Optional[str] = None
) -> None:
    """Log generation of AI recommendations."""
    log_audit_event(
        event_type=AuditEventType.RECOMMENDATIONS_GENERATED,
        user_id=user_id,
        session_id=session_id,
        details={
            "task_count": task_count,
            "milestone_count": milestone_count,
            "generation_time_ms": generation_time_ms,
            "used_fallback": used_fallback
        },
        ip_address=ip_address
    )


def log_recommendations_accepted(
    user_id: str,
    session_id: str,
    tasks_accepted: int,
    milestones_accepted: int,
    ip_address: Optional[str] = None
) -> None:
    """Log acceptance of recommendations."""
    log_audit_event(
        event_type=AuditEventType.RECOMMENDATIONS_ACCEPTED,
        user_id=user_id,
        session_id=session_id,
        details={
            "tasks_accepted": tasks_accepted,
            "milestones_accepted": milestones_accepted
        },
        ip_address=ip_address
    )


def log_session_completed(
    user_id: str,
    session_id: str,
    ip_address: Optional[str] = None
) -> None:
    """Log completion of a planning session."""
    log_audit_event(
        event_type=AuditEventType.SESSION_COMPLETED,
        user_id=user_id,
        session_id=session_id,
        ip_address=ip_address
    )


def log_auth_failure(
    user_id: str,
    reason: str,
    ip_address: Optional[str] = None
) -> None:
    """Log authentication failure."""
    log_audit_event(
        event_type=AuditEventType.AUTH_FAILURE,
        user_id=user_id,
        severity=AuditSeverity.WARNING,
        details={"reason": reason},
        ip_address=ip_address
    )


def log_authorization_denied(
    user_id: str,
    resource: str,
    required_role: str,
    user_roles: list,
    ip_address: Optional[str] = None
) -> None:
    """Log authorization denial."""
    log_audit_event(
        event_type=AuditEventType.AUTHORIZATION_DENIED,
        user_id=user_id,
        severity=AuditSeverity.WARNING,
        details={
            "resource": resource,
            "required_role": required_role,
            "user_roles": user_roles
        },
        ip_address=ip_address
    )


def log_invalid_input(
    user_id: str,
    field: str,
    error: str,
    ip_address: Optional[str] = None
) -> None:
    """Log detection of invalid/malicious input."""
    log_audit_event(
        event_type=AuditEventType.INVALID_INPUT_DETECTED,
        user_id=user_id,
        severity=AuditSeverity.WARNING,
        details={
            "field": field,
            "error": error
        },
        ip_address=ip_address
    )


def log_rate_limit_exceeded(
    user_id: str,
    action: str,
    limit: int,
    ip_address: Optional[str] = None
) -> None:
    """Log rate limit violation."""
    log_audit_event(
        event_type=AuditEventType.RATE_LIMIT_EXCEEDED,
        user_id=user_id,
        severity=AuditSeverity.WARNING,
        details={
            "action": action,
            "limit": limit
        },
        ip_address=ip_address
    )


def log_ai_generation_failed(
    user_id: str,
    session_id: str,
    error: str,
    ip_address: Optional[str] = None
) -> None:
    """Log AI generation failure."""
    log_audit_event(
        event_type=AuditEventType.AI_GENERATION_FAILED,
        user_id=user_id,
        severity=AuditSeverity.ERROR,
        session_id=session_id,
        details={"error": error},
        ip_address=ip_address
    )
