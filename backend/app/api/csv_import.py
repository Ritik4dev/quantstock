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
    ImportHistoryResponse,
)
from app.services.business_service import BusinessService
from app.services.csv_import_service import CSVImportService

logger = logging.getLogger("app.api.csv_import")
router = APIRouter(prefix="/upload", tags=["CSV Import Pipeline"])

# In-memory storage for active upload previews before confirmation
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
    "/csv",
    response_model=CSVPreviewResponse,
    status_code=status.HTTP_200_OK,
    summary="Upload & validate CSV file",
    description="Validates CSV headers, auto-maps columns, checks row data, and returns a detailed validation preview report."
)
async def upload_csv(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> CSVPreviewResponse:
    if not file.filename or not file.filename.endswith(".csv"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. Please upload a valid .csv file."
        )

    content = await file.read()
    if not content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded CSV file is empty."
        )

    preview_res = await CSVImportService.process_and_preview(file.filename, content)
    
    # Store session cache for confirmation step
    session_key = f"{current_user.id}_{file.filename}"
    _upload_sessions[session_key] = content

    return preview_res


@router.post(
    "/csv/confirm",
    response_model=ImportHistoryResponse,
    status_code=status.HTTP_200_OK,
    summary="Confirm and commit CSV import to PostgreSQL",
    description="Executes a single-transaction database commit of valid CSV products and inventory. Rolls back on error."
)
async def confirm_csv_import(
    request: CSVConfirmRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> ImportHistoryResponse:
    if not request.confirm:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Import confirmation set to False. CSV data was not saved."
        )

    business_id = await get_user_first_business_id(db, current_user.id)
    session_key = f"{current_user.id}_{request.filename}"

    content_bytes = _upload_sessions.get(session_key)
    if not content_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Upload session for file '{request.filename}' expired or not found. Please upload the CSV again."
        )

    history = await CSVImportService.confirm_and_import(
        db=db,
        business_id=business_id,
        user_id=current_user.id,
        filename=request.filename,
        content_bytes=content_bytes,
        mapping=request.column_mapping
    )

    # Clean up session
    _upload_sessions.pop(session_key, None)

    return history


@router.get(
    "/history",
    response_model=List[ImportHistoryResponse],
    status_code=status.HTTP_200_OK,
    summary="Get CSV import audit history",
    description="Retrieves history logs of previous CSV uploads and import operations."
)
async def get_import_history(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> List[ImportHistoryResponse]:
    business_id = await get_user_first_business_id(db, current_user.id)
    history_logs = await CSVImportService.get_import_history(db, business_id=business_id)
    return history_logs
