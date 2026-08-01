import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.database.models import User
from app.database.session import get_db
from app.schemas.dashboard import DashboardCardsResponse, DashboardSummaryResponse
from app.services.business_service import BusinessService
from app.services.dashboard_service import DashboardService

logger = logging.getLogger("app.api.dashboard")
router = APIRouter(prefix="/dashboard", tags=["Dashboard Engine"])


async def get_user_first_business_id(db: AsyncSession, user_id: int) -> int:
    businesses = await BusinessService.get_user_businesses(db, owner_id=user_id)
    if not businesses:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No registered business found for user. Please create a business first."
        )
    return businesses[0].id


@router.get(
    "",
    response_model=DashboardCardsResponse,
    status_code=status.HTTP_200_OK,
    summary="Get real-time dashboard cards",
    description="Returns metric cards (Total Products, Inventory Value, Today's Sales, Revenue, Profit, Health Breakdown) computed dynamically from PostgreSQL."
)
async def get_dashboard_cards(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> DashboardCardsResponse:
    business_id = await get_user_first_business_id(db, current_user.id)
    cards = await DashboardService.get_dashboard_cards(db, business_id=business_id)
    return cards


@router.get(
    "/summary",
    response_model=DashboardSummaryResponse,
    status_code=status.HTTP_200_OK,
    summary="Get full dashboard summary",
    description="Returns dashboard cards along with low stock alerts, expiring product warnings, and recent transaction logs."
)
async def get_dashboard_summary(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> DashboardSummaryResponse:
    business_id = await get_user_first_business_id(db, current_user.id)
    summary = await DashboardService.get_dashboard_summary(db, business_id=business_id)
    return summary
