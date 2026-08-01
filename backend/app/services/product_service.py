import logging
import uuid
from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.models import Product, Inventory
from app.schemas.product import ProductCreate, ProductUpdate
from app.services.inventory_service import InventoryService

logger = logging.getLogger("app.services.product")


class ProductService:
    """Service for Product CRUD and automatic Inventory link creation."""

    @staticmethod
    def generate_sku(product_name: str) -> str:
        """Generates a clean SKU string based on product name and random hash."""
        clean_name = "".join(c for c in product_name if c.isalnum()).upper()[:6]
        short_hash = uuid.uuid4().hex[:6].upper()
        return f"SKU-{clean_name}-{short_hash}"

    @staticmethod
    async def create_product(
        db: AsyncSession, business_id: int, product_in: ProductCreate
    ) -> Product:
        """
        Creates a product and automatically initializes its inventory record.
        """
        sku = product_in.sku if product_in.sku and product_in.sku.strip() else ProductService.generate_sku(product_in.name)

        product = Product(
            business_id=business_id,
            name=product_in.name,
            sku=sku,
            category=product_in.category or "General",
            description=product_in.description
        )
        db.add(product)
        await db.commit()
        await db.refresh(product)

        # Automatically create inventory record
        await InventoryService.create_or_update_inventory(
            db=db,
            business_id=business_id,
            product_id=product.id,
            current_stock=product_in.current_stock or 0,
            minimum_stock=product_in.minimum_stock if product_in.minimum_stock is not None else 5,
            maximum_stock=product_in.maximum_stock if product_in.maximum_stock is not None else 100,
            buying_price=product_in.buying_price or 0.0,
            selling_price=product_in.selling_price or 0.0,
            supplier_id=product_in.supplier_id,
            expiry_date=product_in.expiry_date
        )

        logger.info(f"Created product '{product.name}' (SKU: {product.sku}, ID: {product.id})")
        return product

    @staticmethod
    async def get_products(
        db: AsyncSession, business_id: int, category: Optional[str] = None
    ) -> List[Product]:
        """Retrieve all products for a business."""
        query = (
            select(Product)
            .where(Product.business_id == business_id)
            .options(selectinload(Product.inventory))
            .order_by(Product.name.asc())
        )
        if category:
            query = query.where(Product.category == category)

        result = await db.execute(query)
        return result.scalars().all()

    @staticmethod
    async def get_product_by_id(
        db: AsyncSession, business_id: int, product_id: int
    ) -> Optional[Product]:
        """Get product by ID."""
        query = (
            select(Product)
            .where(Product.id == product_id, Product.business_id == business_id)
            .options(selectinload(Product.inventory))
        )
        result = await db.execute(query)
        return result.scalar_one_or_none()

    @staticmethod
    async def update_product(
        db: AsyncSession, business_id: int, product_id: int, product_in: ProductUpdate
    ) -> Optional[Product]:
        """Update product info."""
        product = await ProductService.get_product_by_id(db, business_id, product_id)
        if not product:
            return None

        update_data = product_in.model_dump(exclude_unset=True)
        for field, val in update_data.items():
            setattr(product, field, val)

        await db.commit()
        await db.refresh(product)
        return product

    @staticmethod
    async def delete_product(
        db: AsyncSession, business_id: int, product_id: int
    ) -> bool:
        """Delete product and associated inventory/sales."""
        product = await ProductService.get_product_by_id(db, business_id, product_id)
        if not product:
            return False

        await db.delete(product)
        await db.commit()
        return True
