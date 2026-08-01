import logging
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.database.models import User
from app.database.session import get_db
from app.schemas.auth import Token, UserLogin, UserRegister, UserResponse
from app.services.auth_service import AuthService

logger = logging.getLogger("app.api.auth")
router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user account",
    description="Registers a new store owner account with email and password."
)
async def register(
    user_in: UserRegister,
    db: AsyncSession = Depends(get_db)
) -> UserResponse:
    """
    Register a new user in the system.
    """
    logger.info(f"Received registration request for email: {user_in.email}")
    user = await AuthService.register_user(db, user_in=user_in)
    return user


@router.post(
    "/login",
    response_model=Token,
    status_code=status.HTTP_200_OK,
    summary="User login for JWT token",
    description="Authenticates credentials and returns a Bearer JWT access token."
)
async def login(
    login_in: UserLogin,
    db: AsyncSession = Depends(get_db)
) -> Token:
    """
    Authenticate user and issue JWT token.
    """
    logger.info(f"Received login request for email: {login_in.email}")
    token = await AuthService.authenticate_user(db, login_in=login_in)
    return token


@router.get(
    "/me",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Get current user details",
    description="Returns profile information for the currently authenticated user."
)
async def get_me(
    current_user: User = Depends(get_current_user)
) -> UserResponse:
    """
    Protected route to retrieve current user info.
    """
    return current_user
