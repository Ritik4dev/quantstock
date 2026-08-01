import os
from typing import Optional
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application Settings powered by Pydantic BaseSettings.
    Loads configurations from environment variables or .env file.
    """
    APP_NAME: str = Field(default="AI Retail Management Platform API")
    APP_ENV: str = Field(default="development")
    DEBUG: bool = Field(default=True)
    API_V1_PREFIX: str = Field(default="/api/v1")

    # Database Settings
    DATABASE_URL: str = Field(
        default="postgresql+asyncpg://postgres:postgres@localhost:5432/quadstock"
    )

    # JWT Settings
    JWT_SECRET: str = Field(
        default="e9b4d8a1c3f5e7a9b2d4f6a8c0e2f4a6b8d0c2e4f6a8b0c2d4e6f8a0b2c4d6e8"
    )
    JWT_ALGORITHM: str = Field(default="HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=1440)  # 24 hours

    # Groq Settings
    GROQ_API_KEY: Optional[str] = Field(default=None)
    GROQ_MODEL: str = Field(default="llama-3.3-70b-versatile")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=True
    )

    @property
    def sync_database_url(self) -> str:
        """
        Returns a synchronous SQLAlchemy URL for Alembic migrations or sync engine usage.
        Replaces async drivers (+asyncpg) with synchronous drivers (+psycopg2 or sqlite).
        """
        url = self.DATABASE_URL
        if url.startswith("postgresql+asyncpg://"):
            return url.replace("postgresql+asyncpg://", "postgresql+psycopg2://")
        elif url.startswith("sqlite+aiosqlite://"):
            return url.replace("sqlite+aiosqlite://", "sqlite://")
        return url


settings = Settings()
