import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.database.models import ChatSession, User
from app.database.session import get_db
from app.schemas.copilot import (
    ChatMessageSchema,
    ChatRequest,
    ChatResponse,
    ChatSessionHistoryResponse,
)
from app.services.business_service import BusinessService
from app.services.copilot_service import CopilotService

logger = logging.getLogger("app.api.chat")
router = APIRouter(prefix="/chat", tags=["AI Business Copilot Chat Pipeline"])

copilot_service = CopilotService()


async def get_user_first_business_id(db: AsyncSession, user_id: int) -> int:
    businesses = await BusinessService.get_user_businesses(db, owner_id=user_id)
    if not businesses:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No registered business found for user. Please create a business first."
        )
    return businesses[0].id


@router.post(
    "",
    response_model=ChatResponse,
    status_code=status.HTTP_200_OK,
    summary="Natural language Q&A with AI Business Copilot",
    description="Processes user questions, detects intent, gathers ground-truth database context, and returns reasoned responses via Groq API."
)
async def chat_with_copilot(
    payload: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> ChatResponse:
    business_id = await get_user_first_business_id(db, current_user.id)
    response = await copilot_service.process_chat(
        db=db,
        user_id=current_user.id,
        business_id=business_id,
        message_text=payload.message,
        session_id=payload.session_id
    )
    return response


@router.post(
    "/history",
    response_model=ChatSessionHistoryResponse,
    status_code=status.HTTP_200_OK,
    summary="Retrieve chat session history",
    description="Returns recent message history and summary for a given chat session."
)
async def get_chat_history(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> ChatSessionHistoryResponse:
    business_id = await get_user_first_business_id(db, current_user.id)
    
    query = (
        select(ChatSession)
        .where(ChatSession.session_id == session_id, ChatSession.business_id == business_id)
        .options(selectinload(ChatSession.messages))
    )
    res = await db.execute(query)
    session_obj = res.scalar_one_or_none()

    if not session_obj:
        raise HTTPException(status_code=404, detail="Chat session not found.")

    msgs = [
        ChatMessageSchema(
            role=m.role,
            content=m.content,
            intent=m.intent,
            created_at=m.created_at.isoformat()
        )
        for m in session_obj.messages
    ]

    return ChatSessionHistoryResponse(
        session_id=session_obj.session_id,
        title=session_obj.title,
        summary=session_obj.summary,
        messages=msgs
    )


@router.get(
    "/suggestions",
    response_model=List[str],
    status_code=status.HTTP_200_OK,
    summary="Get dynamic prompt suggestions",
    description="Returns recommended starter prompts for retail operations Q&A."
)
async def get_chat_suggestions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> List[str]:
    return [
        "What are my top recommended stock reorders today?",
        "Explain the 7-day predicted demand for my highest volume items.",
        "Which products have the highest stockout or expiration risk?",
        "Summarize my revenue, profit, and inventory health over the last 30 days."
    ]
