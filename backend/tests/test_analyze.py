"""Tests for POST /api/analyze and GET /api/categories.

Tests:
- Valid uploads (JPEG, PNG, WEBP)
- Invalid / spoofed file types (magic bytes mismatch)
- Unsupported file types (PDF, text, empty)
- Oversized uploads
- Pluggable demo classifier mode (confidence=None, model_mode='demo')
- Unknown category handling ('Unknown or other')
- Persistence of WasteItem when save_record=True
"""
import io
import pytest
from app.models.waste_item import WasteItem

# Valid minimal image byte signatures
VALID_JPEG_BYTES = b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00\xff\xdb\x00C\x00"
VALID_PNG_BYTES = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4"
VALID_WEBP_BYTES = b"RIFF\x1a\x00\x00\x00WEBPVP8L\x0e\x00\x00\x00/\x00\x00\x00\x00\x07\x01\x08\x90\x88\x88\x08\x00"


def test_get_categories_endpoint(client):
    """Test GET /api/categories returns the 5 specification categories and metadata."""
    response = client.get("/api/categories")
    assert response.status_code == 200
    data = response.json()
    assert "categories" in data
    assert "Medicine or tablet strip" in data["categories"]
    assert "Empty blister pack" in data["categories"]
    assert "Medicine bottle or container" in data["categories"]
    assert "Cardboard or paper pharmaceutical packaging" in data["categories"]
    assert "Unknown or other" in data["categories"]
    assert data["active_model_mode"] in ("demo", "real")
    assert "Notice:" in data["disclaimer"]


def test_analyze_valid_jpeg_demo_mode(client):
    """Test analyzing valid JPEG in demo mode returns model_mode='demo' and confidence=None."""
    file_tuple = ("test_sample.jpg", io.BytesIO(VALID_JPEG_BYTES), "image/jpeg")
    response = client.post(
        "/api/analyze",
        files={"file": file_tuple},
        data={"sample_category": "Empty blister pack", "model_mode": "demo"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["predicted_category"] == "Empty blister pack"
    assert data["model_mode"] == "demo"
    assert data["confidence"] is None  # Section 4B requirement
    assert data["detected_format"] == "jpeg"
    assert "Simulated Demo Classification" in data["explanation"]
    assert "Notice:" in data["disclaimer"]


def test_analyze_valid_png_and_webp(client):
    """Test analyzing valid PNG and WEBP file signatures."""
    # PNG test
    png_file = ("blister.png", io.BytesIO(VALID_PNG_BYTES), "image/png")
    res_png = client.post(
        "/api/analyze",
        files={"file": png_file},
        data={"sample_category": "Medicine or tablet strip"}
    )
    assert res_png.status_code == 200
    assert res_png.json()["detected_format"] == "png"
    assert res_png.json()["predicted_category"] == "Medicine or tablet strip"

    # WEBP test
    webp_file = ("bottle.webp", io.BytesIO(VALID_WEBP_BYTES), "image/webp")
    res_webp = client.post(
        "/api/analyze",
        files={"file": webp_file},
        data={"sample_category": "Medicine bottle or container"}
    )
    assert res_webp.status_code == 200
    assert res_webp.json()["detected_format"] == "webp"
    assert res_webp.json()["predicted_category"] == "Medicine bottle or container"


def test_analyze_unknown_category_handling(client):
    """Test that ambiguous or unknown packaging resolves to 'Unknown or other' without forcing known class."""
    file_tuple = ("mystery.jpg", io.BytesIO(VALID_JPEG_BYTES), "image/jpeg")
    response = client.post(
        "/api/analyze",
        files={"file": file_tuple},
        data={"sample_category": "Unknown or other"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["predicted_category"] == "Unknown or other"
    assert "Unknown / Needs Review outcome" in data["uncertainty_notes"]
    assert "Consult a pharmacist" in data["suggested_next_action"]


def test_analyze_unsupported_file_types_rejected(client):
    """Test that unsupported formats (PDF, text) are rejected with HTTP 415."""
    # PDF masquerading as jpg
    pdf_content = b"%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF"
    pdf_file = ("document.jpg", io.BytesIO(pdf_content), "image/jpeg")
    res_pdf = client.post("/api/analyze", files={"file": pdf_file})
    assert res_pdf.status_code == 415
    assert "PDF documents are not accepted" in res_pdf.json()["detail"]

    # Plain text file
    txt_content = b"This is a text file describing pharmaceutical medicine."
    txt_file = ("notes.txt", io.BytesIO(txt_content), "text/plain")
    res_txt = client.post("/api/analyze", files={"file": txt_file})
    assert res_txt.status_code == 415
    assert "file signature does not match" in res_txt.json()["detail"]


def test_analyze_empty_file_rejected(client):
    """Test that empty file (0 bytes) is rejected with HTTP 400."""
    empty_file = ("empty.png", io.BytesIO(b""), "image/png")
    response = client.post("/api/analyze", files={"file": empty_file})
    assert response.status_code == 400
    assert "empty (0 bytes)" in response.json()["detail"]


def test_analyze_oversized_file_rejected(client):
    """Test that file exceeding MAX_UPLOAD_SIZE_BYTES is rejected with HTTP 413."""
    # Create fake oversized content starting with valid JPEG header but larger than 5MB
    large_size = 5 * 1024 * 1024 + 500  # 5MB + 500 bytes
    large_bytes = b"\xff\xd8\xff" + b"\x00" * (large_size - 3)
    large_file = ("huge_photo.jpg", io.BytesIO(large_bytes), "image/jpeg")

    response = client.post("/api/analyze", files={"file": large_file})
    assert response.status_code == 413
    assert "exceeds maximum limit" in response.json()["detail"]


def test_analyze_with_save_record(client, db_session):
    """Test that setting save_record=True creates a WasteItem in the database with status='identified'."""
    file_tuple = ("tablet_strip.png", io.BytesIO(VALID_PNG_BYTES), "image/png")
    response = client.post(
        "/api/analyze",
        files={"file": file_tuple},
        data={"sample_category": "Medicine or tablet strip", "save_record": "true"}
    )
    assert response.status_code == 200
    data = response.json()
    item_id = data["waste_item_id"]
    assert item_id is not None

    # Verify record in DB
    item = db_session.query(WasteItem).filter(WasteItem.id == item_id).first()
    assert item is not None
    assert item.visual_category == "Medicine or tablet strip"
    assert item.current_status == "identified"
    assert item.model_mode == "demo"
    assert item.confidence is None
