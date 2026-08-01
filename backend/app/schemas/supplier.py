from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict, EmailStr


class SupplierBase(BaseModel):
    """Base fields for Supplier schema."""
    name: str = Field(..., min_length=1, max_length=255, description="Supplier or vendor name")
    contact_person: Optional[str] = Field(None, max_length=255)
    email: Optional[EmailStr] = Field(None, description="Supplier contact email")
    phone: Optional[str] = Field(None, max_length=50)
    address: Optional[str] = Field(None)


class SupplierCreate(SupplierBase):
    """Schema for creating a supplier."""
    pass


class SupplierUpdate(BaseModel):
    """Schema for updating a supplier."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    contact_person: Optional[str] = Field(None, max_length=255)
    email: Optional[EmailStr] = Field(None)
    phone: Optional[str] = Field(None, max_length=50)
    address: Optional[str] = Field(None)


class SupplierResponse(SupplierBase):
    """Schema for returning supplier data."""
    id: int
    business_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
