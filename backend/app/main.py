import logging
import os
import sys
from contextlib import asynccontextmanager

# Add parent directory to sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)
app_dir = os.path.abspath(os.path.dirname(__file__))
if app_dir not in sys.path:
    sys.path.insert(0, app_dir)

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api import (
    ai_copilot,
    ai_discovery,
    analytics,
    auth,
    business,
    chat,
    csv_import,
    dashboard,
    forecast,
    inventory,
    product,
    recommendation,
    risk,
    sales,
    supplier,
)
from app.core.config import settings
from app.core.logging_config import logger
from app.database.database import async_engine
from app.database.models import Base


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager handling database connection startup and shutdown.
    Automatically creates database tables on startup if they do not exist.
    """
    global async_engine
    logger.info("Initializing database tables...")
    try:
        async with async_engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("PostgreSQL database tables initialized successfully.")
    except Exception as e:
        logger.warning(f"PostgreSQL connection offline ({e}). Switching to SQLite engine for local persistence...")
        from sqlalchemy.ext.asyncio import create_async_engine
        from app.database.database import AsyncSessionLocal
        
        fallback_engine = create_async_engine("sqlite+aiosqlite:///./quadstock.db", echo=settings.DEBUG)
        async with fallback_engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        
        AsyncSessionLocal.configure(bind=fallback_engine)
        async_engine = fallback_engine
        logger.info("SQLite database tables initialized successfully.")

    yield

    logger.info("Closing database engine pool...")
    await async_engine.dispose()
    logger.info("Application shutdown complete.")


app = FastAPI(
    title=settings.APP_NAME,
    description="Production-grade AI Retail Management Platform Backend (Phase 1 + Phase 2A + Phase 2B + Phase 3 AI Business Copilot)",
    version="3.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url=f"{settings.API_V1_PREFIX}/openapi.json",
    lifespan=lifespan
)

# CORS Configuration for Cloudflare Tunnels & Local Development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_origin_regex=r"https?://.*",
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Exception Handlers
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global unhandled exception handler returning structured JSON errors with CORS headers."""
    logger.error(f"Unhandled server exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": f"Internal Server Error: {str(exc)}"},
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "*",
        }
    )


# Health check endpoint
@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint to verify server status."""
    return {
        "status": "healthy",
        "app_name": settings.APP_NAME,
        "environment": settings.APP_ENV
    }


# Include Phase 1 Routers
app.include_router(auth.router, prefix=settings.API_V1_PREFIX)
app.include_router(business.router, prefix=settings.API_V1_PREFIX)
app.include_router(ai_discovery.router, prefix=settings.API_V1_PREFIX)

# Include Phase 2A Routers
app.include_router(supplier.router, prefix=settings.API_V1_PREFIX)
app.include_router(product.router, prefix=settings.API_V1_PREFIX)
app.include_router(inventory.router, prefix=settings.API_V1_PREFIX)
app.include_router(csv_import.router, prefix=settings.API_V1_PREFIX)
app.include_router(sales.router, prefix=settings.API_V1_PREFIX)
app.include_router(dashboard.router, prefix=settings.API_V1_PREFIX)
app.include_router(analytics.router, prefix=settings.API_V1_PREFIX)

# Include Phase 2B Routers (Decision Engine & ML Forecasting)
app.include_router(forecast.router, prefix=settings.API_V1_PREFIX)
app.include_router(recommendation.router, prefix=settings.API_V1_PREFIX)
app.include_router(risk.router, prefix=settings.API_V1_PREFIX)

# Include Phase 3 Routers (AI Business Copilot & Groq Integration)
app.include_router(chat.router, prefix=settings.API_V1_PREFIX)
app.include_router(ai_copilot.router, prefix=settings.API_V1_PREFIX)
