import logging
from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.models import Supplier
from app.schemas.supplier import SupplierCreate, SupplierUpdate
from app.utils.exceptions import DatabaseException

logger = logging.getLogger("app.services.supplier")


class SupplierService:
    """Service for Supplier CRUD operations in PostgreSQL."""

    @staticmethod
    async def create_supplier(
        db: AsyncSession, business_id: int, supplier_in: SupplierCreate
    ) -> Supplier:
        """Create a new supplier for a business."""
        supplier = Supplier(
            business_id=business_id,
            name=supplier_in.name,
            contact_person=supplier_in.contact_person,
            email=str(supplier_in.email) if supplier_in.email else None,
            phone=supplier_in.phone,
            address=supplier_in.address
        )
        db.add(supplier)
        await db.commit()
        await db.refresh(supplier)
        logger.info(f"Created supplier '{supplier.name}' (ID: {supplier.id}) for Business {business_id}")
        return supplier

    @staticmethod
    async def get_suppliers(
        db: AsyncSession, business_id: int
    ) -> List[Supplier]:
        """Retrieve all suppliers for a business."""
        query = (
            select(Supplier)
            .where(Supplier.business_id == business_id)
            .order_by(Supplier.name.asc())
        )
        result = await db.execute(query)
        return result.scalars().all()

    @staticmethod
    async def get_supplier_by_id(
        db: AsyncSession, business_id: int, supplier_id: int
    ) -> Optional[Supplier]:
        """Get a supplier by ID for a specific business."""
        query = select(Supplier).where(
            Supplier.id == supplier_id,
            Supplier.business_id == business_id
        )
        result = await db.execute(query)
        return result.scalar_one_or_none()

    @staticmethod
    async def update_supplier(
        db: AsyncSession, business_id: int, supplier_id: int, supplier_in: SupplierUpdate
    ) -> Optional[Supplier]:
        """Update a supplier."""
        supplier = await SupplierService.get_supplier_by_id(db, business_id, supplier_id)
        if not supplier:
            return None

        update_data = supplier_in.model_dump(exclude_unset=True)
        if "email" in update_data and update_data["email"] is not None:
            update_data["email"] = str(update_data["email"])

        for field, val in update_data.items():
            setattr(supplier, field, val)

        await db.commit()
        await db.refresh(supplier)
        logger.info(f"Updated supplier ID {supplier_id}")
        return supplier

    @staticmethod
    async def delete_supplier(
        db: AsyncSession, business_id: int, supplier_id: int
    ) -> bool:
        """Delete a supplier."""
        supplier = await SupplierService.get_supplier_by_id(db, business_id, supplier_id)
        if not supplier:
            return False

        await db.delete(supplier)
        await db.commit()
        logger.info(f"Deleted supplier ID {supplier_id}")
        return True
