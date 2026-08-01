import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.database.models import User
from app.database.session import get_db
from app.schemas.risk import RiskScorecardResponse
from app.services.business_service import BusinessService
from app.services.risk_engine import RiskEngine

logger = logging.getLogger("app.api.risk")
router = APIRouter(prefix="/risk", tags=["Risk Scorecard & Intelligence Engine"])

risk_engine = RiskEngine()


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
    response_model=RiskScorecardResponse,
    status_code=status.HTTP_200_OK,
    summary="Get business risk scorecard and priority alerts",
    description="Returns dynamic overall business risk score (0-100), inventory health index, ML forecast confidence, and active priority risk alerts."
)
async def get_risk_scorecard(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> RiskScorecardResponse:
    business_id = await get_user_first_business_id(db, current_user.id)
    scorecard = await risk_engine.get_risk_scorecard(db, business_id=business_id)
    return scorecard
