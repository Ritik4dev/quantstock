import logging
from datetime import datetime, timedelta, timezone
from typing import List
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.models import Inventory, Product, Sale
from app.schemas.analytics import (
    AnalyticsOverviewResponse,
    CategoryDistributionItem,
    ProductAnalyticsResponse,
    ProductPerformanceItem,
    RevenueAnalyticsResponse,
    SalesTrendPoint,
)

logger = logging.getLogger("app.services.analytics")


class AnalyticsService:
    """
    Analytics Engine generating sales performance, revenue, profit, best/worst sellers,
    and category breakdowns strictly via PostgreSQL SQL aggregation queries.
    """

    @staticmethod
    async def get_sales_trends(
        db: AsyncSession, business_id: int, days: int = 30
    ) -> List[SalesTrendPoint]:
        """
        Generates daily sales & revenue trend points over given number of days.
        """
        now = datetime.now(timezone.utc)
        start_date = now - timedelta(days=days)

        # SQL grouping by date
        date_col = func.date(Sale.sale_date)
        query = (
            select(
                date_col.label("date_label"),
                func.count(Sale.id).label("sales_count"),
                func.coalesce(func.sum(Sale.total_amount), 0.0).label("revenue"),
                func.coalesce(func.sum((Sale.unit_price - Sale.buying_price) * Sale.quantity), 0.0).label("profit")
            )
            .where(Sale.business_id == business_id, Sale.sale_date >= start_date)
            .group_by(date_col)
            .order_by(date_col.asc())
        )

        result = await db.execute(query)
        rows = result.tuples().all()

        return [
            SalesTrendPoint(
                period=str(row[0]),
                sales_count=row[1],
                revenue=round(float(row[2]), 2),
                profit=round(float(row[3]), 2)
            )
            for row in rows
        ]

    @staticmethod
    async def get_product_rankings(
        db: AsyncSession, business_id: int, limit: int = 10, ascending: bool = False
    ) -> List[ProductPerformanceItem]:
        """
        Calculates best or worst selling products based on total sales volume in PostgreSQL.
        """
        order_direction = Sale.quantity if not ascending else Sale.quantity.asc()
        
        query = (
            select(
                Product.id,
                Product.name,
                Product.sku,
                func.coalesce(func.sum(Sale.quantity), 0).label("total_qty"),
                func.coalesce(func.sum(Sale.total_amount), 0.0).label("total_rev"),
                func.coalesce(func.sum((Sale.unit_price - Sale.buying_price) * Sale.quantity), 0.0).label("total_prof"),
                func.coalesce(Inventory.current_stock, 0).label("stock"),
                func.coalesce(Inventory.status, "Out Of Stock").label("status")
            )
            .join(Sale, Product.id == Sale.product_id, isouter=True)
            .join(Inventory, Product.id == Inventory.product_id, isouter=True)
            .where(Product.business_id == business_id)
            .group_by(Product.id, Product.name, Product.sku, Inventory.current_stock, Inventory.status)
            .order_by(func.coalesce(func.sum(Sale.quantity), 0).asc() if ascending else func.coalesce(func.sum(Sale.quantity), 0).desc())
            .limit(limit)
        )

        result = await db.execute(query)
        rows = result.tuples().all()

        return [
            ProductPerformanceItem(
                product_id=row[0],
                name=row[1],
                sku=row[2],
                total_quantity_sold=int(row[3]),
                total_revenue=round(float(row[4]), 2),
                total_profit=round(float(row[5]), 2),
                current_stock=int(row[6]),
                status=str(row[7])
            )
            for row in rows
        ]

    @staticmethod
    async def get_category_distribution(
        db: AsyncSession, business_id: int
    ) -> List[CategoryDistributionItem]:
        """
        Aggregates product count, total stock, and total inventory value per category.
        """
        query = (
            select(
                func.coalesce(Product.category, "General").label("cat"),
                func.count(Product.id).label("p_count"),
                func.coalesce(func.sum(Inventory.current_stock), 0).label("tot_stock"),
                func.coalesce(func.sum(Inventory.current_stock * Inventory.buying_price), 0.0).label("tot_val")
            )
            .join(Inventory, Product.id == Inventory.product_id, isouter=True)
            .where(Product.business_id == business_id)
            .group_by(Product.category)
            .order_by(func.coalesce(func.sum(Inventory.current_stock * Inventory.buying_price), 0.0).desc())
        )

        result = await db.execute(query)
        rows = result.tuples().all()

        return [
            CategoryDistributionItem(
                category=row[0],
                product_count=row[1],
                total_stock=int(row[2]),
                inventory_value=round(float(row[3]), 2)
            )
            for row in rows
        ]

    @staticmethod
    async def get_analytics_overview(
        db: AsyncSession, business_id: int
    ) -> AnalyticsOverviewResponse:
        """
        Full Analytics Overview computed strictly from SQL queries.
        """
        daily = await AnalyticsService.get_sales_trends(db, business_id, days=7)
        weekly = await AnalyticsService.get_sales_trends(db, business_id, days=30)
        monthly = await AnalyticsService.get_sales_trends(db, business_id, days=90)

        best_sellers = await AnalyticsService.get_product_rankings(db, business_id, limit=5, ascending=False)
        worst_sellers = await AnalyticsService.get_product_rankings(db, business_id, limit=5, ascending=True)

        categories = await AnalyticsService.get_category_distribution(db, business_id)

        # Revenue & Profit Total SQL
        rev_profit_query = select(
            func.coalesce(func.sum(Sale.total_amount), 0.0),
            func.coalesce(func.sum((Sale.unit_price - Sale.buying_price) * Sale.quantity), 0.0)
        ).where(Sale.business_id == business_id)
        tot_rev, tot_prof = (await db.execute(rev_profit_query)).tuples().one()

        # Total Inventory Value SQL
        inv_val_query = select(
            func.coalesce(func.sum(Inventory.current_stock * Inventory.buying_price), 0.0)
        ).where(Inventory.business_id == business_id)
        tot_inv_val = (await db.execute(inv_val_query)).scalar() or 0.0

        return AnalyticsOverviewResponse(
            daily_sales=daily,
            weekly_sales=weekly,
            monthly_sales=monthly,
            total_revenue=round(float(tot_rev), 2),
            total_profit=round(float(tot_prof), 2),
            total_inventory_value=round(float(tot_inv_val), 2),
            best_sellers=best_sellers,
            worst_sellers=worst_sellers,
            fast_moving_products=best_sellers[:3],
            slow_moving_products=worst_sellers[:3],
            category_distribution=categories
        )
