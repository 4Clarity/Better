"""
Authentication and authorization middleware for AI Planning endpoints.

Implements role-based access control (RBAC) to ensure only authorized users
can access AI planning features.
"""

import logging
from functools import wraps
from typing import List, Optional
from fastapi import Header, HTTPException, status
from pydantic import BaseModel

logger = logging.getLogger(__name__)


class UserInfo(BaseModel):
    """User information extracted from authentication headers."""
    user_id: str
    email: Optional[str] = None
    roles: List[str] = []
    organization: Optional[str] = None


# Roles authorized to use AI Planning features
AUTHORIZED_ROLES = [
    "Program Manager",
    "Transition Manager",
    "Administrator",
    "System Admin"
]


def extract_user_from_headers(
    x_auth_bypass: Optional[str] = Header(None),
    x_user_id: Optional[str] = Header(None),
    x_user_email: Optional[str] = Header(None),
    x_user_roles: Optional[str] = Header(None),
    authorization: Optional[str] = Header(None)
) -> UserInfo:
    """
    Extract user information from request headers.

    Supports:
    - Auth bypass mode (development only)
    - User ID/email/roles headers (from Keycloak/auth service)
    - JWT token in Authorization header

    Args:
        x_auth_bypass: Development auth bypass flag
        x_user_id: User ID from auth service
        x_user_email: User email from auth service
        x_user_roles: Comma-separated list of roles
        authorization: JWT Bearer token

    Returns:
        UserInfo object with user details

    Raises:
        HTTPException: If authentication fails
    """
    # Development mode: auth bypass
    if x_auth_bypass == "true":
        logger.warning("AUTH BYPASS MODE - Development only!")
        return UserInfo(
            user_id=x_user_id or "dev-user",
            email=x_user_email or "dev@example.com",
            roles=["Program Manager", "Administrator"]
        )

    # Extract from headers (set by auth middleware)
    if x_user_id:
        roles = x_user_roles.split(",") if x_user_roles else []
        return UserInfo(
            user_id=x_user_id,
            email=x_user_email,
            roles=[role.strip() for role in roles]
        )

    # Extract from JWT token
    if authorization and authorization.startswith("Bearer "):
        token = authorization.replace("Bearer ", "")
        # TODO: Implement JWT validation and decoding
        # For now, raise error - JWT validation should be implemented in production
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="JWT authentication not yet implemented. Use x-auth-bypass or user headers."
        )

    # No valid authentication found
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication required. Provide x-user-id header or Bearer token."
    )


def require_program_manager_role(user: UserInfo) -> UserInfo:
    """
    Verify user has Program Manager role or equivalent.

    Args:
        user: UserInfo object from authentication

    Returns:
        UserInfo if authorized

    Raises:
        HTTPException: If user lacks required role
    """
    # Check if user has any authorized role (case-insensitive)
    user_roles_lower = [role.lower() for role in user.roles]
    authorized_roles_lower = [role.lower() for role in AUTHORIZED_ROLES]

    if any(role in authorized_roles_lower for role in user_roles_lower):
        logger.info(f"User {user.user_id} authorized with roles: {user.roles}")
        return user

    # User lacks required role
    logger.warning(
        f"User {user.user_id} denied access. Has roles: {user.roles}, "
        f"Required one of: {AUTHORIZED_ROLES}"
    )
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail=f"Access denied. Required role: {', '.join(AUTHORIZED_ROLES)}"
    )


def verify_program_manager(
    x_auth_bypass: Optional[str] = Header(None),
    x_user_id: Optional[str] = Header(None),
    x_user_email: Optional[str] = Header(None),
    x_user_roles: Optional[str] = Header(None),
    authorization: Optional[str] = Header(None)
) -> str:
    """
    FastAPI dependency to verify user is a Program Manager.

    Usage:
        @app.post("/api/endpoint")
        async def endpoint(user_id: str = Depends(verify_program_manager)):
            # user_id contains authenticated user ID
            ...

    Returns:
        user_id string for use in endpoint

    Raises:
        HTTPException: If authentication or authorization fails
    """
    user = extract_user_from_headers(
        x_auth_bypass=x_auth_bypass,
        x_user_id=x_user_id,
        x_user_email=x_user_email,
        x_user_roles=x_user_roles,
        authorization=authorization
    )

    require_program_manager_role(user)

    return user.user_id


def verify_session_ownership(session_user_id: str, requesting_user_id: str) -> bool:
    """
    Verify that the requesting user owns the planning session.

    Args:
        session_user_id: User ID who created the session
        requesting_user_id: User ID making the request

    Returns:
        True if user owns session

    Raises:
        HTTPException: If user doesn't own session
    """
    if session_user_id != requesting_user_id:
        logger.warning(
            f"User {requesting_user_id} attempted to access session "
            f"owned by {session_user_id}"
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. You can only access your own planning sessions."
        )

    return True
