import logging
from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.models import Business, BusinessProfile
from app.schemas.business import BusinessCreate, BusinessProfileUpdate
from app.schemas.ai_discovery import ExtractedProfile
from app.utils.exceptions import BusinessAccessDeniedException, BusinessNotFoundException

logger = logging.getLogger("app.services.business")


class BusinessService:
    """Service for managing Business and BusinessProfile database persistence."""

    @staticmethod
    async def create_business(
        db: AsyncSession, owner_id: int, business_in: BusinessCreate
    ) -> Business:
        """
        Create a new business record for the authenticated owner.
        """
        new_business = Business(
            owner_id=owner_id,
            business_name=business_in.business_name,
            business_type=business_in.business_type
        )

        db.add(new_business)
        await db.commit()

        logger.info(f"Business created. Owner ID: {owner_id}")
        return await BusinessService.get_business_by_id(db, business_id=new_business.id, owner_id=owner_id)

    @staticmethod
    async def get_user_businesses(
        db: AsyncSession, owner_id: int
    ) -> List[Business]:
        """
        Retrieve all businesses owned by the given user, eager loading profile.
        """
        query = (
            select(Business)
            .where(Business.owner_id == owner_id)
            .options(selectinload(Business.profile))
            .order_by(Business.created_at.desc())
        )
        result = await db.execute(query)
        return result.scalars().all()

    @staticmethod
    async def get_business_by_id(
        db: AsyncSession, business_id: int, owner_id: Optional[int] = None
    ) -> Business:
        """
        Retrieve a specific business by ID, ensuring ownership validation if owner_id provided.
        """
        query = (
            select(Business)
            .where(Business.id == business_id)
            .options(selectinload(Business.profile))
        )
        result = await db.execute(query)
        business = result.scalar_one_or_none()

        if not business:
            raise BusinessNotFoundException(f"Business with ID {business_id} not found.")

        if owner_id is not None and business.owner_id != owner_id:
            raise BusinessAccessDeniedException()

        return business

    @staticmethod
    async def save_confirmed_profile(
        db: AsyncSession,
        business_id: int,
        owner_id: int,
        profile_data: ExtractedProfile
    ) -> BusinessProfile:
        """
        Create or update a BusinessProfile once AI Discovery details are confirmed by user.
        """
        # Ensure business exists & belongs to user
        business = await BusinessService.get_business_by_id(db, business_id=business_id, owner_id=owner_id)

        # Check if profile already exists
        query = select(BusinessProfile).where(BusinessProfile.business_id == business_id)
        result = await db.execute(query)
        profile = result.scalar_one_or_none()

        if not profile:
            profile = BusinessProfile(business_id=business_id)
            db.add(profile)

        # Map attributes from extracted profile
        profile.location_type = profile_data.location_type
        profile.nearby_places = profile_data.nearby_places
        profile.primary_customers = profile_data.primary_customers
        profile.daily_customers = str(profile_data.daily_customers) if profile_data.daily_customers is not None else None
        profile.employees = str(profile_data.employees) if profile_data.employees is not None else None
        profile.supplier_count = str(profile_data.supplier_count) if profile_data.supplier_count is not None else None
        profile.seasonality = profile_data.seasonality
        profile.top_products = profile_data.top_products
        profile.business_scale = profile_data.business_scale
        profile.notes = profile_data.notes

        # Also update business_type on parent business if extracted
        if profile_data.business_type:
            business.business_type = profile_data.business_type

        await db.commit()
        await db.refresh(profile)

        logger.info(f"Saved confirmed profile for Business ID: {business_id}")
        return profile

    @staticmethod
    async def update_business_profile(
        db: AsyncSession,
        business_id: int,
        owner_id: int,
        profile_in: BusinessProfileUpdate
    ) -> BusinessProfile:
        """
        Directly update attributes of a business profile.
        """
        # Verify ownership
        await BusinessService.get_business_by_id(db, business_id=business_id, owner_id=owner_id)

        query = select(BusinessProfile).where(BusinessProfile.business_id == business_id)
        result = await db.execute(query)
        profile = result.scalar_one_or_none()

        if not profile:
            profile = BusinessProfile(business_id=business_id)
            db.add(profile)

        update_data = profile_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(profile, field, value)

        await db.commit()
        await db.refresh(profile)

        logger.info(f"Updated profile for Business ID: {business_id}")
        return profile

    @staticmethod
    async def delete_business(
        db: AsyncSession, business_id: int, owner_id: int
    ) -> bool:
        """
        Delete a business and associated profile.
        """
        business = await BusinessService.get_business_by_id(db, business_id=business_id, owner_id=owner_id)
        await db.delete(business)
        await db.commit()
        logger.info(f"Deleted Business ID: {business_id} for Owner ID: {owner_id}")
        return True
