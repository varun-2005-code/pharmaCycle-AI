"""Comprehensive tests for Waste Items, State Machine Lifecycle, and Dashboard Analytics.

Covers Section 4G and Section 9 acceptance criteria:
- Empty database statistics and analytics
- Demo data loading, labelling (demo_record=true), and resetting
- Preservation of non-demo items upon reset
- Statistics, quantity metric separation, and event counts
- Invalid lifecycle state machine transitions (skips, backward, terminal, missing actor/evidence)
- Per-item event history
- Filtering by category, status, search, and date
- Privacy deletion
"""
import pytest
from datetime import datetime, timezone


def test_empty_database_summary_and_analytics(client):
    """Test dashboard summary and analytics on an empty database."""
    # 1. Summary
    res_summary = client.get("/api/dashboard/summary")
    assert res_summary.status_code == 200
    summary = res_summary.json()
    assert summary["total_items"] == 0
    assert summary["total_events"] == 0
    assert summary["demo_items_count"] == 0
    assert summary["actual_items_count"] == 0
    assert summary["status_breakdown"]["identified"] == 0
    assert summary["status_breakdown"]["awaiting_confirmation"] == 0
    assert summary["status_breakdown"]["collection_pending"] == 0
    assert summary["status_breakdown"]["collected"] == 0
    assert summary["status_breakdown"]["processed"] == 0

    # 2. Analytics
    res_analytics = client.get("/api/dashboard/analytics")
    assert res_analytics.status_code == 200
    analytics = res_analytics.json()
    assert len(analytics["category_distribution"]) > 0
    for cat in analytics["category_distribution"]:
        assert cat["count"] == 0
        assert cat["percentage"] == 0.0

    assert len(analytics["status_distribution"]) == 5
    for st in analytics["status_distribution"]:
        assert st["count"] == 0

    assert len(analytics["timeline"]) >= 1
    assert analytics["timeline"][0]["events"] == 0

    quantities = analytics["quantities"]
    assert quantities["user_reported_units"] == 0.0
    assert quantities["recorded_collected_units"] == 0.0
    assert quantities["verified_processed_units"] == 0.0
    assert "not inferred from detected items" in quantities["note"]

    # 3. Waste items list
    res_items = client.get("/api/waste-items")
    assert res_items.status_code == 200
    items_data = res_items.json()
    assert items_data["total"] == 0
    assert items_data["items"] == []


def test_demo_load_labelling_and_reset(client):
    """Test loading sample data, verifying demo_record=true on every item and event, and resetting."""
    # 1. Seed demo data
    res_seed = client.post("/api/demo/seed")
    assert res_seed.status_code == 200
    seed_data = res_seed.json()
    assert seed_data["status"] == "success"
    assert seed_data["items_seeded"] > 0
    assert seed_data["events_seeded"] > 0

    # 2. Check every demo waste item has demo_record=True
    res_items = client.get("/api/waste-items?limit=100")
    assert res_items.status_code == 200
    items = res_items.json()["items"]
    assert len(items) == seed_data["items_seeded"]

    for item in items:
        assert item["demo_record"] is True
        # Check every event has demo_record=True
        assert len(item["events"]) >= 1
        for ev in item["events"]:
            assert ev["demo_record"] is True

    # 3. Check dashboard summary reflects demo items
    res_summary = client.get("/api/dashboard/summary")
    assert res_summary.status_code == 200
    summary = res_summary.json()
    assert summary["total_items"] == seed_data["items_seeded"]
    assert summary["demo_items_count"] == seed_data["items_seeded"]
    assert summary["actual_items_count"] == 0
    assert summary["status_breakdown"]["processed"] >= 1

    # 4. Alias endpoint /api/dashboard/demo/load also works
    res_load_alias = client.post("/api/dashboard/demo/load")
    assert res_load_alias.status_code == 200

    # 5. Reset demo data
    res_reset = client.post("/api/demo/reset")
    assert res_reset.status_code == 200
    reset_data = res_reset.json()
    assert reset_data["status"] == "success"
    assert reset_data["demo_items_deleted"] == seed_data["items_seeded"]

    # 6. Verify database is clean
    res_summary_after = client.get("/api/dashboard/summary")
    assert res_summary_after.json()["total_items"] == 0
    assert res_summary_after.json()["total_events"] == 0


def test_demo_reset_preserves_non_demo_items(client):
    """Test that resetting demo data leaves user/real records untouched."""
    # 1. Create a non-demo actual item
    real_item_payload = {
        "visual_category": "Medicine or tablet strip",
        "model_mode": "real",
        "demo_record": False,
        "material_type": "PVC/Alu",
        "estimated_quantity": 6.0,
        "quantity_unit": "tablets",
        "user_notes": "Real patient medicine scan"
    }
    res_real = client.post("/api/waste-items", json=real_item_payload)
    assert res_real.status_code == 201
    real_item = res_real.json()
    assert real_item["demo_record"] is False

    # 2. Seed demo data
    client.post("/api/demo/seed")
    summary_before = client.get("/api/dashboard/summary").json()
    assert summary_before["actual_items_count"] == 1
    assert summary_before["demo_items_count"] > 0

    # 3. Reset demo data via alias
    res_reset = client.post("/api/dashboard/demo/reset")
    assert res_reset.status_code == 200

    # 4. Confirm real item remains
    summary_after = client.get("/api/dashboard/summary").json()
    assert summary_after["total_items"] == 1
    assert summary_after["actual_items_count"] == 1
    assert summary_after["demo_items_count"] == 0

    res_check = client.get(f"/api/waste-items/{real_item['id']}")
    assert res_check.status_code == 200
    assert res_check.json()["user_notes"] == "Real patient medicine scan"


def test_statistics_and_event_counts(client):
    """Test that quantities, category distribution, and event counts are accurately computed."""
    # 1. Item A: 10 tablets
    item_a_payload = {
        "visual_category": "Medicine or tablet strip",
        "model_mode": "real",
        "demo_record": False,
        "estimated_quantity": 10.0,
        "quantity_unit": "tablets",
        "user_notes": "Antibiotics"
    }
    res_a = client.post("/api/waste-items", json=item_a_payload)
    assert res_a.status_code == 201
    id_a = res_a.json()["id"]

    # 2. Item B: 5 blister packs
    item_b_payload = {
        "visual_category": "Empty blister pack",
        "model_mode": "real",
        "demo_record": False,
        "estimated_quantity": 5.0,
        "quantity_unit": "packs",
        "user_notes": "Empty packs"
    }
    res_b = client.post("/api/waste-items", json=item_b_payload)
    assert res_b.status_code == 201

    # Check analytics at identified state
    ana1 = client.get("/api/dashboard/analytics").json()
    assert ana1["quantities"]["user_reported_units"] == 15.0
    assert ana1["quantities"]["recorded_collected_units"] == 0.0
    assert ana1["quantities"]["verified_processed_units"] == 0.0

    # Advance Item A to awaiting_confirmation -> collection_pending -> collected (qty=10.0)
    client.post(f"/api/waste-items/{id_a}/events", json={
        "event_type": "user_confirm",
        "target_status": "awaiting_confirmation",
        "actor": "Patient"
    })
    client.post(f"/api/waste-items/{id_a}/events", json={
        "event_type": "schedule_pickup",
        "target_status": "collection_pending",
        "actor": "System"
    })
    client.post(f"/api/waste-items/{id_a}/events", json={
        "event_type": "courier_collection",
        "target_status": "collected",
        "actor": "Courier #4",
        "evidence_reference": "RECEIPT-889",
        "quantity": 10.0,
        "quantity_unit": "tablets"
    })

    # Check analytics after collection:
    # user_reported=15.0, collected=10.0, processed=0.0
    ana2 = client.get("/api/dashboard/analytics").json()
    assert ana2["quantities"]["user_reported_units"] == 15.0
    assert ana2["quantities"]["recorded_collected_units"] == 10.0
    assert ana2["quantities"]["verified_processed_units"] == 0.0

    # Advance Item A to processed (qty=10.0)
    client.post(f"/api/waste-items/{id_a}/events", json={
        "event_type": "destruction_treatment",
        "target_status": "processed",
        "actor": "Facility High-Temp Plant",
        "evidence_reference": "CERT-DESTRUCT-552",
        "quantity": 10.0,
        "quantity_unit": "tablets"
    })

    # Check analytics after processing:
    # user_reported=15.0, collected=10.0, processed=10.0
    ana3 = client.get("/api/dashboard/analytics").json()
    assert ana3["quantities"]["user_reported_units"] == 15.0
    assert ana3["quantities"]["recorded_collected_units"] == 10.0
    assert ana3["quantities"]["verified_processed_units"] == 10.0

    # Verify total event count: Item A has 5 events, Item B has 1 event = 6 total events
    sum_data = client.get("/api/dashboard/summary").json()
    assert sum_data["total_items"] == 2
    assert sum_data["total_events"] == 6
    assert sum_data["status_breakdown"]["processed"] == 1
    assert sum_data["status_breakdown"]["identified"] == 1


def test_invalid_lifecycle_transitions(client):
    """Test that all invalid transitions, skipped stages, backwards jumps, and terminal state exits are rejected."""
    create_payload = {
        "visual_category": "Medicine bottle or container",
        "model_mode": "real",
        "material_type": "Glass"
    }
    item_res = client.post("/api/waste-items", json=create_payload)
    assert item_res.status_code == 201
    item_id = item_res.json()["id"]

    # Current status: identified
    # 1. Invalid forward skips from identified
    for invalid_target in ["collection_pending", "collected", "processed", "unknown_status"]:
        res_inv = client.post(f"/api/waste-items/{item_id}/events", json={
            "event_type": "skip_test",
            "target_status": invalid_target,
            "actor": "Tester"
        })
        assert res_inv.status_code == 400

    # 2. Valid transition to awaiting_confirmation
    res_step1 = client.post(f"/api/waste-items/{item_id}/events", json={
        "event_type": "confirm",
        "target_status": "awaiting_confirmation",
        "actor": "User"
    })
    assert res_step1.status_code == 200

    # 3. Backward transition from awaiting_confirmation to identified
    res_back = client.post(f"/api/waste-items/{item_id}/events", json={
        "event_type": "rewind",
        "target_status": "identified",
        "actor": "User"
    })
    assert res_back.status_code == 400

    # 4. Skip from awaiting_confirmation to collected or processed
    for invalid_target in ["collected", "processed"]:
        res_inv = client.post(f"/api/waste-items/{item_id}/events", json={
            "event_type": "skip_test",
            "target_status": invalid_target,
            "actor": "Tester"
        })
        assert res_inv.status_code == 400

    # 5. Valid transition to collection_pending
    client.post(f"/api/waste-items/{item_id}/events", json={
        "event_type": "book",
        "target_status": "collection_pending",
        "actor": "Dispatcher"
    })

    # 6. Skip from collection_pending to processed
    res_skip_proc = client.post(f"/api/waste-items/{item_id}/events", json={
        "event_type": "skip",
        "target_status": "processed",
        "actor": "Tester"
    })
    assert res_skip_proc.status_code == 400

    # 7. Valid transition to collected
    client.post(f"/api/waste-items/{item_id}/events", json={
        "event_type": "collect",
        "target_status": "collected",
        "actor": "Courier"
    })

    # 8. Backward from collected to collection_pending or identified
    for back_st in ["collection_pending", "awaiting_confirmation", "identified"]:
        res_back = client.post(f"/api/waste-items/{item_id}/events", json={
            "event_type": "rewind",
            "target_status": back_st,
            "actor": "Courier"
        })
        assert res_back.status_code == 400

    # 9. Transition to processed with empty actor must fail
    res_no_actor = client.post(f"/api/waste-items/{item_id}/events", json={
        "event_type": "process",
        "target_status": "processed",
        "actor": "",
        "evidence_reference": "CERT-110"
    })
    assert res_no_actor.status_code == 400

    # 10. Valid transition to processed
    res_proc = client.post(f"/api/waste-items/{item_id}/events", json={
        "event_type": "process",
        "target_status": "processed",
        "actor": "Facility Operator 9",
        "evidence_reference": "CERT-DESTRUCT-9001"
    })
    assert res_proc.status_code == 200
    assert res_proc.json()["current_status"] == "processed"

    # 11. Terminal state: processed cannot transition anywhere
    for any_status in ["identified", "awaiting_confirmation", "collection_pending", "collected", "processed"]:
        res_terminal = client.post(f"/api/waste-items/{item_id}/events", json={
            "event_type": "try_leave_terminal",
            "target_status": any_status,
            "actor": "Operator"
        })
        assert res_terminal.status_code == 400


def test_per_item_history_and_filters(client):
    """Test retrieving per-item event history and querying with filters (status, category, search, date)."""
    # Create item
    res = client.post("/api/waste-items", json={
        "visual_category": "Cardboard or paper pharmaceutical packaging",
        "model_mode": "real",
        "material_type": "Paperboard",
        "user_notes": "Paracetamol carton"
    })
    item_id = res.json()["id"]

    # Add 2 transitions
    client.post(f"/api/waste-items/{item_id}/events", json={
        "event_type": "user_check",
        "target_status": "awaiting_confirmation",
        "actor": "User Jane"
    })
    client.post(f"/api/waste-items/{item_id}/events", json={
        "event_type": "schedule_recycling",
        "target_status": "collection_pending",
        "actor": "Logistics Dispatch"
    })

    # Retrieve history
    res_hist = client.get(f"/api/waste-items/{item_id}/history")
    assert res_hist.status_code == 200
    history = res_hist.json()
    assert len(history) == 3
    assert history[0]["event_type"] == "identified"
    assert history[1]["event_type"] == "user_check"
    assert history[2]["event_type"] == "schedule_recycling"

    # Test filtering by status
    res_st = client.get("/api/waste-items?status=collection_pending")
    assert res_st.status_code == 200
    assert res_st.json()["total"] == 1

    res_st_none = client.get("/api/waste-items?status=processed")
    assert res_st_none.json()["total"] == 0

    # Test filtering by category
    res_cat = client.get("/api/waste-items?category=Cardboard")
    assert res_cat.status_code == 200
    assert res_cat.json()["total"] == 1

    # Test search
    res_search = client.get("/api/waste-items?search=Paracetamol")
    assert res_search.status_code == 200
    assert res_search.json()["total"] == 1

    # Test date filtering
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    res_date = client.get(f"/api/waste-items?date_from={today_str}&date_to={today_str}")
    assert res_date.status_code == 200
    assert res_date.json()["total"] == 1

    # Test privacy deletion
    res_del = client.delete(f"/api/waste-items/{item_id}")
    assert res_del.status_code == 204
    assert client.get(f"/api/waste-items/{item_id}").status_code == 404
    assert client.get(f"/api/waste-items/{item_id}/history").status_code == 404
