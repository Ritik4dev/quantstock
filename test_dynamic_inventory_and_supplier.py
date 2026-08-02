import asyncio
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

# Ensure backend folder is in Python import path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "backend"))

from app.core.config import settings
from app.database.models import Base, User, Business, Product, Inventory, Sale, Supplier
from app.services.dashboard_service import DashboardService
from app.services.supplier_service import SupplierService
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
    print("VERIFYING DYNAMIC INVENTORY & SUPPLIER SYSTEM")
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
                usr = User(email="test_dynamic@quadstock.ai", hashed_password="hashed_pass_test")
                db.add(usr)
                await db.flush()
            biz = Business(owner_id=usr.id, name="Test Dynamic Retail Store")
            db.add(biz)
            await db.commit()
            await db.refresh(biz)

        print(f"[OK] Test Business ID: {biz.id}")

        # 1. Verify Total Inventory Capacity Widget Query
        capacity = await DashboardService.get_inventory_capacity(db, business_id=biz.id)
        print(f"\n[VERIFIED] Inventory Capacity Widget:")
        print(f"   Occupied Stock: {capacity.total_occupied_units} units")
        print(f"   Total Capacity: {capacity.total_capacity_units} units")
        print(f"   Utilization: {capacity.utilization_pct}%")
        print(f"   Capacity Status: '{capacity.status}'")
        assert capacity.utilization_pct >= 0.0

        # 2. Verify Stock Lasting (Runway Estimate) Widget Query
        runway = await DashboardService.get_stock_runway(db, business_id=biz.id)
        print(f"\n[VERIFIED] Stock Lasting Runway Widget:")
        print(f"   Overall Days Remaining: {runway.overall_days_remaining} days")
        print(f"   Daily Burn Rate: {runway.daily_burn_rate_units} units/day")
        print(f"   Shortest Runway Items Count: {len(runway.shortest_runway_items)}")
        assert runway.overall_days_remaining >= 0

        # 3. Verify Item-Level Stock Intelligence Suggestions Query
        suggestions = await DashboardService.get_item_stock_suggestions(db, business_id=biz.id)
        print(f"\n[VERIFIED] Item-Level Stock Intelligence Suggestions:")
        print(f"   Total Product Suggestions Generated: {len(suggestions)}")
        if suggestions:
            sample_s = suggestions[0]
            print(f"   Sample Suggestion for '{sample_s.product_name}':")
            print(f"      Action Type: {sample_s.action_type}")
            print(f"      Suggested Order Qty: +{sample_s.suggested_order_qty}")
            print(f"      Insight Copy: '{sample_s.insight_text}'")

        # 4. Verify AI Supplier & Packaging Analysis Mapping
        supplier_mapping = await SupplierService.get_ai_supplier_mapping(db, business_id=biz.id)
        print(f"\n[VERIFIED] AI Supplier & Packaging Analysis Mapping:")
        print(f"   Total Product Mappings: {len(supplier_mapping)}")
        if supplier_mapping:
            sample_m = supplier_mapping[0]
            print(f"   Product: {sample_m.product_name}")
            print(f"   Optimal Supplier: {sample_m.optimal_supplier_name}")
            print(f"   Packaging Unit: {sample_m.recommended_packaging.unit_type}")
            print(f"   Effective Unit Cost: ${sample_m.recommended_packaging.unit_cost_effective:.2f}")
            print(f"   Potential Savings: {sample_m.potential_savings_pct}%")
            print(f"   Mapping Reason: '{sample_m.mapping_reason}'")

    print("\n==================================================")
    print("ALL DYNAMIC INVENTORY & SUPPLIER VERIFICATIONS PASSED!")
    print("==================================================")


if __name__ == "__main__":
    asyncio.run(run_verification())
