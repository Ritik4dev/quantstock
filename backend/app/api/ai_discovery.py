import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.database.models import User
from app.database.session import get_db
from app.schemas.ai_discovery import (
    ConfirmDiscoveryRequest,
    DiscoveryInput,
    DiscoveryResponse,
)
from app.schemas.business import BusinessProfileResponse
from app.services.ai_service import AIService
from app.services.business_service import BusinessService

logger = logging.getLogger("app.api.ai_discovery")
router = APIRouter(prefix="/ai", tags=["AI Business Discovery Engine"])

ai_service = AIService()


@router.post(
    "/interview",
    response_model=DiscoveryResponse,
    status_code=status.HTTP_200_OK,
    summary="Process AI Discovery interview step",
    description=(
        "Processes freeform natural language text from store owner, extracts structured attributes using Groq, "
        "identifies missing fields, and generates targeted follow-up questions."
    )
)
async def discovery_interview(
    input_data: DiscoveryInput,
    current_user: User = Depends(get_current_user)
) -> DiscoveryResponse:
    """
    Core AI Discovery Interview Flow.
    """
    logger.info(f"User {current_user.id} starting/continuing AI discovery interview.")

    # Step 1: Structured Extraction via Groq
    extracted_profile = await ai_service.extract_business_information(
        user_input=input_data.user_input,
        existing_profile=input_data.existing_profile
    )

    # Step 2: Detect Missing Required Fields
    missing_fields = ai_service.find_missing_fields(extracted_profile)

    # Step 3: Branch - Follow-up questions vs Final Confirmation Summary
    if missing_fields:
        logger.info(f"Missing fields detected: {missing_fields}. Generating targeted follow-up questions.")
        followup_questions = await ai_service.generate_followup_questions(missing_fields)
        return DiscoveryResponse(
            extracted_profile=extracted_profile,
            missing_fields=missing_fields,
            followup_questions=followup_questions,
            confirmation_summary=None,
            is_complete=False
        )

    logger.info("All required fields gathered. Generating final confirmation summary.")
    confirmation_summary = await ai_service.generate_confirmation_summary(extracted_profile)
    return DiscoveryResponse(
        extracted_profile=extracted_profile,
        missing_fields=[],
        followup_questions=[],
        confirmation_summary=confirmation_summary,
        is_complete=True
    )


@router.post(
    "/confirm",
    response_model=BusinessProfileResponse,
    status_code=status.HTTP_200_OK,
    summary="Confirm and persist extracted Business Profile to PostgreSQL",
    description="Saves the confirmed structured business profile attributes directly into PostgreSQL."
)
async def confirm_discovery(
    request: ConfirmDiscoveryRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> BusinessProfileResponse:
    """
    Persist confirmed AI Discovery business profile into database.
    """
    if not request.confirmed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Confirmation set to false. Business profile was not persisted."
        )

    logger.info(f"User {current_user.id} confirming discovery for Business ID {request.business_id}.")
    profile = await BusinessService.save_confirmed_profile(
        db,
        business_id=request.business_id,
        owner_id=current_user.id,
        profile_data=request.confirmed_profile
    )
    return profile


@router.get(
    "/analysis-summary",
    status_code=status.HTTP_200_OK,
    summary="Get 100% Grounded Store Intelligence Audit & Analysis Report",
    description="Computes zero-hallucination store history analysis directly from PostgreSQL database records."
)
async def get_store_analysis_summary(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Computes zero-hallucination analysis strictly from database records.
    """
    from sqlalchemy import select, func
    from app.database.models import Business, BusinessProfile, Product, Inventory, Sale, Supplier

    businesses = await BusinessService.get_user_businesses(db, owner_id=current_user.id)
    if not businesses:
        return {
            "has_data": False,
            "message": "No business registered yet. Please complete onboarding.",
        }

    b_id = businesses[0].id
    business_obj = businesses[0]

    # Fetch Profile
    p_stmt = select(BusinessProfile).where(BusinessProfile.business_id == b_id)
    p_res = await db.execute(p_stmt)
    prof = p_res.scalar_one_or_none()

    # Query Products & Inventory Metrics
    p_stmt = select(func.count(Product.id)).where(Product.business_id == b_id)
    p_count = (await db.execute(p_stmt)).scalar() or 0

    inv_stmt = select(
        func.coalesce(func.sum(Inventory.current_stock), 0),
        func.coalesce(func.sum(Inventory.current_stock * Inventory.selling_price), 0.0),
        func.coalesce(func.sum(Inventory.current_stock * Inventory.buying_price), 0.0),
    ).where(Inventory.business_id == b_id)
    inv_row = (await db.execute(inv_stmt)).fetchone()
    total_units = inv_row[0] if inv_row else 0
    total_retail_val = float(inv_row[1]) if inv_row else 0.0
    total_cost_val = float(inv_row[2]) if inv_row else 0.0

    # Query Sales History
    sale_stmt = select(
        func.count(Sale.id),
        func.coalesce(func.sum(Sale.total_amount), 0.0)
    ).where(Sale.business_id == b_id)
    sale_row = (await db.execute(sale_stmt)).fetchone()
    total_sales_count = sale_row[0] if sale_row else 0
    total_sales_revenue = float(sale_row[1]) if sale_row else 0.0

    # Query Suppliers Count
    sup_stmt = select(func.count(Supplier.id)).where(Supplier.business_id == b_id)
    sup_count = (await db.execute(sup_stmt)).scalar() or 0

    return {
        "has_data": True,
        "business": {
            "id": business_obj.id,
            "name": business_obj.business_name,
            "type": business_obj.business_type or "Not Specified",
            "owner": current_user.name,
            "email": current_user.email,
        },
        "profile_attributes": {
            "business_type": prof.business_type if prof else "Not Disclosed",
            "location_type": prof.location_type if prof else "Not Disclosed",
            "primary_customers": prof.primary_customers if prof and prof.primary_customers else ["Not Disclosed"],
            "daily_customers": prof.daily_customers if prof else "Not Disclosed",
            "employees": prof.employees if prof else "Not Disclosed",
            "seasonality": prof.seasonality if prof else "Not Disclosed",
            "business_scale": prof.business_scale if prof else "Not Disclosed",
        },
        "grounded_inventory_metrics": {
            "total_skus": p_count,
            "total_stock_units": total_units,
            "total_retail_valuation": round(total_retail_val, 2),
            "total_cost_valuation": round(total_cost_val, 2),
            "supplier_count": sup_count,
        },
        "grounded_sales_metrics": {
            "total_recorded_sales_orders": total_sales_count,
            "total_recorded_revenue": round(total_sales_revenue, 2),
            "sales_data_status": "Verified from Sales DB" if total_sales_count > 0 else "No Sales Recorded Yet (Not Disclosed)",
        },
    }
