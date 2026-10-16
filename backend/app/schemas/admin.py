"""Pydantic schemas for Admin Management Console."""
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class DisposalRuleCreate(BaseModel):
    waste_category: str = Field(..., max_length=100)
    location_scope: str = Field("General", max_length=100)
    recommended_action: str
    handling_cautions: Optional[str] = None
    source_title: Optional[str] = Field(None, max_length=255)
    source_url: Optional[str] = Field(None, max_length=500)
    verification_status: str = Field("verified", max_length=50)


class DisposalRuleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    waste_category: str
    location_scope: str
    recommended_action: str
    handling_cautions: Optional[str] = None
    source_title: Optional[str] = None
    source_url: Optional[str] = None
    verification_status: str
    last_verified_at: Optional[str] = None


class AdminEventCreate(BaseModel):
    waste_item_id: int
    event_type: str = Field(..., max_length=100)
    previous_status: Optional[str] = None
    new_status: str = Field(..., max_length=50)
    quantity: Optional[float] = None
    quantity_unit: Optional[str] = None
    actor: str = Field(..., max_length=100)
    evidence_reference: str = Field(..., max_length=255)
    demo_record: bool = False


class AdminStatsResponse(BaseModel):
    total_facilities: int
    verified_facilities: int
    total_rules: int
    total_items: int
    total_events: int


class VerificationStatusUpdate(BaseModel):
    verification_status: str = Field(..., pattern="^(verified|unverified)$")

