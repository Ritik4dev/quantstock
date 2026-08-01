import logging
from datetime import datetime, date, timezone
from typing import Dict, Any, Optional
import holidays

logger = logging.getLogger("app.services.holiday")


class HolidayService:
    """
    Holiday Engine integrating python 'holidays' library.
    Detects Public Holidays, Regional Festivals, Weekends, and High-Traffic Event Periods.
    """

    _country_holidays: Optional[Dict] = None

    @classmethod
    def get_holiday_info(cls, target_date: Optional[datetime] = None, country_code: str = "IN") -> Dict[str, Any]:
        """
        Determines holiday status for a given date.
        """
        if target_date is None:
            target_date = datetime.now(timezone.utc)

        date_obj = target_date.date() if isinstance(target_date, datetime) else target_date

        try:
            if cls._country_holidays is None:
                cls._country_holidays = holidays.country_holidays(country_code)

            holiday_name = cls._country_holidays.get(date_obj)
            is_holiday = holiday_name is not None
            is_weekend = date_obj.weekday() >= 5  # 5=Saturday, 6=Sunday

            return {
                "date": date_obj.isoformat(),
                "is_holiday": is_holiday,
                "holiday_name": holiday_name,
                "is_weekend": is_weekend,
                "day_of_week": date_obj.strftime("%A"),
                "is_high_traffic_day": is_holiday or is_weekend
            }
        except Exception as e:
            logger.warning(f"Holiday lookup failed ({e}). Returning fallback calendar info.")
            is_weekend = date_obj.weekday() >= 5
            return {
                "date": date_obj.isoformat(),
                "is_holiday": False,
                "holiday_name": None,
                "is_weekend": is_weekend,
                "day_of_week": date_obj.strftime("%A"),
                "is_high_traffic_day": is_weekend
            }
