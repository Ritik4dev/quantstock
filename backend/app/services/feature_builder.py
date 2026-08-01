import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
import numpy as np
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.models import Business, BusinessProfile, Inventory, Product, Sale
from app.services.holiday_service import HolidayService
from app.services.weather_service import WeatherService

logger = logging.getLogger("app.services.feature_builder")


class FeatureBuilder:
    """
    Feature Engineering Engine extracting calendar, weather, sales lags, rolling averages,
    and business context attributes into normalized feature matrices for ML models.
    """

    @classmethod
    async def build_product_feature_vector(
        cls,
        db: AsyncSession,
        business_id: int,
        product_id: int,
        target_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """
        Builds a complete feature vector for a specific product and target date.
        """
        if target_date is None:
            target_date = datetime.now(timezone.utc)

        # 1. Calendar Features
        holiday_info = HolidayService.get_holiday_info(target_date)
        day_of_week = target_date.weekday()
        month = target_date.month
        week_number = target_date.isocalendar()[1]
        is_weekend = 1 if holiday_info["is_weekend"] else 0
        is_holiday = 1 if holiday_info["is_holiday"] else 0

        # 2. Weather Features
        weather_info = await WeatherService.get_current_and_forecast_weather()
        temperature = weather_info.get("temperature", 25.0)
        rain_probability = weather_info.get("rain_probability", 10.0)
        humidity = weather_info.get("humidity", 50.0)
        weather_code = weather_info.get("weather_code", 0)

        # 3. Product & Inventory Attributes
        p_query = (
            select(Product, Inventory)
            .join(Inventory, Product.id == Inventory.product_id, isouter=True)
            .where(Product.business_id == business_id, Product.id == product_id)
        )
        res = await db.execute(p_query)
        row = res.first()

        current_stock = 0
        buying_price = 0.0
        selling_price = 0.0
        margin = 0.0

        if row and row[1]:
            inv = row[1]
            current_stock = inv.current_stock
            buying_price = inv.buying_price
            selling_price = inv.selling_price
            margin = round(selling_price - buying_price, 2)

        # 4. Historical Sales Lag & Rolling Window Features
        sales_30d_query = (
            select(Sale.sale_date, Sale.quantity)
            .where(
                Sale.business_id == business_id,
                Sale.product_id == product_id,
                Sale.sale_date >= (target_date - timedelta(days=30))
            )
            .order_by(Sale.sale_date.asc())
        )
        sales_res = await db.execute(sales_30d_query)
        sales_rows = sales_res.all()

        daily_quantities = {}
        for s_date, qty in sales_rows:
            d_key = s_date.date()
            daily_quantities[d_key] = daily_quantities.get(d_key, 0) + qty

        # Fill 30-day series
        series_30d = []
        for d in range(1, 31):
            check_d = (target_date - timedelta(days=d)).date()
            series_30d.append(daily_quantities.get(check_d, 0))

        lag_1d = series_30d[0] if len(series_30d) > 0 else 0
        lag_7d = series_30d[6] if len(series_30d) > 6 else 0
        lag_30d = series_30d[29] if len(series_30d) > 29 else 0

        arr_7d = np.array(series_30d[:7]) if len(series_30d) >= 7 else np.array([0])
        arr_30d = np.array(series_30d) if len(series_30d) > 0 else np.array([0])

        rolling_avg_7d = float(np.mean(arr_7d))
        rolling_avg_30d = float(np.mean(arr_30d))
        rolling_median_7d = float(np.median(arr_7d))
        rolling_std_7d = float(np.std(arr_7d))

        features = {
            "day_of_week": day_of_week,
            "month": month,
            "week_number": week_number,
            "is_weekend": is_weekend,
            "is_holiday": is_holiday,
            "temperature": temperature,
            "rain_probability": rain_probability,
            "humidity": humidity,
            "weather_code": weather_code,
            "current_stock": current_stock,
            "buying_price": buying_price,
            "selling_price": selling_price,
            "margin": margin,
            "lag_1d": lag_1d,
            "lag_7d": lag_7d,
            "lag_30d": lag_30d,
            "rolling_avg_7d": round(rolling_avg_7d, 2),
            "rolling_avg_30d": round(rolling_avg_30d, 2),
            "rolling_median_7d": round(rolling_median_7d, 2),
            "rolling_std_7d": round(rolling_std_7d, 2)
        }

        logger.debug(f"Constructed feature vector for Product {product_id}: {features}")
        return features

    @classmethod
    def convert_features_to_array(cls, feature_dict: Dict[str, Any]) -> np.ndarray:
        """Converts feature dictionary into numeric numpy array for ML model prediction."""
        ordered_keys = [
            "day_of_week", "month", "week_number", "is_weekend", "is_holiday",
            "temperature", "rain_probability", "humidity", "weather_code",
            "current_stock", "buying_price", "selling_price", "margin",
            "lag_1d", "lag_7d", "lag_30d", "rolling_avg_7d", "rolling_avg_30d",
            "rolling_median_7d", "rolling_std_7d"
        ]
        values = [float(feature_dict.get(k, 0.0)) for k in ordered_keys]
        return np.array(values).reshape(1, -1)
