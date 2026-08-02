import asyncio
import os
import sys
from datetime import datetime, timedelta, timezone

sys.stdout.reconfigure(encoding='utf-8')

# Ensure backend folder is in Python import path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "backend"))

from app.core.config import settings
from app.database.models import Base, User, Business, Product, Inventory, Sale
from app.services.smart_intelligence_service import SmartIntelligenceService
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
    print("VERIFYING XGBOOST SPOILAGE CLASSIFIER & FOOTFALL PREDICTOR")
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
                usr = User(email="test_xgboost@quadstock.ai", hashed_password="hashed_pass_test")
                db.add(usr)
                await db.flush()
            biz = Business(owner_id=usr.id, name="Test XGBoost Retail Store")
            db.add(biz)
            await db.commit()
            await db.refresh(biz)

        print(f"[OK] Test Business ID: {biz.id}")

        # 1. Clean existing test product "Yogurt"
        p_res = await db.execute(
            select(Product).where(Product.business_id == biz.id, Product.name.ilike("Yogurt"))
        )
        existing_p = p_res.scalar_one_or_none()
        if existing_p:
            await db.execute(delete(Sale).where(Sale.product_id == existing_p.id))
            await db.execute(delete(Inventory).where(Inventory.product_id == existing_p.id))
            await db.execute(delete(Product).where(Product.id == existing_p.id))
            await db.commit()

        # 2. Seed test product "Yogurt" expiring in 4 days with 12 units stock at cost $2.00
        expiry_4d = (datetime.now(timezone.utc) + timedelta(days=4)).date()
        yogurt_prod = Product(business_id=biz.id, sku="YOG-001", name="Yogurt", category="Dairy")
        db.add(yogurt_prod)
        await db.flush()

        yogurt_inv = Inventory(
            business_id=biz.id,
            product_id=yogurt_prod.id,
            current_stock=12,
            buying_price=2.0,
            selling_price=3.5,
            expiry_date=expiry_4d,
            status="Expiring Soon"
        )
        db.add(yogurt_inv)

        # 3. Seed sales transactions at 5:00 PM (17:00) to create peak traffic window
        now_utc = datetime.now(timezone.utc)
        peak_sale_time = datetime(now_utc.year, now_utc.month, now_utc.day, 17, 30, tzinfo=timezone.utc)
        for i in range(10):
            sale = Sale(
                business_id=biz.id,
                product_id=yogurt_prod.id,
                quantity=3,
                unit_price=3.5,
                buying_price=2.0,
                total_amount=10.5,
                sale_date=peak_sale_time
            )
            db.add(sale)

        await db.commit()
        print(f"[OK] Seeded 'Yogurt' expiring in 4 days (12 units, Cost: $2.00) & 10 sales records at 5:30 PM.")

        # 4. Test XGBoost Spoilage & Expiry Waste Classifier
        spoilage_risks = await SmartIntelligenceService.predict_spoilage_risks(db, business_id=biz.id)
        print(f"\n[VERIFIED] XGBoost Spoilage Waste Classifier Output:")
        print(f"   High Risk Items Count: {len(spoilage_risks)}")
        assert len(spoilage_risks) >= 1, "Expected at least 1 spoilage risk item"

        yogurt_spoilage = next(item for item in spoilage_risks if item.product_id == yogurt_prod.id)
        print(f"   Item: {yogurt_spoilage.product_name} ({yogurt_spoilage.sku})")
        print(f"   Days Left: {yogurt_spoilage.days_until_expiry} days")
        print(f"   Spoilage Risk: {yogurt_spoilage.spoilage_risk_pct}%")
        print(f"   Potential Loss at Risk: ${yogurt_spoilage.potential_loss:.2f}")
        print(f"   Recommended Discount: {yogurt_spoilage.recommended_discount_pct}%")
        print(f"   Insight UX Copy: '{yogurt_spoilage.recommendation_text}'")

        assert yogurt_spoilage.current_stock == 12
        assert yogurt_spoilage.potential_loss == 24.0, f"Expected potential loss $24.00, got ${yogurt_spoilage.potential_loss}"
        assert yogurt_spoilage.spoilage_risk_pct >= 50.0

        # 5. Test XGBoost Hourly Store Footfall & Busy-Hours Predictor
        footfall_pred = await SmartIntelligenceService.predict_hourly_footfall(db, business_id=biz.id)
        print(f"\n[VERIFIED] XGBoost Hourly Store Footfall Predictor Output:")
        print(f"   Peak Hours Window: {footfall_pred.peak_hours_window}")
        print(f"   Predicted Surge: +{footfall_pred.predicted_surge_pct:.1f}%")
        print(f"   Recommended Checkout Staffing: {footfall_pred.recommended_staffing} active registers")
        print(f"   Insight UX Copy: '{footfall_pred.insight_text}'")

        assert footfall_pred.has_sufficient_data == True
        assert footfall_pred.recommended_staffing >= 2

    print("\n==================================================")
    print("ALL XGBOOST SMART INTELLIGENCE VERIFICATIONS PASSED!")
    print("==================================================")


if __name__ == "__main__":
    asyncio.run(run_verification())
