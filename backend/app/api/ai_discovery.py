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
