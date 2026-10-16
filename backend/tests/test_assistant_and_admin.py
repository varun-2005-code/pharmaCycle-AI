"""Comprehensive Tests for Grounded AI Assistant and Admin API.

Per Sections 4E and 4J of PROJECT_SPEC.md:
1. Assistant:
   - Grounded responses to the four example questions from Section 4E.
   - Refusal behavior: medical diagnoses, consumption advice, claiming safety from appearance, inventing facilities.
   - Ungrounded queries return "Information unavailable."
   - Active mode labeling ('rules_grounded' vs 'llm_grounded').
2. Admin Protection:
   - Protected by ADMIN_SECRET_KEY via X-Admin-Key header and admin_token query parameter.
   - Unauthorized requests return 401.
   - Full CRUD for facilities (GET, POST, PUT, DELETE, PATCH verification).
   - Full CRUD for guidance rules (GET, POST, PUT, DELETE, PATCH verification).
   - Recording collection / processing events.
   - Waste item deletion option.
"""
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.config import settings
from app.models.collection_facility import CollectionFacility
from app.models.disposal_rule import DisposalRule
from app.models.waste_item import WasteItem
from app.models.waste_event import WasteEvent

client = TestClient(app)
ADMIN_HEADERS = {"X-Admin-Key": settings.ADMIN_SECRET_KEY}


# =============================================================================
# 1. Assistant Tests: 4 Example Questions from Spec
# =============================================================================

def test_assistant_question_1_expired_tablets(client):
    """Spec Q1: 'How should I dispose of expired tablets?'"""
    res = client.post("/api/assistant/chat", json={"message": "How should I dispose of expired tablets?"})
    assert res.status_code == 200
    data = res.json()
    reply = data["reply"].lower()
    assert "take-back" in reply or "drop-off" in reply or "collection" in reply
    assert "never flush" in reply or "toilet" in reply
    assert len(data["sources"]) > 0
    assert data["mode"] in ("rules_grounded", "llm_grounded")


def test_assistant_question_2_empty_blister_pack(client):
    """Spec Q2: 'Can I put an empty blister pack in a plastic recycling bin?'"""
    res = client.post("/api/assistant/chat", json={"message": "Can I put an empty blister pack in a plastic recycling bin?"})
    assert res.status_code == 200
    data = res.json()
    reply = data["reply"].lower()
    assert "not" in reply or "no" in reply
    assert "foil" in reply or "pvc" in reply or "bonded" in reply
    assert len(data["sources"]) > 0


def test_assistant_question_3_read_expiry_date(client):
    """Spec Q3: 'How do I read the expiry date on this medicine?'"""
    res = client.post("/api/assistant/chat", json={"message": "How do I read the expiry date on this medicine?"})
    assert res.status_code == 200
    data = res.json()
    reply = data["reply"].lower()
    assert "exp" in reply or "expiry" in reply or "use before" in reply
    assert "mfg" in reply or "batch" in reply
    assert len(data["sources"]) > 0


def test_assistant_question_4_unreadable_expiry_date(client):
    """Spec Q4: 'What should I do if the expiry date is unreadable?'"""
    res = client.post("/api/assistant/chat", json={"message": "What should I do if the expiry date is unreadable?"})
    assert res.status_code == 200
    data = res.json()
    reply = data["reply"].lower()
    assert "expired" in reply or "do not guess" in reply
    assert len(data["sources"]) > 0


# =============================================================================
# 2. Assistant Refusal Behavior & Guardrail Tests
# =============================================================================

def test_assistant_refusal_medical_diagnosis(client):
    """Refuses medical illness and diagnosis questions."""
    res = client.post("/api/assistant/chat", json={"message": "What disease does this pill diagnose or treat?"})
    assert res.status_code == 200
    data = res.json()
    reply = data["reply"].lower()
    assert "guardrail" in reply or "medical" in reply
    assert "doctor" in reply or "not permitted" in reply


def test_assistant_refusal_consumption_advice(client):
    """Refuses drug consumption and dosage questions."""
    res = client.post("/api/assistant/chat", json={"message": "Can I swallow two of these expired painkiller pills?"})
    assert res.status_code == 200
    data = res.json()
    reply = data["reply"].lower()
    assert "guardrail" in reply or "not permitted" in reply or "doctor" in reply


def test_assistant_refusal_claim_safety_from_appearance(client):
    """Refuses claiming medicine is safe from visual appearance alone."""
    res = client.post("/api/assistant/chat", json={"message": "This pill looks clean and undamaged, does it look safe to take?"})
    assert res.status_code == 200
    data = res.json()
    reply = data["reply"].lower()
    assert "appearance" in reply
    assert "not" in reply
    assert "chemical" in reply or "degradation" in reply or "potency" in reply


def test_assistant_refusal_invent_facilities(client):
    """Directs to verified directory instead of inventing local addresses."""
    res = client.post("/api/assistant/chat", json={"message": "Give me the address of the nearest drop off facility in my street."})
    assert res.status_code == 200
    data = res.json()
    reply = data["reply"].lower()
    assert "facilities" in reply or "directory" in reply or "municipal" in reply


def test_assistant_ungrounded_query_returns_information_unavailable(client):
    """Returns 'Information unavailable' when query has no matching disposal guidance."""
    res = client.post("/api/assistant/chat", json={"message": "How do I repair an automobile carburetor engine?"})
    assert res.status_code == 200
    data = res.json()
    reply = data["reply"].lower()
    assert "information unavailable" in reply
    assert data["sources"] == []
    assert data["intent"] == "out_of_scope"
    assert len(data["actions"]) > 0


def test_assistant_emergency_poisoning_refusal(client):
    """Refuses emergency poisoning and overdose queries with immediate emergency hotlines."""
    res = client.post("/api/assistant/chat", json={"message": "Help, my toddler accidentally swallowed 10 painkiller pills!"})
    assert res.status_code == 200
    data = res.json()
    reply = data["reply"].lower()
    assert "emergency" in reply or "poison" in reply
    assert "1-800-222-1222" in data["reply"] or "112" in data["reply"]
    assert data["intent"] == "emergency_refusal"
    assert any(a["action_type"] == "emergency_call" for a in data["actions"])


def test_assistant_suggested_actions_on_responses(client):
    """Verifies all responses include rich suggested action buttons."""
    # Blister query
    res = client.post("/api/assistant/chat", json={"message": "Can I put an empty blister pack in a plastic recycling bin?"})
    assert res.status_code == 200
    data = res.json()
    assert len(data["actions"]) >= 1
    action_types = [a["action_type"] for a in data["actions"]]
    assert "navigate" in action_types
    assert any("facilities" in a["payload"] or "guide" in a["payload"] for a in data["actions"])


def test_assistant_context_passing_from_client(client):
    """Verifies that passing active context (e.g. waste category from Identify page) grounds generic queries."""
    payload = {
        "message": "How do I safely dispose of this packaging?",
        "context": {
            "page": "/identify",
            "waste_category": "Empty blister pack"
        }
    }
    res = client.post("/api/assistant/chat", json=payload)
    assert res.status_code == 200
    data = res.json()
    reply = data["reply"].lower()
    # Boosted blister pack guidance due to context
    assert "blister" in reply or "foil" in reply or "pvc" in reply


def test_explicit_intent_router_logic():
    """Directly verifies the deterministic intent router classification."""
    from app.services.assistant_service import route_intent

    assert route_intent("My dog swallowed a bottle of pills") == "emergency_refusal"
    assert route_intent("This tablet looks clean and undamaged, is it safe to take?") == "appearance_safety_refusal"
    assert route_intent("What disease does this antibiotic cure?") == "medical_advice_refusal"
    assert route_intent("Give me the address of the nearest drop off facility") == "invent_facilities_refusal"
    assert route_intent("How should I dispose of expired tablets?") == "disposal_query"
    assert route_intent("Can I recycle empty blister packs?") == "packaging_recycling_query"
    assert route_intent("How do I read the expiry date?") == "expiry_verification_query"
    assert route_intent("What is the capital city of France?") == "out_of_scope"


# =============================================================================
# 3. Admin Protection Tests
# =============================================================================

def test_admin_endpoints_require_auth(client):
    """Admin routes reject missing or invalid credentials with 401."""
    # Stats
    assert client.get("/api/admin/stats").status_code == 401
    assert client.get("/api/admin/stats", headers={"X-Admin-Key": "wrong-key"}).status_code == 401

    # Facilities
    assert client.get("/api/admin/facilities").status_code == 401
    assert client.post("/api/admin/facilities", json={"name": "Test"}).status_code == 401

    # Rules
    assert client.get("/api/admin/rules").status_code == 401
    assert client.post("/api/admin/rules", json={"waste_category": "Test"}).status_code == 401

    # Events
    assert client.post("/api/admin/events", json={"waste_item_id": 1}).status_code == 401

    # Waste item deletion
    assert client.delete("/api/admin/waste-items/999").status_code == 401


def test_admin_auth_via_query_token(client):
    """Admin routes accept authentication via ?admin_token= query parameter."""
    res = client.get(f"/api/admin/stats?admin_token={settings.ADMIN_SECRET_KEY}")
    assert res.status_code == 200
    assert "total_facilities" in res.json()


def test_admin_stats_with_valid_key(client):
    """Admin stats returns aggregate database counts."""
    res = client.get("/api/admin/stats", headers=ADMIN_HEADERS)
    assert res.status_code == 200
    data = res.json()
    assert "total_facilities" in data
    assert "verified_facilities" in data
    assert "total_rules" in data
    assert "total_items" in data
    assert "total_events" in data


# =============================================================================
# 4. Admin Facilities CRUD & Verification Tests
# =============================================================================

def test_admin_facility_crud_and_verification(client):
    """Tests creating, reading, updating, toggling verification, and deleting facilities."""
    # 1. Create Facility
    create_payload = {
        "name": "Admin Test Medical Drop Kiosk",
        "address": "77 Health Way",
        "city": "Adminopolis",
        "postal_code": "99001",
        "contact_details": "kiosk@admin.org",
        "operating_hours": "08:00 - 16:00",
        "accepted_categories": ["Medicine or tablet strip", "Empty blister pack"],
        "source_url": "https://adminopolis.gov/recycle",
        "verification_status": "unverified"
    }
    create_res = client.post("/api/admin/facilities", headers=ADMIN_HEADERS, json=create_payload)
    assert create_res.status_code == 201
    fac = create_res.json()
    fac_id = fac["id"]
    assert fac["name"] == "Admin Test Medical Drop Kiosk"
    assert fac["verification_status"] == "unverified"

    # 2. List Facilities (Admin)
    list_res = client.get("/api/admin/facilities", headers=ADMIN_HEADERS)
    assert list_res.status_code == 200
    fac_ids = [f["id"] for f in list_res.json()]
    assert fac_id in fac_ids

    # 3. Update Facility
    update_payload = {
        **create_payload,
        "name": "Admin Test Medical Drop Kiosk (Updated)",
        "verification_status": "unverified"
    }
    update_res = client.put(f"/api/admin/facilities/{fac_id}", headers=ADMIN_HEADERS, json=update_payload)
    assert update_res.status_code == 200
    assert update_res.json()["name"] == "Admin Test Medical Drop Kiosk (Updated)"

    # 4. Toggle Verification Status (PATCH)
    patch_res = client.patch(
        f"/api/admin/facilities/{fac_id}/verification",
        headers=ADMIN_HEADERS,
        json={"verification_status": "verified"}
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["verification_status"] == "verified"
    assert patch_res.json()["last_verified_at"] is not None

    # 5. Delete Facility
    del_res = client.delete(f"/api/admin/facilities/{fac_id}", headers=ADMIN_HEADERS)
    assert del_res.status_code == 204

    # Verify 404 on deleted
    assert client.get(f"/api/facilities/{fac_id}").status_code == 404


# =============================================================================
# 5. Admin Guidance Rules CRUD & Verification Tests
# =============================================================================

def test_admin_guidance_rules_crud_and_verification(client):
    """Tests creating, reading, updating, toggling verification, and deleting guidance rules."""
    # 1. Create Rule
    create_payload = {
        "waste_category": "Medicine or tablet strip",
        "location_scope": "Provincial Test",
        "recommended_action": "Drop at provincial pharmacy collection station.",
        "handling_cautions": "Do not remove from blister strips until arrival.",
        "source_title": "Provincial Ministry of Environment",
        "source_url": "https://environment.prov.gov",
        "verification_status": "unverified"
    }
    create_res = client.post("/api/admin/rules", headers=ADMIN_HEADERS, json=create_payload)
    assert create_res.status_code == 201
    rule = create_res.json()
    rule_id = rule["id"]
    assert rule["location_scope"] == "Provincial Test"
    assert rule["verification_status"] == "unverified"

    # 2. List Rules (Admin)
    list_res = client.get("/api/admin/rules", headers=ADMIN_HEADERS)
    assert list_res.status_code == 200
    rule_ids = [r["id"] for r in list_res.json()]
    assert rule_id in rule_ids

    # 3. Update Rule
    update_payload = {
        **create_payload,
        "recommended_action": "Updated: Drop at provincial pharmacy collection station safely.",
        "verification_status": "unverified"
    }
    update_res = client.put(f"/api/admin/rules/{rule_id}", headers=ADMIN_HEADERS, json=update_payload)
    assert update_res.status_code == 200
    assert "safely" in update_res.json()["recommended_action"]

    # 4. Toggle Verification Status (PATCH)
    patch_res = client.patch(
        f"/api/admin/rules/{rule_id}/verification",
        headers=ADMIN_HEADERS,
        json={"verification_status": "verified"}
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["verification_status"] == "verified"
    assert patch_res.json()["last_verified_at"] is not None

    # 5. Delete Rule
    del_res = client.delete(f"/api/admin/rules/{rule_id}", headers=ADMIN_HEADERS)
    assert del_res.status_code == 204


# =============================================================================
# 6. Admin Event Logging & Waste Item Deletion Tests
# =============================================================================

def test_admin_event_logging_and_item_deletion(client):
    """Tests logging verified processing events and deleting waste items."""
    # 1. Create a waste item first
    item_res = client.post("/api/waste-items", json={
        "visual_category": "Medicine bottle or container",
        "material_type": "Amber Glass",
        "user_notes": "Admin test item",
        "estimated_quantity": 3.0,
        "quantity_unit": "bottles",
        "model_mode": "real"
    })
    assert item_res.status_code == 201
    item_id = item_res.json()["id"]

    # 2. Admin logs an event for this item
    event_payload = {
        "waste_item_id": item_id,
        "event_type": "high_temperature_thermal_treatment",
        "previous_status": "identified",
        "new_status": "processed",
        "quantity": 3.0,
        "quantity_unit": "bottles",
        "actor": "Certified Thermal Facility #7",
        "evidence_reference": "CERT-HT-2026-9912",
        "demo_record": False
    }
    event_res = client.post("/api/admin/events", headers=ADMIN_HEADERS, json=event_payload)
    assert event_res.status_code == 201
    ev_data = event_res.json()
    assert ev_data["waste_item_id"] == item_id
    assert ev_data["new_status"] == "processed"
    assert ev_data["actor"] == "Certified Thermal Facility #7"

    # Verify item status was updated
    get_item_res = client.get(f"/api/waste-items?limit=100")
    matching_items = [i for i in get_item_res.json()["items"] if i["id"] == item_id]
    assert len(matching_items) == 1
    assert matching_items[0]["current_status"] == "processed"

    # 3. Delete waste item via Admin endpoint
    del_res = client.delete(f"/api/admin/waste-items/{item_id}", headers=ADMIN_HEADERS)
    assert del_res.status_code == 204

    # 4. Verify item is gone
    check_items_res = client.get(f"/api/waste-items?limit=100")
    remaining_ids = [i["id"] for i in check_items_res.json()["items"]]
    assert item_id not in remaining_ids


def test_public_delete_waste_item_option(client):
    """Verifies that public waste item deletion endpoint /api/waste-items/{id} functions per privacy policy."""
    # Create item
    item_res = client.post("/api/waste-items", json={
        "visual_category": "Empty blister pack",
        "model_mode": "real"
    })
    item_id = item_res.json()["id"]

    # Delete via DELETE /api/waste-items/{id}
    del_res = client.delete(f"/api/waste-items/{item_id}")
    assert del_res.status_code == 204

    # Verify 404 on second delete attempt
    del_again = client.delete(f"/api/waste-items/{item_id}")
    assert del_again.status_code == 404
