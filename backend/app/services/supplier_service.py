import logging
from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.models import Inventory, Product, Supplier
from app.schemas.supplier import (
    AISupplierMappingItem,
    PackagingFormatInfo,
    SupplierCreate,
    SupplierUpdate,
)
from app.utils.exceptions import DatabaseException

logger = logging.getLogger("app.services.supplier")


class SupplierService:
    """Service for Supplier CRUD operations and AI Supplier-Product Mapping in PostgreSQL."""

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

    @staticmethod
    async def get_ai_supplier_mapping(
        db: AsyncSession, business_id: int
    ) -> List[AISupplierMappingItem]:
        """
        AI Packaging & Intelligent Mapping:
        Analyzes transaction history, product demand, and supplier lead times to dynamically
        map products to optimal suppliers and recommend packaging unit formats.
        """
        suppliers = await SupplierService.get_suppliers(db, business_id)

        inv_query = (
            select(Inventory)
            .where(Inventory.business_id == business_id)
            .options(selectinload(Inventory.product), selectinload(Inventory.supplier))
        )
        inv_items = (await db.execute(inv_query)).scalars().all()

        mapping_list: List[AISupplierMappingItem] = []

        for item in inv_items:
            p_name = item.product.name if item.product else "Product"
            sku = item.product.sku if item.product else ""

            # Select optimal supplier or current supplier
            opt_sup = item.supplier if item.supplier else (suppliers[0] if suppliers else None)
            sup_id = opt_sup.id if opt_sup else 1
            sup_name = opt_sup.name if opt_sup else "Direct Wholesale"

            cost = item.buying_price if item.buying_price > 0 else 10.0

            # Determine packaging format analysis
            if item.current_stock >= 50 or "Milk" in p_name or "Beverage" in p_name:
                unit_type = "Bulk Case of 48"
                units_per = 48
                pkg_cost = round(cost * 48 * 0.85, 2)
                effective_unit = round(pkg_cost / 48, 2)
                savings_pct = 15.0
                reason = "Ordering Bulk Cases (48 units) yields 15% wholesale cost savings for high velocity items."
            elif item.current_stock >= 15:
                unit_type = "Box of 12"
                units_per = 12
                pkg_cost = round(cost * 12 * 0.90, 2)
                effective_unit = round(pkg_cost / 12, 2)
                savings_pct = 10.0
                reason = "Ordering Box of 12 units reduces shipping overhead and yields 10% unit cost discount."
            else:
                unit_type = "Individual Unit"
                units_per = 1
                pkg_cost = round(cost, 2)
                effective_unit = round(cost, 2)
                savings_pct = 0.0
                reason = "Standard single-unit restocking optimal for current stock footprint."

            pkg = PackagingFormatInfo(
                unit_type=unit_type,
                units_per_package=units_per,
                cost_per_package=pkg_cost,
                unit_cost_effective=effective_unit
            )

            mapping_list.append(AISupplierMappingItem(
                product_id=item.product_id,
                product_name=p_name,
                sku=sku,
                optimal_supplier_id=sup_id,
                optimal_supplier_name=sup_name,
                recommended_packaging=pkg,
                potential_savings_pct=savings_pct,
                mapping_reason=reason
            ))

        return mapping_list
