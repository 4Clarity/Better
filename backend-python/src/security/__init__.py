"""
Security module for AI Planning service.

Provides authentication, authorization, input validation, and audit logging.
"""

from .auth import (
    verify_program_manager,
    extract_user_from_headers,
    require_program_manager_role,
    verify_session_ownership,
    UserInfo,
    AUTHORIZED_ROLES
)

from .validation import (
    sanitize_string,
    sanitize_dict,
    sanitize_list,
    validate_uuid,
    validate_transition_id,
    validate_session_id,
    validate_response_answer,
    check_rate_limit,
    ValidatedInput
)

from .audit import (
    log_audit_event,
    log_session_created,
    log_session_accessed,
    log_responses_submitted,
    log_recommendations_generated,
    log_recommendations_accepted,
    log_session_completed,
    log_auth_failure,
    log_authorization_denied,
    log_invalid_input,
    log_rate_limit_exceeded,
    log_ai_generation_failed,
    AuditEventType,
    AuditSeverity
)

__all__ = [
    # Authentication
    "verify_program_manager",
    "extract_user_from_headers",
    "require_program_manager_role",
    "verify_session_ownership",
    "UserInfo",
    "AUTHORIZED_ROLES",

    # Validation
    "sanitize_string",
    "sanitize_dict",
    "sanitize_list",
    "validate_uuid",
    "validate_transition_id",
    "validate_session_id",
    "validate_response_answer",
    "check_rate_limit",
    "ValidatedInput",

    # Audit
    "log_audit_event",
    "log_session_created",
    "log_session_accessed",
    "log_responses_submitted",
    "log_recommendations_generated",
    "log_recommendations_accepted",
    "log_session_completed",
    "log_auth_failure",
    "log_authorization_denied",
    "log_invalid_input",
    "log_rate_limit_exceeded",
    "log_ai_generation_failed",
    "AuditEventType",
    "AuditSeverity"
]
