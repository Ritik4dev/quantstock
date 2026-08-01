import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.database.models import User
from app.database.session import get_db
from app.schemas.forecast import ForecastOverviewResponse, ProductForecastResponse, WeeklyForecastDay
from app.services.business_service import BusinessService
from app.services.forecast_service import ForecastService

logger = logging.getLogger("app.api.forecast")
router = APIRouter(prefix="/forecast", tags=["ML Demand Forecasting Engine"])

forecast_service = ForecastService()


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
    response_model=ForecastOverviewResponse,
    status_code=status.HTTP_200_OK,
    summary="Get system-wide demand forecast overview",
    description="Returns XGBoost ML demand predictions for 1, 3, 7, 14, and 30 day horizons across all products."
)
async def get_all_forecasts(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> ForecastOverviewResponse:
    business_id = await get_user_first_business_id(db, current_user.id)
    overview = await forecast_service.predict_all_products_forecast(db, business_id=business_id)
    return overview


@router.get(
    "/product/{product_id}",
    response_model=ProductForecastResponse,
    status_code=status.HTTP_200_OK,
    summary="Get demand forecast for a specific product",
    description="Returns multi-horizon demand predictions, confidence score, and feature impact analysis for a product."
)
async def get_product_forecast(
    product_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> ProductForecastResponse:
    business_id = await get_user_first_business_id(db, current_user.id)
    forecast = await forecast_service.predict_product_forecast(db, business_id=business_id, product_id=product_id)
    if not forecast:
        raise HTTPException(status_code=404, detail="Product not found.")
    return forecast


@router.get(
    "/week",
    response_model=List[WeeklyForecastDay],
    status_code=status.HTTP_200_OK,
    summary="Get weekly demand forecast breakdown",
    description="Returns aggregated daily demand predictions for the next 7 days including weather and holiday multipliers."
)
async def get_weekly_forecast_breakdown(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> List[WeeklyForecastDay]:
    business_id = await get_user_first_business_id(db, current_user.id)
    overview = await forecast_service.predict_all_products_forecast(db, business_id=business_id)

    # Aggregate weekly breakdown across all products
    if not overview.product_forecasts:
        return []

    first_prod = overview.product_forecasts[0]
    aggregated_days = []

    for day_idx in range(len(first_prod.weekly_breakdown)):
        base_day = first_prod.weekly_breakdown[day_idx]
        total_day_demand = sum(p.weekly_breakdown[day_idx].predicted_demand for p in overview.product_forecasts if day_idx < len(p.weekly_breakdown))

        aggregated_days.append(WeeklyForecastDay(
            day_name=base_day.day_name,
            date=base_day.date,
            predicted_demand=round(total_day_demand, 2),
            is_weekend=base_day.is_weekend,
            is_holiday=base_day.is_holiday,
            holiday_name=base_day.holiday_name,
            weather_summary=base_day.weather_summary
        ))

    return aggregated_days
