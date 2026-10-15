"""Tests for POST /api/ocr/expiry endpoint and ExpiryOcrService.

Covers Section 4C requirements:
- Date formats: MM/YYYY, MM/YY, DD/MM/YYYY, MMM YYYY.
- Distinguishing EXP/EXPIRY/USE BEFORE/BEST BEFORE from MFG/MFD/manufacturing dates.
- Ambiguous dates: only manufacturing date, unlabeled dates, unreadable/missing text.
- Conflicting dates: multiple conflicting expiry dates on packaging.
- OCR unavailable/failure handling: clear response, no faked OCR output.
- Manual entry: marked as 'user-provided'.
- Expired, non-expired, and unconfirmed states.
- Rejection of invalid file signatures.
"""
import io
import pytest
from app.services import ocr as ocr_module

VALID_PNG_BYTES = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4"


def test_ocr_unavailable_when_engine_missing(client):
    """When EasyOCR/PaddleOCR is not installed, return clear 'OCR unavailable' response.

    Crucial: Must NOT fake OCR output when engine is missing or fails.
    """
    file_tuple = ("blister_foil.png", io.BytesIO(VALID_PNG_BYTES), "image/png")
    response = client.post("/api/ocr/expiry", files={"file": file_tuple})
    assert response.status_code == 200
    data = response.json()
    assert data["ocr_available"] is False
    assert data["engine_mode"] == "ocr_unavailable"
    assert data["extracted_text"] == ""  # Never fake OCR text!
    assert data["candidate_date"] is None
    assert data["is_ambiguous"] is True
    assert "OCR engine" in data["ambiguity_reason"]
    assert data["verification_status"] == "unverified"
    assert "Notice:" in data["disclaimer"]


def test_ocr_engine_failure_fallback(client, monkeypatch):
    """Simulate runtime OCR failure and verify clean fallback without faked data."""
    def mock_fail(image_bytes):
        return False, "", "CUDA out of memory"

    monkeypatch.setattr(ocr_module, "run_real_ocr", mock_fail)
    file_tuple = ("scan.png", io.BytesIO(VALID_PNG_BYTES), "image/png")
    response = client.post("/api/ocr/expiry", files={"file": file_tuple})
    assert response.status_code == 200
    data = response.json()
    assert data["ocr_available"] is False
    assert data["engine_mode"] == "ocr_unavailable"
    assert data["candidate_date"] is None


def test_ocr_date_format_mm_yyyy(client):
    """Test date parser with MM/YYYY format and variants (slash, dash, dot)."""
    text = "EXP DATE: 12/2028\nLOT: 49"
    response = client.post("/api/ocr/expiry", data={"sample_text": text, "user_confirmed": "true"})
    assert response.status_code == 200
    data = response.json()
    assert data["candidate_date"] == "12/2028"
    assert data["normalized_date"] == "2028-12"
    assert data["is_expired"] is False
    assert data["is_ambiguous"] is False

    # Dash variant
    res2 = client.post("/api/ocr/expiry", data={"sample_text": "EXP: 05-2027", "user_confirmed": "true"})
    assert res2.json()["normalized_date"] == "2027-05"

    # Dot variant
    res3 = client.post("/api/ocr/expiry", data={"sample_text": "EXPIRY: 04.2029", "user_confirmed": "true"})
    assert res3.json()["normalized_date"] == "2029-04"


def test_ocr_date_format_mm_yy(client):
    """Test date parser with MM/YY format (maps to 20YY)."""
    text = "USE BEFORE 12/26\nBATCH 10"
    response = client.post("/api/ocr/expiry", data={"sample_text": text, "user_confirmed": "true"})
    assert response.status_code == 200
    data = response.json()
    assert data["candidate_date"] == "12/26"
    assert data["normalized_date"] == "2026-12"
    assert data["is_ambiguous"] is False


def test_ocr_date_format_dd_mm_yyyy(client):
    """Test date parser with DD/MM/YYYY format."""
    text = "BEST BEFORE: 15/10/2026"
    response = client.post("/api/ocr/expiry", data={"sample_text": text, "user_confirmed": "true"})
    assert response.status_code == 200
    data = response.json()
    assert data["candidate_date"] == "15/10/2026"
    assert data["normalized_date"] == "2026-10-15"
    assert data["is_ambiguous"] is False


def test_ocr_date_format_mmm_yyyy(client):
    """Test date parser with MMM YYYY textual month format."""
    text = "EXPIRES: OCT 2026"
    response = client.post("/api/ocr/expiry", data={"sample_text": text, "user_confirmed": "true"})
    assert response.status_code == 200
    data = response.json()
    assert data["candidate_date"] == "OCT 2026"
    assert data["normalized_date"] == "2026-10"


def test_ocr_distinguishes_mfg_and_exp(client):
    """Test that manufacturing date (MFG 01/2023) is separated from expiry (EXP 12/2028)."""
    text = "TABLET STRIP\nMFG DATE: 01/2023\nBATCH NO: 442\nEXPIRY DATE: 12/2028"
    response = client.post("/api/ocr/expiry", data={"sample_text": text, "user_confirmed": "true"})
    assert response.status_code == 200
    data = response.json()
    assert data["candidate_date"] == "12/2028"
    assert data["normalized_date"] == "2028-12"
    assert data["is_expired"] is False
    assert data["verification_status"] == "confirmed"
    assert data["manufacturing_date_detected"] == "01/2023"
    assert "MFG_LABEL" in data["labels_detected"]
    assert "EXPIRY_LABEL" in data["labels_detected"]

    # Verify candidate_dates structure
    cands = data["candidate_dates"]
    assert len(cands) == 2
    mfg_cand = next(c for c in cands if c["is_mfg_label"])
    exp_cand = next(c for c in cands if c["is_expiry_label"])
    assert mfg_cand["raw_date"] == "01/2023"
    assert exp_cand["raw_date"] == "12/2028"


def test_ocr_ambiguous_only_mfg_date(client):
    """Never treat a manufacturing date as an expiry date."""
    text = "AMBIGUOUS SAMPLE\nMFG: 05/2023\nBATCH: X-900"
    response = client.post("/api/ocr/expiry", data={"sample_text": text})
    assert response.status_code == 200
    data = response.json()
    assert data["verification_status"] == "ambiguous"
    assert data["candidate_date"] is None
    assert data["is_ambiguous"] is True
    assert "Only manufacturing date detected" in data["ambiguity_reason"]
    assert data["manufacturing_date_detected"] == "05/2023"
    assert data["is_expired"] is None


def test_ocr_ambiguous_unlabeled_dates(client):
    """An unlabeled date without EXP/MFG label is flagged as ambiguous."""
    text = "TABLETS 500mg\n05/2026\nSTORE BELOW 25C"
    response = client.post("/api/ocr/expiry", data={"sample_text": text})
    assert response.status_code == 200
    data = response.json()
    assert data["candidate_date"] == "05/2026"
    assert data["is_ambiguous"] is True
    assert "Date found without explicit expiry label" in data["ambiguity_reason"]
    assert data["verification_status"] == "ambiguous"


def test_ocr_missing_unreadable_dates(client):
    """Missing or unreadable text is handled safely."""
    text = "ANTIBIOTIC SUSPENSION\nSHAKE WELL BEFORE USE"
    response = client.post("/api/ocr/expiry", data={"sample_text": text})
    assert response.status_code == 200
    data = response.json()
    assert data["candidate_date"] is None
    assert data["is_ambiguous"] is True
    assert data["verification_status"] == "unverified"
    assert data["is_expired"] is None


def test_ocr_conflicting_dates(client):
    """Multiple conflicting expiry dates must trigger conflict detection and ambiguity flag."""
    text = "SUSPICIOUS PACKAGING\nEXP: 05/2024\nEXPIRY: 11/2026"
    response = client.post("/api/ocr/expiry", data={"sample_text": text})
    assert response.status_code == 200
    data = response.json()
    assert data["candidate_date"] is None
    assert data["is_ambiguous"] is True
    assert "Conflicting expiry dates detected" in data["ambiguity_reason"]
    assert data["verification_status"] == "unverified"
    assert data["is_expired"] is None


def test_ocr_manual_entry_valid(client):
    """Manual date entry is marked as 'user-provided' and user_confirmed=True."""
    response = client.post("/api/ocr/expiry", data={"manual_date": "10/2028"})
    assert response.status_code == 200
    data = response.json()
    assert data["candidate_date"] == "10/2028"
    assert data["normalized_date"] == "2028-10"
    assert data["is_expired"] is False
    assert data["verification_status"] == "user_provided"
    assert data["engine_mode"] == "user_provided"
    assert data["user_confirmed"] is True
    assert data["confidence_score"] == 1.0


def test_ocr_manual_entry_expired(client):
    """Past manual date is accurately flagged as is_expired=True and marked 'user-provided'."""
    response = client.post("/api/ocr/expiry", data={"manual_date": "01/2020"})
    assert response.status_code == 200
    data = response.json()
    assert data["candidate_date"] == "01/2020"
    assert data["normalized_date"] == "2020-01"
    assert data["is_expired"] is True
    assert data["verification_status"] == "user_provided"
    assert data["engine_mode"] == "user_provided"


def test_ocr_manual_entry_invalid_format(client):
    """Invalid manual date format is handled safely without crashing."""
    response = client.post("/api/ocr/expiry", data={"manual_date": "unparseable-date-99"})
    assert response.status_code == 200
    data = response.json()
    assert data["normalized_date"] is None
    assert data["is_ambiguous"] is True
    assert "Unrecognized date format" in data["ambiguity_reason"]
    assert data["verification_status"] == "unverified"


def test_ocr_unconfirmed_vs_confirmed_states(client):
    """Show 'Expiry not verified' unless confirmed. Only declare 'expired' when confirmed and in the past."""
    past_text = "PARACETAMOL\nEXP: 01/2020"

    # 1. Unconfirmed state: even if date is past, do not declare expired without user confirmation!
    unconf_res = client.post("/api/ocr/expiry", data={"sample_text": past_text, "user_confirmed": "false"})
    assert unconf_res.status_code == 200
    unconf_data = unconf_res.json()
    assert unconf_data["candidate_date"] == "01/2020"
    assert unconf_data["verification_status"] == "unverified"
    assert unconf_data["is_expired"] is None  # Unconfirmed!

    # 2. Confirmed state: confirmed by user and in the past -> declare expired
    conf_res = client.post("/api/ocr/expiry", data={"sample_text": past_text, "user_confirmed": "true"})
    assert conf_res.status_code == 200
    conf_data = conf_res.json()
    assert conf_data["candidate_date"] == "01/2020"
    assert conf_data["verification_status"] == "confirmed"
    assert conf_data["is_expired"] is True  # Declared expired

    # 3. Confirmed state in the future -> non-expired state
    future_text = "IBUPROFEN\nEXP: 12/2028"
    future_res = client.post("/api/ocr/expiry", data={"sample_text": future_text, "user_confirmed": "true"})
    assert future_res.status_code == 200
    future_data = future_res.json()
    assert future_data["candidate_date"] == "12/2028"
    assert future_data["verification_status"] == "confirmed"
    assert future_data["is_expired"] is False  # Non-expired


def test_ocr_unsupported_file_rejected(client):
    """Invalid file magic bytes are rejected with 415 Unsupported Media Type."""
    fake_file = ("bad.jpg", io.BytesIO(b"Not an image file"), "image/jpeg")
    response = client.post("/api/ocr/expiry", files={"file": fake_file})
    assert response.status_code == 415


def test_ocr_date_format_dd_mmm_yyyy(client):
    """Test date parser with DD-MMM-YYYY format (e.g. 15-OCT-2026)."""
    text = "EXPIRY: 15-OCT-2026\nBATCH: 7721"
    response = client.post("/api/ocr/expiry", data={"sample_text": text, "user_confirmed": "true"})
    assert response.status_code == 200
    data = response.json()
    assert data["candidate_date"] == "15-OCT-2026"
    assert data["normalized_date"] == "2026-10-15"
    assert data["is_ambiguous"] is False


def test_ocr_date_format_dd_mm_yy(client):
    """Test date parser with DD/MM/YY format (e.g. 15/10/26)."""
    text = "USE BEFORE: 15/10/26"
    response = client.post("/api/ocr/expiry", data={"sample_text": text, "user_confirmed": "true"})
    assert response.status_code == 200
    data = response.json()
    assert data["candidate_date"] == "15/10/26"
    assert data["normalized_date"] == "2026-10-15"
    assert data["is_ambiguous"] is False


def test_ocr_user_confirm_ambiguous_unlabeled_date(client):
    """When user confirms an unlabeled ambiguous date, status transitions to confirmed."""
    text = "TABLETS 500mg\n05/2026\nSTORE BELOW 25C"
    # 1. Unconfirmed -> ambiguous
    res1 = client.post("/api/ocr/expiry", data={"sample_text": text, "user_confirmed": "false"})
    assert res1.status_code == 200
    d1 = res1.json()
    assert d1["verification_status"] == "ambiguous"
    assert d1["is_ambiguous"] is True
    assert d1["is_expired"] is None

    # 2. Confirmed -> confirmed with resolved expiry status
    res2 = client.post("/api/ocr/expiry", data={"sample_text": text, "user_confirmed": "true"})
    assert res2.status_code == 200
    d2 = res2.json()
    assert d2["verification_status"] == "confirmed"
    assert d2["is_ambiguous"] is False
    assert d2["user_confirmed"] is True


def test_ocr_boolean_string_coercion_safety(client):
    """Ensure string 'false' is not coerced to True via bool('false') trap."""
    text = "EXP: 01/2020"
    # String "false" must leave status as unverified, NOT confirmed
    res = client.post("/api/ocr/expiry", data={"sample_text": text, "user_confirmed": "false"})
    assert res.status_code == 200
    data = res.json()
    assert data["verification_status"] == "unverified"
    assert data["is_expired"] is None
    assert data["user_confirmed"] is False
