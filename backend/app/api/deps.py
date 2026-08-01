import logging
from typing import AsyncGenerator
from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_access_token
from app.database.models import User
from app.database.session import get_db
from app.services.auth_service import AuthService
from app.utils.exceptions import UnauthorizedException

logger = logging.getLogger("app.api.deps")
security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> User:
    """
    Dependency to validate JWT Bearer token and retrieve the current authenticated User.
    """
    token = credentials.credentials
    payload = decode_access_token(token)

    if not payload or "sub" not in payload:
        logger.warning("Token validation failed: Invalid or expired JWT token.")
        raise UnauthorizedException("Invalid or expired access token.")

    user_id_str = payload["sub"]
    try:
        user_id = int(user_id_str)
    except ValueError:
        raise UnauthorizedException("Invalid token subject format.")

    user = await AuthService.get_user_by_id(db, user_id=user_id)
    if not user:
        logger.warning(f"User not found for user_id: {user_id}")
        raise UnauthorizedException("User associated with token no longer exists.")

    return user
