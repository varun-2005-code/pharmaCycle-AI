"""Pydantic schemas for Grounded AI Disposal Assistant."""
from typing import List, Optional
from pydantic import BaseModel, Field


class ChatSource(BaseModel):
    title: str
    url: Optional[str] = None


class ChatMessage(BaseModel):
    role: str = Field(..., description="'user' or 'assistant'")
    content: str


class ChatRequest(BaseModel):
    message: str = Field(..., max_length=1000)
    history: Optional[List[ChatMessage]] = Field(default_factory=list)


class ChatResponse(BaseModel):
    reply: str
    mode: str = Field("rules_grounded", description="'rules_grounded' or 'llm_grounded'")
    sources: List[ChatSource] = Field(default_factory=list)
    disclaimer: str
    suggestions: List[str] = Field(default_factory=list)
