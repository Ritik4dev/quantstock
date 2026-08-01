from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict
from app.schemas.product import ProductResponse
from app.schemas.supplier import SupplierResponse


class InventoryBase(BaseModel):
    """Base fields for Inventory schema."""
    current_stock: int = Field(0, ge=0, description="Current physical stock count")
    minimum_stock: int = Field(5, ge=0, description="Minimum reorder threshold")
    maximum_stock: int = Field(100, ge=0, description="Maximum capacity threshold")
    buying_price: float = Field(0.0, ge=0.0, description="Unit cost/buying price")
    selling_price: float = Field(0.0, ge=0.0, description="Unit retail/selling price")
    expiry_date: Optional[datetime] = Field(None, description="Expiration date")


class InventoryCreate(InventoryBase):
    """Schema for creating an inventory item for a product."""
    product_id: int = Field(..., description="ID of associated product")
    supplier_id: Optional[int] = Field(None, description="ID of associated supplier")


class InventoryUpdate(BaseModel):
    """Schema for updating an inventory item."""
    current_stock: Optional[int] = Field(None, ge=0)
    minimum_stock: Optional[int] = Field(None, ge=0)
    maximum_stock: Optional[int] = Field(None, ge=0)
    buying_price: Optional[float] = Field(None, ge=0.0)
    selling_price: Optional[float] = Field(None, ge=0.0)
    supplier_id: Optional[int] = Field(None)
    expiry_date: Optional[datetime] = Field(None)


class InventoryResponse(InventoryBase):
    """Schema for returning full inventory details including product and supplier models."""
    id: int
    business_id: int
    product_id: int
    supplier_id: Optional[int] = None
    status: str = Field(..., description="Calculated status: Healthy, Low Stock, Out Of Stock, Overstock, Expired, Expiring Soon")
    created_at: datetime
    updated_at: datetime
    product: Optional[ProductResponse] = None
    supplier: Optional[SupplierResponse] = None

    model_config = ConfigDict(from_attributes=True)
