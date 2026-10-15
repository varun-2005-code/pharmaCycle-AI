"""Tests for Grounded AI Assistant and Admin API."""
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.config import settings

client = TestClient(app)


def test_assistant_disposal_query():
    res = client.post("/api/assistant/chat", json={"message": "How should I dispose of expired tablets?"})
    assert res.status_code == 200
    data = res.json()
    assert "take-back" in data["reply"].lower()
    assert len(data["sources"]) > 0
    assert data["mode"] == "rules_grounded"


def test_assistant_blister_query():
    res = client.post("/api/assistant/chat", json={"message": "Can I put an empty blister pack in a plastic recycling bin?"})
    assert res.status_code == 200
    data = res.json()
    assert "not" in data["reply"].lower() or "bonded" in data["reply"].lower()
    assert any("WRAP" in s["title"] for s in data["sources"])


def test_assistant_medical_advice_guardrail():
    res = client.post("/api/assistant/chat", json={"message": "Can I take this expired painkiller pill for my headache?"})
    assert res.status_code == 200
    data = res.json()
    assert "safety guardrail" in data["reply"].lower() or "doctor" in data["reply"].lower() or "not permitted" in data["reply"].lower()


def test_admin_auth_required():
    res = client.get("/api/admin/stats")
    assert res.status_code == 401


def test_admin_stats_with_key():
    headers = {"X-Admin-Key": settings.ADMIN_SECRET_KEY}
    res = client.get("/api/admin/stats", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "total_facilities" in data
    assert "total_rules" in data
