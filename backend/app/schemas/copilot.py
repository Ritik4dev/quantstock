from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, ConfigDict


class ChatRequest(BaseModel):
    """Chat input payload."""
    message: str = Field(..., description="User question or prompt in natural language")
    session_id: Optional[str] = Field(default=None, description="Optional existing session ID for conversation continuity")


class ChatMessageSchema(BaseModel):
    """Schema for individual stored message."""
    role: str
    content: str
    intent: Optional[str] = None
    created_at: str


class ChatResponse(BaseModel):
    """Grounded AI Copilot response payload."""
    session_id: str
    message: str = Field(..., description="Grounded response answer")
    intent: str = Field(..., description="Detected business intent category")
    grounding_sources: List[str] = Field(default_factory=list, description="Backend services queried for ground truth")
    suggested_followups: List[str] = Field(default_factory=list, description="Relevant followup suggestions")


class ChatSessionHistoryResponse(BaseModel):
    """Chat session history overview."""
    session_id: str
    title: Optional[str] = None
    summary: Optional[str] = None
    messages: List[ChatMessageSchema] = Field(default_factory=list)


class SalesForecastSchema(BaseModel):
    expected_revenue_usd: float
    expected_order_count: int
    calculation_basis: str = "Based on 7-day rolling average with day-of-week weighting"


class InventoryAlertSchema(BaseModel):
    item_id: str
    item_name: str
    current_stock: int
    reorder_level: int
    action_required: str = "REORDER_IMMEDIATE"


class DailyBriefResponse(BaseModel):
    """Smart Executive Daily Brief response matching user system prompt specification."""
    greeting: str = "Good morning! Here is your daily operational summary."
    report_date: str
    sales_forecast: SalesForecastSchema
    inventory_alerts: List[InventoryAlertSchema] = Field(default_factory=list)
    business_opportunities: List[str] = Field(default_factory=list)
    business_summary: str


class ReportSummaryResponse(BaseModel):
    """Executive Report Summary response."""
    period: str
    total_revenue: float
    total_profit: float
    best_sellers: List[str]
    inventory_health_score: float
    executive_summary: str


class ExplainRequest(BaseModel):
    """Request payload to explain a metric or recommendation."""
    topic: str = Field(..., description="e.g. Stockout Risk, Reorder Quantity, Expiry Risk")
    item_id: Optional[int] = Field(default=None, description="Optional target product ID")
    context_data: Optional[Dict[str, Any]] = Field(default=None, description="Optional metric context dictionary")


class ExplainResponse(BaseModel):
    """Response payload for metric explanation."""
    topic: str
    explanation: str
    grounded_facts: Dict[str, Any]


class ParseCommandRequest(BaseModel):
    """Request payload for natural language inventory commands."""
    command_text: str = Field(..., description="e.g. 'I sold 12 Coke bottles', 'Add 40 Milk packets'")


class ParseCommandResponse(BaseModel):
    """Parsed and executed command output."""
    action: str = Field(..., description="sale, add_stock, remove_stock")
    product_name: str
    quantity: int
    executed: bool
    message: str
    product_id: Optional[int] = None
    updated_stock: Optional[int] = None
