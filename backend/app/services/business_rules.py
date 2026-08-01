import math
import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional

logger = logging.getLogger("app.services.business_rules")


class BusinessRulesEngine:
    """
    Deterministic Business Rule Engine evaluating inventory thresholds,
    supplier lead times, safety stocks, reorder points, and clearance triggers.
    """

    DEFAULT_LEAD_TIME_DAYS = 3

    @classmethod
    def evaluate_inventory_rules(
        cls,
        current_stock: int,
        forecast_1d: float,
        forecast_3d: float,
        forecast_7d: float,
        forecast_14d: float,
        forecast_30d: float,
        buying_price: float,
        selling_price: float,
        expiry_date: Optional[datetime] = None,
        lead_time_days: int = DEFAULT_LEAD_TIME_DAYS
    ) -> Dict[str, Any]:
        """
        Evaluates deterministic rules and returns calculated order quantity, safety stock, and risk statuses.
        """
        daily_demand = max(0.1, forecast_1d)

        # 1. Safety Stock Formula: z * sigma_L (Safety factor = 1.5, Lead time buffer)
        safety_stock = int(math.ceil(math.sqrt(lead_time_days) * daily_demand * 1.5))

        # 2. Reorder Trigger Level (R = d * L + SS)
        reorder_threshold = int(math.ceil((daily_demand * lead_time_days) + safety_stock))

        # 3. Recommended Order Quantity
        if current_stock <= reorder_threshold:
            target_stock = int(math.ceil(forecast_30d + safety_stock))
            recommended_order_qty = max(0, target_stock - current_stock)
        else:
            recommended_order_qty = 0

        # 4. Stockout Risk Evaluation
        if current_stock == 0 or current_stock < forecast_3d:
            stockout_risk = "High"
        elif current_stock < forecast_7d:
            stockout_risk = "Medium"
        else:
            stockout_risk = "Low"

        # 5. Overstock Risk Evaluation
        if forecast_30d > 0 and current_stock >= (forecast_30d * 2.0) and current_stock > 10:
            overstock_risk = "High"
        elif forecast_30d > 0 and current_stock >= (forecast_30d * 1.5):
            overstock_risk = "Medium"
        else:
            overstock_risk = "Low"

        # 6. Expiry Risk Evaluation
        now = datetime.now(timezone.utc)
        expiry_risk = "Low"
        days_to_expiry = None

        if expiry_date is not None:
            if expiry_date.tzinfo is None:
                expiry_date = expiry_date.replace(tzinfo=timezone.utc)
            days_to_expiry = (expiry_date - now).days

            if days_to_expiry <= 0:
                expiry_risk = "High"
            elif days_to_expiry <= 14 and current_stock > forecast_7d:
                expiry_risk = "High"
            elif days_to_expiry <= 30 and current_stock > forecast_14d:
                expiry_risk = "Medium"

        # 7. Dead Stock Evaluation
        dead_stock_risk = "Low"
        if forecast_30d < 0.5 and current_stock > 5:
            dead_stock_risk = "High"

        # 8. Action Type & Reasoning Determination
        if stockout_risk in ["High", "Medium"] or recommended_order_qty > 0:
            action_type = "Reorder"
            action_reason = f"Current stock ({current_stock}) is below reorder threshold ({reorder_threshold}) for {lead_time_days}-day lead time."
        elif expiry_risk == "High":
            action_type = "Clearance"
            action_reason = f"Product expires in {days_to_expiry if days_to_expiry is not None else 0} days with {current_stock} unsold units."
        elif dead_stock_risk == "High":
            action_type = "Clearance"
            action_reason = f"Zero/low sales velocity over 30 days with {current_stock} units holding capital."
        elif overstock_risk == "High":
            action_type = "Reduce Order"
            action_reason = f"Current stock ({current_stock}) exceeds 2x predicted 30-day demand ({forecast_30d})."
        else:
            action_type = "Maintain"
            action_reason = "Stock level is healthy and aligned with forecasted demand."

        return {
            "recommended_order_quantity": recommended_order_qty,
            "reorder_threshold": reorder_threshold,
            "safety_stock": safety_stock,
            "supplier_lead_time_days": lead_time_days,
            "stockout_risk": stockout_risk,
            "overstock_risk": overstock_risk,
            "expiry_risk": expiry_risk,
            "dead_stock_risk": dead_stock_risk,
            "action_type": action_type,
            "action_reason": action_reason
        }
