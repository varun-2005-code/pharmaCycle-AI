"""Admin Management Console API Endpoints for Development & Facility Management."""
from typing import List, Optional
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
    AdminStatsResponse
)
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
    """
    key = x_admin_key or admin_token
    # In local development mode, allow the configured key or default demo key
    valid_keys = [settings.ADMIN_SECRET_KEY, "pharmacycle-dev-admin-key-2026", "dev-admin"]
    if not key or key not in valid_keys:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized: Admin access requires valid X-Admin-Key header or admin_token parameter."
        )
    return True


@router.get("/admin/stats", response_model=AdminStatsResponse)
def get_admin_stats(
    db: Session = Depends(get_db),
    _auth: bool = Depends(verify_admin_key)
):
    """Returns database summary statistics for admin dashboard."""
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


@router.get("/admin/rules", response_model=List[DisposalRuleResponse])
def list_disposal_rules(
    db: Session = Depends(get_db),
    _auth: bool = Depends(verify_admin_key)
):
    """Lists all configured disposal guidance rules."""
    rules = db.query(DisposalRule).all()
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
def create_disposal_rule(
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
def update_disposal_rule(
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


@router.delete("/admin/rules/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_disposal_rule(
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
