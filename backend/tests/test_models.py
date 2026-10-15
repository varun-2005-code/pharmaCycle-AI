"""Tests for SQLAlchemy database models as specified in Section 5."""
import pytest
from datetime import datetime
from sqlalchemy.exc import IntegrityError

from app.models.waste_item import WasteItem
from app.models.disposal_rule import DisposalRule
from app.models.collection_facility import CollectionFacility
from app.models.waste_event import WasteEvent


def test_create_waste_item_defaults(db_session):
    """Test creating a WasteItem with default values and verifying all Section 5 fields."""
    item = WasteItem(
        visual_category="Medicine or tablet strip",
        confidence=0.92,
        model_mode="demo",
        expiry_date="12/2026",
        expiry_confirmation_status="confirmed",
        material_type="aluminium/PVC blister",
        user_notes="Found in home medicine box",
        estimated_quantity=10.0,
        quantity_unit="tablets"
    )
    db_session.add(item)
    db_session.commit()
    db_session.refresh(item)

    assert item.id is not None
    assert item.visual_category == "Medicine or tablet strip"
    assert item.confidence == 0.92
    assert item.model_mode == "demo"
    assert item.current_status == "identified"  # default
    assert item.expiry_confirmation_status == "confirmed"
    assert item.created_at is not None
    assert item.updated_at is not None


def test_waste_item_negative_quantity_constraint(db_session):
    """Test that negative estimated_quantity violates check constraint."""
    item = WasteItem(
        visual_category="Empty blister pack",
        estimated_quantity=-5.0  # Invalid
    )
    db_session.add(item)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()


def test_waste_item_invalid_status_constraint(db_session):
    """Test that invalid current_status violates check constraint."""
    item = WasteItem(
        visual_category="Medicine bottle or container",
        current_status="invalid_nonexistent_status"
    )
    db_session.add(item)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()


def test_create_disposal_rule(db_session):
    """Test creating a DisposalRule and verifying Section 5 fields."""
    rule = DisposalRule(
        waste_category="Medicine or tablet strip",
        location_scope="National",
        recommended_action="Do not flush. Hand over to authorized take-back facility.",
        handling_cautions="Keep in original blister to prevent child exposure.",
        source_title="National Guidelines on Pharmaceutical Disposal",
        source_url="https://example.gov/pharmaceutical-disposal",
        verification_status="verified",
        last_verified_at=datetime.utcnow()
    )
    db_session.add(rule)
    db_session.commit()
    db_session.refresh(rule)

    assert rule.id is not None
    assert rule.waste_category == "Medicine or tablet strip"
    assert rule.verification_status == "verified"
    assert rule.location_scope == "National"


def test_create_collection_facility(db_session):
    """Test creating a CollectionFacility and verifying Section 5 fields."""
    facility = CollectionFacility(
        name="GreenCross Eco Pharmacy Drop-off",
        address="104 Botanical Way, Health District",
        city="Springfield",
        postal_code="12345",
        latitude=37.7749,
        longitude=-122.4194,
        contact_details="+1-555-0199",
        operating_hours="Mon-Fri 08:00 - 20:00",
        accepted_categories='["Medicine or tablet strip", "Empty blister pack"]',
        source_url="https://example.org/facilities/104",
        verification_status="verified",
        last_verified_at=datetime.utcnow()
    )
    db_session.add(facility)
    db_session.commit()
    db_session.refresh(facility)

    assert facility.id is not None
    assert facility.name == "GreenCross Eco Pharmacy Drop-off"
    assert facility.city == "Springfield"
    assert "Empty blister pack" in facility.accepted_categories


def test_create_waste_event_and_relationship(db_session):
    """Test creating WasteEvent and testing relationship to WasteItem."""
    item = WasteItem(
        visual_category="Cardboard or paper pharmaceutical packaging",
        estimated_quantity=2.0,
        quantity_unit="boxes"
    )
    db_session.add(item)
    db_session.commit()
    db_session.refresh(item)

    event = WasteEvent(
        waste_item_id=item.id,
        event_type="collection",
        previous_status="collection_pending",
        new_status="collected",
        quantity=2.0,
        quantity_unit="boxes",
        actor="Municipal Recycling Van #4",
        evidence_reference="MANIFEST-2026-X88",
        demo_record=False
    )
    db_session.add(event)
    db_session.commit()
    db_session.refresh(event)

    assert event.id is not None
    assert event.waste_item_id == item.id
    assert event.waste_item.visual_category == item.visual_category
    assert len(item.events) == 1
    assert item.events[0].actor == "Municipal Recycling Van #4"
