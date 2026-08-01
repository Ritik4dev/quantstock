from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, ConfigDict


class SalesTrendPoint(BaseModel):
    """Sales & revenue trend over a time period."""
    period: str
    sales_count: int
    revenue: float
    profit: float


class ProductPerformanceItem(BaseModel):
    """Product sales velocity & ranking item."""
    product_id: int
    name: str
    sku: str
    total_quantity_sold: int
    total_revenue: float
    total_profit: float
    current_stock: int
    status: str


class CategoryDistributionItem(BaseModel):
    """Inventory & revenue breakdown by category."""
    category: str
    product_count: int
    total_stock: int
    inventory_value: float


class AnalyticsOverviewResponse(BaseModel):
    """Comprehensive analytics breakdown generated strictly from PostgreSQL SQL."""
    daily_sales: List[SalesTrendPoint] = Field(default_factory=list)
    weekly_sales: List[SalesTrendPoint] = Field(default_factory=list)
    monthly_sales: List[SalesTrendPoint] = Field(default_factory=list)
    total_revenue: float = 0.0
    total_profit: float = 0.0
    total_inventory_value: float = 0.0
    best_sellers: List[ProductPerformanceItem] = Field(default_factory=list)
    worst_sellers: List[ProductPerformanceItem] = Field(default_factory=list)
    fast_moving_products: List[ProductPerformanceItem] = Field(default_factory=list)
    slow_moving_products: List[ProductPerformanceItem] = Field(default_factory=list)
    category_distribution: List[CategoryDistributionItem] = Field(default_factory=list)


class RevenueAnalyticsResponse(BaseModel):
    """Revenue & Profit trend analytics."""
    total_revenue: float = 0.0
    total_profit: float = 0.0
    sales_trends: List[SalesTrendPoint] = Field(default_factory=list)


class ProductAnalyticsResponse(BaseModel):
    """Product performance rankings and category breakdowns."""
    best_sellers: List[ProductPerformanceItem] = Field(default_factory=list)
    worst_sellers: List[ProductPerformanceItem] = Field(default_factory=list)
    category_distribution: List[CategoryDistributionItem] = Field(default_factory=list)
