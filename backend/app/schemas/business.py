from datetime import datetime
from typing import Any, List, Optional
from pydantic import BaseModel, Field, ConfigDict


class BusinessProfileBase(BaseModel):
    """Base business profile attributes."""
    location_type: Optional[str] = Field(None, description="Type of location e.g. Near a college, Mall, High street")
    nearby_places: Optional[List[str]] = Field(None, description="Nearby landmark places or institutions")
    primary_customers: Optional[List[str]] = Field(None, description="Target customer segments e.g. Students, Locals")
    daily_customers: Optional[str] = Field(None, description="Estimated average daily customer traffic")
    employees: Optional[str] = Field(None, description="Number of employees or workforce size")
    supplier_count: Optional[str] = Field(None, description="Number of suppliers")
    seasonality: Optional[str] = Field(None, description="Peak season or seasonality patterns")
    top_products: Optional[List[str]] = Field(None, description="Top selling products or categories")
    business_scale: Optional[str] = Field(None, description="Scale of operation e.g. Small, Medium, Micro")
    opening_time: Optional[str] = Field(None, description="Store opening time e.g. 09:00 AM")
    closing_time: Optional[str] = Field(None, description="Store closing time e.g. 09:00 PM")
    notes: Optional[str] = Field(None, description="Additional business discovery notes")


class BusinessProfileCreate(BusinessProfileBase):
    """Schema for creating a business profile."""
    pass


class BusinessProfileUpdate(BusinessProfileBase):
    """Schema for updating business profile attributes."""
    pass


class BusinessProfileResponse(BusinessProfileBase):
    """Schema for returning business profile responses."""
    id: int
    business_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class BusinessCreate(BaseModel):
    """Schema for creating a business entry."""
    business_name: str = Field(..., min_length=2, max_length=255, description="Name of the retail business")
    business_type: str = Field(..., min_length=2, max_length=255, description="Category/Type e.g. Grocery Store, Apparel")


class BusinessUpdate(BaseModel):
    """Schema for updating business entry basic info."""
    business_name: Optional[str] = Field(None, min_length=2, max_length=255)
    business_type: Optional[str] = Field(None, min_length=2, max_length=255)


class BusinessResponse(BaseModel):
    """Schema for returning full business response including optional profile."""
    id: int
    owner_id: int
    business_name: str
    business_type: str
    created_at: datetime
    updated_at: datetime
    profile: Optional[BusinessProfileResponse] = None

    model_config = ConfigDict(from_attributes=True)
