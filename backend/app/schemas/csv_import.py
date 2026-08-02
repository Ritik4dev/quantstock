from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, ConfigDict


class ColumnMapping(BaseModel):
    """Detected or mapped column names."""
    product_name_col: Optional[str] = None
    sku_col: Optional[str] = None
    category_col: Optional[str] = None
    stock_col: Optional[str] = None
    sold_col: Optional[str] = None
    buying_price_col: Optional[str] = None
    selling_price_col: Optional[str] = None
    expiry_col: Optional[str] = None
    supplier_col: Optional[str] = None


class CSVRowValidationError(BaseModel):
    """Details of validation error for a specific row."""
    row_number: int
    raw_data: Dict[str, Any]
    error_messages: List[str]


class ExtractedProductItem(BaseModel):
    """Standardized entity extracted from any document format (CSV, Excel, PDF, Image, TXT)."""
    product_name: str
    sku: Optional[str] = None
    category: Optional[str] = "General"
    quantity: int = 0
    buying_price: float = 0.0
    selling_price: float = 0.0
    expiry_date: Optional[str] = None
    supplier_name: Optional[str] = None
    # Additive preview stats
    existing_stock: int = 0
    new_total_stock: int = 0
    is_existing_product: bool = False


class CSVPreviewResponse(BaseModel):
    """Response returned after document upload, parsing, and AI extraction."""
    filename: str
    file_format: str = "CSV"
    total_rows: int
    valid_rows_count: int
    invalid_rows_count: int
    column_mapping: Optional[Any] = Field(default_factory=dict)
    detected_headers: List[str] = []
    preview_data: List[Dict[str, Any]] = []
    extracted_items: List[ExtractedProductItem] = []
    validation_errors: List[CSVRowValidationError] = []
    is_ready_for_import: bool = True

    # Missing Data & AI Clarification Flags
    requires_clarification: bool = False
    missing_fields_prompt: Optional[str] = None
    ask_expiry_date: bool = False
    clarification_questions: List[str] = []


class CSVConfirmRequest(BaseModel):
    """Request payload to commit document import preview data to PostgreSQL."""
    filename: str
    column_mapping: Optional[ColumnMapping] = None
    extracted_items: Optional[List[ExtractedProductItem]] = None
    confirm: bool = Field(True, description="Must be true to trigger database transaction")


class DocumentClarificationAnswer(BaseModel):
    """Answers submitted by user via AI clarification chat."""
    filename: str
    answers: Dict[str, Any]  # e.g., {"buying_price": 25.0, "has_expiry": False}
    extracted_items: List[ExtractedProductItem]


class ImportHistoryResponse(BaseModel):
    """Schema for import audit trail log."""
    id: int
    business_id: int
    user_id: int
    filename: str
    rows_imported: int
    rows_failed: int
    status: str
    error_details: Optional[Any] = None
    upload_time: datetime

    model_config = ConfigDict(from_attributes=True)


class LastUploadStatusResponse(BaseModel):
    """Schema for returning last document upload audit summary for UI banner."""
    has_uploaded: bool
    last_upload_time: Optional[datetime] = None
    filename: Optional[str] = None
    file_format: Optional[str] = None
    items_imported: int = 0
    items_failed: int = 0
    status: Optional[str] = None
