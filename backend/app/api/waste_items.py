"""Waste Items and Lifecycle Events API Endpoints."""
from typing import List, Optional
import logging
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models.waste_item import WasteItem
from app.models.waste_event import WasteEvent
from app.schemas.waste import (
    WasteItemCreate,
    WasteItemResponse,
    WasteItemListResponse,
    WasteEventCreate,
    WasteEventResponse
)
from app.state_machine import (
    transition_waste_status,
    InvalidStateTransitionError,
    ProcessedStatusRequiresEventError
)
from app.services.seed_data import (
    seed_demo_waste_items_and_events,
    reset_demo_data
)

logger = logging.getLogger("pharmacycle.api.waste_items")
router = APIRouter()


def _format_event_response(ev: WasteEvent) -> WasteEventResponse:
    return WasteEventResponse(
        id=ev.id,
        waste_item_id=ev.waste_item_id,
        event_type=ev.event_type,
        previous_status=ev.previous_status,
        new_status=ev.new_status,
        quantity=ev.quantity,
        quantity_unit=ev.quantity_unit,
        timestamp=ev.timestamp.isoformat() if ev.timestamp else "",
        actor=ev.actor,
        evidence_reference=ev.evidence_reference,
        demo_record=ev.demo_record
    )


def _format_item_response(item: WasteItem) -> WasteItemResponse:
    events = [_format_event_response(e) for e in (item.events or [])]
    return WasteItemResponse(
        id=item.id,
        visual_category=item.visual_category,
        confidence=item.confidence,
        model_mode=item.model_mode,
        expiry_date=item.expiry_date,
        expiry_confirmation_status=item.expiry_confirmation_status,
        material_type=item.material_type,
        user_notes=item.user_notes,
        estimated_quantity=item.estimated_quantity,
        quantity_unit=item.quantity_unit,
        current_status=item.current_status,
        created_at=item.created_at.isoformat() if item.created_at else "",
        updated_at=item.updated_at.isoformat() if item.updated_at else "",
        events=events
    )


@router.get("/waste-items", response_model=WasteItemListResponse)
def list_waste_items(
    status: Optional[str] = Query(None, description="Filter by status (e.g. identified, collected)"),
    category: Optional[str] = Query(None, description="Filter by visual category"),
    search: Optional[str] = Query(None, description="Search in notes or material"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """List tracked waste items with optional filtering by status, category, or keyword."""
    query = db.query(WasteItem).options(joinedload(WasteItem.events))

    if status:
        query = query.filter(WasteItem.current_status == status.strip().lower())

    if category:
        query = query.filter(WasteItem.visual_category.ilike(f"%{category.strip()}%"))

    if search:
        s = f"%{search.strip()}%"
        query = query.filter(
            (WasteItem.user_notes.ilike(s)) |
            (WasteItem.material_type.ilike(s))
        )

    total = query.count()
    items = query.order_by(WasteItem.created_at.desc()).offset(offset).limit(limit).all()

    return WasteItemListResponse(
        total=total,
        items=[_format_item_response(it) for it in items]
    )


@router.post("/waste-items", response_model=WasteItemResponse, status_code=status.HTTP_201_CREATED)
def create_waste_item(payload: WasteItemCreate, db: Session = Depends(get_db)):
    """
    Register a newly identified waste item into the Digital Twin tracking system.
    Automatically logs an initial 'identified' event.
    """
    item = WasteItem(
        visual_category=payload.visual_category,
        confidence=payload.confidence,
        model_mode=payload.model_mode,
        expiry_date=payload.expiry_date,
        expiry_confirmation_status=payload.expiry_confirmation_status,
        material_type=payload.material_type,
        user_notes=payload.user_notes,
        estimated_quantity=payload.estimated_quantity,
        quantity_unit=payload.quantity_unit,
        current_status="identified"
    )
    db.add(item)
    db.flush()

    # Initial event record
    initial_event = WasteEvent(
        waste_item_id=item.id,
        event_type="identified",
        previous_status=None,
        new_status="identified",
        quantity=item.estimated_quantity,
        quantity_unit=item.quantity_unit,
        actor="Identification Service",
        evidence_reference="Initial detection log",
        demo_record=(item.model_mode == "demo")
    )
    db.add(initial_event)
    db.commit()
    db.refresh(item)
    logger.info(f"Created waste item #{item.id} category='{item.visual_category}'")
    return _format_item_response(item)


@router.get("/waste-items/{item_id}", response_model=WasteItemResponse)
def get_waste_item(item_id: int, db: Session = Depends(get_db)):
    """Retrieve details and complete event history of a tracked waste item."""
    item = db.query(WasteItem).options(joinedload(WasteItem.events)).filter(WasteItem.id == item_id).first()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Waste item with ID {item_id} not found."
        )
    return _format_item_response(item)


@router.post("/waste-items/{item_id}/events", response_model=WasteItemResponse)
def transition_item_status(
    item_id: int,
    payload: WasteEventCreate,
    db: Session = Depends(get_db)
):
    """
    Advance the status of a tracked waste item through the state machine.
    Enforces valid state progression:
    identified -> awaiting_confirmation -> collection_pending -> collected -> processed.
    'processed' status strictly requires an associated WasteEvent record with actor and evidence.
    """
    item = db.query(WasteItem).filter(WasteItem.id == item_id).first()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Waste item with ID {item_id} not found."
        )

    try:
        transition_waste_status(
            item=item,
            target_status=payload.target_status,
            db=db,
            actor=payload.actor or "User",
            event_type=payload.event_type,
            evidence_reference=payload.evidence_reference,
            quantity=payload.quantity,
            quantity_unit=payload.quantity_unit,
            demo_record=payload.demo_record or (item.model_mode == "demo")
        )
        db.commit()
        db.refresh(item)
        logger.info(f"Item #{item.id} transitioned to '{item.current_status}' by '{payload.actor}'")
        return _format_item_response(item)
    except (InvalidStateTransitionError, ProcessedStatusRequiresEventError) as err:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(err))
    except Exception as e:
        db.rollback()
        logger.error(f"Error transitioning waste item #{item_id}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to transition item status.")


@router.get("/waste-items/{item_id}/history", response_model=List[WasteEventResponse])
def get_item_history(item_id: int, db: Session = Depends(get_db)):
    """Retrieve the immutable lifecycle audit log for a tracked item."""
    item = db.query(WasteItem).filter(WasteItem.id == item_id).first()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Waste item with ID {item_id} not found."
        )

    events = db.query(WasteEvent).filter(
        WasteEvent.waste_item_id == item_id
    ).order_by(WasteEvent.timestamp.asc()).all()

    return [_format_event_response(e) for e in events]


@router.delete("/waste-items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_waste_item(item_id: int, db: Session = Depends(get_db)):
    """
    Deletes a waste record and associated event data.
    Implements the privacy and data deletion requirement of Section 8.
    """
    item = db.query(WasteItem).filter(WasteItem.id == item_id).first()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Waste item with ID {item_id} not found."
        )

    db.delete(item)
    db.commit()
    logger.info(f"Deleted waste item #{item_id} and associated event logs per privacy request.")
    return None


@router.post("/demo/seed")
def seed_demo_data(db: Session = Depends(get_db)):
    """
    Seeds comprehensive sample waste items and event histories for judges to explore immediately.
    All seeded demo records are marked demo_record=True or model_mode='demo'.
    """
    result = seed_demo_waste_items_and_events(db)
    return {
        "status": "success",
        "message": "Demo data loaded successfully.",
        **result
    }


@router.post("/demo/reset")
def reset_demo(db: Session = Depends(get_db)):
    """
    Cleans up all demo items and events from the database.
    Preserves baseline rules and facility configurations.
    """
    result = reset_demo_data(db)
    return {
        "status": "success",
        "message": "Demo data reset successfully.",
        **result
    }
