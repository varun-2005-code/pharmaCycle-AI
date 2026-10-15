"""Tests for POST /api/ocr/expiry endpoint and ExpiryOcrService."""
import io
import pytest

VALID_PNG_BYTES = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4"


def test_ocr_with_simulated_image(client):
    """Test OCR on simulated packaging image extracts candidate date without errors."""
    file_tuple = ("blister_foil.png", io.BytesIO(VALID_PNG_BYTES), "image/png")
    response = client.post("/api/ocr/expiry", files={"file": file_tuple})
    assert response.status_code == 200
    data = response.json()
    assert data["engine_mode"] == "demo_ocr"
    assert "candidate_date" in data
    assert "Notice:" in data["disclaimer"]


def test_ocr_distinguishes_mfg_and_exp(client):
    """Test that manufacturing date (MFG 01/2023) is distinct from expiry date (EXP 12/2028)."""
    text = "TABLET STRIP\nMFG DATE: 01/2023\nBATCH NO: 442\nEXPIRY DATE: 12/2028"
    response = client.post("/api/ocr/expiry", data={"sample_text": text})
    assert response.status_code == 200
    data = response.json()
    assert data["normalized_date"] == "2028-12"
    assert data["is_expired"] is False
    assert data["verification_status"] == "confirmed"
    assert "MFG_LABEL" in data["labels_detected"]
    assert "EXPIRY_LABEL" in data["labels_detected"]


def test_ocr_ambiguous_only_mfg_date(client):
    """Test that when only MFG is present, the system does not guess it as expiry date."""
    text = "AMBIGUOUS SAMPLE\nMFG: 05/2023\nBATCH: X-900"
    response = client.post("/api/ocr/expiry", data={"sample_text": text})
    assert response.status_code == 200
    data = response.json()
    assert data["verification_status"] == "ambiguous"
    assert data["candidate_date"] is None
    assert data["is_expired"] is None


def test_ocr_manual_date_override(client):
    """Test manual user date override takes precedence and marks verification_status='manual_entry'."""
    response = client.post("/api/ocr/expiry", data={"manual_date": "10/2027"})
    assert response.status_code == 200
    data = response.json()
    assert data["candidate_date"] == "10/2027"
    assert data["normalized_date"] == "2027-10"
    assert data["is_expired"] is False
    assert data["verification_status"] == "manual_entry"
    assert data["confidence_score"] == 1.0


def test_ocr_detects_past_expired_date(client):
    """Test that date in the past is accurately flagged as is_expired=True."""
    response = client.post("/api/ocr/expiry", data={"manual_date": "01/2020"})
    assert response.status_code == 200
    data = response.json()
    assert data["is_expired"] is True
    assert data["normalized_date"] == "2020-01"


def test_ocr_unsupported_file_rejected(client):
    """Test that invalid file signature is rejected."""
    fake_file = ("bad.jpg", io.BytesIO(b"Not an image file"), "image/jpeg")
    response = client.post("/api/ocr/expiry", files={"file": fake_file})
    assert response.status_code == 415
