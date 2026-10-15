"""Grounded AI Assistant API Endpoints."""
import logging
from fastapi import APIRouter, HTTPException

from app.schemas.assistant import ChatRequest, ChatResponse
from app.services.assistant_service import process_chat_message

logger = logging.getLogger("pharmacycle.api.assistant")
router = APIRouter()


@router.post("/assistant/chat", response_model=ChatResponse)
def chat_with_assistant(payload: ChatRequest):
    """
    Retrieval-grounded Q&A assistant for pharmaceutical waste disposal queries.
    Provides verifiable citations and strictly avoids medical advice or drug consumption recommendations.
    """
    try:
        response = process_chat_message(payload.message)
        return response
    except Exception as e:
        logger.error(f"Error handling assistant chat: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to generate assistant response.")
