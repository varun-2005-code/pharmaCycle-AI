"""Pydantic schemas for Grounded AI Disposal Assistant."""
from typing import List, Optional
from pydantic import BaseModel, Field


class ChatSource(BaseModel):
    title: str
    url: Optional[str] = None


class ChatMessage(BaseModel):
    role: str = Field(..., description="'user' or 'assistant'")
    content: str


class SuggestedAction(BaseModel):
    label: str
    action_type: str = Field(..., description="'navigate', 'prompt', 'emergency_call', or 'link'")
    payload: str = Field(..., description="Target path, phone number, prompt string, or URL")


class ChatContext(BaseModel):
    page: Optional[str] = None
    waste_category: Optional[str] = None
    item_id: Optional[int] = None
    user_location: Optional[str] = None


class ChatRequest(BaseModel):
    message: str = Field(..., max_length=1000)
    history: Optional[List[ChatMessage]] = Field(default_factory=list)
    context: Optional[ChatContext] = Field(default=None)


class ChatResponse(BaseModel):
    reply: str
    mode: str = Field("rules_grounded", description="'rules_grounded' or 'llm_grounded'")
    intent: Optional[str] = Field("disposal_query", description="Detected intent category")
    sources: List[ChatSource] = Field(default_factory=list)
    disclaimer: str
    suggestions: List[str] = Field(default_factory=list)
    actions: List[SuggestedAction] = Field(default_factory=list)
