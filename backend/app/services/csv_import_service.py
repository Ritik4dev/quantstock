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
    ImportHistoryResponse,
)
from app.services.inventory_service import InventoryService
from app.services.product_service import ProductService
from app.services.supplier_service import SupplierService

logger = logging.getLogger("app.services.csv_import")

# Column Header Variation Dictionary
COLUMN_VARIATIONS = {
    "product_name": ["product", "product name", "item", "item name", "name", "title"],
    "sku": ["sku", "stock keeping unit", "code", "item code", "barcode"],
    "category": ["category", "product category", "type", "group"],
    "stock": ["stock", "current stock", "remaining", "available", "quantity", "units", "qty"],
    "sold": ["sold", "sales", "sale quantity", "units sold"],
    "buying_price": ["cost", "buying price", "purchase price", "cost price", "buy price"],
    "selling_price": ["selling price", "price", "mrp", "retail price", "sale price"],
    "expiry": ["expiry", "expiry date", "exp date", "expiration date"],
    "supplier": ["supplier", "vendor", "supplier name", "vendor name"],
}


class CSVImportService:
    """
    Production-grade CSV Import Pipeline handling Encoding/Delimiter Detection,
    Fuzzy Column Mapping, Validation Engine, Preview, Single-Transaction Database Commit, and Audit Trail.
    """

    @staticmethod
    def detect_encoding(content_bytes: bytes) -> str:
        """Detect encoding (UTF-8, UTF-8-SIG, ASCII, ISO-8859-1)."""
        if content_bytes.startswith(b'\xef\xbb\xbf'):
            return "utf-8-sig"
        try:
            content_bytes.decode('utf-8')
            return "utf-8"
        except UnicodeDecodeError:
            return "latin1"

    @staticmethod
    def detect_delimiter(text_sample: str) -> str:
        """Detect delimiter (comma, semicolon, tab, pipe)."""
        try:
            sniffer = csv.Sniffer()
            dialect = sniffer.sniff(text_sample[:2048])
            return dialect.delimiter
        except Exception:
            # Fallback counts
            for delim in [',', ';', '\t', '|']:
                if text_sample.count(delim) > 2:
                    return delim
            return ','

    @staticmethod
    def map_columns(headers: List[str]) -> ColumnMapping:
        """Intelligently match CSV column headers to entity attributes."""
        normalized_headers = {h.strip().lower(): h.strip() for h in headers}
        mapping = ColumnMapping()

        for field_name, aliases in COLUMN_VARIATIONS.items():
            matched_header = None
            for alias in aliases:
                if alias in normalized_headers:
                    matched_header = normalized_headers[alias]
                    break
            
            if matched_header:
                if field_name == "product_name":
                    mapping.product_name_col = matched_header
                elif field_name == "sku":
                    mapping.sku_col = matched_header
                elif field_name == "category":
                    mapping.category_col = matched_header
                elif field_name == "stock":
                    mapping.stock_col = matched_header
                elif field_name == "sold":
                    mapping.sold_col = matched_header
                elif field_name == "buying_price":
                    mapping.buying_price_col = matched_header
                elif field_name == "selling_price":
                    mapping.selling_price_col = matched_header
                elif field_name == "expiry":
                    mapping.expiry_col = matched_header
                elif field_name == "supplier":
                    mapping.supplier_col = matched_header

        return mapping

    @staticmethod
    def parse_date(date_str: str) -> Optional[datetime]:
        """Parse date string into UTC datetime object."""
        if not date_str or not date_str.strip():
            return None
        date_str = date_str.strip()
        formats = [
            "%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y", "%Y/%m/%d",
            "%d-%m-%Y", "%m-%d-%Y", "%Y-%m-%d %H:%M:%S"
        ]
        for fmt in formats:
            try:
                dt = datetime.strptime(date_str, fmt)
                return dt.replace(tzinfo=timezone.utc)
            except ValueError:
                continue
        return None

    @classmethod
    async def process_and_preview(
        cls, filename: str, content_bytes: bytes
    ) -> CSVPreviewResponse:
        """
        Runs file validation, encoding/delimiter detection, column mapping, and row validation report.
        """
        encoding = cls.detect_encoding(content_bytes)
        text_content = content_bytes.decode(encoding, errors="replace")
        delimiter = cls.detect_delimiter(text_content)

        reader = csv.DictReader(io.StringIO(text_content), delimiter=delimiter)
        headers = reader.fieldnames or []

        mapping = cls.map_columns(headers)
        
        rows = list(reader)
        total_rows = len(rows)

        preview_data = []
        validation_errors = []
        valid_rows_count = 0

        seen_skus = set()
        seen_names = set()

        for idx, row in enumerate(rows, start=1):
            row_errors = []
            
            # Extract fields according to mapping
            p_name = row.get(mapping.product_name_col, "").strip() if mapping.product_name_col else ""
            sku = row.get(mapping.sku_col, "").strip() if mapping.sku_col else ""
            stock_str = row.get(mapping.stock_col, "0").strip() if mapping.stock_col else "0"
            sold_str = row.get(mapping.sold_col, "0").strip() if mapping.sold_col else "0"
            buying_str = row.get(mapping.buying_price_col, "0.0").strip() if mapping.buying_price_col else "0.0"
            selling_str = row.get(mapping.selling_price_col, "0.0").strip() if mapping.selling_price_col else "0.0"
            expiry_str = row.get(mapping.expiry_col, "").strip() if mapping.expiry_col else ""

            # Validation 1: Product Name Missing
            if not p_name:
                row_errors.append("Missing product name.")
            elif p_name.lower() in seen_names:
                row_errors.append(f"Duplicate product name '{p_name}' in CSV file.")
            else:
                seen_names.add(p_name.lower())

            # Validation 2: Duplicate SKU in file
            if sku:
                if sku.lower() in seen_skus:
                    row_errors.append(f"Duplicate SKU '{sku}' in CSV file.")
                else:
                    seen_skus.add(sku.lower())

            # Validation 3: Stock Value
            try:
                stock_val = int(float(stock_str)) if stock_str else 0
                if stock_val < 0:
                    row_errors.append("Negative stock quantity.")
            except ValueError:
                row_errors.append(f"Invalid numeric stock value '{stock_str}'.")

            # Validation 4: Prices
            try:
                buy_val = float(buying_str) if buying_str else 0.0
                if buy_val < 0:
                    row_errors.append("Negative buying price.")
            except ValueError:
                row_errors.append(f"Invalid buying price '{buying_str}'.")

            try:
                sell_val = float(selling_str) if selling_str else 0.0
                if sell_val < 0:
                    row_errors.append("Negative selling price.")
            except ValueError:
                row_errors.append(f"Invalid selling price '{selling_str}'.")

            # Validation 5: Expiry Date
            if expiry_str:
                parsed_exp = cls.parse_date(expiry_str)
                if not parsed_exp:
                    row_errors.append(f"Invalid expiry date format '{expiry_str}'.")

            if row_errors:
                validation_errors.append(CSVRowValidationError(
                    row_number=idx, raw_data=dict(row), error_messages=row_errors
                ))
            else:
                valid_rows_count += 1
                if len(preview_data) < 10:
                    preview_data.append(dict(row))

        invalid_rows_count = len(validation_errors)
        is_ready = valid_rows_count > 0

        return CSVPreviewResponse(
            filename=filename,
            total_rows=total_rows,
            valid_rows_count=valid_rows_count,
            invalid_rows_count=invalid_rows_count,
            column_mapping=mapping,
            detected_headers=headers,
            preview_data=preview_data,
            validation_errors=validation_errors,
            is_ready_for_import=is_ready
        )

    @classmethod
    async def confirm_and_import(
        cls,
        db: AsyncSession,
        business_id: int,
        user_id: int,
        filename: str,
        content_bytes: bytes,
        mapping: ColumnMapping
    ) -> ImportHistoryResponse:
        """
        Executes single-transaction database insertion of Products, Inventory, Suppliers, and Sales.
        Rolls back database state completely if any step fails. Logs result in ImportHistory.
        """
        encoding = cls.detect_encoding(content_bytes)
        text_content = content_bytes.decode(encoding, errors="replace")
        delimiter = cls.detect_delimiter(text_content)

        reader = csv.DictReader(io.StringIO(text_content), delimiter=delimiter)
        rows = list(reader)

        rows_imported = 0
        rows_failed = 0
        error_logs = []

        try:
            for idx, row in enumerate(rows, start=1):
                p_name = row.get(mapping.product_name_col, "").strip() if mapping.product_name_col else ""
                if not p_name:
                    rows_failed += 1
                    error_logs.append({"row": idx, "error": "Missing product name"})
                    continue

                sku = row.get(mapping.sku_col, "").strip() if mapping.sku_col else None
                if not sku:
                    sku = ProductService.generate_sku(p_name)

                cat = row.get(mapping.category_col, "General").strip() if mapping.category_col else "General"
                
                stock_val = int(float(row.get(mapping.stock_col, 0))) if mapping.stock_col and row.get(mapping.stock_col) else 0
                sold_val = int(float(row.get(mapping.sold_col, 0))) if mapping.sold_col and row.get(mapping.sold_col) else 0
                buy_val = float(row.get(mapping.buying_price_col, 0.0)) if mapping.buying_price_col and row.get(mapping.buying_price_col) else 0.0
                sell_val = float(row.get(mapping.selling_price_col, 0.0)) if mapping.selling_price_col and row.get(mapping.selling_price_col) else 0.0
                exp_date = cls.parse_date(row.get(mapping.expiry_col, "")) if mapping.expiry_col else None
                supplier_name = row.get(mapping.supplier_col, "").strip() if mapping.supplier_col else None

                # Handle Supplier
                supplier_id = None
                if supplier_name:
                    s_query = select(Supplier).where(
                        Supplier.business_id == business_id,
                        Supplier.name == supplier_name
                    )
                    s_res = await db.execute(s_query)
                    supplier_obj = s_res.scalar_one_or_none()
                    if not supplier_obj:
                        supplier_obj = Supplier(business_id=business_id, name=supplier_name)
                        db.add(supplier_obj)
                        await db.flush()
                    supplier_id = supplier_obj.id

                # Upsert Product
                p_query = select(Product).where(
                    Product.business_id == business_id,
                    Product.name == p_name
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
                    if sku:
                        product.sku = sku

                # Upsert Inventory
                status = InventoryService.calculate_status(stock_val, 5, 100, exp_date)
                inv_query = select(Inventory).where(
                    Inventory.business_id == business_id,
                    Inventory.product_id == product.id
                )
                inv_res = await db.execute(inv_query)
                inventory = inv_res.scalar_one_or_none()

                if not inventory:
                    inventory = Inventory(
                        business_id=business_id,
                        product_id=product.id,
                        supplier_id=supplier_id,
                        current_stock=stock_val,
                        buying_price=buy_val,
                        selling_price=sell_val,
                        expiry_date=exp_date,
                        status=status
                    )
                    db.add(inventory)
                else:
                    inventory.current_stock = stock_val
                    inventory.buying_price = buy_val
                    inventory.selling_price = sell_val
                    inventory.supplier_id = supplier_id
                    inventory.expiry_date = exp_date
                    inventory.status = status

                # Record Sales if sold quantity > 0
                if sold_val > 0:
                    sale = Sale(
                        business_id=business_id,
                        product_id=product.id,
                        quantity=sold_val,
                        unit_price=sell_val,
                        buying_price=buy_val,
                        total_amount=round(sold_val * sell_val, 2)
                    )
                    db.add(sale)

                rows_imported += 1

            # Save import history record
            history = ImportHistory(
                business_id=business_id,
                user_id=user_id,
                filename=filename,
                rows_imported=rows_imported,
                rows_failed=rows_failed,
                status="Completed" if rows_failed == 0 else "Partial Failure",
                error_details=error_logs if error_logs else None
            )
            db.add(history)

            # Single-transaction commit
            await db.commit()
            await db.refresh(history)

            logger.info(f"CSV import completed for {filename}: {rows_imported} rows imported, {rows_failed} failed.")
            return history

        except Exception as e:
            await db.rollback()
            logger.error(f"CSV import transaction failed for {filename}: {e}. Rolled back transaction.")
            
            history = ImportHistory(
                business_id=business_id,
                user_id=user_id,
                filename=filename,
                rows_imported=0,
                rows_failed=len(rows),
                status="Rolled back",
                error_details={"exception": str(e)}
            )
            db.add(history)
            await db.commit()
            await db.refresh(history)

            return history

    @staticmethod
    async def get_import_history(
        db: AsyncSession, business_id: int
    ) -> List[ImportHistory]:
        """Retrieve audit history of CSV imports for a business."""
        query = (
            select(ImportHistory)
            .where(ImportHistory.business_id == business_id)
            .order_by(ImportHistory.upload_time.desc())
        )
        result = await db.execute(query)
        return result.scalars().all()
