import csv
import io
import json
import logging
import re
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.models import Inventory, Product
from app.schemas.csv_import import (
    CSVPreviewResponse,
    CSVRowValidationError,
    ColumnMapping,
    ExtractedProductItem,
)
from app.services.groq_service import GroqService

logger = logging.getLogger("app.services.document_parser")

COLUMN_VARIATIONS = {
    "product_name": ["product", "product name", "item", "item name", "name", "title", "description"],
    "sku": ["sku", "stock keeping unit", "code", "item code", "barcode"],
    "category": ["category", "product category", "type", "group"],
    "stock": ["stock", "current stock", "remaining", "available", "quantity", "units", "qty", "count"],
    "sold": ["sold", "sales", "sale quantity", "units sold"],
    "buying_price": ["cost", "buying price", "purchase price", "cost price", "buy price", "cost/unit"],
    "selling_price": ["selling price", "price", "mrp", "retail price", "sale price", "unit price"],
    "expiry": ["expiry", "expiry date", "exp date", "expiration date"],
    "supplier": ["supplier", "vendor", "supplier name", "vendor name"],
}


class DocumentParserService:
    """
    Universal Multi-Format Document Parsing & AI Data Extraction Service.
    Supports CSV, Excel (.xlsx, .xls), PDF (.pdf), Images (.png, .jpg, .webp), and TXT (.txt).
    Uses Groq LLM (Qwen / Llama) for unstructured extraction and missing-field evaluation.
    """

    def __init__(self):
        self.groq = GroqService()

    @staticmethod
    def detect_format(filename: str) -> str:
        """Detect file format based on extension."""
        fname = filename.lower()
        if fname.endswith(".csv"):
            return "CSV"
        elif fname.endswith(".xlsx") or fname.endswith(".xls"):
            return "EXCEL"
        elif fname.endswith(".pdf"):
            return "PDF"
        elif fname.endswith((".png", ".jpg", ".jpeg", ".webp")):
            return "IMAGE"
        elif fname.endswith(".txt"):
            return "TXT"
        return "UNKNOWN"

    @classmethod
    async def parse_and_extract(
        cls,
        db: AsyncSession,
        business_id: int,
        filename: str,
        content_bytes: bytes
    ) -> CSVPreviewResponse:
        """
        Main entry point to parse multi-format file, extract items, check existing DB stock additively,
        and evaluate missing data for AI clarification.
        """
        fmt = cls.detect_format(filename)
        logger.info(f"Processing document upload: '{filename}', Format='{fmt}', Size={len(content_bytes)} bytes.")

        raw_items: List[Dict[str, Any]] = []

        if fmt in ["CSV", "TXT"]:
            raw_items = await cls._parse_tabular_csv(content_bytes)
        elif fmt == "EXCEL":
            raw_items = await cls._parse_excel(content_bytes)
        elif fmt in ["PDF", "IMAGE", "UNKNOWN"]:
            raw_items = await cls._parse_with_groq_ai(filename, content_bytes, fmt)

        # Fallback if empty tabular parse
        if not raw_items and fmt in ["CSV", "EXCEL"]:
            raw_items = await cls._parse_with_groq_ai(filename, content_bytes, fmt)

        # Standardize extracted items and calculate additive stock levels against current DB
        extracted_items, valid_count, invalid_count, validation_errors = await cls._build_additive_preview(
            db=db, business_id=business_id, raw_items=raw_items
        )

        # Missing data evaluation & AI clarification prompts
        requires_clarification, ask_expiry, missing_prompt, questions = cls._evaluate_missing_data(extracted_items)

        return CSVPreviewResponse(
            filename=filename,
            file_format=fmt,
            total_rows=len(raw_items),
            valid_rows_count=valid_count,
            invalid_rows_count=invalid_count,
            detected_headers=list(raw_items[0].keys()) if raw_items else [],
            preview_data=raw_items[:10],
            extracted_items=extracted_items,
            validation_errors=validation_errors,
            is_ready_for_import=valid_count > 0,
            requires_clarification=requires_clarification,
            missing_fields_prompt=missing_prompt,
            ask_expiry_date=ask_expiry,
            clarification_questions=questions
        )

    @staticmethod
    async def _parse_tabular_csv(content_bytes: bytes) -> List[Dict[str, Any]]:
        """Parses CSV text bytes into dict list using sniffer and header detection."""
        try:
            try:
                text = content_bytes.decode("utf-8-sig", errors="replace")
            except Exception:
                text = content_bytes.decode("latin1", errors="replace")

            first_lines = [l for l in text.splitlines() if l.strip()]
            delimiter = ","
            if first_lines:
                counts = {d: first_lines[0].count(d) for d in [",", ";", "\t", "|"]}
                best_d = max(counts, key=counts.get)
                if counts[best_d] > 0:
                    delimiter = best_d

            reader = csv.DictReader(io.StringIO(text), delimiter=delimiter)
            rows = []
            for row in reader:
                clean_row = {str(k).strip(): str(v).strip() for k, v in row.items() if k and v is not None}
                if clean_row and any(val for val in clean_row.values()):
                    rows.append(clean_row)
            return rows
        except Exception as e:
            logger.warning(f"Tabular CSV parse failed ({e}). Returning empty.")
            return []

    @staticmethod
    async def _parse_excel(content_bytes: bytes) -> List[Dict[str, Any]]:
        """Parses Excel bytes into list of dicts using pandas if available."""
        try:
            import pandas as pd
            df = pd.read_excel(io.BytesIO(content_bytes))
            df = df.fillna("")
            return df.to_dict(orient="records")
        except Exception as e:
            logger.warning(f"Pandas Excel parse failed ({e}). Falling back to text stream.")
            try:
                # Try raw text extraction fallback
                text_sample = content_bytes.decode("latin1", errors="ignore")
                clean_lines = [l.strip() for l in text_sample.split("\n") if len(l.strip()) > 10]
                return [{"raw_row": l} for l in clean_lines[:50]]
            except Exception:
                return []

    @classmethod
    def extract_text_from_pdf(cls, content_bytes: bytes) -> str:
        """Extract clean text from PDF bytes using pypdf and zlib fallback."""
        text_pages = []
        try:
            import pypdf
            reader = pypdf.PdfReader(io.BytesIO(content_bytes))
            for page in reader.pages:
                txt = page.extract_text()
                if txt and txt.strip():
                    text_pages.append(txt.strip())
        except Exception as e:
            logger.warning(f"pypdf extraction error: {e}")

        if text_pages:
            return "\n".join(text_pages)

        # Fallback zlib stream decompression
        try:
            import zlib
            streams = re.findall(b"stream[\r\n]+(.*?)[\r\n]+endstream", content_bytes, re.DOTALL)
            decompressed_text = []
            for s in streams:
                try:
                    decomp = zlib.decompress(s)
                    clean = re.sub(r"[^\x20-\x7E\t\n\r]", " ", decomp.decode("latin1", errors="ignore"))
                    clean_lines = [l.strip() for l in clean.split("\n") if len(l.strip()) > 3]
                    if clean_lines:
                        decompressed_text.append("\n".join(clean_lines))
                except Exception:
                    pass
            if decompressed_text:
                return "\n".join(decompressed_text)
        except Exception as e:
            logger.warning(f"zlib stream fallback error: {e}")

        # Final plain text fallback
        text_content = content_bytes.decode("latin1", errors="ignore")
        chunks = re.findall(r"[\x20-\x7E\t\n\r]{10,}", text_content)
        return "\n".join(chunks[:200]) if chunks else text_content[:4000]

    @classmethod
    async def _parse_with_groq_ai(
        cls, filename: str, content_bytes: bytes, file_format: str
    ) -> List[Dict[str, Any]]:
        """
        Uses Groq API (Qwen/Llama) to parse unstructured PDF text, receipts, images, or raw docs.
        Extracts structured JSON product list.
        """
        groq = GroqService()
        logger.info(f"Extracting document data via Groq AI for '{filename}' ({file_format})...")

        if file_format == "IMAGE":
            import base64
            b64_str = base64.b64encode(content_bytes).decode("utf-8")
            messages = [
                {"role": "system", "content": "You are a specialized retail image & receipt parser. Respond ONLY in valid JSON."},
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": f"Extract all product items, stock quantities, buying prices, and selling prices from this receipt image ({filename}). Return JSON with key 'items'."},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{b64_str}"
                            }
                        }
                    ]
                }
            ]
        else:
            if file_format == "PDF":
                sample_str = cls.extract_text_from_pdf(content_bytes)
            else:
                text_content = content_bytes.decode("latin1", errors="ignore")
                chunks = re.findall(r"[\x20-\x7E\t\n\r]{10,}", text_content)
                sample_str = "\n".join(chunks[:150]) if chunks else text_content[:2000]

            prompt = (
                f"You are an AI Document & Receipt Data Extractor for an Inventory System.\n"
                f"File Name: {filename}\nFile Format: {file_format}\n\n"
                f"Extracted Document Text:\n\"\"\"\n{sample_str[:4000]}\n\"\"\"\n\n"
                "Extract all products, inventory items, stock arrivals, prices, and suppliers from this document.\n"
                "Return a JSON object with key 'items' containing a list of items with keys:\n"
                "- product_name (string, required)\n"
                "- sku (string or null)\n"
                "- category (string, default 'General')\n"
                "- quantity (integer, default 1)\n"
                "- buying_price (float, default 0.0)\n"
                "- selling_price (float, default 0.0)\n"
                "- expiry_date (string YYYY-MM-DD or null)\n"
                "- supplier_name (string or null)"
            )

            messages = [
                {"role": "system", "content": "You are a specialized retail document & inventory parser. Respond ONLY in valid JSON."},
                {"role": "user", "content": prompt}
            ]

        try:
            res_dict = await groq.generate_json_completion(messages, model_override="qwen/qwen3.6-27b")
            items = res_dict.get("items") or res_dict.get("products") or res_dict.get("extracted_items") or []
            if isinstance(items, list):
                return items
        except Exception as e:
            logger.error(f"Groq document parsing failed ({e}). Returning heuristic fallback.")

        # Heuristic text fallback if LLM offline
        fallback_items = []
        lines = [l.strip() for l in sample_str.split("\n") if len(l.strip()) > 5]
        for line in lines[:20]:
            parts = line.split()
            if len(parts) >= 2:
                # Find integer quantity
                qty = 1
                for p in parts:
                    if p.isdigit():
                        qty = int(p)
                        break
                fallback_items.append({
                    "product_name": line[:50],
                    "quantity": qty,
                    "buying_price": 0.0,
                    "selling_price": 0.0
                })

        return fallback_items

    @classmethod
    async def _build_additive_preview(
        cls,
        db: AsyncSession,
        business_id: int,
        raw_items: List[Dict[str, Any]]
    ) -> Tuple[List[ExtractedProductItem], int, int, List[CSVRowValidationError]]:
        """
        Maps raw dict rows into ExtractedProductItem models, queries current PostgreSQL stock,
        and computes additive stock levels (existing_stock + newly_arrived_qty = new_total_stock).
        """
        extracted_items: List[ExtractedProductItem] = []
        valid_count = 0
        invalid_count = 0
        validation_errors: List[CSVRowValidationError] = []

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

        NAME_ALIASES = ["productname", "itemname", "product", "item", "name", "title", "description", "producttitle", "itemdescription", "details", "rawrow"]
        SKU_ALIASES = ["sku", "code", "itemcode", "barcode", "stockkeepingunit", "productcode", "skucode"]
        CAT_ALIASES = ["category", "productcategory", "type", "group", "dept", "department"]
        QTY_ALIASES = ["quantity", "qty", "stock", "currentstock", "units", "count", "available", "remaining", "newqty", "qtyarrived", "amount"]
        BUY_ALIASES = ["buyingprice", "cost", "buyingcost", "purchaseprice", "costprice", "buyprice", "costunit", "unitcost", "pricecost", "buying"]
        SELL_ALIASES = ["sellingprice", "price", "retailprice", "saleprice", "unitprice", "mrp", "rate", "priceunit", "selling"]
        EXP_ALIASES = ["expiry", "expirydate", "expdate", "expirationdate", "exp", "bestbefore"]
        SUP_ALIASES = ["supplier", "suppliername", "vendor", "vendorname", "distributor"]

        for idx, item in enumerate(raw_items, start=1):
            if not isinstance(item, dict):
                continue

            # Create normalized key mapping for robust lookup
            row_norm = {norm(k): v for k, v in item.items() if k is not None}

            # Extract product name using normalized aliases
            p_name = extract_val(row_norm, NAME_ALIASES)

            # Fallback if raw row string available
            if not p_name and "raw_row" in item:
                p_name = str(item["raw_row"])[:40]

            if not p_name:
                invalid_count += 1
                validation_errors.append(CSVRowValidationError(
                    row_number=idx, raw_data=item, error_messages=["Missing product name in row."]
                ))
                continue

            # Extract fields safely
            sku = extract_val(row_norm, SKU_ALIASES) or None
            cat = extract_val(row_norm, CAT_ALIASES) or "General"

            # Extract quantity
            qty_str = extract_val(row_norm, QTY_ALIASES)
            try:
                qty = int(float(qty_str)) if qty_str else 1
            except Exception:
                qty = 1

            # Extract prices
            b_price_str = extract_val(row_norm, BUY_ALIASES)
            try:
                b_price = float(b_price_str) if b_price_str else 0.0
            except Exception:
                b_price = 0.0

            s_price_str = extract_val(row_norm, SELL_ALIASES)
            try:
                s_price = float(s_price_str) if s_price_str else 0.0
            except Exception:
                s_price = 0.0

            exp_date = extract_val(row_norm, EXP_ALIASES) or None
            supplier = extract_val(row_norm, SUP_ALIASES) or None

            # Query existing PostgreSQL database for existing product stock
            existing_stock = 0
            is_existing = False

            # Search by SKU first if available, else by name
            db_product = None
            if sku:
                p_q = select(Product).where(Product.business_id == business_id, Product.sku == sku)
                db_res = await db.execute(p_q)
                db_product = db_res.scalar_one_or_none()

            if not db_product:
                p_q = select(Product).where(
                    Product.business_id == business_id,
                    Product.name.ilike(p_name)
                )
                db_res = await db.execute(p_q)
                db_product = db_res.scalar_one_or_none()

            if db_product:
                inv_q = select(Inventory).where(
                    Inventory.business_id == business_id,
                    Inventory.product_id == db_product.id
                )
                inv_res = await db.execute(inv_q)
                inv_obj = inv_res.scalar_one_or_none()
                if inv_obj:
                    existing_stock = inv_obj.current_stock
                    is_existing = True
                    # Preserve prices if missing in upload
                    if b_price == 0.0:
                        b_price = inv_obj.buying_price
                    if s_price == 0.0:
                        s_price = inv_obj.selling_price

            new_total = existing_stock + qty
            valid_count += 1

            extracted_items.append(ExtractedProductItem(
                product_name=p_name,
                sku=sku or (db_product.sku if db_product else None),
                category=cat,
                quantity=qty,
                buying_price=b_price,
                selling_price=s_price,
                expiry_date=exp_date,
                supplier_name=supplier,
                existing_stock=existing_stock,
                new_total_stock=new_total,
                is_existing_product=is_existing
            ))

        return extracted_items, valid_count, invalid_count, validation_errors

    @staticmethod
    def _evaluate_missing_data(
        items: List[ExtractedProductItem]
    ) -> Tuple[bool, bool, Optional[str], List[str]]:
        """
        Evaluates extracted items for missing attributes.
        Generates AI clarification prompt and asks optional expiry date question.
        """
        if not items:
            return False, False, None, []

        missing_prices = []
        missing_categories = []

        for item in items:
            if item.buying_price == 0.0 or item.selling_price == 0.0:
                missing_prices.append(item.product_name)
            if not item.category or item.category == "General":
                missing_categories.append(item.product_name)

        questions = []
        requires_clarification = False

        if missing_prices:
            requires_clarification = True
            questions.append(
                f"Some products like '{missing_prices[0]}' do not have selling or cost prices defined. "
                "Please enter prices to ensure revenue & profit calculations are accurate."
            )

        # Expiry Date Question Prompt
        ask_expiry = True
        questions.append(
            "Do any of your uploaded products have an expiry date? "
            "(If yes, please list the product names and expiry dates, or select 'No Expiry Dates')."
        )

        missing_prompt = (
            f"Found {len(items)} items in document. "
            f"{'Note: ' + ' '.join(questions) if questions else 'All key fields present.'}"
        )

        return requires_clarification or len(missing_prices) > 0, ask_expiry, missing_prompt, questions
