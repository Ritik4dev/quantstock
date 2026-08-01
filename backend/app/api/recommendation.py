import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.database.models import User
from app.database.session import get_db
from app.schemas.recommendation import ProductRecommendationItem, RecommendationOverviewResponse
from app.services.business_service import BusinessService
from app.services.recommendation_service import RecommendationService

logger = logging.getLogger("app.api.recommendation")
router = APIRouter(prefix="/recommendations", tags=["Inventory Recommendation Engine"])

rec_service = RecommendationService()


async def get_user_first_business_id(db: AsyncSession, user_id: int) -> int:
    businesses = await BusinessService.get_user_businesses(db, owner_id=user_id)
    if not businesses:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No registered business found for user. Please create a business first."
        )
    return businesses[0].id


@router.get(
    "",
    response_model=RecommendationOverviewResponse,
    status_code=status.HTTP_200_OK,
    summary="Get system-wide inventory recommendations",
    description="Returns reorder quantities, clearance items, safety stocks, and stockout risk evaluations computed via deterministic rules & ML demand."
)
async def get_all_recommendations(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> RecommendationOverviewResponse:
    business_id = await get_user_first_business_id(db, current_user.id)
    recs = await rec_service.get_all_recommendations(db, business_id=business_id)
    return recs


@router.get(
    "/product/{product_id}",
    response_model=ProductRecommendationItem,
    status_code=status.HTTP_200_OK,
    summary="Get recommendations for a specific product",
    description="Returns reorder quantity, safety stock, lead time, stockout risk, overstock risk, and clearance suggestions for a single product."
)
async def get_product_recommendation(
    product_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> ProductRecommendationItem:
    business_id = await get_user_first_business_id(db, current_user.id)
    rec = await rec_service.get_product_recommendation(db, business_id=business_id, product_id=product_id)
    if not rec:
        raise HTTPException(status_code=404, detail="Product not found.")
    return rec
