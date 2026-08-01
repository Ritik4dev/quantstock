import logging
from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.models import Inventory, Product, Supplier
from app.schemas.recommendation import ProductRecommendationItem, RecommendationOverviewResponse
from app.services.business_rules import BusinessRulesEngine
from app.services.forecast_service import ForecastService

logger = logging.getLogger("app.services.recommendation")


class RecommendationService:
    """
    Recommendation Engine generating reorder quantities, clearance suggestions,
    and risk mitigation actions combining Forecast ML outputs and Business Rules.
    """

    def __init__(self, forecast_service: Optional[ForecastService] = None):
        self.forecast_service = forecast_service if forecast_service else ForecastService()

    async def get_product_recommendation(
        self, db: AsyncSession, business_id: int, product_id: int
    ) -> Optional[ProductRecommendationItem]:
        """
        Calculates recommendation metrics for a single product.
        """
        # Fetch Product & Inventory & Supplier
        p_query = (
            select(Product)
            .where(Product.id == product_id, Product.business_id == business_id)
            .options(selectinload(Product.inventory), selectinload(Product.inventory).selectinload(Inventory.supplier))
        )
        res = await db.execute(p_query)
        product = res.scalar_one_or_none()

        if not product:
            return None

        inv = product.inventory
        current_stock = inv.current_stock if inv else 0
        buying_price = inv.buying_price if inv else 0.0
        selling_price = inv.selling_price if inv else 0.0
        expiry_date = inv.expiry_date if inv else None
        supplier_name = inv.supplier.name if inv and inv.supplier else "Unassigned"

        # Generate ML Forecast
        fc = await self.forecast_service.predict_product_forecast(db, business_id, product_id)
        
        f_1d = fc.forecast_1d if fc else 1.0
        f_3d = fc.forecast_3d if fc else 3.0
        f_7d = fc.forecast_7d if fc else 7.0
        f_14d = fc.forecast_14d if fc else 14.0
        f_30d = fc.forecast_30d if fc else 30.0

        # Evaluate Rules
        eval_result = BusinessRulesEngine.evaluate_inventory_rules(
            current_stock=current_stock,
            forecast_1d=f_1d,
            forecast_3d=f_3d,
            forecast_7d=f_7d,
            forecast_14d=f_14d,
            forecast_30d=f_30d,
            buying_price=buying_price,
            selling_price=selling_price,
            expiry_date=expiry_date,
            lead_time_days=3
        )

        return ProductRecommendationItem(
            product_id=product.id,
            product_name=product.name,
            sku=product.sku,
            current_stock=current_stock,
            buying_price=buying_price,
            selling_price=selling_price,
            recommended_order_quantity=eval_result["recommended_order_quantity"],
            reorder_threshold=eval_result["reorder_threshold"],
            safety_stock=eval_result["safety_stock"],
            supplier_lead_time_days=eval_result["supplier_lead_time_days"],
            supplier_name=supplier_name,
            stockout_risk=eval_result["stockout_risk"],
            overstock_risk=eval_result["overstock_risk"],
            expiry_risk=eval_result["expiry_risk"],
            dead_stock_risk=eval_result["dead_stock_risk"],
            action_type=eval_result["action_type"],
            action_reason=eval_result["action_reason"]
        )

    async def get_all_recommendations(
        self, db: AsyncSession, business_id: int
    ) -> RecommendationOverviewResponse:
        """
        Calculates system-wide inventory reorder and clearance recommendations across all products.
        """
        p_query = select(Product.id).where(Product.business_id == business_id)
        p_res = await db.execute(p_query)
        product_ids = p_res.scalars().all()

        recs: List[ProductRecommendationItem] = []
        total_units = 0
        total_cost = 0.0
        high_priority_count = 0
        clearance_count = 0

        for pid in product_ids:
            rec = await self.get_product_recommendation(db, business_id, pid)
            if rec:
                recs.append(rec)
                if rec.recommended_order_quantity > 0:
                    total_units += rec.recommended_order_quantity
                    total_cost += (rec.recommended_order_quantity * rec.buying_price)
                if rec.stockout_risk == "High" or rec.action_type == "Reorder":
                    high_priority_count += 1
                if rec.action_type == "Clearance":
                    clearance_count += 1

        return RecommendationOverviewResponse(
            total_recommended_reorder_units=total_units,
            total_estimated_reorder_cost=round(total_cost, 2),
            high_priority_reorders_count=high_priority_count,
            clearance_items_count=clearance_count,
            recommendations=recs
        )
