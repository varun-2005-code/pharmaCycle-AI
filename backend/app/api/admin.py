"""Admin Management Console API Endpoints for Development & Facility Management.

Per Section 4J of PROJECT_SPEC.md:
- Protected by a simple dev-only token from the environment variable (no hard-coded credentials).
- CRUD for facilities and disposal guidance.
- Verification status updates for facilities and rules.
- Recording collection and processing events.
- Delete record options for waste items per privacy policy.
"""
from typing import List, Optional
import json
from datetime import datetime, timezone
import logging
from fastapi import APIRouter, Depends, HTTPException, Header, Query, status
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.disposal_rule import DisposalRule
from app.models.collection_facility import CollectionFacility
from app.models.waste_item import WasteItem
from app.models.waste_event import WasteEvent
from app.schemas.admin import (
    DisposalRuleCreate,
    DisposalRuleResponse,
    AdminEventCreate,
    AdminStatsResponse,
    VerificationStatusUpdate
)
from app.schemas.facility import FacilityCreate, FacilityResponse
from app.schemas.waste import WasteEventResponse

logger = logging.getLogger("pharmacycle.api.admin")
router = APIRouter()


def verify_admin_key(
    x_admin_key: Optional[str] = Header(None, alias="X-Admin-Key"),
    admin_token: Optional[str] = Query(None, alias="admin_token")
):
    """
    Validates development admin authentication.
    Header: 'X-Admin-Key: <ADMIN_SECRET_KEY>' or query param '?admin_token=<ADMIN_SECRET_KEY>'.
    Must match the dev-only secret key configured in settings.ADMIN_SECRET_KEY.
    """
    key = x_admin_key or admin_token
    if not key or key != settings.ADMIN_SECRET_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized: Admin access requires valid X-Admin-Key header or admin_token parameter."
        )
    return True


def _parse_facility_response(fac: CollectionFacility) -> FacilityResponse:
    try:
        categories = json.loads(fac.accepted_categories)
        if not isinstance(categories, list):
            categories = [str(categories)]
    except Exception:
        categories = [c.strip() for c in fac.accepted_categories.split(",") if c.strip()]

    return FacilityResponse(
        id=fac.id,
        name=fac.name,
        address=fac.address,
        city=fac.city,
        postal_code=fac.postal_code,
        latitude=fac.latitude,
        longitude=fac.longitude,
        contact_details=fac.contact_details,
        operating_hours=fac.operating_hours,
        accepted_categories=categories,
        source_url=fac.source_url,
        verification_status=fac.verification_status,
        last_verified_at=fac.last_verified_at.isoformat() if fac.last_verified_at else None,
        is_example="example" in fac.name.lower() or "demo" in fac.name.lower()
    )


# -----------------------------------------------------------------------------
# Admin Stats
# -----------------------------------------------------------------------------

@router.get("/admin/stats", response_model=AdminStatsResponse)
def get_admin_stats(
    db: Session = Depends(get_db),
    _auth: bool = Depends(verify_admin_key)
):
    """Returns database summary statistics for admin console."""
    total_facs = db.query(CollectionFacility).count()
    verified_facs = db.query(CollectionFacility).filter(CollectionFacility.verification_status == "verified").count()
    total_rules = db.query(DisposalRule).count()
    total_items = db.query(WasteItem).count()
    total_events = db.query(WasteEvent).count()

    return AdminStatsResponse(
        total_facilities=total_facs,
        verified_facilities=verified_facs,
        total_rules=total_rules,
        total_items=total_items,
        total_events=total_events
    )


# -----------------------------------------------------------------------------
# Facilities CRUD (Admin Protected)
# -----------------------------------------------------------------------------

@router.get("/admin/facilities", response_model=List[FacilityResponse])
def list_admin_facilities(
    db: Session = Depends(get_db),
    _auth: bool = Depends(verify_admin_key)
):
    """Lists all facility records with verification details for admin review."""
    facs = db.query(CollectionFacility).order_by(CollectionFacility.id.asc()).all()
    return [_parse_facility_response(f) for f in facs]


@router.post("/admin/facilities", response_model=FacilityResponse, status_code=status.HTTP_201_CREATED)
def create_admin_facility(
    payload: FacilityCreate,
    db: Session = Depends(get_db),
    _auth: bool = Depends(verify_admin_key)
):
    """Admin endpoint to create a new collection facility."""
    fac = CollectionFacility(
        name=payload.name,
        address=payload.address,
        city=payload.city,
        postal_code=payload.postal_code,
        latitude=payload.latitude,
        longitude=payload.longitude,
        contact_details=payload.contact_details,
        operating_hours=payload.operating_hours,
        accepted_categories=json.dumps(payload.accepted_categories),
        source_url=payload.source_url,
        verification_status=payload.verification_status,
        last_verified_at=datetime.now(timezone.utc) if payload.verification_status == "verified" else None
    )
    db.add(fac)
    db.commit()
    db.refresh(fac)
    logger.info(f"Admin created facility #{fac.id}: '{fac.name}'")
    return _parse_facility_response(fac)


@router.put("/admin/facilities/{facility_id}", response_model=FacilityResponse)
def update_admin_facility(
    facility_id: int,
    payload: FacilityCreate,
    db: Session = Depends(get_db),
    _auth: bool = Depends(verify_admin_key)
):
    """Admin endpoint to update facility information."""
    fac = db.query(CollectionFacility).filter(CollectionFacility.id == facility_id).first()
    if not fac:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Facility with ID {facility_id} not found."
        )

    fac.name = payload.name
    fac.address = payload.address
    fac.city = payload.city
    fac.postal_code = payload.postal_code
    fac.latitude = payload.latitude
    fac.longitude = payload.longitude
    fac.contact_details = payload.contact_details
    fac.operating_hours = payload.operating_hours
    fac.accepted_categories = json.dumps(payload.accepted_categories)
    fac.source_url = payload.source_url
    fac.verification_status = payload.verification_status
    if payload.verification_status == "verified":
        fac.last_verified_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(fac)
    logger.info(f"Admin updated facility #{fac.id}")
    return _parse_facility_response(fac)


@router.patch("/admin/facilities/{facility_id}/verification", response_model=FacilityResponse)
def update_facility_verification(
    facility_id: int,
    payload: VerificationStatusUpdate,
    db: Session = Depends(get_db),
    _auth: bool = Depends(verify_admin_key)
):
    """Admin endpoint to update facility verification status."""
    fac = db.query(CollectionFacility).filter(CollectionFacility.id == facility_id).first()
    if not fac:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Facility with ID {facility_id} not found."
        )

    fac.verification_status = payload.verification_status
    fac.last_verified_at = datetime.now(timezone.utc) if payload.verification_status == "verified" else None
    db.commit()
    db.refresh(fac)
    logger.info(f"Admin updated facility #{fac.id} verification to '{fac.verification_status}'")
    return _parse_facility_response(fac)


@router.delete("/admin/facilities/{facility_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_admin_facility(
    facility_id: int,
    db: Session = Depends(get_db),
    _auth: bool = Depends(verify_admin_key)
):
    """Admin endpoint to delete a collection facility."""
    fac = db.query(CollectionFacility).filter(CollectionFacility.id == facility_id).first()
    if not fac:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Facility with ID {facility_id} not found."
        )
    db.delete(fac)
    db.commit()
    logger.info(f"Admin deleted facility #{facility_id}")
    return None


# -----------------------------------------------------------------------------
# Disposal Guidance CRUD (Admin Protected)
# -----------------------------------------------------------------------------

@router.get("/admin/rules", response_model=List[DisposalRuleResponse])
def list_admin_rules(
    db: Session = Depends(get_db),
    _auth: bool = Depends(verify_admin_key)
):
    """Lists all configured disposal guidance rules."""
    rules = db.query(DisposalRule).order_by(DisposalRule.id.asc()).all()
    results: List[DisposalRuleResponse] = []
    for r in rules:
        results.append(
            DisposalRuleResponse(
                id=r.id,
                waste_category=r.waste_category,
                location_scope=r.location_scope,
                recommended_action=r.recommended_action,
                handling_cautions=r.handling_cautions,
                source_title=r.source_title,
                source_url=r.source_url,
                verification_status=r.verification_status,
                last_verified_at=r.last_verified_at.isoformat() if r.last_verified_at else None
            )
        )
    return results


@router.post("/admin/rules", response_model=DisposalRuleResponse, status_code=status.HTTP_201_CREATED)
def create_admin_rule(
    payload: DisposalRuleCreate,
    db: Session = Depends(get_db),
    _auth: bool = Depends(verify_admin_key)
):
    """Create a new disposal guidance rule."""
    rule = DisposalRule(
        waste_category=payload.waste_category,
        location_scope=payload.location_scope,
        recommended_action=payload.recommended_action,
        handling_cautions=payload.handling_cautions,
        source_title=payload.source_title,
        source_url=payload.source_url,
        verification_status=payload.verification_status,
        last_verified_at=datetime.now(timezone.utc) if payload.verification_status == "verified" else None
    )
    db.add(rule)
    db.commit()
    db.refresh(rule)
    logger.info(f"Admin created disposal rule #{rule.id} for category='{rule.waste_category}'")
    return DisposalRuleResponse(
        id=rule.id,
        waste_category=rule.waste_category,
        location_scope=rule.location_scope,
        recommended_action=rule.recommended_action,
        handling_cautions=rule.handling_cautions,
        source_title=rule.source_title,
        source_url=rule.source_url,
        verification_status=rule.verification_status,
        last_verified_at=rule.last_verified_at.isoformat() if rule.last_verified_at else None
    )


@router.put("/admin/rules/{rule_id}", response_model=DisposalRuleResponse)
def update_admin_rule(
    rule_id: int,
    payload: DisposalRuleCreate,
    db: Session = Depends(get_db),
    _auth: bool = Depends(verify_admin_key)
):
    """Update an existing disposal guidance rule."""
    rule = db.query(DisposalRule).filter(DisposalRule.id == rule_id).first()
    if not rule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Disposal rule with ID {rule_id} not found."
        )

    rule.waste_category = payload.waste_category
    rule.location_scope = payload.location_scope
    rule.recommended_action = payload.recommended_action
    rule.handling_cautions = payload.handling_cautions
    rule.source_title = payload.source_title
    rule.source_url = payload.source_url
    rule.verification_status = payload.verification_status
    if payload.verification_status == "verified":
        rule.last_verified_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(rule)
    logger.info(f"Admin updated disposal rule #{rule.id}")
    return DisposalRuleResponse(
        id=rule.id,
        waste_category=rule.waste_category,
        location_scope=rule.location_scope,
        recommended_action=rule.recommended_action,
        handling_cautions=rule.handling_cautions,
        source_title=rule.source_title,
        source_url=rule.source_url,
        verification_status=rule.verification_status,
        last_verified_at=rule.last_verified_at.isoformat() if rule.last_verified_at else None
    )


@router.patch("/admin/rules/{rule_id}/verification", response_model=DisposalRuleResponse)
def update_rule_verification(
    rule_id: int,
    payload: VerificationStatusUpdate,
    db: Session = Depends(get_db),
    _auth: bool = Depends(verify_admin_key)
):
    """Admin endpoint to update disposal rule verification status."""
    rule = db.query(DisposalRule).filter(DisposalRule.id == rule_id).first()
    if not rule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Disposal rule with ID {rule_id} not found."
        )

    rule.verification_status = payload.verification_status
    rule.last_verified_at = datetime.now(timezone.utc) if payload.verification_status == "verified" else None
    db.commit()
    db.refresh(rule)
    logger.info(f"Admin updated disposal rule #{rule.id} verification to '{rule.verification_status}'")
    return DisposalRuleResponse(
        id=rule.id,
        waste_category=rule.waste_category,
        location_scope=rule.location_scope,
        recommended_action=rule.recommended_action,
        handling_cautions=rule.handling_cautions,
        source_title=rule.source_title,
        source_url=rule.source_url,
        verification_status=rule.verification_status,
        last_verified_at=rule.last_verified_at.isoformat() if rule.last_verified_at else None
    )


@router.delete("/admin/rules/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_admin_rule(
    rule_id: int,
    db: Session = Depends(get_db),
    _auth: bool = Depends(verify_admin_key)
):
    """Delete a disposal guidance rule."""
    rule = db.query(DisposalRule).filter(DisposalRule.id == rule_id).first()
    if not rule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Disposal rule with ID {rule_id} not found."
        )
    db.delete(rule)
    db.commit()
    logger.info(f"Admin deleted disposal rule #{rule_id}")
    return None


# -----------------------------------------------------------------------------
# Event Logging (Admin Protected)
# -----------------------------------------------------------------------------

@router.post("/admin/events", response_model=WasteEventResponse, status_code=status.HTTP_201_CREATED)
def log_admin_event(
    payload: AdminEventCreate,
    db: Session = Depends(get_db),
    _auth: bool = Depends(verify_admin_key)
):
    """
    Manually log a verified processing, recovery, or batch destruction event.
    Links to an existing waste item.
    """
    item = db.query(WasteItem).filter(WasteItem.id == payload.waste_item_id).first()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Waste item with ID {payload.waste_item_id} not found."
        )

    event = WasteEvent(
        waste_item_id=item.id,
        event_type=payload.event_type,
        previous_status=payload.previous_status or item.current_status,
        new_status=payload.new_status,
        quantity=payload.quantity or item.estimated_quantity,
        quantity_unit=payload.quantity_unit or item.quantity_unit,
        actor=payload.actor,
        evidence_reference=payload.evidence_reference,
        demo_record=payload.demo_record
    )
    db.add(event)
    item.current_status = payload.new_status
    db.commit()
    db.refresh(event)
    logger.info(f"Admin logged event #{event.id} for item #{item.id}")

    return WasteEventResponse(
        id=event.id,
        waste_item_id=event.waste_item_id,
        event_type=event.event_type,
        previous_status=event.previous_status,
        new_status=event.new_status,
        quantity=event.quantity,
        quantity_unit=event.quantity_unit,
        timestamp=event.timestamp.isoformat() if event.timestamp else "",
        actor=event.actor,
        evidence_reference=event.evidence_reference,
        demo_record=event.demo_record
    )


# -----------------------------------------------------------------------------
# Waste Items Management (Admin Protected)
# -----------------------------------------------------------------------------

@router.delete("/admin/waste-items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_waste_item(
    item_id: int,
    db: Session = Depends(get_db),
    _auth: bool = Depends(verify_admin_key)
):
    """Admin endpoint to permanently delete a tracked waste record and associated events."""
    item = db.query(WasteItem).filter(WasteItem.id == item_id).first()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Waste item with ID {item_id} not found."
        )
    db.delete(item)
    db.commit()
    logger.info(f"Admin permanently deleted waste item #{item_id}")
    return None
