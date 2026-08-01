import logging
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token, get_password_hash, verify_password
from app.database.models import User
from app.schemas.auth import Token, UserLogin, UserRegister
from app.utils.exceptions import InvalidCredentialsException, UserAlreadyExistsException

logger = logging.getLogger("app.services.auth")


class AuthService:
    """Service handling User Registration, Authentication, and Token Generation."""

    @staticmethod
    async def register_user(db: AsyncSession, user_in: UserRegister) -> User:
        """
        Register a new user after verifying email uniqueness.
        """
        # Check duplicate email
        query = select(User).where(User.email == user_in.email.lower())
        result = await db.execute(query)
        existing_user = result.scalar_one_or_none()

        if existing_user:
            logger.warning(f"Registration failed: Email '{user_in.email}' is already registered.")
            raise UserAlreadyExistsException(f"A user with email '{user_in.email}' already exists.")

        # Hash password and create user
        hashed_password = get_password_hash(user_in.password)
        new_user = User(
            name=user_in.name,
            email=user_in.email.lower(),
            hashed_password=hashed_password
        )

        db.add(new_user)
        await db.commit()
        await db.refresh(new_user)

        logger.info(f"User registered successfully. ID: {new_user.id}, Email: {new_user.email}")
        return new_user

    @staticmethod
    async def authenticate_user(db: AsyncSession, login_in: UserLogin) -> Token:
        """
        Authenticate user credentials and return a JWT access token.
        """
        query = select(User).where(User.email == login_in.email.lower())
        result = await db.execute(query)
        user = result.scalar_one_or_none()

        if not user or not verify_password(login_in.password, user.hashed_password):
            logger.warning(f"Authentication failed for email: '{login_in.email}'")
            raise InvalidCredentialsException()

        access_token = create_access_token(subject=user.id, extra_claims={"email": user.email})
        logger.info(f"User authenticated successfully. ID: {user.id}")

        return Token(
            access_token=access_token,
            token_type="bearer",
            user_id=user.id,
            email=user.email
        )

    @staticmethod
    async def get_user_by_id(db: AsyncSession, user_id: int) -> User:
        """Retrieve user by primary key ID."""
        query = select(User).where(User.id == user_id)
        result = await db.execute(query)
        return result.scalar_one_or_none()
