"""API endpoints for Expiry-Date OCR text extraction and user verification."""
import logging
from typing import Optional
from fastapi import APIRouter, UploadFile, File, Form, status

from app.config import settings
from app.services.image_validator import validate_image_upload
from app.services.ocr import ExpiryOcrService, OcrResult

logger = logging.getLogger("pharmacycle.ocr_api")
router = APIRouter(tags=["Expiry Date OCR"])


@router.post(
    "/ocr/expiry",
    response_model=OcrResult,
    status_code=status.HTTP_200_OK,
    summary="Extract Expiry Date via OCR with Manual Fallback"
)
async def extract_expiry_date(
    file: Optional[UploadFile] = File(None, description="Optional uploaded packaging image"),
    manual_date: Optional[str] = Form(None, description="User-entered manual date string (e.g. 12/2026)"),
    sample_text: Optional[str] = Form(None, description="Optional simulated text for testing/demo")
):
    """Extract visible expiry date text from packaging image with safety checks.

    - Distinguishes manufacturing dates from expiration dates.
    - Normalizes candidate date to standard format (MM/YYYY, DD/MM/YYYY).
    - Supports manual override when stamps are degraded or missing.
    """
    image_bytes = None
    if file:
        content = await file.read()
        if content:
            # Validate format (magic bytes) and size
            validate_image_upload(
                content=content,
                filename=file.filename or "scan.jpg",
                max_size=settings.MAX_UPLOAD_SIZE_BYTES
            )
            image_bytes = content

    result = ExpiryOcrService.process_image_or_override(
        image_bytes=image_bytes,
        manual_date=manual_date,
        sample_text=sample_text
    )

    return result
