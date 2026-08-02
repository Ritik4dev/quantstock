import asyncio
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

# Ensure backend folder is in Python import path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "backend"))

from app.core.config import settings
from app.database.models import Base, User, Business, Product, Inventory, ImportHistory
from app.services.document_parser_service import DocumentParserService
from app.services.csv_import_service import CSVImportService
from app.schemas.csv_import import ExtractedProductItem
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
    print("VERIFYING UNIVERSAL DOCUMENT & ADDITIVE INVENTORY")
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
                usr = User(email="test@quadstock.ai", hashed_password="hashed_pass_test")
                db.add(usr)
                await db.flush()
            biz = Business(owner_id=usr.id, name="Test Retail Business")
            db.add(biz)
            await db.commit()
            await db.refresh(biz)

        print(f"[OK] Test Business ID: {biz.id}")

        # 1. Clean existing test products "Milk" and "Almond Milk" for idempotent testing
        for p_name in ["Milk", "Almond Milk"]:
            p_res = await db.execute(
                select(Product).where(Product.business_id == biz.id, Product.name.ilike(p_name))
            )
            existing_p = p_res.scalar_one_or_none()
            if existing_p:
                await db.execute(delete(Inventory).where(Inventory.product_id == existing_p.id))
                await db.execute(delete(Product).where(Product.id == existing_p.id))
        await db.commit()

        # 2. Seed initial stock of 5 Milk
        milk_prod = Product(business_id=biz.id, sku="MILK-001", name="Milk", category="Dairy")
        db.add(milk_prod)
        await db.flush()

        milk_inv = Inventory(
            business_id=biz.id,
            product_id=milk_prod.id,
            current_stock=5,
            buying_price=2.0,
            selling_price=3.5,
            status="Healthy"
        )
        db.add(milk_inv)
        await db.commit()
        print(f"[OK] Initialized 'Milk' stock = 5 units")

        # 3. Simulate upload of invoice document containing 5 new Milk units + 10 new Almond Milk units
        incoming_items = [
            ExtractedProductItem(
                product_name="Milk",
                sku="MILK-001",
                category="Dairy",
                quantity=5,
                buying_price=2.0,
                selling_price=3.5,
                existing_stock=5,
                new_total_stock=10,
                is_existing_product=True
            ),
            ExtractedProductItem(
                product_name="Almond Milk",
                sku="ALM-001",
                category="Dairy",
                quantity=10,
                buying_price=3.0,
                selling_price=5.0,
                existing_stock=0,
                new_total_stock=10,
                is_existing_product=False
            )
        ]

        # 4. Execute confirm_and_import
        history = await CSVImportService.confirm_and_import(
            db=db,
            business_id=biz.id,
            user_id=biz.owner_id,
            filename="Invoice_August_2026.pdf",
            extracted_items=incoming_items
        )

        print(f"[OK] Import Completed: Status='{history.status}', Rows Imported={history.rows_imported}")

        # 5. Verify Additive Stock (5 initial + 5 newly arrived = 10)
        res = await db.execute(
            select(Inventory).where(Inventory.business_id == biz.id, Inventory.product_id == milk_prod.id)
        )
        updated_milk = res.scalar_one()
        print(f"[VERIFIED] Milk Stock after additive update: {updated_milk.current_stock} units (Expected: 10)")
        assert updated_milk.current_stock == 10, f"Expected 10, got {updated_milk.current_stock}"

        # 6. Verify New Product Creation
        res2 = await db.execute(
            select(Product).where(Product.business_id == biz.id, Product.name.ilike("Almond Milk"))
        )
        almond_p = res2.scalar_one()
        res3 = await db.execute(
            select(Inventory).where(Inventory.business_id == biz.id, Inventory.product_id == almond_p.id)
        )
        almond_inv = res3.scalar_one()
        print(f"[VERIFIED] Almond Milk Stock created: {almond_inv.current_stock} units (Expected: 10)")
        assert almond_inv.current_stock == 10

        # 7. Verify Last Upload Status Audit Banner service
        last_status = await CSVImportService.get_last_upload_status(db, business_id=biz.id)
        print(f"[VERIFIED] Last Upload Status Banner Data:")
        print(f"   Filename: '{last_status.filename}'")
        print(f"   Format: '{last_status.file_format}'")
        print(f"   Items Synced: {last_status.items_imported}")
        print(f"   Uploaded At: {last_status.last_upload_time}")
        assert last_status.has_uploaded == True
        assert last_status.filename == "Invoice_August_2026.pdf"

    print("\n==================================================")
    print("ALL VERIFICATIONS PASSED SUCCESSFULLY!")
    print("==================================================")


if __name__ == "__main__":
    asyncio.run(run_verification())
