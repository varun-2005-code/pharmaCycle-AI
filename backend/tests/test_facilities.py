"""Tests for Collection Facilities API."""
import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_list_facilities_default():
    response = client.get("/api/facilities")
    assert response.status_code == 200
    data = response.json()
    assert "facilities" in data
    assert data["total"] >= 1
    # Check that demo facilities are present
    names = [f["name"] for f in data["facilities"]]
    assert any("GreenCross" in n for n in names)


def test_filter_facilities_by_city():
    response = client.get("/api/facilities?city=Central+City")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 1
    for fac in data["facilities"]:
        assert "Central City" in fac["city"]


def test_filter_facilities_by_postal_code():
    response = client.get("/api/facilities?postal_code=10001")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 1
    assert data["facilities"][0]["postal_code"] == "10001"


def test_filter_facilities_by_category():
    response = client.get("/api/facilities?category=Empty+blister+pack")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 1
    for fac in data["facilities"]:
        assert any("blister" in c.lower() for c in fac["accepted_categories"])


def test_filter_facilities_verified_only():
    response = client.get("/api/facilities?verified_only=true")
    assert response.status_code == 200
    data = response.json()
    for fac in data["facilities"]:
        assert fac["verification_status"] == "verified"


def test_get_facility_by_id():
    list_res = client.get("/api/facilities")
    first_id = list_res.json()["facilities"][0]["id"]
    response = client.get(f"/api/facilities/{first_id}")
    assert response.status_code == 200
    assert response.json()["id"] == first_id


def test_get_facility_not_found():
    response = client.get("/api/facilities/999999")
    assert response.status_code == 404
