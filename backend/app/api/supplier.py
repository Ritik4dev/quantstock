import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.database.models import User
from app.database.session import get_db
from app.schemas.supplier import SupplierCreate, SupplierResponse, SupplierUpdate
from app.services.business_service import BusinessService
from app.services.supplier_service import SupplierService

logger = logging.getLogger("app.api.supplier")
router = APIRouter(prefix="/suppliers", tags=["Suppliers Management"])


async def get_user_first_business_id(db: AsyncSession, user_id: int) -> int:
    """Helper to retrieve user's default active business ID."""
    businesses = await BusinessService.get_user_businesses(db, owner_id=user_id)
    if not businesses:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No registered business found for user. Please create a business first."
        )
    return businesses[0].id


@router.post(
    "",
    response_model=SupplierResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add a new supplier",
    description="Registers a new supplier/vendor record for the user's business."
)
async def create_supplier(
    supplier_in: SupplierCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> SupplierResponse:
    business_id = await get_user_first_business_id(db, current_user.id)
    supplier = await SupplierService.create_supplier(db, business_id=business_id, supplier_in=supplier_in)
    return supplier


@router.get(
    "",
    response_model=List[SupplierResponse],
    status_code=status.HTTP_200_OK,
    summary="List all suppliers",
    description="Retrieves a list of suppliers for the user's business."
)
async def get_suppliers(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> List[SupplierResponse]:
    business_id = await get_user_first_business_id(db, current_user.id)
    suppliers = await SupplierService.get_suppliers(db, business_id=business_id)
    return suppliers


@router.put(
    "/{supplier_id}",
    response_model=SupplierResponse,
    status_code=status.HTTP_200_OK,
    summary="Update a supplier",
    description="Updates supplier contact details."
)
async def update_supplier(
    supplier_id: int,
    supplier_in: SupplierUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> SupplierResponse:
    business_id = await get_user_first_business_id(db, current_user.id)
    supplier = await SupplierService.update_supplier(db, business_id, supplier_id, supplier_in)
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found.")
    return supplier


@router.delete(
    "/{supplier_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete a supplier",
    description="Deletes a supplier entry."
)
async def delete_supplier(
    supplier_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    business_id = await get_user_first_business_id(db, current_user.id)
    success = await SupplierService.delete_supplier(db, business_id, supplier_id)
    if not success:
        raise HTTPException(status_code=404, detail="Supplier not found.")
    return {"message": f"Supplier ID {supplier_id} deleted successfully."}
