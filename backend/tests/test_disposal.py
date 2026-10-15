"""Tests for Disposal Recommendation Engine and Disposal Guide API."""
import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_get_disposal_guide_all():
    response = client.get("/api/disposal-guide")
    assert response.status_code == 200
    data = response.json()
    assert "articles" in data
    assert data["total_articles"] >= 5
    titles = [a["title"] for a in data["articles"]]
    assert any("Blister" in t for t in titles)
    assert any("Tablets" in t for t in titles)


def test_get_disposal_guide_filter_category():
    response = client.get("/api/disposal-guide?category=Empty+blister+pack")
    assert response.status_code == 200
    data = response.json()
    assert len(data["articles"]) == 1
    assert data["articles"][0]["category"] == "Empty blister pack"


def test_recommend_expired_medicine_take_back():
    payload = {
        "waste_category": "Medicine or tablet strip",
        "expiry_status": "confirmed_expired",
        "material_type": "Alu-PVC Blister",
        "location": "Central City"
    }
    response = client.post("/api/disposal/recommend", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["waste_category"] == "Medicine or tablet strip"
    assert "take-back" in data["recommended_action"].lower()
    assert "Never flush" in data["recommended_action"] or "never flush" in data["recommended_action"].lower()
    assert "handling_cautions" in data
    assert data["verification_status"] == "verified"


def test_recommend_empty_blister_multilayer_warning():
    payload = {
        "waste_category": "Empty blister pack",
        "material_type": "Bonded aluminium/PVC",
        "location": "Central City"
    }
    response = client.post("/api/disposal/recommend", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["waste_category"] == "Empty blister pack"
    # Must warn that standard kerbside plastic recycling cannot separate bonded layers
    assert "kerbside" in data["recommended_action"].lower() or "bonded" in data["why_suggested"].lower()
    assert len(data["eligible_facilities"]) > 0


def test_recommend_cardboard_recyclable():
    payload = {
        "waste_category": "Cardboard or paper pharmaceutical packaging",
        "material_type": "Clean Paperboard"
    }
    response = client.post("/api/disposal/recommend", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "recycling" in data["recommended_action"].lower() or "flatten" in data["recommended_action"].lower()


def test_recommend_unknown_category_safe_fallback():
    payload = {
        "waste_category": "Unknown or other"
    }
    response = client.post("/api/disposal/recommend", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "Unknown or other" in data["waste_category"]
    assert "hazardous" in data["recommended_action"].lower() or "authority" in data["recommended_action"].lower()
