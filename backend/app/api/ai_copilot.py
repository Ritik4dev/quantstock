import logging
from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.database.models import User
from app.database.session import get_db
from app.schemas.copilot import (
    DailyBriefResponse,
    ExplainRequest,
    ExplainResponse,
    ParseCommandRequest,
    ParseCommandResponse,
    ReportSummaryResponse,
)
from app.services.business_service import BusinessService
from app.services.command_parser_service import CommandParserService
from app.services.copilot_service import CopilotService
from app.services.groq_service import GroqService

logger = logging.getLogger("app.api.ai_copilot")
router = APIRouter(prefix="/ai", tags=["AI Business Copilot Engine & NLP Tools"])

copilot_service = CopilotService()
command_parser_service = CommandParserService()
groq_service = GroqService()


async def get_user_first_business_id(db: AsyncSession, user_id: int) -> int:
    businesses = await BusinessService.get_user_businesses(db, owner_id=user_id)
    if not businesses:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No registered business found for user. Please create a business first."
        )
    return businesses[0].id


@router.get(
    "/daily-brief",
    response_model=DailyBriefResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Smart Executive Daily Brief",
    description="Generates executive briefing combining Analytics, Forecasts, Recommendations, and Risk Scorecard."
)
async def get_daily_brief(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> DailyBriefResponse:
    business_id = await get_user_first_business_id(db, current_user.id)
    brief = await copilot_service.generate_daily_brief(db, business_id=business_id)
    return brief


@router.get(
    "/report-summary",
    response_model=ReportSummaryResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Executive Report Summary",
    description="Explains sales performance, revenue trends, top products, and inventory health using plain business language."
)
async def get_report_summary(
    days: int = 30,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> ReportSummaryResponse:
    business_id = await get_user_first_business_id(db, current_user.id)
    summary = await copilot_service.generate_report_summary(db, business_id=business_id, days=days)
    return summary


@router.post(
    "/explain",
    response_model=ExplainResponse,
    status_code=status.HTTP_200_OK,
    summary="Get plain language explanation for specific metrics or recommendations",
    description="Explains why specific order quantities, stockout risks, or clearance actions are suggested for a product."
)
async def explain_metric(
    payload: ExplainRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> ExplainResponse:
    business_id = await get_user_first_business_id(db, current_user.id)
    explanation = await copilot_service.explain_metric(
        db=db,
        business_id=business_id,
        topic=payload.topic,
        item_id=payload.item_id
    )
    return explanation


@router.post(
    "/business-summary",
    status_code=status.HTTP_200_OK,
    summary="Get AI summary of registered business profile",
    description="Returns structured summary of gathered store profile parameters."
)
async def get_business_summary(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, str]:
    business_id = await get_user_first_business_id(db, current_user.id)
    business = await BusinessService.get_business_by_id(db, business_id=business_id)
    if not business:
        raise HTTPException(status_code=404, detail="Business not found.")

    summary_text = f"Business: {business.business_name} ({business.business_type}). Registered profile is active and synced with database analytics."
    return {"business_name": business.business_name, "summary": summary_text}


@router.post(
    "/parse-command",
    response_model=ParseCommandResponse,
    status_code=status.HTTP_200_OK,
    summary="Parse and execute natural language inventory command",
    description="Converts natural text ('I sold 12 Coke bottles', 'Add 40 Milk packets') into structured JSON, validates product availability in PostgreSQL, and executes stock update in a database transaction."
)
async def parse_and_execute_inventory_command(
    payload: ParseCommandRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> ParseCommandResponse:
    business_id = await get_user_first_business_id(db, current_user.id)
    result = await command_parser_service.parse_and_execute_command(
        db=db,
        business_id=business_id,
        command_text=payload.command_text
    )
    return result


@router.get(
    "/health",
    status_code=status.HTTP_200_OK,
    summary="AI Engine Health Status",
    description="Returns Groq API connectivity status and model configuration."
)
async def ai_health_check() -> Dict[str, Any]:
    configured = groq_service.is_configured()
    return {
        "status": "healthy",
        "provider": "Groq",
        "groq_api_configured": configured,
        "model": groq_service.model
    }
