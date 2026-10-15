"""Tests for API health check and root endpoints."""


def test_root_endpoint(client):
    """Test that GET / returns service information."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert "PharmaCycle AI" in data["service"]
    assert data["health"] == "/api/health"


def test_api_health_endpoint(client):
    """Test that GET /api/health returns healthy status and connected database."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["database"] == "connected"
    assert data["environment"] == "development"
    assert data["version"] == "1.0.0"
    assert "timestamp" in data
