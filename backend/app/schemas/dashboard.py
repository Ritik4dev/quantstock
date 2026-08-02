from typing import Dict, List, Optional
from pydantic import BaseModel, Field, ConfigDict


class InventoryHealthBreakdown(BaseModel):
    """Breakdown of inventory counts by status."""
    healthy_count: int = 0
    low_stock_count: int = 0
    out_of_stock_count: int = 0
    overstock_count: int = 0
    expired_count: int = 0
    expiring_soon_count: int = 0


class DashboardCardsResponse(BaseModel):
    """
    Primary dashboard metric cards calculated strictly from PostgreSQL.
    If no data exists, all values return 0 or empty structures.
    """
    total_products: int = 0
    total_inventory_value_cost: float = 0.0
    total_inventory_value_retail: float = 0.0
    todays_sales: float = 0.0
    weekly_sales: float = 0.0
    monthly_sales: float = 0.0
    total_revenue: float = 0.0
    total_profit: float = 0.0
    total_suppliers: int = 0
    products_running_low: int = 0
    products_expiring: int = 0
    inventory_health: InventoryHealthBreakdown = Field(default_factory=InventoryHealthBreakdown)


class DashboardSummaryResponse(BaseModel):
    """
    Comprehensive dashboard response including cards, top low stock items, and recent sales.
    """
    cards: DashboardCardsResponse
    low_stock_alerts: List[Dict] = Field(default_factory=list)
    expiring_alerts: List[Dict] = Field(default_factory=list)
    recent_transactions: List[Dict] = Field(default_factory=list)


class SpoilageRiskItem(BaseModel):
    """XGBoost Spoilage Classifier output for an expiring product."""
    product_id: int
    product_name: str
    sku: str
    expiry_date: str
    days_until_expiry: int
    current_stock: int
    buying_price: float
    potential_loss: float
    spoilage_risk_pct: float
    recommended_discount_pct: int
    recommendation_text: str


class HourlyFootfallPrediction(BaseModel):
    """XGBoost Hourly Store Footfall & Busy-Hours Predictor output."""
    peak_hours_window: str
    predicted_surge_pct: float
    recommended_staffing: int
    weather_impact: str
    insight_text: str
    has_sufficient_data: bool = True


class SmartInsightsResponse(BaseModel):
    """Container response for XGBoost Spoilage Classifier & XGBoost Footfall Predictor."""
    spoilage_risks: List[SpoilageRiskItem] = Field(default_factory=list)
    footfall_prediction: Optional[HourlyFootfallPrediction] = None


class InventoryCapacityMetric(BaseModel):
    """Total Inventory Capacity Utilization across all zones/warehouses."""
    total_occupied_units: int
    total_capacity_units: int
    utilization_pct: float
    status: str
    zone_breakdown: List[Dict[str, str | int | float]] = Field(default_factory=list)


class ShortestRunwayItem(BaseModel):
    """Product with short inventory runway estimate."""
    product_id: int
    product_name: str
    sku: str
    current_stock: int
    daily_velocity: float
    days_remaining: int
    status: str


class StockRunwayMetric(BaseModel):
    """Stock Lasting (Runway Estimate) Metric across database inputs."""
    overall_days_remaining: int
    daily_burn_rate_units: float
    total_current_stock: int
    shortest_runway_items: List[ShortestRunwayItem] = Field(default_factory=list)


class ItemStockSuggestion(BaseModel):
    """Item-Level Stock Intelligence suggestion for an individual product."""
    product_id: int
    product_name: str
    sku: str
    current_stock: int
    minimum_stock: int
    maximum_stock: int
    sales_velocity_daily: float
    action_type: str  # RESTOCK_RECOMMENDED, OVERSTOCK_ALERT, CLEARANCE_DISCOUNT, HEALTHY
    suggested_order_qty: int
    lead_time_days: int
    supplier_name: Optional[str] = None
    insight_text: str
