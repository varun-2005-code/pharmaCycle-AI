"""Schemas for AI Waste Identification and Category metadata."""
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class AnalyzeResponse(BaseModel):
    """Result of AI image classification."""
    predicted_category: str = Field(..., description="Detected visual waste category")
    confidence: Optional[float] = Field(None, description="Confidence score only if real model returned it")
    model_mode: str = Field(..., description="'demo' or 'real'")
    explanation: str = Field(..., description="Short explanation of prediction")
    uncertainty_notes: Optional[str] = Field(None, description="Limitations or uncertainty disclosure")
    suggested_next_action: str = Field(..., description="Suggested immediate next action")
    disclaimer: str = Field(..., description="Mandatory prototype safety disclaimer")
    detected_format: str = Field(..., description="Validated file format from magic bytes (jpeg, png, webp)")
    file_size_bytes: int = Field(..., description="Size of uploaded file in bytes")
    filename: str = Field(..., description="Original filename")
    waste_item_id: Optional[int] = Field(None, description="ID of created WasteItem if requested to save")


class CategoryDetail(BaseModel):
    name: str
    description: str
    typical_materials: str


class CategoriesResponse(BaseModel):
    """Available visual categories and active adapter metadata."""
    categories: List[str]
    details: List[CategoryDetail]
    active_model_mode: str
    supported_formats: List[str]
    max_upload_size_mb: float
    disclaimer: str
