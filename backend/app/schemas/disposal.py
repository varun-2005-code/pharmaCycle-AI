"""Pydantic schemas for Disposal Recommendations and Disposal Guide."""
from typing import List, Optional
from pydantic import BaseModel, Field


class DisposalRecommendRequest(BaseModel):
    waste_category: str = Field(..., description="Visual or confirmed category of waste")
    material_type: Optional[str] = Field(None, description="Packaging material if known (e.g., PVC/Alu, Glass)")
    expiry_status: Optional[str] = Field(None, description="Expiry status: expired, not_expired, unverified")
    location: Optional[str] = Field(None, description="User location, city, or PIN code")
    user_notes: Optional[str] = Field(None, description="Additional context from user")


class FacilitySummary(BaseModel):
    id: int
    name: str
    city: str
    address: str
    accepted_categories: str
    verification_status: str
    contact_details: Optional[str] = None
    operating_hours: Optional[str] = None


class DisposalRecommendResponse(BaseModel):
    waste_category: str
    recommended_action: str
    why_suggested: str
    handling_cautions: str
    applicable_location: str
    source_title: Optional[str] = None
    source_url: Optional[str] = None
    verification_status: str = "verified"
    last_verified_at: Optional[str] = None
    confidence_explanation: str
    matched_rule_id: Optional[int] = None
    eligible_facilities: List[FacilitySummary] = Field(default_factory=list)


class DisposalGuideArticle(BaseModel):
    id: str
    category: str
    title: str
    common_materials: str
    appropriate_route: str
    what_not_to_do: str
    depends_on_local_rules: str
    source_title: Optional[str] = None
    source_url: Optional[str] = None
    verification_status: str = "verified"


class DisposalGuideResponse(BaseModel):
    total_articles: int
    articles: List[DisposalGuideArticle]
