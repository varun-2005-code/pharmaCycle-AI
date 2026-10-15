"""Tests for Waste Items, State Machine Event Progression, and Dashboard Analytics."""
import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_seed_and_reset_demo_data():
    # 1. Seed demo data
    res_seed = client.post("/api/demo/seed")
    assert res_seed.status_code == 200
    seed_data = res_seed.json()
    assert seed_data["status"] == "success"
    assert seed_data["items_seeded"] > 0

    # 2. Check dashboard summary reflects seeded items
    res_summary = client.get("/api/dashboard/summary")
    assert res_summary.status_code == 200
    summary = res_summary.json()
    assert summary["total_items"] >= seed_data["items_seeded"]
    assert summary["status_breakdown"]["processed"] >= 1

    # 3. Check analytics endpoints
    res_analytics = client.get("/api/dashboard/analytics")
    assert res_analytics.status_code == 200
    analytics = res_analytics.json()
    assert len(analytics["category_distribution"]) > 0
    assert len(analytics["status_distribution"]) == 5
    assert "quantities" in analytics
    assert analytics["quantities"]["verified_processed_units"] > 0


def test_waste_item_lifecycle_state_progression():
    # 1. Create new item
    create_payload = {
        "visual_category": "Medicine bottle or container",
        "model_mode": "demo",
        "material_type": "Amber Glass",
        "estimated_quantity": 2.0,
        "quantity_unit": "bottles",
        "user_notes": "Test cough syrup bottle"
    }
    res_create = client.post("/api/waste-items", json=create_payload)
    assert res_create.status_code == 201
    item = res_create.json()
    item_id = item["id"]
    assert item["current_status"] == "identified"
    assert len(item["events"]) == 1

    # 2. Advance to awaiting_confirmation
    ev1 = {
        "event_type": "user_verification",
        "target_status": "awaiting_confirmation",
        "actor": "Test User",
        "evidence_reference": "User checked bottle"
    }
    res_ev1 = client.post(f"/api/waste-items/{item_id}/events", json=ev1)
    assert res_ev1.status_code == 200
    assert res_ev1.json()["current_status"] == "awaiting_confirmation"

    # 3. Invalid jump directly to processed should be rejected
    ev_invalid = {
        "event_type": "skip_step",
        "target_status": "processed",
        "actor": "Hacker"
    }
    res_inv = client.post(f"/api/waste-items/{item_id}/events", json=ev_invalid)
    assert res_inv.status_code == 400

    # 4. Advance to collection_pending
    ev2 = {
        "event_type": "booking",
        "target_status": "collection_pending",
        "actor": "Dispatch",
        "evidence_reference": "Pickup booked"
    }
    res_ev2 = client.post(f"/api/waste-items/{item_id}/events", json=ev2)
    assert res_ev2.status_code == 200
    assert res_ev2.json()["current_status"] == "collection_pending"

    # 5. Advance to collected
    ev3 = {
        "event_type": "collection",
        "target_status": "collected",
        "actor": "Eco Hauler 01",
        "evidence_reference": "Manifest #771"
    }
    res_ev3 = client.post(f"/api/waste-items/{item_id}/events", json=ev3)
    assert res_ev3.status_code == 200
    assert res_ev3.json()["current_status"] == "collected"

    # 6. Advance to processed (requires event record and actor)
    ev4 = {
        "event_type": "recycling_recovery",
        "target_status": "processed",
        "actor": "Harbor Glass Recycler",
        "evidence_reference": "Cullet Melt Certificate 9901"
    }
    res_ev4 = client.post(f"/api/waste-items/{item_id}/events", json=ev4)
    assert res_ev4.status_code == 200
    assert res_ev4.json()["current_status"] == "processed"

    # 7. Check history
    res_hist = client.get(f"/api/waste-items/{item_id}/history")
    assert res_hist.status_code == 200
    events = res_hist.json()
    assert len(events) == 5

    # 8. Test Privacy Delete
    res_del = client.delete(f"/api/waste-items/{item_id}")
    assert res_del.status_code == 204
    # Confirm item no longer exists
    assert client.get(f"/api/waste-items/{item_id}").status_code == 404
