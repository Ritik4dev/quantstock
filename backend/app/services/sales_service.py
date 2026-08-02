import logging
import re
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.models import ImportHistory, Inventory, Product, Sale, Supplier
from app.schemas.sales import (
    ExtractedSaleLine,
    FinancialAnalyticsSummary,
    POSCheckoutResponse,
    ProductFinancialItem,
    ProductSalesTrendResponse,
    ProductTrendPoint,
    SalesDocumentPreviewResponse,
)
from app.services.document_parser_service import DocumentParserService
from app.services.groq_service import GroqService
from app.services.holiday_service import HolidayService
from app.services.inventory_service import InventoryService
from app.services.product_service import ProductService
from app.services.weather_service import WeatherService

logger = logging.getLogger("app.services.sales")


class SalesService:
    """
    POS Barcode Billing, Auto-Inventory Stock Decrement, Multi-Format Sales Document Parser,
    and Per-Product Financial Analytics Engine.
    """

    @classmethod
    async def scan_and_checkout(
        cls,
        db: AsyncSession,
        business_id: int,
        barcode_or_sku: str,
        quantity: int = 1,
        custom_unit_price: Optional[float] = None,
        notes: Optional[str] = None
    ) -> POSCheckoutResponse:
        """
        Executes instant Barcode / POS Checkout Sale:
        - Finds Product by SKU, Barcode, or ID in PostgreSQL for target business.
        - Inserts Sale transaction record in PostgreSQL.
        - AUTO-DECREMENTS Inventory.current_stock (stock = max(0, stock - qty)).
        - Recalculates stock status (Healthy, Low Stock, Out of Stock).
        - Enriches transaction with weather & calendar context.
        """
        query_str = barcode_or_sku.strip()
        logger.info(f"Executing POS Barcode Checkout for '{query_str}', Qty={quantity}...")

        # Find Product by SKU or ID or exact Name
        db_product = None
        # Try ID if integer
        if query_str.isdigit():
            p_q = select(Product).where(Product.business_id == business_id, Product.id == int(query_str))
            res = await db.execute(p_q)
            db_product = res.scalar_one_or_none()

        if not db_product:
            p_q = select(Product).where(Product.business_id == business_id, Product.sku == query_str)
            res = await db.execute(p_q)
            db_product = res.scalar_one_or_none()

        if not db_product:
            p_q = select(Product).where(
                Product.business_id == business_id,
                Product.name.ilike(query_str)
            )
            res = await db.execute(p_q)
            db_product = res.scalar_one_or_none()

        if not db_product:
            # Fuzzy match fallback
            p_q = select(Product).where(
                Product.business_id == business_id,
                Product.name.ilike(f"%{query_str}%")
            ).limit(1)
            res = await db.execute(p_q)
            db_product = res.scalar_one_or_none()

        if not db_product:
            raise ValueError(f"Product with Barcode/SKU '{query_str}' not found in registered inventory.")

        # Fetch Inventory record
        inv_q = select(Inventory).where(
            Inventory.business_id == business_id,
            Inventory.product_id == db_product.id
        )
        inv_res = await db.execute(inv_q)
        inventory = inv_res.scalar_one_or_none()

        if not inventory:
            # Auto-create inventory record if missing
            inventory = Inventory(
                business_id=business_id,
                product_id=db_product.id,
                current_stock=0,
                buying_price=0.0,
                selling_price=10.0,
                status="Out Of Stock"
            )
            db.add(inventory)
            await db.flush()

        prev_stock = inventory.current_stock
        unit_price = custom_unit_price if (custom_unit_price and custom_unit_price > 0) else inventory.selling_price
        buying_price = inventory.buying_price
        total_amount = round(unit_price * quantity, 2)
        sale_now = datetime.now(timezone.utc)

        # 1. Insert Sale record in PostgreSQL
        sale = Sale(
            business_id=business_id,
            product_id=db_product.id,
            quantity=quantity,
            unit_price=unit_price,
            buying_price=buying_price,
            total_amount=total_amount,
            sale_date=sale_now
        )
        db.add(sale)

        # 2. AUTO-DECREMENT INVENTORY STOCK (stock = max(0, stock - qty))
        remaining_stock = max(0, prev_stock - quantity)
        inventory.current_stock = remaining_stock
        
        # Recalculate stock health status
        inventory.status = InventoryService.calculate_status(
            remaining_stock, inventory.minimum_stock, inventory.maximum_stock, inventory.expiry_date
        )

        # 3. Contextual Metadata Enrichment (Weather & Holiday)
        weather_cond = None
        is_holiday = False
        try:
            w_info = await WeatherService.get_current_and_forecast_weather(latitude=28.61, longitude=77.20)
            weather_cond = w_info.get("condition") or w_info.get("summary") or "Clear"
            h_info = HolidayService.get_holiday_info(target_date=sale_now)
            is_holiday = h_info.get("is_holiday", False)
        except Exception as e:
            logger.warning(f"Metadata enrichment skipped: {e}")

        await db.commit()
        await db.refresh(sale)
        await db.refresh(inventory)

        logger.info(f"POS Checkout complete for '{db_product.name}': Prev Stock={prev_stock}, Sold={quantity}, Remaining Stock={remaining_stock}.")

        return POSCheckoutResponse(
            sale_id=sale.id,
            product_id=db_product.id,
            product_name=db_product.name,
            sku=db_product.sku,
            quantity_sold=quantity,
            unit_price=unit_price,
            buying_price=buying_price,
            total_amount=total_amount,
            previous_stock=prev_stock,
            remaining_stock=remaining_stock,
            stock_status=inventory.status,
            sale_date=sale_now,
            weather_condition=weather_cond,
            is_holiday=is_holiday
        )

    @classmethod
    async def parse_sales_document(
        cls,
        db: AsyncSession,
        business_id: int,
        filename: str,
        content_bytes: bytes
    ) -> SalesDocumentPreviewResponse:
        """
        Parses multi-format sales files (CSV, Excel, PDF receipts, Images, TXT) via Groq AI extraction.
        Returns extracted sales lines for preview.
        """
        fmt = DocumentParserService.detect_format(filename)
        logger.info(f"Parsing sales document '{filename}' ({fmt})...")

        raw_sales: List[Dict[str, Any]] = []

        if fmt in ["CSV", "TXT"]:
            raw_sales = await DocumentParserService._parse_tabular_csv(content_bytes)
        elif fmt == "PDF":
            pdf_text = DocumentParserService.extract_text_from_pdf(content_bytes)
            # Try tabular parsing on PDF text if comma/tab/line structured
            if pdf_text and ("," in pdf_text or "\t" in pdf_text):
                raw_sales = await DocumentParserService._parse_tabular_csv(pdf_text.encode("utf-8"))

        if not raw_sales:
            # Fallback to Groq AI extraction
            groq = GroqService()
            if fmt == "PDF":
                sample_str = DocumentParserService.extract_text_from_pdf(content_bytes)
            else:
                text_content = content_bytes.decode("latin1", errors="ignore")
                chunks = re.findall(r"[\x20-\x7E\t\n\r]{10,}", text_content)
                sample_str = "\n".join(chunks[:150]) if chunks else text_content[:2000]

            prompt = (
                f"You are a Sales Receipt & Daily Register Data Extractor.\n"
                f"File Name: {filename}\nFile Format: {fmt}\n\n"
                f"Extracted Document Text:\n\"\"\"\n{sample_str[:4000]}\n\"\"\"\n\n"
                "Extract all completed sales transactions from this document.\n"
                "Return a JSON object with key 'sales' containing a list of sales lines with keys:\n"
                "- product_name (string, required)\n"
                "- sku (string or null)\n"
                "- quantity_sold (integer, default 1)\n"
                "- unit_price (float, default 0.0)\n"
                "- buying_price (float, default 0.0)\n"
                "- total_amount (float, default 0.0)\n"
                "- sale_date (string YYYY-MM-DD or null)"
            )

            messages = [
                {"role": "system", "content": "You are an expert sales transaction parser. Respond ONLY in valid JSON."},
                {"role": "user", "content": prompt}
            ]

            try:
                res_dict = await groq.generate_json_completion(messages)
                raw_sales = res_dict.get("sales") or res_dict.get("extracted_sales") or res_dict.get("items") or []
            except Exception as e:
                logger.error(f"Groq sales extraction failed: {e}")

        # Column Alias Normalization
        def norm(k: Any) -> str:
            if not k:
                return ""
            return str(k).strip('\ufeff"\' \t\r\n').lower().replace(" ", "").replace("_", "").replace("-", "")

        def extract_val(row_norm: Dict[str, Any], aliases: List[str]) -> str:
            for alias in aliases:
                if alias in row_norm and row_norm[alias] is not None:
                    val = str(row_norm[alias]).strip()
                    if val and val.lower() not in ("none", "null", "nan"):
                        return val
            return ""

        NAME_ALIASES = ["productname", "itemname", "product", "item", "name", "title", "description", "rawrow"]
        SKU_ALIASES = ["sku", "code", "itemcode", "barcode", "productcode"]
        QTY_ALIASES = ["quantitysold", "quantity", "qty", "unitsold", "count", "sold"]
        PRICE_ALIASES = ["unitprice", "sellingprice", "price", "rate", "mrp", "saleprice"]
        COST_ALIASES = ["buyingprice", "cost", "buyingcost", "purchaseprice", "costprice"]
        TOTAL_ALIASES = ["totalamount", "total", "amount", "revenue", "totalsale"]
        DATE_ALIASES = ["saledate", "date", "timestamp", "transactiondate", "time"]

        extracted_lines: List[ExtractedSaleLine] = []
        tot_rev = 0.0

        for item in raw_sales:
            if not isinstance(item, dict):
                continue

            row_norm = {norm(k): v for k, v in item.items() if k is not None}
            p_name = extract_val(row_norm, NAME_ALIASES) or str(item.get("product_name") or "Product").strip()

            if not p_name or p_name.lower() == "product":
                if "raw_row" in item:
                    p_name = str(item["raw_row"])[:40]

            sku = extract_val(row_norm, SKU_ALIASES) or None

            qty_str = extract_val(row_norm, QTY_ALIASES)
            try:
                qty = int(float(qty_str)) if qty_str else 1
            except Exception:
                qty = 1

            u_price_str = extract_val(row_norm, PRICE_ALIASES)
            try:
                u_price = float(u_price_str) if u_price_str else 0.0
            except Exception:
                u_price = 0.0

            b_price_str = extract_val(row_norm, COST_ALIASES)
            try:
                b_price = float(b_price_str) if b_price_str else 0.0
            except Exception:
                b_price = 0.0

            tot_str = extract_val(row_norm, TOTAL_ALIASES)
            try:
                tot = float(tot_str) if tot_str else (qty * u_price)
            except Exception:
                tot = qty * u_price

            tot_rev += tot
            s_date = extract_val(row_norm, DATE_ALIASES) or None

            extracted_lines.append(ExtractedSaleLine(
                product_name=p_name,
                sku=sku,
                quantity_sold=qty,
                unit_price=u_price,
                buying_price=b_price,
                total_amount=round(tot, 2),
                sale_date=s_date
            ))

        return SalesDocumentPreviewResponse(
            filename=filename,
            file_format=fmt,
            total_sales_count=len(extracted_lines),
            extracted_sales=extracted_lines,
            total_revenue_preview=round(tot_rev, 2),
            is_ready_for_import=len(extracted_lines) > 0
        )

    @classmethod
    async def confirm_sales_document_import(
        cls,
        db: AsyncSession,
        business_id: int,
        user_id: int,
        filename: str,
        extracted_sales: List[ExtractedSaleLine]
    ) -> ImportHistory:
        """
        Commits extracted sales transactions into PostgreSQL and AUTO-DECREMENTS Inventory stock per product.
        """
        rows_imported = 0
        rows_failed = 0
        fmt = DocumentParserService.detect_format(filename)

        try:
            for s in extracted_sales:
                if isinstance(s, dict):
                    raw_name = s.get("product_name") or s.get("name") or ""
                    p_name = str(raw_name).strip()
                    sku_raw = s.get("sku")
                    sku = str(sku_raw).strip() if sku_raw else ProductService.generate_sku(p_name or "Product")
                    qty = max(1, int(s.get("quantity_sold") or s.get("quantity") or 1))
                    u_price = max(0.0, float(s.get("unit_price") or s.get("price") or 0.0))
                    b_price = max(0.0, float(s.get("buying_price") or s.get("cost") or 0.0))
                    tot_amount = float(s.get("total_amount") or 0.0)
                    tot = round(qty * u_price, 2) if tot_amount == 0.0 else tot_amount
                else:
                    p_name = s.product_name.strip()
                    sku = s.sku.strip() if s.sku else ProductService.generate_sku(p_name or "Product")
                    qty = max(1, s.quantity_sold)
                    u_price = max(0.0, s.unit_price)
                    b_price = max(0.0, s.buying_price)
                    tot = round(qty * u_price, 2) if s.total_amount == 0.0 else s.total_amount

                if not p_name:
                    rows_failed += 1
                    continue

                # Find or Create Product
                p_q = select(Product).where(Product.business_id == business_id, Product.name.ilike(p_name))
                p_res = await db.execute(p_q)
                product = p_res.scalar_one_or_none()

                if not product:
                    product = Product(business_id=business_id, sku=sku, name=p_name, category="General")
                    db.add(product)
                    await db.flush()

                # Insert Sale
                sale = Sale(
                    business_id=business_id,
                    product_id=product.id,
                    quantity=qty,
                    unit_price=u_price,
                    buying_price=b_price,
                    total_amount=tot
                )
                db.add(sale)

                # AUTO-DECREMENT INVENTORY STOCK
                inv_q = select(Inventory).where(Inventory.business_id == business_id, Inventory.product_id == product.id)
                inv_res = await db.execute(inv_q)
                inventory = inv_res.scalar_one_or_none()

                if not inventory:
                    inventory = Inventory(
                        business_id=business_id,
                        product_id=product.id,
                        current_stock=0,
                        buying_price=b_price,
                        selling_price=u_price,
                        status="Out Of Stock"
                    )
                    db.add(inventory)
                else:
                    updated_stock = max(0, inventory.current_stock - qty)
                    inventory.current_stock = updated_stock
                    inventory.status = InventoryService.calculate_status(
                        updated_stock, inventory.minimum_stock, inventory.maximum_stock, inventory.expiry_date
                    )

                rows_imported += 1

            history = ImportHistory(
                business_id=business_id,
                user_id=user_id,
                filename=filename,
                rows_imported=rows_imported,
                rows_failed=rows_failed,
                status="Completed",
                error_details={"type": "sales_document_import", "file_format": fmt}
            )
            db.add(history)

            await db.commit()
            await db.refresh(history)

            return history

        except Exception as e:
            await db.rollback()
            logger.error(f"Sales document confirm failed: {e}. Rolled back.")
            raise e

    @classmethod
    async def get_per_product_financials(
        cls, db: AsyncSession, business_id: int
    ) -> FinancialAnalyticsSummary:
        """
        Runs SQL queries comparing buying price vs. selling price for every product:
        Computes per-product Revenue ($), Buying Cost ($), Net Profit ($), Profit Margin (%), Units Sold, and Stock Remaining.
        Also computes Overall Total Revenue ($), Total Cost ($), Total Profit ($), Net Margin (%), and Total Units Sold.
        """
        query = (
            select(
                Product.id,
                Product.name,
                Product.sku,
                func.coalesce(Product.category, "General"),
                func.coalesce(func.sum(Sale.quantity), 0).label("tot_qty"),
                func.coalesce(Inventory.buying_price, 0.0).label("b_price"),
                func.coalesce(Inventory.selling_price, 0.0).label("s_price"),
                func.coalesce(func.sum(Sale.total_amount), 0.0).label("tot_rev"),
                func.coalesce(func.sum(Sale.quantity * Sale.buying_price), 0.0).label("tot_cost"),
                func.coalesce(Inventory.current_stock, 0).label("stock"),
                func.coalesce(Inventory.status, "Out Of Stock").label("status")
            )
            .join(Sale, Product.id == Sale.product_id, isouter=True)
            .join(Inventory, Product.id == Inventory.product_id, isouter=True)
            .where(Product.business_id == business_id)
            .group_by(
                Product.id, Product.name, Product.sku, Product.category,
                Inventory.buying_price, Inventory.selling_price,
                Inventory.current_stock, Inventory.status
            )
            .order_by(func.coalesce(func.sum(Sale.total_amount), 0.0).desc())
        )

        result = await db.execute(query)
        rows = result.tuples().all()

        product_items: List[ProductFinancialItem] = []
        overall_rev = 0.0
        overall_cost = 0.0
        overall_qty = 0

        for row in rows:
            p_id, p_name, sku, cat, qty_sold, b_price, s_price, rev, cost, stock, status = row
            qty_sold = int(qty_sold)
            rev = float(rev)
            cost = float(cost)
            
            # If cost is 0 in sales table, calculate from inventory b_price
            if cost == 0.0 and qty_sold > 0:
                cost = float(b_price) * qty_sold

            net_profit = rev - cost
            margin_pct = (net_profit / rev * 100.0) if rev > 0 else 0.0

            overall_rev += rev
            overall_cost += cost
            overall_qty += qty_sold

            product_items.append(ProductFinancialItem(
                product_id=p_id,
                name=p_name,
                sku=sku,
                category=cat,
                units_sold=qty_sold,
                buying_price=round(float(b_price), 2),
                selling_price=round(float(s_price), 2),
                total_revenue=round(rev, 2),
                total_cost=round(cost, 2),
                net_profit=round(net_profit, 2),
                profit_margin_pct=round(margin_pct, 1),
                current_stock=int(stock),
                status=str(status)
            ))

        overall_profit = overall_rev - overall_cost
        overall_margin = (overall_profit / overall_rev * 100.0) if overall_rev > 0 else 0.0

        # Total Inventory Value SQL
        inv_val_query = select(
            func.coalesce(func.sum(Inventory.current_stock * Inventory.buying_price), 0.0)
        ).where(Inventory.business_id == business_id)
        tot_inv_val = (await db.execute(inv_val_query)).scalar() or 0.0

        return FinancialAnalyticsSummary(
            total_revenue=round(overall_rev, 2),
            total_cost=round(overall_cost, 2),
            total_profit=round(overall_profit, 2),
            overall_profit_margin_pct=round(overall_margin, 1),
            total_units_sold=overall_qty,
            total_inventory_value=round(float(tot_inv_val), 2),
            products=product_items
        )

    @classmethod
    async def get_product_sales_trend(
        cls, db: AsyncSession, business_id: int, product_id: int, days: int = 30
    ) -> ProductSalesTrendResponse:
        """
        Generates daily revenue ($), profit ($), units sold, and profit margin trend points
        for an individual product over given days.
        """
        p_q = select(Product).where(Product.business_id == business_id, Product.id == product_id)
        p_res = await db.execute(p_q)
        product = p_res.scalar_one_or_none()

        if not product:
            raise ValueError(f"Product ID #{product_id} not found.")

        now = datetime.now(timezone.utc)
        start_date = now - timedelta(days=days)
        date_col = func.date(Sale.sale_date)

        query = (
            select(
                date_col.label("date_label"),
                func.coalesce(func.sum(Sale.quantity), 0).label("units_sold"),
                func.coalesce(func.sum(Sale.total_amount), 0.0).label("revenue"),
                func.coalesce(func.sum((Sale.unit_price - Sale.buying_price) * Sale.quantity), 0.0).label("profit")
            )
            .where(
                Sale.business_id == business_id,
                Sale.product_id == product_id,
                Sale.sale_date >= start_date
            )
            .group_by(date_col)
            .order_by(date_col.asc())
        )

        result = await db.execute(query)
        rows = result.tuples().all()

        trend_points: List[ProductTrendPoint] = []
        tot_rev = 0.0
        tot_prof = 0.0
        tot_qty = 0

        for r in rows:
            d_lbl, qty_sold, rev, prof = r
            qty_sold = int(qty_sold)
            rev = float(rev)
            prof = float(prof)
            margin = (prof / rev * 100.0) if rev > 0 else 0.0

            tot_rev += rev
            tot_prof += prof
            tot_qty += qty_sold

            trend_points.append(ProductTrendPoint(
                date_label=str(d_lbl),
                units_sold=qty_sold,
                revenue=round(rev, 2),
                profit=round(prof, 2),
                margin_pct=round(margin, 1)
            ))

        avg_margin = (tot_prof / tot_rev * 100.0) if tot_rev > 0 else 0.0

        return ProductSalesTrendResponse(
            product_id=product.id,
            product_name=product.name,
            sku=product.sku,
            days=days,
            total_revenue=round(tot_rev, 2),
            total_profit=round(tot_prof, 2),
            total_units_sold=tot_qty,
            avg_margin_pct=round(avg_margin, 1),
            trend_points=trend_points
        )
