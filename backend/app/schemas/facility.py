"""Pydantic schemas for Collection Facilities."""
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class FacilityCreate(BaseModel):
    name: str = Field(..., max_length=255)
    address: str = Field(..., max_length=500)
    city: str = Field(..., max_length=100)
    postal_code: Optional[str] = Field(None, max_length=50)
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    contact_details: Optional[str] = Field(None, max_length=255)
    operating_hours: Optional[str] = Field(None, max_length=255)
    accepted_categories: List[str] = Field(default_factory=list)
    source_url: Optional[str] = Field(None, max_length=500)
    verification_status: str = Field("unverified", max_length=50)


class FacilityResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    address: str
    city: str
    postal_code: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    contact_details: Optional[str] = None
    operating_hours: Optional[str] = None
    accepted_categories: List[str]
    source_url: Optional[str] = None
    verification_status: str
    last_verified_at: Optional[str] = None
    is_example: bool = False


class FacilityListResponse(BaseModel):
    total: int
    facilities: List[FacilityResponse]
