import logging
from typing import List
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.database.models import User
from app.database.session import get_db
from app.schemas.csv_import import (
    CSVConfirmRequest,
    CSVPreviewResponse,
    DocumentClarificationAnswer,
    ExtractedProductItem,
    ImportHistoryResponse,
    LastUploadStatusResponse,
)
from app.services.business_service import BusinessService
from app.services.csv_import_service import CSVImportService

logger = logging.getLogger("app.api.csv_import")
router = APIRouter(prefix="/upload", tags=["Universal Document Upload Pipeline"])

# In-memory session cache for preview state before confirmation
_upload_sessions = {}


async def get_user_first_business_id(db: AsyncSession, user_id: int) -> int:
    businesses = await BusinessService.get_user_businesses(db, owner_id=user_id)
    if not businesses:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No registered business found for user. Please create a business first."
        )
    return businesses[0].id


@router.post(
    "/document",
    response_model=CSVPreviewResponse,
    status_code=status.HTTP_200_OK,
    summary="Upload & extract multi-format document (CSV, Excel, PDF, Image, TXT)",
    description="Parses tabular or unstructured files, extracts items via Groq AI, calculates additive stock preview, and evaluates missing attributes."
)
async def upload_document(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> CSVPreviewResponse:
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file has no filename."
        )

    content = await file.read()
    if not content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty."
        )

    clean_filename = os.path.basename(file.filename)
    business_id = await get_user_first_business_id(db, current_user.id)

    preview_res = await CSVImportService.process_and_preview(
        db=db, business_id=business_id, filename=clean_filename, content_bytes=content
    )

    # Store preview cache for confirmation / clarification step
    session_key = f"{current_user.id}_{clean_filename}"
    _upload_sessions[session_key] = preview_res.extracted_items
    _upload_sessions[f"{current_user.id}_{file.filename}"] = preview_res.extracted_items

    return preview_res


@router.post(
    "/csv",
    response_model=CSVPreviewResponse,
    status_code=status.HTTP_200_OK,
    summary="Upload & validate document (Legacy CSV route alias)",
)
async def upload_csv(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> CSVPreviewResponse:
    """Alias for /upload/document to preserve complete backward compatibility."""
    return await upload_document(file=file, current_user=current_user, db=db)


@router.post(
    "/clarify",
    response_model=CSVPreviewResponse,
    status_code=status.HTTP_200_OK,
    summary="Submit answers to AI missing data clarification chat",
    description="Updates preview extracted items with answers supplied by user in the interactive AI clarification chat."
)
async def clarify_document_data(
    payload: DocumentClarificationAnswer,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> CSVPreviewResponse:
    clean_filename = os.path.basename(payload.filename)
    business_id = await get_user_first_business_id(db, current_user.id)
    session_key = f"{current_user.id}_{clean_filename}"

    # Update session items with clarification input
    updated_items = payload.extracted_items

    # Apply global answers if provided
    answers = payload.answers or {}
    for item in updated_items:
        if "buying_price" in answers and (item.buying_price == 0.0 or item.buying_price is None):
            item.buying_price = float(answers["buying_price"])
        if "selling_price" in answers and (item.selling_price == 0.0 or item.selling_price is None):
            item.selling_price = float(answers["selling_price"])
        if "category" in answers and (not item.category or item.category == "General"):
            item.category = str(answers["category"])

    _upload_sessions[session_key] = updated_items
    _upload_sessions[f"{current_user.id}_{payload.filename}"] = updated_items

    return CSVPreviewResponse(
        filename=payload.filename,
        total_rows=len(updated_items),
        valid_rows_count=len(updated_items),
        invalid_rows_count=0,
        extracted_items=updated_items,
        is_ready_for_import=True,
        requires_clarification=False,
        missing_fields_prompt="All missing data clarified successfully by AI chat!"
    )


@router.post(
    "/confirm",
    response_model=ImportHistoryResponse,
    status_code=status.HTTP_200_OK,
    summary="Confirm and commit document import to PostgreSQL with additive stock sync",
    description="Executes a single-transaction database commit. Adds newly arrived quantity to existing product stock additively (5 + 5 = 10)."
)
@router.post(
    "/confirm-csv",
    response_model=ImportHistoryResponse,
    status_code=status.HTTP_200_OK,
    summary="Confirm and commit document import to PostgreSQL (Alias)",
)
async def confirm_document_import(
    request: CSVConfirmRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> ImportHistoryResponse:
    if not request.confirm:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Import confirmation set to False. Data was not saved."
        )

    clean_filename = os.path.basename(request.filename)
    business_id = await get_user_first_business_id(db, current_user.id)
    session_key = f"{current_user.id}_{clean_filename}"

    extracted_items = request.extracted_items or _upload_sessions.get(session_key) or _upload_sessions.get(f"{current_user.id}_{request.filename}")

    if not extracted_items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Upload session for file '{request.filename}' expired or not found. Please upload the file again."
        )

    history = await CSVImportService.confirm_and_import(
        db=db,
        business_id=business_id,
        user_id=current_user.id,
        filename=request.filename,
        extracted_items=extracted_items
    )

    # Clear session cache
    _upload_sessions.pop(session_key, None)

    return history


@router.post(
    "/csv/confirm",
    response_model=ImportHistoryResponse,
    status_code=status.HTTP_200_OK,
    summary="Confirm legacy CSV import route alias"
)
async def confirm_csv_import(
    request: CSVConfirmRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> ImportHistoryResponse:
    """Alias for /upload/confirm for backward compatibility."""
    return await confirm_document_import(request=request, current_user=current_user, db=db)


@router.get(
    "/last-status",
    response_model=LastUploadStatusResponse,
    status_code=status.HTTP_200_OK,
    summary="Get last document upload status and timestamp",
    description="Retrieves the most recent upload audit log summary for rendering the frontend UI status banner."
)
async def get_last_upload_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> LastUploadStatusResponse:
    business_id = await get_user_first_business_id(db, current_user.id)
    return await CSVImportService.get_last_upload_status(db, business_id=business_id)


@router.get(
    "/history",
    response_model=List[ImportHistoryResponse],
    status_code=status.HTTP_200_OK,
    summary="Get document import audit history log",
    description="Retrieves history logs of previous document uploads and import operations."
)
async def get_import_history(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> List[ImportHistoryResponse]:
    business_id = await get_user_first_business_id(db, current_user.id)
    return await CSVImportService.get_import_history(db, business_id=business_id)
