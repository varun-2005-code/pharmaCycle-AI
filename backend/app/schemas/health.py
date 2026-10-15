"""Health check response schema."""
from datetime import datetime, timezone
from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str = Field(..., description="Overall service status", json_schema_extra={"example": "healthy"})
    database: str = Field(..., description="Database connectivity status", json_schema_extra={"example": "connected"})
    environment: str = Field(..., description="Application environment", json_schema_extra={"example": "development"})
    version: str = Field(..., description="API Version", json_schema_extra={"example": "1.0.0"})
    timestamp: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="Timestamp of health check"
    )
