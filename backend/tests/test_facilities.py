"""Tests for Collection Facilities API (Section 4F).

Covers search by city and PIN, category filtering, verified vs unverified facilities,
and clear labelling of example facilities ("EXAMPLE – not a real facility").
"""
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.database import init_db

# Ensure baseline rules and facilities are seeded and updated
init_db()

client = TestClient(app)


def test_list_facilities_default_and_example_labelling():
    """Verify default facility listing and verify that example facilities are clearly labelled."""
    response = client.get("/api/facilities")
    assert response.status_code == 200
    data = response.json()
    assert "facilities" in data
    assert data["total"] >= 1

    facilities = data["facilities"]
    # Section 4F: Seed example facilities clearly labelled 'EXAMPLE – not a real facility' in name
    for fac in facilities:
        if fac.get("is_example"):
            assert "EXAMPLE – not a real facility" in fac["name"]

    names = [f["name"] for f in facilities]
    assert any("GreenCross" in n for n in names)
    assert any("TerraCycle" in n for n in names)


def test_filter_facilities_by_city():
    """Verify search/filter by city."""
    response = client.get("/api/facilities?city=Central+City")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 1
    for fac in data["facilities"]:
        assert "Central City" in fac["city"]


def test_filter_facilities_by_pin_and_postal_code():
    """Verify search/filter by PIN code and postal_code parameters."""
    # Test using pin query parameter
    res_pin = client.get("/api/facilities?pin=10001")
    assert res_pin.status_code == 200
    data_pin = res_pin.json()
    assert data_pin["total"] >= 1
    assert data_pin["facilities"][0]["postal_code"] == "10001"

    # Test using postal_code query parameter
    res_pc = client.get("/api/facilities?postal_code=10005")
    assert res_pc.status_code == 200
    data_pc = res_pc.json()
    assert data_pc["total"] >= 1
    assert data_pc["facilities"][0]["postal_code"] == "10005"


def test_filter_facilities_by_category():
    """Verify filtering by accepted waste category."""
    response = client.get("/api/facilities?category=Empty+blister+pack")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 1
    for fac in data["facilities"]:
        assert any("blister" in c.lower() for c in fac["accepted_categories"])


def test_verified_vs_unverified_facilities():
    """Verify distinction between verified facilities and unverified facilities."""
    # When verified_only is True, no unverified facility should appear
    res_verified = client.get("/api/facilities?verified_only=true")
    assert res_verified.status_code == 200
    data_verified = res_verified.json()
    assert data_verified["total"] >= 1
    for fac in data_verified["facilities"]:
        assert fac["verification_status"] == "verified"
        assert "unverified" not in fac["name"].lower()

    # When verified_only is False, unverified facilities should be returned as well
    res_all = client.get("/api/facilities?verified_only=false")
    assert res_all.status_code == 200
    data_all = res_all.json()
    statuses = [f["verification_status"] for f in data_all["facilities"]]
    assert "verified" in statuses
    assert "unverified" in statuses

    # Unverified facility in Riverdale
    res_riv = client.get("/api/facilities?city=Riverdale")
    assert res_riv.status_code == 200
    data_riv = res_riv.json()
    assert data_riv["total"] >= 1
    unverified_riv = [f for f in data_riv["facilities"] if f["verification_status"] == "unverified"]
    assert len(unverified_riv) >= 1
    assert any("unverified" in f["name"].lower() for f in unverified_riv)


def test_search_by_free_text():
    """Verify searching across name, city, and PIN code in free-text search."""
    # Search by city keyword
    res1 = client.get("/api/facilities?search=Harbor")
    assert res1.status_code == 200
    assert any("Harbor" in f["city"] or "Harbor" in f["name"] for f in res1.json()["facilities"])

    # Search by PIN
    res2 = client.get("/api/facilities?search=10001")
    assert res2.status_code == 200
    assert any(f["postal_code"] == "10001" for f in res2.json()["facilities"])


def test_get_facility_by_id_and_not_found():
    """Verify retrieving a single facility by ID and handling 404 for missing IDs."""
    list_res = client.get("/api/facilities")
    first_fac = list_res.json()["facilities"][0]
    first_id = first_fac["id"]

    res = client.get(f"/api/facilities/{first_id}")
    assert res.status_code == 200
    detail = res.json()
    assert detail["id"] == first_id
    assert detail["name"] == first_fac["name"]
    assert "address" in detail
    assert "city" in detail
    assert "accepted_categories" in detail
    assert "verification_status" in detail
    assert "is_example" in detail

    # Non-existent ID
    res_404 = client.get("/api/facilities/999999")
    assert res_404.status_code == 404
    assert "not found" in res_404.json()["detail"].lower()
