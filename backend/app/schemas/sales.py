from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, ConfigDict


class BarcodeScanRequest(BaseModel):
    """Payload to execute instant POS barcode / SKU checkout sale."""
    barcode_or_sku: str = Field(..., description="Scanned barcode, product SKU, or product ID string")
    quantity: int = Field(1, ge=1, description="Quantity of units being purchased")
    custom_unit_price: Optional[float] = Field(None, description="Optional custom selling price override")
    notes: Optional[str] = Field(None, description="Optional sale transaction notes")


class ManualSaleRequest(BaseModel):
    """Payload to record a manual sale transaction."""
    product_id: int
    quantity: int = Field(1, ge=1)
    unit_price: Optional[float] = None
    notes: Optional[str] = None


class POSCheckoutResponse(BaseModel):
    """Response returned after POS barcode checkout sale."""
    sale_id: int
    product_id: int
    product_name: str
    sku: str
    quantity_sold: int
    unit_price: float
    buying_price: float
    total_amount: float
    previous_stock: int
    remaining_stock: int
    stock_status: str
    sale_date: datetime
    weather_condition: Optional[str] = None
    is_holiday: bool = False


class ExtractedSaleLine(BaseModel):
    """Standardized sales transaction line extracted from uploaded sales document."""
    product_name: str
    sku: Optional[str] = None
    quantity_sold: int = 1
    unit_price: float = 0.0
    buying_price: float = 0.0
    total_amount: float = 0.0
    sale_date: Optional[str] = None


class SalesDocumentPreviewResponse(BaseModel):
    """Response returned after parsing multi-format sales file."""
    filename: str
    file_format: str
    total_sales_count: int
    extracted_sales: List[ExtractedSaleLine]
    total_revenue_preview: float
    is_ready_for_import: bool = True


class SalesConfirmRequest(BaseModel):
    """Request to commit preview sales lines to PostgreSQL and deduct inventory stock."""
    filename: str
    extracted_sales: Optional[List[Dict[str, Any]]] = None
    confirm: bool = Field(True, description="Must be true to commit transaction")


class ProductFinancialItem(BaseModel):
    """Per-product financial analytics comparing buying cost vs. selling price."""
    product_id: int
    name: str
    sku: str
    category: str
    units_sold: int
    buying_price: float
    selling_price: float
    total_revenue: float
    total_cost: float
    net_profit: float
    profit_margin_pct: float
    current_stock: int
    status: str


class ProductTrendPoint(BaseModel):
    """Daily/weekly revenue & profit trend point for an individual product."""
    date_label: str
    units_sold: int
    revenue: float
    profit: float
    margin_pct: float


class ProductSalesTrendResponse(BaseModel):
    """Individual product revenue & profit performance trend response."""
    product_id: int
    product_name: str
    sku: str
    days: int
    total_revenue: float
    total_profit: float
    total_units_sold: int
    avg_margin_pct: float
    trend_points: List[ProductTrendPoint]


class FinancialAnalyticsSummary(BaseModel):
    """Overall store financial analytics summary response."""
    total_revenue: float
    total_cost: float
    total_profit: float
    overall_profit_margin_pct: float
    total_units_sold: int
    total_inventory_value: float
    products: List[ProductFinancialItem]
