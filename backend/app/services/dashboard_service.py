import logging
from datetime import datetime, timedelta, timezone
from typing import Dict, List
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.models import Inventory, Product, Sale, Supplier
from app.schemas.dashboard import (
    DashboardCardsResponse,
    DashboardSummaryResponse,
    InventoryCapacityMetric,
    InventoryHealthBreakdown,
    ItemStockSuggestion,
    ShortestRunwayItem,
    StockRunwayMetric,
)

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

    @staticmethod
    async def get_inventory_capacity(
        db: AsyncSession, business_id: int
    ) -> InventoryCapacityMetric:
        """
        Total Inventory Capacity Widget:
        Dynamically calculates occupied stock vs total maximum capacity limits strictly from SQL.
        """
        query = select(
            func.coalesce(func.sum(Inventory.current_stock), 0).label("tot_occupied"),
            func.coalesce(func.sum(Inventory.maximum_stock), 0).label("tot_capacity")
        ).where(Inventory.business_id == business_id)

        res = await db.execute(query)
        tot_occupied, tot_capacity = res.tuples().one()
        tot_occupied = int(tot_occupied)
        tot_capacity = int(tot_capacity)

        if tot_capacity == 0:
            tot_capacity = max(tot_occupied, 500)

        utilization_pct = round((tot_occupied / tot_capacity * 100.0), 1) if tot_capacity > 0 else 0.0

        if utilization_pct >= 90.0:
            status = "Near Capacity Warning"
        elif utilization_pct >= 60.0:
            status = "Healthy Utilization"
        elif utilization_pct >= 30.0:
            status = "Moderate Occupancy"
        else:
            status = "Low Capacity Utilization"

        # Zone breakdown mock aggregation from categories
        cat_query = select(
            func.coalesce(Product.category, "Main Store Zone"),
            func.coalesce(func.sum(Inventory.current_stock), 0),
            func.coalesce(func.sum(Inventory.maximum_stock), 100)
        ).join(Product, Inventory.product_id == Product.id, isouter=True).where(
            Inventory.business_id == business_id
        ).group_by(Product.category)

        cat_res = await db.execute(cat_query)
        cat_rows = cat_res.tuples().all()

        zone_list = []
        for cat_name, c_stock, c_max in cat_rows:
            c_stock = int(c_stock)
            c_max = int(c_max) if c_max > 0 else 100
            u_pct = round((c_stock / c_max * 100.0), 1)
            zone_list.append({
                "zone_name": str(cat_name),
                "occupied": c_stock,
                "capacity": c_max,
                "utilization_pct": u_pct
            })

        return InventoryCapacityMetric(
            total_occupied_units=tot_occupied,
            total_capacity_units=tot_capacity,
            utilization_pct=utilization_pct,
            status=status,
            zone_breakdown=zone_list
        )

    @staticmethod
    async def get_stock_runway(
        db: AsyncSession, business_id: int
    ) -> StockRunwayMetric:
        """
        Stock Lasting (Runway Estimate) Widget:
        Predicts time remaining before inventory runs out based on historical sales velocity.
        """
        # Calculate 30-day total sales volume
        thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
        vol_q = select(func.coalesce(func.sum(Sale.quantity), 0)).where(
            Sale.business_id == business_id,
            Sale.sale_date >= thirty_days_ago
        )
        total_30d_sold = (await db.execute(vol_q)).scalar() or 0
        daily_burn_rate = float(total_30d_sold) / 30.0

        # Total current stock
        stock_q = select(func.coalesce(func.sum(Inventory.current_stock), 0)).where(
            Inventory.business_id == business_id
        )
        tot_stock = (await db.execute(stock_q)).scalar() or 0

        overall_days = int(tot_stock / daily_burn_rate) if daily_burn_rate > 0 else 90

        # Per-product shortest runway items
        items_query = (
            select(Inventory)
            .where(Inventory.business_id == business_id, Inventory.current_stock > 0)
            .options(selectinload(Inventory.product))
            .limit(10)
        )
        inv_items = (await db.execute(items_query)).scalars().all()

        shortest_items: List[ShortestRunwayItem] = []
        for item in inv_items:
            # item sales velocity
            i_sales_q = select(func.coalesce(func.sum(Sale.quantity), 0)).where(
                Sale.business_id == business_id,
                Sale.product_id == item.product_id,
                Sale.sale_date >= thirty_days_ago
            )
            i_sold_30d = (await db.execute(i_sales_q)).scalar() or 0
            i_vel = float(i_sold_30d) / 30.0
            if i_vel == 0.0:
                i_vel = 0.5  # baseline assumption for active stock

            days_rem = int(item.current_stock / i_vel)
            p_name = item.product.name if item.product else "Product"
            sku = item.product.sku if item.product else ""

            if days_rem <= 7:
                item_status = "Critical Stockout Risk"
            elif days_rem <= 14:
                item_status = "Reorder Urgently"
            else:
                item_status = "Adequate Runway"

            shortest_items.append(ShortestRunwayItem(
                product_id=item.product_id,
                product_name=p_name,
                sku=sku,
                current_stock=item.current_stock,
                daily_velocity=round(i_vel, 1),
                days_remaining=days_rem,
                status=item_status
            ))

        shortest_items.sort(key=lambda x: x.days_remaining)

        return StockRunwayMetric(
            overall_days_remaining=overall_days,
            daily_burn_rate_units=round(daily_burn_rate, 1),
            total_current_stock=tot_stock,
            shortest_runway_items=shortest_items[:5]
        )

    @staticmethod
    async def get_item_stock_suggestions(
        db: AsyncSession, business_id: int
    ) -> List[ItemStockSuggestion]:
        """
        Item-Level Stock Intelligence:
        Generates dynamic reorder/stocking suggestions positioned directly above every individual product.
        """
        inv_query = (
            select(Inventory)
            .where(Inventory.business_id == business_id)
            .options(selectinload(Inventory.product), selectinload(Inventory.supplier))
        )
        inv_items = (await db.execute(inv_query)).scalars().all()

        thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
        suggestions: List[ItemStockSuggestion] = []

        for item in inv_items:
            # Sales velocity
            s_q = select(func.coalesce(func.sum(Sale.quantity), 0)).where(
                Sale.business_id == business_id,
                Sale.product_id == item.product_id,
                Sale.sale_date >= thirty_days_ago
            )
            sold_30d = (await db.execute(s_q)).scalar() or 0
            vel = float(sold_30d) / 30.0

            p_name = item.product.name if item.product else "Product"
            sku = item.product.sku if item.product else ""
            sup_name = item.supplier.name if item.supplier else "Preferred Supplier"
            lead_time = item.supplier.lead_time_days if (item.supplier and item.supplier.lead_time_days) else 3

            # Determine suggestion logic
            if item.current_stock <= item.minimum_stock or (vel > 0 and (item.current_stock / vel) <= lead_time + 2):
                action = "RESTOCK_RECOMMENDED"
                rec_qty = max(20, (item.maximum_stock - item.current_stock))
                days_left = int(item.current_stock / vel) if vel > 0 else 2
                text = (
                    f"High sales velocity ({vel:.1f} units/day). Reorder {rec_qty} units from {sup_name} "
                    f"to prevent stockout in {days_left} days."
                )
            elif item.current_stock >= item.maximum_stock and vel < 0.2:
                action = "OVERSTOCK_ALERT"
                rec_qty = 0
                text = f"Low sales velocity. {item.current_stock} units remaining. Pause reorders for 30 days."
            elif item.status in ["Expiring Soon", "Expired"]:
                action = "CLEARANCE_DISCOUNT"
                rec_qty = 0
                text = f"Expiring soon. Put remaining {item.current_stock} units on 25% clearance discount."
            else:
                action = "HEALTHY"
                rec_qty = 0
                text = f"Stock level healthy. {item.current_stock} units in stock ({int(item.current_stock / vel) if vel > 0 else 60} days runway)."

            suggestions.append(ItemStockSuggestion(
                product_id=item.product_id,
                product_name=p_name,
                sku=sku,
                current_stock=item.current_stock,
                minimum_stock=item.minimum_stock,
                maximum_stock=item.maximum_stock,
                sales_velocity_daily=round(vel, 1),
                action_type=action,
                suggested_order_qty=rec_qty,
                lead_time_days=lead_time,
                supplier_name=sup_name,
                insight_text=text
            ))

        return suggestions
