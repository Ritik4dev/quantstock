import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.database.models import User
from app.database.session import get_db
from app.schemas.dashboard import (
    DashboardCardsResponse,
    DashboardSummaryResponse,
    InventoryCapacityMetric,
    ItemStockSuggestion,
    SmartInsightsResponse,
    StockRunwayMetric,
)
from app.services.business_service import BusinessService
from app.services.dashboard_service import DashboardService
from app.services.smart_intelligence_service import SmartIntelligenceService

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


@router.get(
    "/capacity",
    response_model=InventoryCapacityMetric,
    status_code=status.HTTP_200_OK,
    summary="Get Total Inventory Capacity utilization widget metrics",
    description="Calculates current occupied stock vs total maximum capacity limits dynamically from PostgreSQL."
)
async def get_inventory_capacity(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> InventoryCapacityMetric:
    business_id = await get_user_first_business_id(db, current_user.id)
    return await DashboardService.get_inventory_capacity(db, business_id=business_id)


@router.get(
    "/runway",
    response_model=StockRunwayMetric,
    status_code=status.HTTP_200_OK,
    summary="Get Stock Lasting Runway Estimate widget metrics",
    description="Predicts estimated time remaining before stock runs out based on historical sales velocity."
)
async def get_stock_runway(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> StockRunwayMetric:
    business_id = await get_user_first_business_id(db, current_user.id)
    return await DashboardService.get_stock_runway(db, business_id=business_id)


@router.get(
    "/suggestions",
    response_model=List[ItemStockSuggestion],
    status_code=status.HTTP_200_OK,
    summary="Get Item-Level Stock Intelligence suggestions",
    description="Calculates dynamic restocking suggestions positioned directly above every individual product."
)
async def get_item_stock_suggestions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> List[ItemStockSuggestion]:
    business_id = await get_user_first_business_id(db, current_user.id)
    return await DashboardService.get_item_stock_suggestions(db, business_id=business_id)


@router.get(
    "/smart-insights",
    response_model=SmartInsightsResponse,
    status_code=status.HTTP_200_OK,
    summary="Get XGBoost Spoilage Classifier & Footfall Predictor insights",
    description="Runs XGBoost Classifier for per-item spoilage waste risk and XGBoost Regressor for hourly store traffic predictions."
)
async def get_smart_insights(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> SmartInsightsResponse:
    business_id = await get_user_first_business_id(db, current_user.id)
    return await SmartIntelligenceService.get_smart_insights(db, business_id=business_id)
