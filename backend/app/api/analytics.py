import logging
from typing import Dict, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.database.models import User
from app.database.session import get_db
from app.schemas.analytics import (
    AnalyticsOverviewResponse,
    ProductAnalyticsResponse,
    RevenueAnalyticsResponse,
)
from app.services.analytics_service import AnalyticsService
from app.services.business_context_service import BusinessContextService
from app.services.business_service import BusinessService

logger = logging.getLogger("app.api.analytics")
router = APIRouter(prefix="/analytics", tags=["Analytics & Business Context Engine"])


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
    response_model=AnalyticsOverviewResponse,
    status_code=status.HTTP_200_OK,
    summary="Get complete analytics overview",
    description="Returns daily/weekly/monthly sales trends, revenue, profit, best/worst sellers, and category breakdowns calculated from PostgreSQL."
)
async def get_analytics_overview(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> AnalyticsOverviewResponse:
    business_id = await get_user_first_business_id(db, current_user.id)
    analytics = await AnalyticsService.get_analytics_overview(db, business_id=business_id)
    return analytics


@router.get(
    "/revenue",
    response_model=RevenueAnalyticsResponse,
    status_code=status.HTTP_200_OK,
    summary="Get revenue & profit analytics",
    description="Returns total revenue, total profit, and sales trend points."
)
async def get_revenue_analytics(
    days: int = Query(30, description="Time range in days"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> RevenueAnalyticsResponse:
    business_id = await get_user_first_business_id(db, current_user.id)
    overview = await AnalyticsService.get_analytics_overview(db, business_id=business_id)
    trends = await AnalyticsService.get_sales_trends(db, business_id=business_id, days=days)
    return RevenueAnalyticsResponse(
        total_revenue=overview.total_revenue,
        total_profit=overview.total_profit,
        sales_trends=trends
    )


@router.get(
    "/products",
    response_model=ProductAnalyticsResponse,
    status_code=status.HTTP_200_OK,
    summary="Get product performance rankings",
    description="Returns best sellers, worst sellers, and category stock distributions."
)
async def get_product_analytics(
    limit: int = Query(10, description="Max number of ranked products"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> ProductAnalyticsResponse:
    business_id = await get_user_first_business_id(db, current_user.id)
    best_sellers = await AnalyticsService.get_product_rankings(db, business_id, limit=limit, ascending=False)
    worst_sellers = await AnalyticsService.get_product_rankings(db, business_id, limit=limit, ascending=True)
    category_dist = await AnalyticsService.get_category_distribution(db, business_id)
    return ProductAnalyticsResponse(
        best_sellers=best_sellers,
        worst_sellers=worst_sellers,
        category_distribution=category_dist
    )


@router.get(
    "/context",
    status_code=status.HTTP_200_OK,
    summary="Get target business context for AI",
    description="Retrieves tightly-scoped product inventory, sales velocity, supplier, and store metadata for target item queries."
)
async def get_business_context(
    query: str = Query(..., min_length=1, description="Target item query e.g. 'Milk', 'Maggi'"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Dict:
    business_id = await get_user_first_business_id(db, current_user.id)
    context_data = await BusinessContextService.get_item_context(db, business_id=business_id, item_query=query)
    return context_data
