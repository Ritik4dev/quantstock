import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.database.models import User
from app.database.session import get_db
from app.schemas.product import ProductCreate, ProductResponse, ProductUpdate
from app.services.business_service import BusinessService
from app.services.product_service import ProductService

logger = logging.getLogger("app.api.product")
router = APIRouter(prefix="/products", tags=["Product Catalog Management"])


async def get_user_first_business_id(db: AsyncSession, user_id: int) -> int:
    businesses = await BusinessService.get_user_businesses(db, owner_id=user_id)
    if not businesses:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No registered business found for user. Please create a business first."
        )
    return businesses[0].id


@router.post(
    "",
    response_model=ProductResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add a new product",
    description="Creates a new product item and initializes its inventory entry."
)
async def create_product(
    product_in: ProductCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> ProductResponse:
    business_id = await get_user_first_business_id(db, current_user.id)
    product = await ProductService.create_product(db, business_id=business_id, product_in=product_in)
    return product


@router.get(
    "",
    response_model=List[ProductResponse],
    status_code=status.HTTP_200_OK,
    summary="Get all products",
    description="Retrieves a list of all products for the user's business."
)
async def get_products(
    category: Optional[str] = Query(None, description="Optional category filter"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> List[ProductResponse]:
    business_id = await get_user_first_business_id(db, current_user.id)
    products = await ProductService.get_products(db, business_id=business_id, category=category)
    return products


@router.get(
    "/{product_id}",
    response_model=ProductResponse,
    status_code=status.HTTP_200_OK,
    summary="Get product details by ID",
    description="Retrieves product details by primary key ID."
)
async def get_product_by_id(
    product_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> ProductResponse:
    business_id = await get_user_first_business_id(db, current_user.id)
    product = await ProductService.get_product_by_id(db, business_id, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found.")
    return product


@router.put(
    "/{product_id}",
    response_model=ProductResponse,
    status_code=status.HTTP_200_OK,
    summary="Update a product",
    description="Updates product name, SKU, or category."
)
async def update_product(
    product_id: int,
    product_in: ProductUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> ProductResponse:
    business_id = await get_user_first_business_id(db, current_user.id)
    product = await ProductService.update_product(db, business_id, product_id, product_in)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found.")
    return product


@router.delete(
    "/{product_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete a product",
    description="Deletes a product entry and associated inventory."
)
async def delete_product(
    product_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    business_id = await get_user_first_business_id(db, current_user.id)
    success = await ProductService.delete_product(db, business_id, product_id)
    if not success:
        raise HTTPException(status_code=404, detail="Product not found.")
    return {"message": f"Product ID {product_id} deleted successfully."}
