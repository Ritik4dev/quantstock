import logging
from abc import ABC, abstractmethod
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional
import numpy as np
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

import xgboost as xgb
from app.database.models import Inventory, Product, Sale
from app.schemas.forecast import (
    ForecastOverviewResponse,
    ProductForecastResponse,
    WeeklyForecastDay,
)
from app.services.feature_builder import FeatureBuilder
from app.services.holiday_service import HolidayService
from app.services.weather_service import WeatherService

logger = logging.getLogger("app.services.forecast")


class BasePredictionModel(ABC):
    """
    Abstract interface for demand prediction models.
    Allows replacing or upgrading the underlying ML algorithm (XGBoost, LightGBM, Prophet)
    without modifying API endpoints or service signatures.
    """

    @abstractmethod
    def predict_daily_demand(self, feature_matrix: np.ndarray) -> float:
        """Returns predicted daily demand units for a given feature matrix."""
        pass


class XGBoostPredictionModel(BasePredictionModel):
    """
    XGBoost Regressor model implementation for retail demand forecasting.
    """

    def __init__(self):
        # Initialize pretrained / default XGBoost Regressor hyperparameters
        self.model = xgb.XGBRegressor(
            n_estimators=100,
            learning_rate=0.05,
            max_depth=5,
            subsample=0.8,
            colsample_bytree=0.8,
            random_state=42
        )
        self.is_fitted = False

    def fit_sample_data(self, X: np.ndarray, y: np.ndarray):
        """Fit model on historical sales features."""
        if len(X) > 2:
            self.model.fit(X, y)
            self.is_fitted = True

    def predict_daily_demand(self, feature_matrix: np.ndarray) -> float:
        """
        Predicts daily demand units using XGBoost if fitted, or feature-weighted regression.
        """
        if self.is_fitted:
            pred = float(self.model.predict(feature_matrix)[0])
            return max(0.0, pred)

        # Baseline weighted feature inference when historical train samples < 2
        # Matrix columns: [..., rolling_avg_7d (index 16), rolling_avg_30d (17), is_weekend (3), is_holiday (4)]
        r_avg_7d = feature_matrix[0][16]
        r_avg_30d = feature_matrix[0][17]
        is_weekend = feature_matrix[0][3]
        is_holiday = feature_matrix[0][4]

        base_velocity = r_avg_7d if r_avg_7d > 0 else (r_avg_30d if r_avg_30d > 0 else 1.0)
        multiplier = 1.0
        if is_weekend:
            multiplier += 0.25
        if is_holiday:
            multiplier += 0.35

        return round(float(base_velocity * multiplier), 2)


class ForecastService:
    """
    Forecast Engine executing ML demand predictions across 1-day, 3-day, 7-day, 14-day,
    and 30-day time horizons, calculating confidence scores and daily breakdowns.
    """

    def __init__(self, model: Optional[BasePredictionModel] = None):
        self.model = model if model else XGBoostPredictionModel()

    async def predict_product_forecast(
        self, db: AsyncSession, business_id: int, product_id: int
    ) -> Optional[ProductForecastResponse]:
        """
        Generates 1d, 3d, 7d, 14d, 30d demand forecast for a single product.
        """
        # Fetch Product & Inventory
        p_query = (
            select(Product)
            .where(Product.id == product_id, Product.business_id == business_id)
            .options(selectinload(Product.inventory))
        )
        res = await db.execute(p_query)
        product = res.scalar_one_or_none()

        if not product:
            return None

        current_stock = product.inventory.current_stock if product.inventory else 0

        # Build feature vector for current state
        now = datetime.now(timezone.utc)
        features_dict = await FeatureBuilder.build_product_feature_vector(db, business_id, product_id, now)
        feature_matrix = FeatureBuilder.convert_features_to_array(features_dict)

        # Base daily demand prediction
        base_daily_pred = self.model.predict_daily_demand(feature_matrix)

        # Build 7-day daily breakdown & key factors
        weekly_breakdown: List[WeeklyForecastDay] = []
        tot_7d = 0.0
        key_factors = []

        weather_info = await WeatherService.get_current_and_forecast_weather()

        for day_offset in range(7):
            future_date = now + timedelta(days=day_offset)
            h_info = HolidayService.get_holiday_info(future_date)
            
            day_mult = 1.0
            if h_info["is_weekend"]:
                day_mult *= 1.25
                if "Weekend surge" not in key_factors:
                    key_factors.append("Weekend surge (+25% volume)")
            if h_info["is_holiday"]:
                day_mult *= 1.35
                if f"Holiday: {h_info['holiday_name']}" not in key_factors:
                    key_factors.append(f"Holiday: {h_info['holiday_name']} (+35% volume)")

            if weather_info.get("rain_probability", 0) > 60:
                day_mult *= 0.85
                if "Rain impact" not in key_factors:
                    key_factors.append("Rain impact (-15% footfall)")

            day_pred = round(base_daily_pred * day_mult, 2)
            tot_7d += day_pred

            weekly_breakdown.append(WeeklyForecastDay(
                day_name=future_date.strftime("%a"),
                date=future_date.strftime("%Y-%m-%d"),
                predicted_demand=day_pred,
                is_weekend=h_info["is_weekend"],
                is_holiday=h_info["is_holiday"],
                holiday_name=h_info["holiday_name"],
                weather_summary=weather_info.get("weather_type", "Normal")
            ))

        # Multi-horizon forecast scaling
        forecast_1d = round(base_daily_pred, 2)
        forecast_3d = round(base_daily_pred * 3.0, 2)
        forecast_7d = round(tot_7d, 2)
        forecast_14d = round(base_daily_pred * 14.0, 2)
        forecast_30d = round(base_daily_pred * 30.0, 2)

        # Dynamic confidence score based on historical data availability
        rolling_std = features_dict.get("rolling_std_7d", 0.0)
        rolling_avg = features_dict.get("rolling_avg_7d", 1.0)
        
        if rolling_avg > 0:
            coef_var = min(1.0, rolling_std / rolling_avg)
            confidence = round(max(60.0, min(95.0, 95.0 - (coef_var * 30.0))), 1)
        else:
            confidence = 75.0

        if not key_factors:
            key_factors.append("Stable baseline demand pattern")

        return ProductForecastResponse(
            product_id=product.id,
            product_name=product.name,
            sku=product.sku,
            current_stock=current_stock,
            forecast_1d=forecast_1d,
            forecast_3d=forecast_3d,
            forecast_7d=forecast_7d,
            forecast_14d=forecast_14d,
            forecast_30d=forecast_30d,
            confidence_score=confidence,
            daily_avg_demand=round(base_daily_pred, 2),
            weekly_breakdown=weekly_breakdown,
            key_factors=key_factors
        )

    async def predict_all_products_forecast(
        self, db: AsyncSession, business_id: int
    ) -> ForecastOverviewResponse:
        """
        Generates system-wide demand forecasts across all products.
        """
        p_query = select(Product.id).where(Product.business_id == business_id)
        p_res = await db.execute(p_query)
        product_ids = p_res.scalars().all()

        forecasts: List[ProductForecastResponse] = []
        tot_7d = 0.0
        tot_30d = 0.0
        conf_sum = 0.0

        for pid in product_ids:
            fc = await self.predict_product_forecast(db, business_id, pid)
            if fc:
                forecasts.append(fc)
                tot_7d += fc.forecast_7d
                tot_30d += fc.forecast_30d
                conf_sum += fc.confidence_score

        avg_conf = round(conf_sum / len(forecasts), 1) if forecasts else 0.0

        return ForecastOverviewResponse(
            total_products_forecasted=len(forecasts),
            total_7d_predicted_units=round(tot_7d, 2),
            total_30d_predicted_units=round(tot_30d, 2),
            average_confidence_score=avg_conf,
            product_forecasts=forecasts
        )
