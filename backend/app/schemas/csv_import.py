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


class CSVPreviewResponse(BaseModel):
    """Response returned after initial CSV upload and validation."""
    filename: str
    total_rows: int
    valid_rows_count: int
    invalid_rows_count: int
    column_mapping: ColumnMapping
    detected_headers: List[str]
    preview_data: List[Dict[str, Any]]
    validation_errors: List[CSVRowValidationError]
    is_ready_for_import: bool


class CSVConfirmRequest(BaseModel):
    """Request payload to commit CSV import preview data to PostgreSQL."""
    filename: str
    column_mapping: ColumnMapping
    confirm: bool = Field(True, description="Must be true to trigger database transaction")


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
