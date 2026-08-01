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
