import logging
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.risk import RiskAlertItem, RiskScorecardResponse
from app.services.forecast_service import ForecastService
from app.services.recommendation_service import RecommendationService

logger = logging.getLogger("app.services.risk")


class RiskEngine:
    """
    Risk Engine evaluating overall business risk scorecard, inventory health,
    stockout risk, dead stock risk, and active priority alerts.
    """

    def __init__(
        self,
        recommendation_service: Optional[RecommendationService] = None,
        forecast_service: Optional[ForecastService] = None
    ):
        self.recommendation_service = recommendation_service if recommendation_service else RecommendationService()
        self.forecast_service = forecast_service if forecast_service else ForecastService()

    async def get_risk_scorecard(
        self, db: AsyncSession, business_id: int
    ) -> RiskScorecardResponse:
        """
        Calculates risk scorecard metrics purely from PostgreSQL database items and ML recommendations.
        """
        recs_response = await self.recommendation_service.get_all_recommendations(db, business_id)
        fc_response = await self.forecast_service.predict_all_products_forecast(db, business_id)

        recommendations = recs_response.recommendations
        total_products = len(recommendations)

        if total_products == 0:
            return RiskScorecardResponse(
                overall_business_risk_score=0.0,
                inventory_health_score=100.0,
                forecast_confidence_score=fc_response.average_confidence_score or 90.0,
                stockout_risk_count=0,
                overstock_risk_count=0,
                expiry_risk_count=0,
                dead_stock_risk_count=0,
                active_risk_alerts=[]
            )

        stockout_count = 0
        overstock_count = 0
        expiry_count = 0
        dead_stock_count = 0
        alerts: List[RiskAlertItem] = []

        for r in recommendations:
            if r.stockout_risk in ["High", "Medium"]:
                stockout_count += 1
                if r.stockout_risk == "High":
                    alerts.append(RiskAlertItem(
                        product_id=r.product_id,
                        product_name=r.product_name,
                        sku=r.sku,
                        risk_type="Stockout Risk",
                        severity="High",
                        description=f"Current stock ({r.current_stock}) is insufficient for expected 3-day demand.",
                        suggested_action=f"Order {r.recommended_order_quantity} units immediately from {r.supplier_name}."
                    ))

            if r.overstock_risk in ["High", "Medium"]:
                overstock_count += 1
                if r.overstock_risk == "High":
                    alerts.append(RiskAlertItem(
                        product_id=r.product_id,
                        product_name=r.product_name,
                        sku=r.sku,
                        risk_type="Overstock Risk",
                        severity="High",
                        description=f"Current stock ({r.current_stock}) exceeds 2x predicted 30-day demand.",
                        suggested_action="Pause reordering and run promotional discount."
                    ))

            if r.expiry_risk in ["High", "Medium"]:
                expiry_count += 1
                if r.expiry_risk == "High":
                    alerts.append(RiskAlertItem(
                        product_id=r.product_id,
                        product_name=r.product_name,
                        sku=r.sku,
                        risk_type="Expiry Risk",
                        severity="High",
                        description=f"Product stock ({r.current_stock} units) is near expiration date with slow clearance.",
                        suggested_action="Initiate immediate clearance discount."
                    ))

            if r.dead_stock_risk == "High":
                dead_stock_count += 1
                alerts.append(RiskAlertItem(
                    product_id=r.product_id,
                    product_name=r.product_name,
                    sku=r.sku,
                    risk_type="Dead Stock",
                    severity="Medium",
                    description=f"No sales recorded in 30 days while holding {r.current_stock} units in inventory.",
                    suggested_action="Bundle item with fast-moving products to clear stock."
                ))

        # Risk Index Calculations (0-100)
        risk_penalty = (
            (stockout_count * 25.0) +
            (expiry_count * 20.0) +
            (dead_stock_count * 15.0) +
            (overstock_count * 10.0)
        ) / total_products

        overall_business_risk = round(min(100.0, max(0.0, risk_penalty * 2.0)), 1)
        inventory_health = round(max(0.0, 100.0 - overall_business_risk), 1)

        return RiskScorecardResponse(
            overall_business_risk_score=overall_business_risk,
            inventory_health_score=inventory_health,
            forecast_confidence_score=fc_response.average_confidence_score,
            stockout_risk_count=stockout_count,
            overstock_risk_count=overstock_count,
            expiry_risk_count=expiry_count,
            dead_stock_risk_count=dead_stock_count,
            active_risk_alerts=alerts
        )
