import logging
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.models import Inventory, Product, Supplier
from app.schemas.inventory import InventoryCreate, InventoryUpdate

logger = logging.getLogger("app.services.inventory")


class InventoryService:
    """Service handling Inventory stock management and dynamic status calculations."""

    @staticmethod
    def calculate_status(
        current_stock: int,
        minimum_stock: int,
        maximum_stock: int,
        expiry_date: Optional[datetime] = None
    ) -> str:
        """
        Dynamically calculates stock status based on stock thresholds and expiration dates.
        Statuses: Expired, Expiring Soon, Out Of Stock, Low Stock, Overstock, Healthy.
        """
        now = datetime.now(timezone.utc)

        if expiry_date is not None:
            # Normalize to UTC
            if expiry_date.tzinfo is None:
                expiry_date = expiry_date.replace(tzinfo=timezone.utc)

            if expiry_date < now:
                return "Expired"
            
            delta_days = (expiry_date - now).days
            if 0 <= delta_days <= 30:
                return "Expiring Soon"

        if current_stock <= 0:
            return "Out Of Stock"

        if current_stock <= minimum_stock:
            return "Low Stock"

        if maximum_stock > 0 and current_stock >= maximum_stock:
            return "Overstock"

        return "Healthy"

    @staticmethod
    async def create_or_update_inventory(
        db: AsyncSession,
        business_id: int,
        product_id: int,
        current_stock: int = 0,
        minimum_stock: int = 5,
        maximum_stock: int = 100,
        buying_price: float = 0.0,
        selling_price: float = 0.0,
        supplier_id: Optional[int] = None,
        expiry_date: Optional[datetime] = None
    ) -> Inventory:
        """Create or update an inventory entry for a product."""
        query = select(Inventory).where(
            Inventory.business_id == business_id,
            Inventory.product_id == product_id
        )
        result = await db.execute(query)
        inventory = result.scalar_one_or_none()

        status = InventoryService.calculate_status(
            current_stock, minimum_stock, maximum_stock, expiry_date
        )

        if not inventory:
            inventory = Inventory(
                business_id=business_id,
                product_id=product_id,
                supplier_id=supplier_id,
                current_stock=current_stock,
                minimum_stock=minimum_stock,
                maximum_stock=maximum_stock,
                buying_price=buying_price,
                selling_price=selling_price,
                expiry_date=expiry_date,
                status=status
            )
            db.add(inventory)
        else:
            inventory.supplier_id = supplier_id
            inventory.current_stock = current_stock
            inventory.minimum_stock = minimum_stock
            inventory.maximum_stock = maximum_stock
            inventory.buying_price = buying_price
            inventory.selling_price = selling_price
            inventory.expiry_date = expiry_date
            inventory.status = status

        await db.commit()
        await db.refresh(inventory)
        return inventory

    @staticmethod
    async def get_inventory_by_id(
        db: AsyncSession, business_id: int, inventory_id: int
    ) -> Optional[Inventory]:
        """Get inventory item by ID with product and supplier loaded."""
        query = (
            select(Inventory)
            .where(Inventory.id == inventory_id, Inventory.business_id == business_id)
            .options(selectinload(Inventory.product), selectinload(Inventory.supplier))
        )
        result = await db.execute(query)
        return result.scalar_one_or_none()

    @staticmethod
    async def get_all_inventory(
        db: AsyncSession, business_id: int, status_filter: Optional[str] = None
    ) -> List[Inventory]:
        """Retrieve all inventory items for a business."""
        query = (
            select(Inventory)
            .where(Inventory.business_id == business_id)
            .options(selectinload(Inventory.product), selectinload(Inventory.supplier))
            .order_by(Inventory.updated_at.desc())
        )
        if status_filter:
            query = query.where(Inventory.status == status_filter)

        result = await db.execute(query)
        return result.scalars().all()

    @staticmethod
    async def update_inventory(
        db: AsyncSession, business_id: int, inventory_id: int, inv_in: InventoryUpdate
    ) -> Optional[Inventory]:
        """Update inventory fields and recalculate dynamic stock status."""
        inventory = await InventoryService.get_inventory_by_id(db, business_id, inventory_id)
        if not inventory:
            return None

        update_data = inv_in.model_dump(exclude_unset=True)
        for field, val in update_data.items():
            setattr(inventory, field, val)

        # Recalculate status
        inventory.status = InventoryService.calculate_status(
            inventory.current_stock,
            inventory.minimum_stock,
            inventory.maximum_stock,
            inventory.expiry_date
        )

        await db.commit()
        await db.refresh(inventory)
        return inventory

    @staticmethod
    async def delete_inventory(
        db: AsyncSession, business_id: int, inventory_id: int
    ) -> bool:
        """Delete an inventory entry."""
        inventory = await InventoryService.get_inventory_by_id(db, business_id, inventory_id)
        if not inventory:
            return False

        await db.delete(inventory)
        await db.commit()
        return True
