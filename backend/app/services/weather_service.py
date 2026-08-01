import logging
import time
from typing import Dict, Any, Optional
import httpx

logger = logging.getLogger("app.services.weather")

# In-memory cache for weather data (TTL: 1 hour)
_weather_cache: Dict[str, Any] = {}
_cache_timestamp: float = 0.0
CACHE_TTL_SECONDS = 3600


class WeatherService:
    """
    Service for integrating real weather data from Open-Meteo REST API.
    Provides temperature, rain probability, humidity, and weather conditions.
    Includes in-memory TTL caching.
    """

    DEFAULT_LAT = 28.6139  # Delhi / Default retail hub latitude
    DEFAULT_LON = 77.2090  # Default longitude

    @classmethod
    async def get_current_and_forecast_weather(
        cls, latitude: float = DEFAULT_LAT, longitude: float = DEFAULT_LON
    ) -> Dict[str, Any]:
        """
        Fetches current weather and 7-day weather forecast from Open-Meteo REST API.
        Uses cached responses if within TTL.
        """
        global _weather_cache, _cache_timestamp
        now = time.time()

        if _weather_cache and (now - _cache_timestamp) < CACHE_TTL_SECONDS:
            logger.debug("Returning cached weather response.")
            return _weather_cache

        url = (
            f"https://api.open-meteo.com/v1/forecast?"
            f"latitude={latitude}&longitude={longitude}&"
            f"current=temperature_2m,relative_humidity_2m,precipitation,weather_code&"
            f"daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code&"
            f"timezone=auto"
        )

        try:
            async with httpx.AsyncClient(timeout=4.0) as client:
                res = await client.get(url)
                if res.status_code == 200:
                    data = res.json()
                    current = data.get("current", {})
                    daily = data.get("daily", {})

                    weather_data = {
                        "temperature": current.get("temperature_2m", 25.0),
                        "humidity": current.get("relative_humidity_2m", 50.0),
                        "rain_probability": (
                            daily.get("precipitation_probability_max", [10])[0]
                            if daily.get("precipitation_probability_max") else 0.0
                        ),
                        "weather_code": current.get("weather_code", 0),
                        "weather_type": cls._interpret_weather_code(current.get("weather_code", 0)),
                        "daily_forecast": daily
                    }

                    _weather_cache = weather_data
                    _cache_timestamp = now
                    logger.info("Successfully fetched and cached fresh weather data from Open-Meteo API.")
                    return weather_data
        except Exception as e:
            logger.warning(f"Could not reach external Weather API ({e}). Returning standard baseline weather values.")

        # Default fallback values if offline
        fallback = {
            "temperature": 25.0,
            "humidity": 55.0,
            "rain_probability": 10.0,
            "weather_code": 0,
            "weather_type": "Clear / Mild",
            "daily_forecast": {}
        }
        return fallback

    @staticmethod
    def _interpret_weather_code(code: int) -> str:
        """Converts WMO weather code to human-readable string."""
        if code == 0:
            return "Clear sky"
        elif code in [1, 2, 3]:
            return "Partly Cloudy"
        elif code in [45, 48]:
            return "Foggy"
        elif code in [51, 53, 55, 61, 63, 65]:
            return "Rainy"
        elif code in [71, 73, 75, 77]:
            return "Snow"
        elif code in [80, 81, 82]:
            return "Heavy Rain Showers"
        elif code in [95, 96, 99]:
            return "Thunderstorm"
        return "Normal"
