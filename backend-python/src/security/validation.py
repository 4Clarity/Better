"""
Input validation and sanitization for AI Planning endpoints.

Prevents injection attacks, validates data types, and sanitizes user input.
"""

import re
import logging
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, validator, Field
from fastapi import HTTPException, status

logger = logging.getLogger(__name__)


# Dangerous patterns to detect and block
INJECTION_PATTERNS = [
    r'<script',  # XSS
    r'javascript:',  # XSS
    r'on\w+\s*=',  # Event handlers (XSS)
    r'--',  # SQL comment
    r';.*DROP',  # SQL injection
    r';.*DELETE',  # SQL injection
    r';.*UPDATE',  # SQL injection
    r'UNION.*SELECT',  # SQL injection
    r'\.\./',  # Path traversal
    r'\\x',  # Encoded characters
    r'%[0-9a-f]{2}',  # URL encoding (potential bypass)
]


def sanitize_string(value: str, field_name: str = "input") -> str:
    """
    Sanitize string input to prevent injection attacks.

    Args:
        value: Input string to sanitize
        field_name: Name of field for error messages

    Returns:
        Sanitized string

    Raises:
        HTTPException: If dangerous patterns detected
    """
    if not isinstance(value, str):
        return value

    # Check for dangerous patterns
    for pattern in INJECTION_PATTERNS:
        if re.search(pattern, value, re.IGNORECASE):
            logger.warning(
                f"Potential injection attack detected in {field_name}: "
                f"Pattern '{pattern}' found in '{value[:100]}'"
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid characters detected in {field_name}"
            )

    # Remove excessive whitespace
    value = ' '.join(value.split())

    # Limit length to prevent DoS
    max_length = 10000
    if len(value) > max_length:
        logger.warning(f"Input too long in {field_name}: {len(value)} chars")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{field_name} exceeds maximum length of {max_length} characters"
        )

    return value


def sanitize_dict(data: Dict[str, Any], field_name: str = "object") -> Dict[str, Any]:
    """
    Recursively sanitize dictionary values.

    Args:
        data: Dictionary to sanitize
        field_name: Name of field for error messages

    Returns:
        Sanitized dictionary
    """
    if not isinstance(data, dict):
        return data

    sanitized = {}
    for key, value in data.items():
        # Sanitize key
        clean_key = sanitize_string(str(key), f"{field_name}.key")

        # Sanitize value based on type
        if isinstance(value, str):
            sanitized[clean_key] = sanitize_string(value, f"{field_name}.{clean_key}")
        elif isinstance(value, dict):
            sanitized[clean_key] = sanitize_dict(value, f"{field_name}.{clean_key}")
        elif isinstance(value, list):
            sanitized[clean_key] = sanitize_list(value, f"{field_name}.{clean_key}")
        else:
            sanitized[clean_key] = value

    return sanitized


def sanitize_list(data: List[Any], field_name: str = "array") -> List[Any]:
    """
    Sanitize list items.

    Args:
        data: List to sanitize
        field_name: Name of field for error messages

    Returns:
        Sanitized list
    """
    if not isinstance(data, list):
        return data

    # Limit list size to prevent DoS
    max_items = 1000
    if len(data) > max_items:
        logger.warning(f"List too long in {field_name}: {len(data)} items")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{field_name} exceeds maximum of {max_items} items"
        )

    sanitized = []
    for i, item in enumerate(data):
        if isinstance(item, str):
            sanitized.append(sanitize_string(item, f"{field_name}[{i}]"))
        elif isinstance(item, dict):
            sanitized.append(sanitize_dict(item, f"{field_name}[{i}]"))
        elif isinstance(item, list):
            sanitized.append(sanitize_list(item, f"{field_name}[{i}]"))
        else:
            sanitized.append(item)

    return sanitized


def validate_uuid(value: str, field_name: str = "ID") -> str:
    """
    Validate that a string is a valid UUID.

    Args:
        value: String to validate
        field_name: Name of field for error messages

    Returns:
        Validated UUID string

    Raises:
        HTTPException: If not a valid UUID
    """
    uuid_pattern = r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'

    if not re.match(uuid_pattern, value, re.IGNORECASE):
        logger.warning(f"Invalid UUID in {field_name}: {value}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid {field_name} format. Expected UUID."
        )

    return value.lower()


def validate_transition_id(transition_id: str) -> str:
    """
    Validate transition ID format.

    Args:
        transition_id: Transition ID to validate

    Returns:
        Validated transition ID

    Raises:
        HTTPException: If invalid format
    """
    # Transition IDs should be alphanumeric with hyphens
    if not re.match(r'^[a-zA-Z0-9\-_]{1,255}$', transition_id):
        logger.warning(f"Invalid transition ID format: {transition_id}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid transition ID format"
        )

    return transition_id


def validate_session_id(session_id: str) -> str:
    """
    Validate session ID format.

    Args:
        session_id: Session ID to validate

    Returns:
        Validated session ID

    Raises:
        HTTPException: If invalid format
    """
    # Session IDs are UUIDs
    return validate_uuid(session_id, "session ID")


class ValidatedInput(BaseModel):
    """Base class for validated input models."""

    @validator('*', pre=True)
    def sanitize_string_fields(cls, v, field):
        """Automatically sanitize all string fields."""
        if isinstance(v, str):
            return sanitize_string(v, field.name)
        return v


def check_rate_limit(user_id: str, action: str, limit: int = 100, window: int = 3600) -> bool:
    """
    Check if user has exceeded rate limit for an action.

    Args:
        user_id: User ID to check
        action: Action being performed (e.g., "create_session")
        limit: Maximum requests allowed in window
        window: Time window in seconds

    Returns:
        True if within limit

    Raises:
        HTTPException: If rate limit exceeded

    Note:
        This is a placeholder implementation. In production, use Redis
        or similar for distributed rate limiting.
    """
    # TODO: Implement actual rate limiting with Redis
    # For now, always allow
    logger.debug(f"Rate limit check for {user_id}.{action}: OK (placeholder)")
    return True


def validate_response_answer(answer: Any, question_type: str) -> Any:
    """
    Validate that answer matches expected question type.

    Args:
        answer: User's answer
        question_type: Expected question type

    Returns:
        Validated answer

    Raises:
        HTTPException: If answer doesn't match type
    """
    if question_type == "text":
        if not isinstance(answer, str):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Text question requires string answer"
            )
        return sanitize_string(answer, "answer")

    elif question_type == "number":
        try:
            return int(answer) if isinstance(answer, (int, str)) else answer
        except (ValueError, TypeError):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Number question requires numeric answer"
            )

    elif question_type == "select":
        if not isinstance(answer, str):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Select question requires string answer"
            )
        return sanitize_string(answer, "answer")

    elif question_type == "multi_select":
        if not isinstance(answer, list):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Multi-select question requires list answer"
            )
        return sanitize_list(answer, "answer")

    elif question_type == "date":
        if not isinstance(answer, str):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Date question requires string answer"
            )
        # Validate date format
        if not re.match(r'^\d{4}-\d{2}-\d{2}$', answer):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Date must be in YYYY-MM-DD format"
            )
        return answer

    elif question_type == "boolean":
        if not isinstance(answer, bool):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Boolean question requires true/false answer"
            )
        return answer

    else:
        # Unknown question type - accept any value but sanitize if string
        if isinstance(answer, str):
            return sanitize_string(answer, "answer")
        return answer
