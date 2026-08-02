import csv
import io
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.models import ImportHistory, Inventory, Product, Sale, Supplier
from app.schemas.csv_import import (
    ColumnMapping,
    CSVPreviewResponse,
    CSVRowValidationError,
    ExtractedProductItem,
    ImportHistoryResponse,
    LastUploadStatusResponse,
)
from app.services.document_parser_service import DocumentParserService
from app.services.inventory_service import InventoryService
from app.services.product_service import ProductService
from app.services.supplier_service import SupplierService

logger = logging.getLogger("app.services.csv_import")


class CSVImportService:
    """
    Production-grade Document Import Pipeline handling Tabular & Unstructured Files,
    Per-Product Additive Inventory Sync, Single-Transaction Database Commit, and Audit Trail.
    """

    @classmethod
    async def process_and_preview(
        cls,
        db: AsyncSession,
        business_id: int,
        filename: str,
        content_bytes: bytes
    ) -> CSVPreviewResponse:
        """
        Runs document parsing, AI entity extraction, DB stock comparison, and missing data check.
        """
        return await DocumentParserService.parse_and_extract(
            db=db, business_id=business_id, filename=filename, content_bytes=content_bytes
        )

    @classmethod
    async def confirm_and_import(
        cls,
        db: AsyncSession,
        business_id: int,
        user_id: int,
        filename: str,
        extracted_items: List[ExtractedProductItem]
    ) -> ImportHistoryResponse:
        """
        Executes single-transaction database commit with PER-PRODUCT ADDITIVE STOCK SYNC:
        - If Product exists: inventory.current_stock += newly_arrived_qty (e.g., 5 Milk + 5 Milk = 10 Milk).
        - If Product does NOT exist: Creates Product & Inventory records.
        """
        rows_imported = 0
        rows_failed = 0
        error_logs = []

        fmt = DocumentParserService.detect_format(filename)
        logger.info(f"Executing additive inventory import for '{filename}' ({len(extracted_items)} items)...")

        try:
            for idx, item in enumerate(extracted_items, start=1):
                p_name = item.product_name.strip()
                if not p_name:
                    rows_failed += 1
                    error_logs.append({"row": idx, "error": "Missing product name"})
                    continue

                sku = item.sku.strip() if item.sku else ProductService.generate_sku(p_name)
                cat = item.category.strip() if item.category else "General"
                new_qty = max(0, item.quantity)
                b_val = max(0.0, item.buying_price)
                s_val = max(0.0, item.selling_price)

                # Expiry Date Parsing
                exp_date = DocumentParserService.parse_date(item.expiry_date) if hasattr(DocumentParserService, 'parse_date') and item.expiry_date else None
                if not exp_date and item.expiry_date:
                    try:
                        dt = datetime.strptime(item.expiry_date.strip(), "%Y-%m-%d")
                        exp_date = dt.replace(tzinfo=timezone.utc)
                    except Exception:
                        exp_date = None

                # Handle Supplier if present
                supplier_id = None
                if item.supplier_name and item.supplier_name.strip():
                    s_name = item.supplier_name.strip()
                    s_query = select(Supplier).where(
                        Supplier.business_id == business_id,
                        Supplier.name == s_name
                    )
                    s_res = await db.execute(s_query)
                    supplier_obj = s_res.scalar_one_or_none()
                    if not supplier_obj:
                        supplier_obj = Supplier(business_id=business_id, name=s_name)
                        db.add(supplier_obj)
                        await db.flush()
                    supplier_id = supplier_obj.id

                # Upsert Product
                p_query = select(Product).where(
                    Product.business_id == business_id,
                    Product.name.ilike(p_name)
                )
                p_res = await db.execute(p_query)
                product = p_res.scalar_one_or_none()

                if not product:
                    product = Product(
                        business_id=business_id,
                        sku=sku,
                        name=p_name,
                        category=cat
                    )
                    db.add(product)
                    await db.flush()
                else:
                    product.category = cat
                    if sku and not product.sku:
                        product.sku = sku

                # PER-PRODUCT ADDITIVE INVENTORY SYNC (5 + 5 = 10)
                inv_query = select(Inventory).where(
                    Inventory.business_id == business_id,
                    Inventory.product_id == product.id
                )
                inv_res = await db.execute(inv_query)
                inventory = inv_res.scalar_one_or_none()

                if not inventory:
                    # New Product Stock Creation
                    status = InventoryService.calculate_status(new_qty, 5, 100, exp_date)
                    inventory = Inventory(
                        business_id=business_id,
                        product_id=product.id,
                        supplier_id=supplier_id,
                        current_stock=new_qty,
                        buying_price=b_val,
                        selling_price=s_val,
                        expiry_date=exp_date,
                        status=status
                    )
                    db.add(inventory)
                else:
                    # Existing Product Stock Additive Addition
                    updated_stock = inventory.current_stock + new_qty
                    status = InventoryService.calculate_status(updated_stock, 5, 100, exp_date or inventory.expiry_date)
                    
                    inventory.current_stock = updated_stock
                    if b_val > 0.0:
                        inventory.buying_price = b_val
                    if s_val > 0.0:
                        inventory.selling_price = s_val
                    if supplier_id:
                        inventory.supplier_id = supplier_id
                    if exp_date:
                        inventory.expiry_date = exp_date
                    inventory.status = status

                rows_imported += 1

            # Log audit history record
            history = ImportHistory(
                business_id=business_id,
                user_id=user_id,
                filename=filename,
                rows_imported=rows_imported,
                rows_failed=rows_failed,
                status="Completed" if rows_failed == 0 else "Partial Failure",
                error_details={"file_format": fmt, "errors": error_logs} if error_logs else {"file_format": fmt}
            )
            db.add(history)

            # Single-transaction database commit
            await db.commit()
            await db.refresh(history)

            logger.info(f"Document import committed successfully: {rows_imported} items synced additively, {rows_failed} failed.")
            return history

        except Exception as e:
            await db.rollback()
            logger.error(f"Document import transaction failed for '{filename}': {e}. Rolled back.")
            
            history = ImportHistory(
                business_id=business_id,
                user_id=user_id,
                filename=filename,
                rows_imported=0,
                rows_failed=len(extracted_items),
                status="Rolled back",
                error_details={"file_format": fmt, "exception": str(e)}
            )
            db.add(history)
            await db.commit()
            await db.refresh(history)

            return history

    @staticmethod
    async def get_import_history(
        db: AsyncSession, business_id: int
    ) -> List[ImportHistory]:
        """Retrieve audit history log of imports for a business."""
        query = (
            select(ImportHistory)
            .where(ImportHistory.business_id == business_id)
            .order_by(ImportHistory.upload_time.desc())
        )
        result = await db.execute(query)
        return result.scalars().all()

    @staticmethod
    async def get_last_upload_status(
        db: AsyncSession, business_id: int
    ) -> LastUploadStatusResponse:
        """Returns the most recent upload audit summary for rendering the UI banner."""
        query = (
            select(ImportHistory)
            .where(ImportHistory.business_id == business_id)
            .order_by(ImportHistory.upload_time.desc())
            .limit(1)
        )
        result = await db.execute(query)
        last_rec = result.scalar_one_or_none()

        if not last_rec:
            return LastUploadStatusResponse(has_uploaded=False, items_imported=0, items_failed=0)

        file_fmt = "CSV"
        if isinstance(last_rec.error_details, dict):
            file_fmt = last_rec.error_details.get("file_format", "CSV")

        return LastUploadStatusResponse(
            has_uploaded=True,
            last_upload_time=last_rec.upload_time,
            filename=last_rec.filename,
            file_format=file_fmt,
            items_imported=last_rec.rows_imported,
            items_failed=last_rec.rows_failed,
            status=last_rec.status
        )
