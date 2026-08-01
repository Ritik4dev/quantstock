from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict


class ExtractedProfile(BaseModel):
    """
    Structured response model used by Groq AI Service to extract business attributes.
    Every field is Optional so missing attributes can be set to None.
    """
    business_type: Optional[str] = Field(
        None, description="Category or industry of the business e.g. Grocery Store, Bakery, Apparel"
    )
    location_type: Optional[str] = Field(
        None, description="Physical location context e.g. Near college campus, Downtown, Shopping mall"
    )
    nearby_places: Optional[List[str]] = Field(
        default_factory=list, description="Landmarks or places near the store e.g. University, Bus Stop"
    )
    primary_customers: Optional[List[str]] = Field(
        default_factory=list, description="Target customer demographics e.g. College students, Office workers"
    )
    daily_customers: Optional[str] = Field(
        None, description="Estimated average number of daily visitors or footfall count e.g. 150"
    )
    top_products: Optional[List[str]] = Field(
        default_factory=list, description="Best-selling items or main inventory categories e.g. Cold drinks, Maggi, Snacks"
    )
    employees: Optional[str] = Field(
        None, description="Staff size or number of employees e.g. 3 employees"
    )
    supplier_count: Optional[str] = Field(
        None, description="Number of wholesale suppliers or vendors e.g. 5 suppliers"
    )
    seasonality: Optional[str] = Field(
        None, description="Seasonal sales patterns e.g. High in winter, Stable year-round"
    )
    business_scale: Optional[str] = Field(
        None, description="Scale of operation e.g. Small retail shop, Medium supermarket"
    )
    notes: Optional[str] = Field(
        None, description="Any extra business background information provided"
    )


class DiscoveryInput(BaseModel):
    """
    Payload sent by user during the AI Discovery conversation.
    """
    user_input: str = Field(..., min_length=1, description="Natural language description from the user")
    existing_profile: Optional[ExtractedProfile] = Field(
        None, description="Profile data accumulated from previous interview steps, if any"
    )


class DiscoveryResponse(BaseModel):
    """
    Output returned after processing user input through the AI Discovery engine.
    """
    extracted_profile: ExtractedProfile
    missing_fields: List[str] = Field(..., description="List of profile fields still missing")
    followup_questions: List[str] = Field(..., description="Targeted follow-up questions for missing fields only")
    confirmation_summary: Optional[str] = Field(
        None, description="Formatted summary of all business details ready for final user confirmation"
    )
    is_complete: bool = Field(
        ..., description="True if all required fields are collected and confirmation summary is prepared"
    )


class ConfirmDiscoveryRequest(BaseModel):
    """
    Payload to confirm and persist the AI discovered business profile into PostgreSQL.
    """
    business_id: int = Field(..., description="ID of the business to associate this profile with")
    confirmed_profile: ExtractedProfile = Field(..., description="Final confirmed business profile attributes")
    confirmed: bool = Field(..., description="Must be true to persist profile to database")
