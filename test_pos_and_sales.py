import asyncio
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

# Ensure backend folder is in Python import path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "backend"))

from app.core.config import settings
from app.database.models import Base, User, Business, Product, Inventory, Sale
from app.services.sales_service import SalesService
from app.schemas.sales import ExtractedSaleLine
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession


async def get_test_db_session():
    try:
        engine = create_async_engine(settings.DATABASE_URL, future=True)
        async with engine.connect() as conn:
            await conn.execute(select(1))
        print("[OK] Connected to PostgreSQL Database")
    except Exception:
        print("[NOTICE] PostgreSQL offline. Using local SQLite fallback 'sqlite+aiosqlite:///./quadstock.db'")
        engine = create_async_engine("sqlite+aiosqlite:///./quadstock.db", future=True)
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)
    return session_factory()


async def run_verification():
    print("==================================================")
    print("VERIFYING POS BARCODE SCANNER & FINANCIAL ANALYTICS")
    print("==================================================")

    db = await get_test_db_session()
    async with db:
        # Get or create test business
        b_res = await db.execute(select(Business))
        biz = b_res.scalars().first()
        if not biz:
            u_res = await db.execute(select(User))
            usr = u_res.scalars().first()
            if not usr:
                usr = User(email="test_pos@quadstock.ai", hashed_password="hashed_pass_test")
                db.add(usr)
                await db.flush()
            biz = Business(owner_id=usr.id, name="Test POS Retail Store")
            db.add(biz)
            await db.commit()
            await db.refresh(biz)

        print(f"[OK] Test Business ID: {biz.id}")

        # 1. Clean existing test product "Milk"
        p_res = await db.execute(
            select(Product).where(Product.business_id == biz.id, Product.name.ilike("Milk"))
        )
        existing_p = p_res.scalar_one_or_none()
        if existing_p:
            await db.execute(delete(Sale).where(Sale.product_id == existing_p.id))
            await db.execute(delete(Inventory).where(Inventory.product_id == existing_p.id))
            await db.execute(delete(Product).where(Product.id == existing_p.id))
            await db.commit()

        # 2. Seed initial product "Milk" with stock = 10 units (Buying price $2.00, Selling price $3.50)
        milk_prod = Product(business_id=biz.id, sku="MILK-001", name="Milk", category="Dairy")
        db.add(milk_prod)
        await db.flush()

        milk_inv = Inventory(
            business_id=biz.id,
            product_id=milk_prod.id,
            current_stock=10,
            buying_price=2.0,
            selling_price=3.5,
            status="Healthy"
        )
        db.add(milk_inv)
        await db.commit()
        print(f"[OK] Initialized 'Milk' stock = 10 units (Cost: $2.00, Retail: $3.50)")

        # 3. Test Barcode POS Checkout Sale of 2 Milk units
        checkout_res = await SalesService.scan_and_checkout(
            db=db,
            business_id=biz.id,
            barcode_or_sku="MILK-001",
            quantity=2
        )

        print(f"[OK] POS Checkout Execution:")
        print(f"   Product: {checkout_res.product_name}")
        print(f"   Quantity Sold: {checkout_res.quantity_sold}")
        print(f"   Total Amount: ${checkout_res.total_amount:.2f}")
        print(f"   Previous Stock: {checkout_res.previous_stock}")
        print(f"   Remaining Stock: {checkout_res.remaining_stock}")

        # Verify Auto Stock Decrement (10 initial - 2 sold = 8 remaining)
        assert checkout_res.previous_stock == 10, f"Expected prev stock 10, got {checkout_res.previous_stock}"
        assert checkout_res.remaining_stock == 8, f"Expected remaining stock 8, got {checkout_res.remaining_stock}"

        # 4. Verify Per-Product Financial Analytics Query
        financials = await SalesService.get_per_product_financials(db, business_id=biz.id)
        print(f"[VERIFIED] Per-Product Financial Summary:")
        print(f"   Total Store Revenue: ${financials.total_revenue:.2f}")
        print(f"   Total Store Profit: ${financials.total_profit:.2f}")
        print(f"   Overall Profit Margin: {financials.overall_profit_margin_pct:.1f}%")
        print(f"   Total Units Sold: {financials.total_units_sold}")

        # Check Milk item in financials list
        milk_fin = next(p for p in financials.products if p.product_id == milk_prod.id)
        print(f"   'Milk' Item Financials:")
        print(f"      Revenue: ${milk_fin.total_revenue:.2f}")
        print(f"      Cost: ${milk_fin.total_cost:.2f}")
        print(f"      Net Profit: ${milk_fin.net_profit:.2f}")
        print(f"      Margin %: {milk_fin.profit_margin_pct:.1f}%")
        print(f"      Stock Left: {milk_fin.current_stock}")

        assert milk_fin.total_revenue == 7.0, f"Expected 7.00 revenue, got {milk_fin.total_revenue}"
        assert milk_fin.total_cost == 4.0, f"Expected 4.00 cost, got {milk_fin.total_cost}"
        assert milk_fin.net_profit == 3.0, f"Expected 3.00 net profit, got {milk_fin.net_profit}"
        assert milk_fin.current_stock == 8, f"Expected 8 stock left, got {milk_fin.current_stock}"

        # 5. Verify Individual Product Sales Trend endpoint
        trend = await SalesService.get_product_sales_trend(db, business_id=biz.id, product_id=milk_prod.id, days=30)
        print(f"[VERIFIED] Individual Product Trend for 'Milk':")
        print(f"   Target Product: {trend.product_name}")
        print(f"   Total Revenue: ${trend.total_revenue:.2f}")
        print(f"   Trend Points Count: {len(trend.trend_points)}")
        assert trend.product_id == milk_prod.id
        assert len(trend.trend_points) >= 1

    print("\n==================================================")
    print("ALL POS & FINANCIAL ANALYTICS VERIFICATIONS PASSED!")
    print("==================================================")


if __name__ == "__main__":
    asyncio.run(run_verification())
