"""Health check endpoint for PharmaCycle AI Backend."""
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import get_db
from app.config import settings
from app.schemas.health import HealthResponse

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Health"])


@router.get("/health", response_model=HealthResponse, summary="Service and Database Health Check")
def health_check(db: Session = Depends(get_db)):
    """Returns the operational status of the API service and verifies database connectivity."""
    db_status = "connected"
    try:
        # Verify database connection with a minimal ping query
        db.execute(text("SELECT 1"))
    except Exception as e:
        logger.error(f"Health check database error: {e}")
        db_status = "disconnected"
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "status": "degraded",
                "database": "disconnected",
                "environment": settings.ENVIRONMENT,
                "version": "1.0.0",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "error": "Database connectivity check failed"
            }
        )

    return HealthResponse(
        status="healthy",
        database=db_status,
        environment=settings.ENVIRONMENT,
        version="1.0.0",
        timestamp=datetime.now(timezone.utc)
    )
