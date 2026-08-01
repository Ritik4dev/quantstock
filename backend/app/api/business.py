import logging
from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.database.models import User
from app.database.session import get_db
from app.schemas.business import (
    BusinessCreate,
    BusinessProfileResponse,
    BusinessProfileUpdate,
    BusinessResponse,
)
from app.services.business_service import BusinessService

logger = logging.getLogger("app.api.business")
router = APIRouter(prefix="/business", tags=["Business Management"])


@router.post(
    "",
    response_model=BusinessResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new business",
    description="Registers a new retail business owned by the authenticated user."
)
async def create_business(
    business_in: BusinessCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> BusinessResponse:
    """
    Create business record.
    """
    logger.info(f"User {current_user.id} creating business: '{business_in.business_name}'")
    business = await BusinessService.create_business(
        db, owner_id=current_user.id, business_in=business_in
    )
    return business


@router.get(
    "",
    response_model=List[BusinessResponse],
    status_code=status.HTTP_200_OK,
    summary="Get all businesses owned by current user",
    description="Retrieves a list of businesses owned by the current user along with profiles."
)
async def get_businesses(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> List[BusinessResponse]:
    """
    Retrieve user businesses.
    """
    businesses = await BusinessService.get_user_businesses(db, owner_id=current_user.id)
    return businesses


@router.get(
    "/{business_id}",
    response_model=BusinessResponse,
    status_code=status.HTTP_200_OK,
    summary="Get business details by ID",
    description="Retrieves specific business profile by ID for the current owner."
)
async def get_business_by_id(
    business_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> BusinessResponse:
    """
    Retrieve business by ID.
    """
    business = await BusinessService.get_business_by_id(
        db, business_id=business_id, owner_id=current_user.id
    )
    return business


@router.put(
    "/{business_id}/profile",
    response_model=BusinessProfileResponse,
    status_code=status.HTTP_200_OK,
    summary="Update business profile attributes",
    description="Updates operational and profile parameters for a specific business."
)
async def update_business_profile(
    business_id: int,
    profile_in: BusinessProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> BusinessProfileResponse:
    """
    Update business profile fields.
    """
    profile = await BusinessService.update_business_profile(
        db, business_id=business_id, owner_id=current_user.id, profile_in=profile_in
    )
    return profile


@router.delete(
    "/{business_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete a business",
    description="Deletes a business entry and associated profile from PostgreSQL."
)
async def delete_business(
    business_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Delete business entry.
    """
    await BusinessService.delete_business(
        db, business_id=business_id, owner_id=current_user.id
    )
    return {"message": f"Business ID {business_id} successfully deleted."}
