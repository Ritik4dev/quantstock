from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict


class ProductRecommendationItem(BaseModel):
    """
    Actionable inventory recommendation for a single product computed via deterministic rules.
    """
    product_id: int
    product_name: str
    sku: str
    current_stock: int
    buying_price: float
    selling_price: float
    recommended_order_quantity: int = Field(..., description="Suggested reorder quantity")
    reorder_threshold: int = Field(..., description="Minimum stock trigger level")
    safety_stock: int = Field(..., description="Calculated safety stock buffer")
    supplier_lead_time_days: int = Field(..., description="Estimated vendor delivery lead time in days")
    supplier_name: Optional[str] = "Unassigned"
    stockout_risk: str = Field(..., description="High, Medium, or Low")
    overstock_risk: str = Field(..., description="High, Medium, or Low")
    expiry_risk: str = Field(..., description="High, Medium, or Low")
    dead_stock_risk: str = Field(..., description="High, Medium, or Low")
    action_type: str = Field(..., description="Reorder, Clearance, Maintain, Reduce Order")
    action_reason: str = Field(..., description="Calculated justification")


class RecommendationOverviewResponse(BaseModel):
    """System-wide recommendations summary."""
    total_recommended_reorder_units: int
    total_estimated_reorder_cost: float
    high_priority_reorders_count: int
    clearance_items_count: int
    recommendations: List[ProductRecommendationItem]
