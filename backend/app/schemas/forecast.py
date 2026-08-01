from typing import Dict, List, Optional
from pydantic import BaseModel, Field, ConfigDict


class WeeklyForecastDay(BaseModel):
    """Daily forecast breakdown within a week."""
    day_name: str
    date: str
    predicted_demand: float
    is_weekend: bool
    is_holiday: bool
    holiday_name: Optional[str] = None
    weather_summary: Optional[str] = None


class ProductForecastResponse(BaseModel):
    """Product-specific multi-horizon demand forecast output."""
    product_id: int
    product_name: str
    sku: str
    current_stock: int
    forecast_1d: float = Field(..., description="Predicted demand for next 24 hours")
    forecast_3d: float = Field(..., description="Predicted demand for next 3 days")
    forecast_7d: float = Field(..., description="Predicted demand for next 7 days")
    forecast_14d: float = Field(..., description="Predicted demand for next 14 days")
    forecast_30d: float = Field(..., description="Predicted demand for next 30 days")
    confidence_score: float = Field(..., description="Forecast confidence percentage (0-100%)")
    daily_avg_demand: float = Field(..., description="Average daily velocity")
    weekly_breakdown: List[WeeklyForecastDay] = Field(default_factory=list)
    key_factors: List[str] = Field(default_factory=list, description="Extracted feature impacts e.g. Weekend surge, Rain impact")


class ForecastOverviewResponse(BaseModel):
    """System-wide demand forecast summary."""
    total_products_forecasted: int
    total_7d_predicted_units: float
    total_30d_predicted_units: float
    average_confidence_score: float
    product_forecasts: List[ProductForecastResponse]
