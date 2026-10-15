"""Tests for Waste Status State Machine and Transition Validations."""
import pytest
from app.models.waste_item import WasteItem
from app.models.waste_event import WasteEvent
from app.state_machine import (
    WasteStatus,
    VALID_TRANSITIONS,
    validate_transition,
    transition_waste_status,
    InvalidStateTransitionError,
    ProcessedStatusRequiresEventError
)


def test_valid_forward_state_transitions(db_session):
    """Test full sequential lifecycle:

    identified -> awaiting_confirmation -> collection_pending -> collected -> processed
    """
    item = WasteItem(
        visual_category="Medicine or tablet strip",
        current_status=WasteStatus.IDENTIFIED.value,
        estimated_quantity=1.0,
        quantity_unit="strip"
    )
    db_session.add(item)
    db_session.commit()
    db_session.refresh(item)

    # 1. identified -> awaiting_confirmation
    ev1 = transition_waste_status(
        item,
        WasteStatus.AWAITING_CONFIRMATION.value,
        db=db_session,
        actor="user",
        event_type="user_review"
    )
    db_session.commit()
    assert item.current_status == WasteStatus.AWAITING_CONFIRMATION.value
    assert ev1.previous_status == "identified"
    assert ev1.new_status == "awaiting_confirmation"

    # 2. awaiting_confirmation -> collection_pending
    ev2 = transition_waste_status(
        item,
        WasteStatus.COLLECTION_PENDING.value,
        db=db_session,
        actor="user",
        event_type="booking_scheduled"
    )
    db_session.commit()
    assert item.current_status == WasteStatus.COLLECTION_PENDING.value
    assert ev2.previous_status == "awaiting_confirmation"
    assert ev2.new_status == "collection_pending"

    # 3. collection_pending -> collected
    ev3 = transition_waste_status(
        item,
        WasteStatus.COLLECTED.value,
        db=db_session,
        actor="collector_driver_9",
        event_type="collection_pickup",
        evidence_reference="PICKUP-REC-501"
    )
    db_session.commit()
    assert item.current_status == WasteStatus.COLLECTED.value
    assert ev3.previous_status == "collection_pending"
    assert ev3.new_status == "collected"

    # 4. collected -> processed (must generate and require an event record)
    ev4 = transition_waste_status(
        item,
        WasteStatus.PROCESSED.value,
        db=db_session,
        actor="certified_thermal_treatment_facility",
        event_type="high_temp_incineration",
        evidence_reference="CERT-DESTRUCTION-774"
    )
    db_session.commit()
    assert item.current_status == WasteStatus.PROCESSED.value
    assert ev4.previous_status == "collected"
    assert ev4.new_status == "processed"

    # Verify event history has all 4 events recorded
    db_session.refresh(item)
    assert len(item.events) == 4


def test_invalid_state_transitions(db_session):
    """Test that attempting invalid jumps in the state machine raises InvalidStateTransitionError."""
    item = WasteItem(
        visual_category="Empty blister pack",
        current_status=WasteStatus.IDENTIFIED.value
    )
    db_session.add(item)
    db_session.commit()

    # Attempt skipping to collected
    with pytest.raises(InvalidStateTransitionError) as exc_info:
        transition_waste_status(item, WasteStatus.COLLECTED.value, db=db_session)
    assert "Invalid transition" in str(exc_info.value)

    # Attempt skipping to processed
    with pytest.raises(InvalidStateTransitionError):
        transition_waste_status(item, WasteStatus.PROCESSED.value, db=db_session)

    # Attempt bogus status
    with pytest.raises(InvalidStateTransitionError):
        transition_waste_status(item, "non_existent_status", db=db_session)


def test_backward_transition_rejected(db_session):
    """Test that transitioning backward (e.g., collected -> identified) is rejected."""
    item = WasteItem(
        visual_category="Medicine bottle or container",
        current_status=WasteStatus.COLLECTED.value
    )
    db_session.add(item)
    db_session.commit()

    with pytest.raises(InvalidStateTransitionError):
        transition_waste_status(item, WasteStatus.IDENTIFIED.value, db=db_session)


def test_processed_requires_event_record(db_session):
    """Test that transitioning to 'processed' strictly requires an event record."""
    item = WasteItem(
        visual_category="Cardboard or paper pharmaceutical packaging",
        current_status=WasteStatus.COLLECTED.value
    )
    db_session.add(item)
    db_session.commit()

    # If create_event is explicitly False, must raise ProcessedStatusRequiresEventError
    with pytest.raises(ProcessedStatusRequiresEventError):
        transition_waste_status(
            item,
            WasteStatus.PROCESSED.value,
            db=db_session,
            create_event=False
        )

    # If actor is missing/empty, must raise ProcessedStatusRequiresEventError
    with pytest.raises(ProcessedStatusRequiresEventError):
        transition_waste_status(
            item,
            WasteStatus.PROCESSED.value,
            db=db_session,
            actor="",
            create_event=True
        )


def test_terminal_state_cannot_transition(db_session):
    """Test that processed items cannot transition to any other status."""
    item = WasteItem(
        visual_category="Unknown or other",
        current_status=WasteStatus.PROCESSED.value
    )
    db_session.add(item)
    db_session.commit()

    for target in WasteStatus:
        with pytest.raises(InvalidStateTransitionError):
            transition_waste_status(item, target.value, db=db_session)
