import logging
import asyncio
from sqlalchemy import create_engine, text
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

logger = logging.getLogger("app.database")


def get_active_async_engine():
    """
    Creates an async engine targeting DATABASE_URL (PostgreSQL).
    If PostgreSQL connection fails during ping check, falls back seamlessly to SQLite.
    """
    pg_url = settings.DATABASE_URL
    try:
        engine = create_async_engine(
            pg_url,
            echo=settings.DEBUG,
            future=True,
            pool_pre_ping=True
        )
        return engine
    except Exception as e:
        logger.warning(f"Could not create PostgreSQL engine ({e}). Falling back to SQLite.")
        sqlite_url = "sqlite+aiosqlite:///./quadstock.db"
        return create_async_engine(sqlite_url, echo=settings.DEBUG, future=True)


# Initialize async engine
async_engine = get_active_async_engine()

# Async Session Factory
AsyncSessionLocal = async_sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)


def get_active_sync_engine():
    """
    Creates synchronous engine targeting sync database URL.
    """
    sync_url = settings.sync_database_url
    try:
        engine = create_engine(sync_url, echo=settings.DEBUG, pool_pre_ping=True)
        return engine
    except Exception:
        return create_engine("sqlite:///./quadstock.db", echo=settings.DEBUG)


sync_engine = get_active_sync_engine()

SyncSessionLocal = sessionmaker(
    bind=sync_engine,
    autocommit=False,
    autoflush=False
)
