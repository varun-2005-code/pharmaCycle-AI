"""Waste status state machine for PharmaCycle AI.

Valid transitions:
identified -> awaiting_confirmation -> collection_pending -> collected -> processed

Rules:
- Invalid transitions are rejected with InvalidStateTransitionError.
- Transitioning to 'processed' strictly requires an associated WasteEvent record.
"""
from enum import Enum
from typing import Dict, List, Optional
from sqlalchemy.orm import Session

from app.models.waste_item import WasteItem
from app.models.waste_event import WasteEvent


class WasteStatus(str, Enum):
    IDENTIFIED = "identified"
    AWAITING_CONFIRMATION = "awaiting_confirmation"
    COLLECTION_PENDING = "collection_pending"
    COLLECTED = "collected"
    PROCESSED = "processed"


# Strictly defined valid forward transitions per specification
VALID_TRANSITIONS: Dict[WasteStatus, List[WasteStatus]] = {
    WasteStatus.IDENTIFIED: [WasteStatus.AWAITING_CONFIRMATION],
    WasteStatus.AWAITING_CONFIRMATION: [WasteStatus.COLLECTION_PENDING],
    WasteStatus.COLLECTION_PENDING: [WasteStatus.COLLECTED],
    WasteStatus.COLLECTED: [WasteStatus.PROCESSED],
    WasteStatus.PROCESSED: [],  # Terminal state
}


class InvalidStateTransitionError(ValueError):
    """Raised when an invalid state transition is attempted."""
    pass


class ProcessedStatusRequiresEventError(ValueError):
    """Raised when transitioning to 'processed' status without a supporting event record."""
    pass


def validate_transition(current_status: str, target_status: str) -> None:
    """Validate whether transitioning from current_status to target_status is permitted.

    Raises:
        InvalidStateTransitionError: If either status is invalid or transition is disallowed.
    """
    try:
        current_enum = WasteStatus(current_status)
    except ValueError:
        raise InvalidStateTransitionError(f"Unknown current status: '{current_status}'")

    try:
        target_enum = WasteStatus(target_status)
    except ValueError:
        raise InvalidStateTransitionError(f"Unknown target status: '{target_status}'")

    allowed_next = VALID_TRANSITIONS.get(current_enum, [])
    if target_enum not in allowed_next:
        raise InvalidStateTransitionError(
            f"Invalid transition from '{current_status}' to '{target_status}'. "
            f"Allowed next status: {[s.value for s in allowed_next]}"
        )


def transition_waste_status(
    item: WasteItem,
    target_status: str,
    db: Optional[Session] = None,
    actor: str = "system",
    event_type: str = "status_change",
    evidence_reference: Optional[str] = None,
    quantity: Optional[float] = None,
    quantity_unit: Optional[str] = None,
    demo_record: bool = False,
    create_event: bool = True
) -> WasteEvent:
    """Safely transitions a WasteItem to a target status and logs a WasteEvent.

    Args:
        item: The WasteItem SQLAlchemy instance.
        target_status: Target status string.
        db: Optional SQLAlchemy Session. If provided, instances are added to session.
        actor: The party or system performing this transition.
        event_type: Type of event (e.g. status_change, collection, processing, recovery).
        evidence_reference: Verification / batch / manifest / photo reference.
        quantity: Quantity associated with this transition.
        quantity_unit: Unit for quantity.
        demo_record: True if generated as part of a demo simulation.
        create_event: Flag indicating whether an event record is generated.

    Returns:
        The created WasteEvent instance.

    Raises:
        InvalidStateTransitionError: On invalid state transitions.
        ProcessedStatusRequiresEventError: If transitioning to 'processed' without an event record.
    """
    previous_status = item.current_status
    validate_transition(previous_status, target_status)

    # Specific rule: 'processed' status must require an event record with actor and evidence
    if target_status == WasteStatus.PROCESSED.value:
        if not create_event:
            raise ProcessedStatusRequiresEventError(
                "Transition to 'processed' status strictly requires an associated event record."
            )
        # Even when create_event is True, ensure actor and evidence are specified
        if not actor or not str(actor).strip():
            raise ProcessedStatusRequiresEventError(
                "Processing event requires an identified actor (e.g., facility or operator)."
            )
        if not evidence_reference or not str(evidence_reference).strip():
            raise ProcessedStatusRequiresEventError(
                "Transition to 'processed' status strictly requires supporting evidence reference."
            )

    # Determine event quantity
    event_qty = quantity if quantity is not None else item.estimated_quantity
    event_unit = quantity_unit if quantity_unit is not None else item.quantity_unit

    # Update item status
    item.current_status = target_status

    # Create supporting WasteEvent
    event = WasteEvent(
        waste_item_id=item.id,
        event_type=event_type,
        previous_status=previous_status,
        new_status=target_status,
        quantity=event_qty,
        quantity_unit=event_unit,
        actor=actor,
        evidence_reference=evidence_reference,
        demo_record=demo_record
    )

    if db is not None:
        db.add(item)
        db.add(event)
        # Link relationship if item is persistent
        if hasattr(item, "events") and item.events is not None:
            item.events.append(event)

    return event
