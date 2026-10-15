"""API routes for AI Waste Identification and Category Discovery."""
import os
import uuid
import logging
from typing import Optional
from fastapi import APIRouter, UploadFile, File, Form, Depends, status
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.waste_item import WasteItem
from app.services.image_validator import validate_image_upload, SUPPORTED_FORMATS
from app.services.classifier import (
    get_classifier,
    VALID_CATEGORIES,
    DISCLAIMER_TEXT,
    ClassificationResult
)
from app.schemas.analyze import AnalyzeResponse, CategoriesResponse, CategoryDetail

logger = logging.getLogger("pharmacycle.analyze_api")
router = APIRouter(tags=["Waste Identification"])

CATEGORY_DETAILS = [
    CategoryDetail(
        name="Medicine or tablet strip",
        description="Prescription or OTC blister strips, tablets, capsules containing active medicinal ingredients.",
        typical_materials="PVC/Aluminium blister, gelatin/cellulose capsules, active pharmaceutical compounds."
    ),
    CategoryDetail(
        name="Empty blister pack",
        description="Used push-through packaging pockets with foil peeled or tablets dispensed.",
        typical_materials="Bonded polymer-aluminium composite (PVC, PVDC, cold-form aluminium foil)."
    ),
    CategoryDetail(
        name="Medicine bottle or container",
        description="Bottles, vials, jars, and dropper dispensers for liquid and tablet medications.",
        typical_materials="Amber glass, HDPE, PET, polypropylene closures."
    ),
    CategoryDetail(
        name="Cardboard or paper pharmaceutical packaging",
        description="Outer printed boxes, cartons, and folded patient information leaflets.",
        typical_materials="Bleached or recycled paperboard, cellulose leaflet paper."
    ),
    CategoryDetail(
        name="Unknown or other",
        description="Unidentified or ambiguous pharmaceutical waste requiring manual safety review.",
        typical_materials="Unmarked composites, damaged tubes, or unclassified medical packaging."
    ),
]


@router.get("/categories", response_model=CategoriesResponse, summary="Get Visual Classification Categories")
def get_categories():
    """Retrieve all supported visual pharmaceutical waste categories and active adapter mode."""
    return CategoriesResponse(
        categories=VALID_CATEGORIES,
        details=CATEGORY_DETAILS,
        active_model_mode=settings.MODEL_MODE,
        supported_formats=sorted(list(SUPPORTED_FORMATS)),
        max_upload_size_mb=settings.MAX_UPLOAD_SIZE_BYTES / (1024 * 1024),
        disclaimer=DISCLAIMER_TEXT
    )


@router.post(
    "/analyze",
    response_model=AnalyzeResponse,
    status_code=status.HTTP_200_OK,
    summary="Analyze and Classify Pharmaceutical Waste Image"
)
async def analyze_waste_image(
    file: UploadFile = File(..., description="Uploaded image file (JPG, PNG, or WEBP)"),
    sample_category: Optional[str] = Form(
        None,
        description="Optional sample category for Demo Simulation mode"
    ),
    model_mode: Optional[str] = Form(
        None,
        description="Override model mode: 'demo' or 'real' (defaults to system setting)"
    ),
    save_record: bool = Form(
        False,
        description="Whether to persist a new WasteItem record in the database"
    ),
    db: Session = Depends(get_db)
):
    """Analyze an uploaded pharmaceutical packaging image.

    Validates:
    - Magic bytes signature (JPG, PNG, WEBP).
    - File size limit (configurable, default 5MB).
    - Image is not stored beyond processing unless RETAIN_UPLOADED_IMAGES is true.

    Returns:
    - Predicted visual category.
    - Confidence score (only if real model inference).
    - Model mode (explicitly labels 'demo' simulation).
    - Explanation and uncertainty disclosure.
    - Suggested next action.
    """
    filename = file.filename or "upload.jpg"
    logger.info(f"Received image analysis request for file: '{filename}'")

    # Read binary content
    content = await file.read()

    # 1. Server-side validation of file type (magic bytes) and size
    detected_format, file_size = validate_image_upload(
        content=content,
        filename=filename,
        max_size=settings.MAX_UPLOAD_SIZE_BYTES
    )

    # 2. Image retention policy (Section 8)
    # By default, images are processed purely in-memory.
    if settings.RETAIN_UPLOADED_IMAGES:
        os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
        unique_filename = f"{uuid.uuid4().hex}.{detected_format}"
        saved_path = os.path.join(settings.UPLOAD_DIR, unique_filename)
        with open(saved_path, "wb") as f:
            f.write(content)
        logger.info(f"Retained image saved to: {saved_path}")

    # 3. Invoke Pluggable Classifier Adapter (Section 4B)
    classifier = get_classifier(mode=model_mode)
    result: ClassificationResult = classifier.classify(
        image_bytes=content,
        filename=filename,
        sample_category=sample_category
    )

    waste_item_id = None
    if save_record:
        # Create and persist initial WasteItem
        item = WasteItem(
            visual_category=result.predicted_category,
            confidence=result.confidence,
            model_mode=result.model_mode,
            current_status="identified",
            user_notes=f"Identified via {result.model_mode} mode"
        )
        db.add(item)
        db.commit()
        db.refresh(item)
        waste_item_id = item.id
        logger.info(f"Created WasteItem ID={waste_item_id} with status='identified'")

    return AnalyzeResponse(
        predicted_category=result.predicted_category,
        confidence=result.confidence,
        model_mode=result.model_mode,
        explanation=result.explanation,
        uncertainty_notes=result.uncertainty_notes,
        suggested_next_action=result.suggested_next_action,
        disclaimer=result.disclaimer,
        detected_format=detected_format,
        file_size_bytes=file_size,
        filename=filename,
        waste_item_id=waste_item_id
    )
