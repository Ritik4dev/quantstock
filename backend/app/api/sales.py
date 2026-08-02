import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.database.models import User
from app.database.session import get_db
from app.schemas.sales import (
    BarcodeScanRequest,
    FinancialAnalyticsSummary,
    ManualSaleRequest,
    POSCheckoutResponse,
    ProductSalesTrendResponse,
    SalesConfirmRequest,
    SalesDocumentPreviewResponse,
)
from app.services.business_service import BusinessService
from app.services.sales_service import SalesService

logger = logging.getLogger("app.api.sales")
router = APIRouter(prefix="/sales", tags=["POS Barcode Scanner & Financial Analytics Engine"])

# Session cache for uploaded sales previews
_sales_sessions = {}


async def get_user_first_business_id(db: AsyncSession, user_id: int) -> int:
    businesses = await BusinessService.get_user_businesses(db, owner_id=user_id)
    if not businesses:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No registered business found for user. Please create a business first."
        )
    return businesses[0].id


@router.post(
    "/scan",
    response_model=POSCheckoutResponse,
    status_code=status.HTTP_200_OK,
    summary="Execute instant Barcode / POS Checkout Sale",
    description="Scans SKU or barcode, registers Sale transaction in PostgreSQL, auto-decrements current stock in Inventory, and enriches transaction with weather context."
)
async def scan_pos_checkout(
    payload: BarcodeScanRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> POSCheckoutResponse:
    business_id = await get_user_first_business_id(db, current_user.id)
    try:
        res = await SalesService.scan_and_checkout(
            db=db,
            business_id=business_id,
            barcode_or_sku=payload.barcode_or_sku,
            quantity=payload.quantity,
            custom_unit_price=payload.custom_unit_price,
            notes=payload.notes
        )
        return res
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"POS checkout failed: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Checkout error: {e}")


@router.post(
    "/manual",
    response_model=POSCheckoutResponse,
    status_code=status.HTTP_200_OK,
    summary="Record manual sale transaction",
    description="Records sale transaction for selected product ID and auto-decrements stock."
)
async def record_manual_sale(
    payload: ManualSaleRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> POSCheckoutResponse:
    business_id = await get_user_first_business_id(db, current_user.id)
    try:
        res = await SalesService.scan_and_checkout(
            db=db,
            business_id=business_id,
            barcode_or_sku=str(payload.product_id),
            quantity=payload.quantity,
            custom_unit_price=payload.unit_price,
            notes=payload.notes
        )
        return res
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post(
    "/upload",
    response_model=SalesDocumentPreviewResponse,
    status_code=status.HTTP_200_OK,
    summary="Upload & parse multi-format sales document (CSV, Excel, PDF, Image, TXT)",
    description="Parses sales receipts or logs via Groq AI extraction and previews sales lines before batch committing to PostgreSQL."
)
async def upload_sales_document(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> SalesDocumentPreviewResponse:
    if not file.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No file selected.")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File is empty.")

    business_id = await get_user_first_business_id(db, current_user.id)

    preview_res = await SalesService.parse_sales_document(
        db=db, business_id=business_id, filename=file.filename, content_bytes=content
    )

    session_key = f"{current_user.id}_{file.filename}"
    _sales_sessions[session_key] = preview_res.extracted_sales

    return preview_res


@router.post(
    "/upload/confirm",
    status_code=status.HTTP_200_OK,
    summary="Confirm & commit sales document upload to PostgreSQL",
    description="Commits preview sales lines to PostgreSQL and auto-decrements inventory stock."
)
async def confirm_sales_upload(
    request: SalesConfirmRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if not request.confirm:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Confirmation is False.")

    business_id = await get_user_first_business_id(db, current_user.id)
    session_key = f"{current_user.id}_{request.filename}"

    sales_lines = request.extracted_sales or _sales_sessions.get(session_key)
    if not sales_lines:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Sales upload session expired.")

    history = await SalesService.confirm_sales_document_import(
        db=db,
        business_id=business_id,
        user_id=current_user.id,
        filename=request.filename,
        extracted_sales=sales_lines
    )

    _sales_sessions.pop(session_key, None)
    return {"message": "Sales records committed successfully!", "imported": history.rows_imported}


@router.get(
    "/financials",
    response_model=FinancialAnalyticsSummary,
    status_code=status.HTTP_200_OK,
    summary="Get per-product & overall financial revenue/profit metrics",
    description="Calculates per-product Buying Cost vs. Selling Price, Revenue, Net Profit, Profit Margin %, and Units Sold strictly from PostgreSQL."
)
async def get_financial_analytics(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> FinancialAnalyticsSummary:
    business_id = await get_user_first_business_id(db, current_user.id)
    return await SalesService.get_per_product_financials(db, business_id=business_id)


@router.get(
    "/product/{product_id}/trend",
    response_model=ProductSalesTrendResponse,
    status_code=status.HTTP_200_OK,
    summary="Get individual product revenue & profit trend over time",
    description="Generates daily/weekly revenue, profit, units sold, and margin % trend points for a specific target product."
)
async def get_individual_product_trend(
    product_id: int,
    days: int = Query(30, description="Time range in days"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> ProductSalesTrendResponse:
    business_id = await get_user_first_business_id(db, current_user.id)
    try:
        return await SalesService.get_product_sales_trend(
            db=db, business_id=business_id, product_id=product_id, days=days
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
