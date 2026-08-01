import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.database.models import User
from app.database.session import get_db
from app.schemas.inventory import InventoryCreate, InventoryResponse, InventoryUpdate
from app.services.business_service import BusinessService
from app.services.inventory_service import InventoryService

logger = logging.getLogger("app.api.inventory")
router = APIRouter(prefix="/inventory", tags=["Inventory Management"])


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
    response_model=List[InventoryResponse],
    status_code=status.HTTP_200_OK,
    summary="Get all inventory stock items",
    description="Retrieves inventory items with dynamically calculated stock status."
)
async def get_inventory(
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status: Healthy, Low Stock, Out Of Stock, Overstock, Expired, Expiring Soon"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> List[InventoryResponse]:
    business_id = await get_user_first_business_id(db, current_user.id)
    items = await InventoryService.get_all_inventory(db, business_id=business_id, status_filter=status_filter)
    return items


@router.get(
    "/{inventory_id}",
    response_model=InventoryResponse,
    status_code=status.HTTP_200_OK,
    summary="Get inventory item details",
    description="Retrieves a single inventory item by ID."
)
async def get_inventory_by_id(
    inventory_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> InventoryResponse:
    business_id = await get_user_first_business_id(db, current_user.id)
    item = await InventoryService.get_inventory_by_id(db, business_id=business_id, inventory_id=inventory_id)
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found.")
    return item


@router.post(
    "",
    response_model=InventoryResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add or initialize inventory item",
    description="Creates or updates inventory tracking for a product."
)
async def create_inventory(
    inv_in: InventoryCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> InventoryResponse:
    business_id = await get_user_first_business_id(db, current_user.id)
    item = await InventoryService.create_or_update_inventory(
        db=db,
        business_id=business_id,
        product_id=inv_in.product_id,
        current_stock=inv_in.current_stock,
        minimum_stock=inv_in.minimum_stock,
        maximum_stock=inv_in.maximum_stock,
        buying_price=inv_in.buying_price,
        selling_price=inv_in.selling_price,
        supplier_id=inv_in.supplier_id,
        expiry_date=inv_in.expiry_date
    )
    return await InventoryService.get_inventory_by_id(db, business_id, item.id)


@router.put(
    "/{inventory_id}",
    response_model=InventoryResponse,
    status_code=status.HTTP_200_OK,
    summary="Update inventory item",
    description="Updates stock level, price, or thresholds. Recalculates status dynamically."
)
async def update_inventory(
    inventory_id: int,
    inv_in: InventoryUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> InventoryResponse:
    business_id = await get_user_first_business_id(db, current_user.id)
    item = await InventoryService.update_inventory(db, business_id, inventory_id, inv_in)
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found.")
    return await InventoryService.get_inventory_by_id(db, business_id, item.id)


@router.delete(
    "/{inventory_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete an inventory entry",
    description="Deletes an inventory record."
)
async def delete_inventory(
    inventory_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    business_id = await get_user_first_business_id(db, current_user.id)
    success = await InventoryService.delete_inventory(db, business_id, inventory_id)
    if not success:
        raise HTTPException(status_code=404, detail="Inventory item not found.")
    return {"message": f"Inventory ID {inventory_id} deleted successfully."}
