"""Tests for Disposal Recommendation Engine (Section 4D) and Disposal Guide API (Section 4H).

Covers deterministic rules, distinct category logic, medicine flush prevention,
blister pack verification requirements, unverified data safeguards, and article contents.
"""
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.database import get_db, SessionLocal
from app.models.disposal_rule import DisposalRule
from app.models.collection_facility import CollectionFacility

client = TestClient(app)


def test_medicines_and_blister_packs_receive_different_recommendations():
    """Pytest proving medicines and blister packs receive fundamentally different recommendations."""
    med_payload = {
        "waste_category": "Medicine or tablet strip",
        "expiry_status": "confirmed_expired",
        "material_type": "Alu-PVC Blister",
        "location": "Central City"
    }
    blister_payload = {
        "waste_category": "Empty blister pack",
        "material_type": "Bonded aluminium/PVC",
        "location": "Central City"
    }

    med_res = client.post("/api/disposal/recommend", json=med_payload)
    blister_res = client.post("/api/disposal/recommend", json=blister_payload)

    assert med_res.status_code == 200
    assert blister_res.status_code == 200

    med_data = med_res.json()
    blister_data = blister_res.json()

    # Recommendations must be distinct
    assert med_data["recommended_action"] != blister_data["recommended_action"]
    assert med_data["why_suggested"] != blister_data["why_suggested"]
    assert med_data["reason"] != blister_data["reason"]

    # Medicine recommendation emphasizes authorized drug take-back and drug chemical risks
    assert "take-back" in med_data["recommended_action"].lower()
    assert "active pharmaceutical ingredient" in med_data["why_suggested"].lower() or "apis" in med_data["why_suggested"].lower()

    # Blister pack recommendation emphasizes bonded plastic-aluminium and delamination
    assert "delamination" in blister_data["why_suggested"].lower() or "bonded" in blister_data["why_suggested"].lower()
    assert "kerbside" in blister_data["recommended_action"].lower() or "terracycle" in blister_data["recommended_action"].lower()


def test_medicine_recommendation_never_flushes_or_ordinary_recycling():
    """Section 4D rule: Never recommend flushing or ordinary recycling bins for medicines."""
    scenarios = [
        {"expiry_status": "confirmed_expired"},
        {"expiry_status": "confirmed_valid"},
        {"expiry_status": "unverified"}
    ]

    for sc in scenarios:
        payload = {
            "waste_category": "Medicine or tablet strip",
            "expiry_status": sc["expiry_status"],
            "location": "Central City"
        }
        res = client.post("/api/disposal/recommend", json=payload)
        assert res.status_code == 200
        data = res.json()

        action = data["recommended_action"].lower()
        cautions = data["handling_cautions"].lower()

        # Must explicitly prohibit flushing
        assert ("never flush" in action or "never flush" in cautions)
        # Must explicitly prohibit household/ordinary recycling
        assert ("never place" in action or "domestic recycling" in action or "standard recycling" in cautions or "ordinary household recycling" in action)


def test_blister_pack_recommends_facilities_only_if_verified():
    """Section 4D rule: Recommend blister-pack facilities ONLY if acceptance is verified.

    Riverdale has an unverified blister box ('Riverdale Quick-Care Unverified Blister Box [Demo Facility]'),
    which must be excluded. Central City has a verified blister facility, which must be included.
    """
    # Test in Riverdale where only an unverified blister facility exists
    riverdale_payload = {
        "waste_category": "Empty blister pack",
        "location": "Riverdale"
    }
    res_riv = client.post("/api/disposal/recommend", json=riverdale_payload)
    assert res_riv.status_code == 200
    riv_data = res_riv.json()

    # The unverified blister facility MUST NOT appear in eligible_facilities
    for fac in riv_data["eligible_facilities"]:
        assert fac["verification_status"] == "verified"
        assert "unverified" not in fac["name"].lower()

    # Test in Central City where verified facility exists
    central_payload = {
        "waste_category": "Empty blister pack",
        "location": "Central City"
    }
    res_cen = client.post("/api/disposal/recommend", json=central_payload)
    assert res_cen.status_code == 200
    cen_data = res_cen.json()

    assert len(cen_data["eligible_facilities"]) > 0
    for fac in cen_data["eligible_facilities"]:
        assert fac["verification_status"] == "verified"


def test_unverified_data_never_appears_as_verified_and_has_no_fabricated_urls():
    """Spec requirement: Where no verified source exists, mark them 'general guidance, unverified'

    with NO fabricated URLs or regulations.
    """
    payload = {
        "waste_category": "Unknown or other",
        "material_type": "Mystery composite"
    }
    res = client.post("/api/disposal/recommend", json=payload)
    assert res.status_code == 200
    data = res.json()

    # Status must NOT be 'verified'
    assert data["verification_status"] != "verified"
    assert "unverified" in data["verification_status"]

    # Must NOT have a fabricated URL
    assert data["source_url"] is None
    # Must NOT have a fake verification timestamp
    assert data["last_verified_at"] is None

    # Title must acknowledge unverified status
    assert "unverified" in data["source_title"].lower()


def test_all_five_categories_distinct_logic():
    """Verify that all five categories yield distinct recommendations and rationales."""
    categories = [
        "Medicine or tablet strip",
        "Empty blister pack",
        "Medicine bottle or container",
        "Cardboard or paper pharmaceutical packaging",
        "Unknown or other"
    ]

    actions = set()
    reasons = set()

    for cat in categories:
        res = client.post("/api/disposal/recommend", json={"waste_category": cat})
        assert res.status_code == 200
        data = res.json()

        assert data["recommended_action"] not in actions
        assert data["why_suggested"] not in reasons

        actions.add(data["recommended_action"])
        reasons.add(data["why_suggested"])

    assert len(actions) == 5
    assert len(reasons) == 5


def test_contaminated_items_go_to_municipal_or_authorized_handler():
    """Section 4D rule: Unknown or contaminated items go to the municipal/authorized handler."""
    # Test contaminated cardboard
    payload_cardboard = {
        "waste_category": "Cardboard or paper pharmaceutical packaging",
        "user_notes": "Carton is heavily stained and contaminated with leaked liquid antibiotics"
    }
    res_cb = client.post("/api/disposal/recommend", json=payload_cardboard)
    assert res_cb.status_code == 200
    data_cb = res_cb.json()

    assert "contaminated" in data_cb["recommended_action"].lower()
    assert ("municipal hazardous" in data_cb["recommended_action"].lower() or "authorized" in data_cb["recommended_action"].lower())
    assert "not place it into ordinary household recycling" in data_cb["recommended_action"].lower()

    # Test unknown items
    payload_unknown = {
        "waste_category": "Unknown or other"
    }
    res_unk = client.post("/api/disposal/recommend", json=payload_unknown)
    assert res_unk.status_code == 200
    data_unk = res_unk.json()

    assert ("municipal" in data_unk["recommended_action"].lower() or "authorized" in data_unk["recommended_action"].lower())


def test_disposal_recommend_schema_outputs():
    """Check that all required fields are returned in the recommendation output:

    recommended action, reason, handling cautions, jurisdiction, source title and URL (only if verified),
    last verification date, and an uncertainty explanation.
    """
    payload = {
        "waste_category": "Medicine bottle or container",
        "material_type": "Amber glass bottle",
        "location": "Metro City"
    }
    res = client.post("/api/disposal/recommend", json=payload)
    assert res.status_code == 200
    data = res.json()

    assert "recommended_action" in data and len(data["recommended_action"]) > 0
    assert "reason" in data and len(data["reason"]) > 0
    assert "why_suggested" in data and len(data["why_suggested"]) > 0
    assert "handling_cautions" in data and len(data["handling_cautions"]) > 0
    assert "jurisdiction" in data and len(data["jurisdiction"]) > 0
    assert "applicable_location" in data and len(data["applicable_location"]) > 0
    assert "source_title" in data
    assert "source_url" in data  # Present and verified URL string for glass bottles
    assert data["source_url"] is not None
    assert "last_verified_at" in data
    assert "confidence_explanation" in data and len(data["confidence_explanation"]) > 0


def test_disposal_guide_articles_and_search():
    """Section 4H: Test searchable disposal guide covering all items with verified and unverified guidance."""
    res = client.get("/api/disposal-guide")
    assert res.status_code == 200
    data = res.json()

    assert data["total_articles"] >= 6
    articles = data["articles"]

    # Verify each spec topic is covered
    titles = [a["title"].lower() for a in articles]
    assert any("tablet" in t or "medicine" in t for t in titles)
    assert any("blister" in t for t in titles)
    assert any("bottle" in t for t in titles)
    assert any("carton" in t for t in titles)
    assert any("leaflet" in t for t in titles)
    assert any("unknown" in t or "contaminated" in t for t in titles)

    # Check unverified article in guide has no fabricated URL
    unknown_art = next((a for a in articles if a["id"] == "art-unknown-hazardous"), None)
    assert unknown_art is not None
    assert unknown_art["verification_status"] == "general guidance, unverified"
    assert unknown_art["source_url"] is None

    # Test keyword search
    res_search = client.get("/api/disposal-guide?search=delamination")
    assert res_search.status_code == 200
    data_search = res_search.json()
    assert data_search["total_articles"] >= 1
    assert any("blister" in a["title"].lower() for a in data_search["articles"])

    # Test category filter
    res_filter = client.get("/api/disposal-guide?category=Empty+blister+pack")
    assert res_filter.status_code == 200
    data_filter = res_filter.json()
    assert len(data_filter["articles"]) == 1
    assert data_filter["articles"][0]["category"] == "Empty blister pack"
