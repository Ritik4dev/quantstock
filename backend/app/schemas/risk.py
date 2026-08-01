from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict


class RiskAlertItem(BaseModel):
    """High-priority risk alert item."""
    product_id: int
    product_name: str
    sku: str
    risk_type: str = Field(..., description="Stockout, Overstock, Expiry, Dead Stock, Supplier Delay")
    severity: str = Field(..., description="High, Medium, Low")
    description: str
    suggested_action: str


class RiskScorecardResponse(BaseModel):
    """
    Comprehensive business risk scorecard generated strictly from database metrics & forecast calculations.
    """
    overall_business_risk_score: float = Field(..., description="Risk index from 0 (Perfect) to 100 (Critical)")
    inventory_health_score: float = Field(..., description="Inventory health index from 0 to 100")
    forecast_confidence_score: float = Field(..., description="Overall ML forecast confidence percentage")
    stockout_risk_count: int
    overstock_risk_count: int
    expiry_risk_count: int
    dead_stock_risk_count: int
    active_risk_alerts: List[RiskAlertItem] = Field(default_factory=list)
