import logging
from datetime import datetime, timedelta, timezone
from typing import Dict, List
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.models import Inventory, Product, Sale, Supplier
from app.schemas.dashboard import DashboardCardsResponse, DashboardSummaryResponse, InventoryHealthBreakdown

logger = logging.getLogger("app.services.dashboard")


class DashboardService:
    """
    Dashboard Engine calculating real-time inventory metrics, sales performance, revenue,
    profit, and inventory health strictly via PostgreSQL SQL queries.
    """

    @staticmethod
    async def get_dashboard_cards(
        db: AsyncSession, business_id: int
    ) -> DashboardCardsResponse:
        """
        Computes summary cards purely from SQL queries.
        Returns 0 for metrics if no database records exist.
        """
        # 1. Total Products
        p_count_query = select(func.count(Product.id)).where(Product.business_id == business_id)
        p_count_res = await db.execute(p_count_query)
        total_products = p_count_res.scalar() or 0

        # 2. Total Suppliers
        s_count_query = select(func.count(Supplier.id)).where(Supplier.business_id == business_id)
        s_count_res = await db.execute(s_count_query)
        total_suppliers = s_count_res.scalar() or 0

        # 3. Inventory Value (Cost & Retail)
        inv_val_query = select(
            func.coalesce(func.sum(Inventory.current_stock * Inventory.buying_price), 0.0),
            func.coalesce(func.sum(Inventory.current_stock * Inventory.selling_price), 0.0)
        ).where(Inventory.business_id == business_id)
        inv_val_res = await db.execute(inv_val_query)
        inv_cost, inv_retail = inv_val_res.tuples().one()

        # 4. Inventory Health Status Breakdown
        health_query = select(
            Inventory.status, func.count(Inventory.id)
        ).where(Inventory.business_id == business_id).group_by(Inventory.status)
        health_res = await db.execute(health_query)
        health_counts = dict(health_res.tuples().all())

        healthy_count = health_counts.get("Healthy", 0)
        low_stock_count = health_counts.get("Low Stock", 0)
        out_of_stock_count = health_counts.get("Out Of Stock", 0)
        overstock_count = health_counts.get("Overstock", 0)
        expired_count = health_counts.get("Expired", 0)
        expiring_soon_count = health_counts.get("Expiring Soon", 0)

        products_running_low = low_stock_count + out_of_stock_count
        products_expiring = expired_count + expiring_soon_count

        # 5. Sales Metrics (Today, Weekly, Monthly, Revenue, Profit)
        now = datetime.now(timezone.utc)
        start_of_today = datetime(now.year, now.month, now.day, tzinfo=timezone.utc)
        seven_days_ago = now - timedelta(days=7)
        thirty_days_ago = now - timedelta(days=30)

        # Today's Sales
        today_sales_query = select(
            func.coalesce(func.sum(Sale.total_amount), 0.0)
        ).where(Sale.business_id == business_id, Sale.sale_date >= start_of_today)
        today_sales = (await db.execute(today_sales_query)).scalar() or 0.0

        # Weekly Sales
        weekly_sales_query = select(
            func.coalesce(func.sum(Sale.total_amount), 0.0)
        ).where(Sale.business_id == business_id, Sale.sale_date >= seven_days_ago)
        weekly_sales = (await db.execute(weekly_sales_query)).scalar() or 0.0

        # Monthly Sales
        monthly_sales_query = select(
            func.coalesce(func.sum(Sale.total_amount), 0.0)
        ).where(Sale.business_id == business_id, Sale.sale_date >= thirty_days_ago)
        monthly_sales = (await db.execute(monthly_sales_query)).scalar() or 0.0

        # Total Revenue & Total Profit
        rev_profit_query = select(
            func.coalesce(func.sum(Sale.total_amount), 0.0),
            func.coalesce(func.sum((Sale.unit_price - Sale.buying_price) * Sale.quantity), 0.0)
        ).where(Sale.business_id == business_id)
        total_rev, total_prof = (await db.execute(rev_profit_query)).tuples().one()

        health_breakdown = InventoryHealthBreakdown(
            healthy_count=healthy_count,
            low_stock_count=low_stock_count,
            out_of_stock_count=out_of_stock_count,
            overstock_count=overstock_count,
            expired_count=expired_count,
            expiring_soon_count=expiring_soon_count
        )

        return DashboardCardsResponse(
            total_products=total_products,
            total_inventory_value_cost=round(float(inv_cost), 2),
            total_inventory_value_retail=round(float(inv_retail), 2),
            todays_sales=round(float(today_sales), 2),
            weekly_sales=round(float(weekly_sales), 2),
            monthly_sales=round(float(monthly_sales), 2),
            total_revenue=round(float(total_rev), 2),
            total_profit=round(float(total_prof), 2),
            total_suppliers=total_suppliers,
            products_running_low=products_running_low,
            products_expiring=products_expiring,
            inventory_health=health_breakdown
        )

    @staticmethod
    async def get_dashboard_summary(
        db: AsyncSession, business_id: int
    ) -> DashboardSummaryResponse:
        """
        Detailed dashboard summary including cards, low stock alerts, expiring items, and recent sales.
        """
        cards = await DashboardService.get_dashboard_cards(db, business_id)

        # Low Stock Alerts
        low_stock_query = (
            select(Inventory)
            .where(
                Inventory.business_id == business_id,
                Inventory.status.in_(["Low Stock", "Out Of Stock"])
            )
            .options(selectinload(Inventory.product))
            .limit(10)
        )
        low_stock_items = (await db.execute(low_stock_query)).scalars().all()
        low_stock_alerts = [
            {
                "inventory_id": item.id,
                "product_name": item.product.name if item.product else "Unknown",
                "sku": item.product.sku if item.product else "",
                "current_stock": item.current_stock,
                "minimum_stock": item.minimum_stock,
                "status": item.status
            }
            for item in low_stock_items
        ]

        # Expiring Alerts
        expiring_query = (
            select(Inventory)
            .where(
                Inventory.business_id == business_id,
                Inventory.status.in_(["Expired", "Expiring Soon"])
            )
            .options(selectinload(Inventory.product))
            .limit(10)
        )
        expiring_items = (await db.execute(expiring_query)).scalars().all()
        expiring_alerts = [
            {
                "inventory_id": item.id,
                "product_name": item.product.name if item.product else "Unknown",
                "sku": item.product.sku if item.product else "",
                "expiry_date": item.expiry_date.isoformat() if item.expiry_date else None,
                "current_stock": item.current_stock,
                "status": item.status
            }
            for item in expiring_items
        ]

        # Recent Transactions
        recent_sales_query = (
            select(Sale)
            .where(Sale.business_id == business_id)
            .options(selectinload(Sale.product))
            .order_by(Sale.sale_date.desc())
            .limit(10)
        )
        recent_sales = (await db.execute(recent_sales_query)).scalars().all()
        recent_transactions = [
            {
                "sale_id": sale.id,
                "product_name": sale.product.name if sale.product else "Unknown",
                "quantity": sale.quantity,
                "unit_price": sale.unit_price,
                "total_amount": sale.total_amount,
                "sale_date": sale.sale_date.isoformat()
            }
            for sale in recent_sales
        ]

        return DashboardSummaryResponse(
            cards=cards,
            low_stock_alerts=low_stock_alerts,
            expiring_alerts=expiring_alerts,
            recent_transactions=recent_transactions
        )
