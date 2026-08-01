import logging
from typing import Any, Dict, List, Optional
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.models import Business, BusinessProfile, Inventory, Product, Sale, Supplier

logger = logging.getLogger("app.services.business_context")


class BusinessContextService:
    """
    Business Context Service for retrieving targeted data subsets required by AI modules.
    Never queries unnecessary tables or unneeded data rows.
    """

    @staticmethod
    async def get_item_context(
        db: AsyncSession, business_id: int, item_query: str
    ) -> Dict[str, Any]:
        """
        Retrieves ONLY relevant product, inventory, sales, supplier, and business category details
        matching a target item query (e.g. "Milk", "Cold Drinks").
        """
        logger.info(f"Retrieving targeted business context for item query '{item_query}' (Business ID {business_id})")

        # 1. Fetch Business Profile summary
        b_query = (
            select(Business)
            .where(Business.id == business_id)
            .options(selectinload(Business.profile))
        )
        b_res = await db.execute(b_query)
        business = b_res.scalar_one_or_none()

        business_meta = {
            "business_name": business.business_name if business else "Unknown",
            "business_type": business.business_type if business else "Retail",
            "location_type": business.profile.location_type if business and business.profile else None,
        }

        # 2. Search product by name or SKU substring
        search_pattern = f"%{item_query.strip().lower()}%"
        p_query = (
            select(Product)
            .where(
                Product.business_id == business_id,
                func.lower(Product.name).like(search_pattern) | func.lower(Product.sku).like(search_pattern)
            )
            .options(selectinload(Product.inventory), selectinload(Product.inventory).selectinload(Inventory.supplier))
        )
        p_res = await db.execute(p_query)
        matching_products = p_res.scalars().all()

        products_data = []
        for p in matching_products:
            # Fetch recent sales for this specific product only
            s_query = (
                select(
                    func.coalesce(func.sum(Sale.quantity), 0).label("tot_sold"),
                    func.coalesce(func.sum(Sale.total_amount), 0.0).label("tot_rev")
                )
                .where(Sale.business_id == business_id, Sale.product_id == p.id)
            )
            s_res = await db.execute(s_query)
            tot_sold, tot_rev = s_res.tuples().one()

            inv = p.inventory
            products_data.append({
                "product_id": p.id,
                "name": p.name,
                "sku": p.sku,
                "category": p.category,
                "current_stock": inv.current_stock if inv else 0,
                "minimum_stock": inv.minimum_stock if inv else 5,
                "buying_price": inv.buying_price if inv else 0.0,
                "selling_price": inv.selling_price if inv else 0.0,
                "status": inv.status if inv else "Out Of Stock",
                "supplier_name": inv.supplier.name if inv and inv.supplier else "No Supplier Assigned",
                "total_units_sold": int(tot_sold),
                "total_revenue": round(float(tot_rev), 2)
            })

        return {
            "query": item_query,
            "business_context": business_meta,
            "matching_products_count": len(products_data),
            "items": products_data
        }
