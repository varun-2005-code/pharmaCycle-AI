"""Pydantic schemas for Digital Twin Dashboard and Analytics."""
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class StatusCounts(BaseModel):
    identified: int = 0
    awaiting_confirmation: int = 0
    collection_pending: int = 0
    collected: int = 0
    processed: int = 0


class DashboardSummaryResponse(BaseModel):
    total_items: int
    status_breakdown: StatusCounts
    total_events: int
    demo_items_count: int
    actual_items_count: int
    recent_events_count: int


class CategoryCount(BaseModel):
    category: str
    count: int
    percentage: float


class StatusCountItem(BaseModel):
    status: str
    label: str
    count: int


class TimelinePoint(BaseModel):
    date: str
    events: int
    identified: int
    collected: int
    processed: int


class QuantityMetrics(BaseModel):
    user_reported_units: float
    recorded_collected_units: float
    verified_processed_units: float
    note: str = "Recycled quantities are not inferred from detected items; strictly based on verified processing events."


class DashboardAnalyticsResponse(BaseModel):
    category_distribution: List[CategoryCount]
    status_distribution: List[StatusCountItem]
    timeline: List[TimelinePoint]
    quantities: QuantityMetrics
