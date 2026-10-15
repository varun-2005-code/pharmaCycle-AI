"""Pydantic schemas for Waste Items and Waste Events."""
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class WasteEventCreate(BaseModel):
    event_type: str = Field(..., max_length=100)
    target_status: str = Field(..., description="Target status in state machine")
    quantity: Optional[float] = None
    quantity_unit: Optional[str] = None
    actor: Optional[str] = Field("User", max_length=100)
    evidence_reference: Optional[str] = Field(None, max_length=255)
    demo_record: bool = False


class WasteEventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    waste_item_id: int
    event_type: str
    previous_status: Optional[str] = None
    new_status: str
    quantity: Optional[float] = None
    quantity_unit: Optional[str] = None
    timestamp: str
    actor: Optional[str] = None
    evidence_reference: Optional[str] = None
    demo_record: bool = False


class WasteItemCreate(BaseModel):
    visual_category: str = Field(..., max_length=100)
    confidence: Optional[float] = None
    model_mode: str = Field("demo", max_length=50)
    expiry_date: Optional[str] = Field(None, max_length=50)
    expiry_confirmation_status: str = Field("unverified", max_length=50)
    material_type: Optional[str] = Field(None, max_length=100)
    user_notes: Optional[str] = None
    estimated_quantity: Optional[float] = Field(None, ge=0)
    quantity_unit: Optional[str] = Field(None, max_length=50)


class WasteItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    visual_category: str
    confidence: Optional[float] = None
    model_mode: str
    expiry_date: Optional[str] = None
    expiry_confirmation_status: str
    material_type: Optional[str] = None
    user_notes: Optional[str] = None
    estimated_quantity: Optional[float] = None
    quantity_unit: Optional[str] = None
    current_status: str
    created_at: str
    updated_at: str
    events: List[WasteEventResponse] = Field(default_factory=list)


class WasteItemListResponse(BaseModel):
    total: int
    items: List[WasteItemResponse]
