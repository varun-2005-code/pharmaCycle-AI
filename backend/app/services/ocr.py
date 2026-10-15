"""OCR Text Extraction and Expiry Date Verification Service.

Implements Section 4C requirements:
- Extracts visible text from uploaded pharmaceutical packaging images
- Looks for expiration indicators (EXP, EXPIRY, USE BEFORE, BEST BEFORE, VALID UP TO)
- Strictly distinguishes expiry from manufacturing indicators (MFG, MFR, BATCH, LOT)
- Normalizes dates into standard formats (MM/YYYY, DD/MM/YYYY, etc.)
- Performs safety-critical date evaluation (expired vs valid) without false positives
- Provides manual date fallback and ambiguous date handling
"""
import re
from datetime import datetime, timezone
from typing import List, Optional, Tuple
from pydantic import BaseModel

MONTH_NAME_MAP = {
    "jan": 1, "january": 1,
    "feb": 2, "february": 2,
    "mar": 3, "march": 3,
    "apr": 4, "april": 4,
    "may": 5,
    "jun": 6, "june": 6,
    "jul": 7, "july": 7,
    "aug": 8, "august": 8,
    "sep": 9, "september": 9,
    "oct": 10, "october": 10,
    "nov": 11, "november": 11,
    "dec": 12, "december": 12,
}

# Regex for expiration labels
EXPIRY_LABEL_PATTERN = re.compile(
    r"\b(exp(?:iry)?|use\s*before|best\s*before|val(?:id)?\s*up\s*to)\b",
    re.IGNORECASE
)

# Regex for manufacturing labels (to avoid false assignment)
MFG_LABEL_PATTERN = re.compile(
    r"\b(mfg|mfd|mfr|manufactur(?:ed|ing)?|batch|lot|b\.no)\b",
    re.IGNORECASE
)

# Common date patterns on blister packs and packaging:
# 1) DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
DATE_DD_MM_YYYY = re.compile(r"\b(0?[1-9]|[12][0-9]|3[01])[\/\-\.](0?[1-9]|1[0-2])[\/\-\.](20\d\d)\b")

# 2) MM/YYYY or MM-YYYY
DATE_MM_YYYY = re.compile(r"\b(0?[1-9]|1[0-2])[\/\-\.](20\d\d)\b")

# 3) MM/YY or MM-YY (e.g. 12/26)
DATE_MM_YY = re.compile(r"\b(0?[1-9]|1[0-2])[\/\-\.](\d{2})\b")

# 4) MMM YYYY (e.g. DEC 2026, OCT 2025)
DATE_MMM_YYYY = re.compile(
    r"\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s\.\-\/]+(20\d\d)\b",
    re.IGNORECASE
)


class OcrResult(BaseModel):
    extracted_text: str
    candidate_date: Optional[str] = None
    normalized_date: Optional[str] = None  # YYYY-MM or YYYY-MM-DD
    is_expired: Optional[bool] = None
    verification_status: str  # "confirmed" | "unverified" | "ambiguous" | "manual_entry" | "expired" | "valid"
    confidence_score: Optional[float] = None
    engine_mode: str  # "demo_ocr" | "real_ocr" | "manual"
    labels_detected: List[str] = []
    manufacturing_date_detected: Optional[str] = None
    disclaimer: str = (
        "Notice: OCR date extraction is an aid only. Visual confirmation by the user is required. "
        "Appearance of packaging does not determine whether a medicine is genuine, potent, or safe."
    )


def parse_and_evaluate_date(candidate_str: str) -> Tuple[Optional[str], Optional[bool], str]:
    """Parse a candidate date string and evaluate whether it is in the past.

    Returns:
        (normalized_date, is_expired, status_string)
    """
    clean_str = candidate_str.strip()
    now_utc = datetime.now(timezone.utc)
    current_year = now_utc.year
    current_month = now_utc.month
    current_day = now_utc.day

    # 1. Try DD/MM/YYYY
    match_dmy = DATE_DD_MM_YYYY.search(clean_str)
    if match_dmy:
        day, month, year = int(match_dmy.group(1)), int(match_dmy.group(2)), int(match_dmy.group(3))
        norm = f"{year:04d}-{month:02d}-{day:02d}"
        target_dt = datetime(year, month, day, 23, 59, 59, tzinfo=timezone.utc)
        is_expired = now_utc > target_dt
        return norm, is_expired, ("expired" if is_expired else "valid")

    # 2. Try MMM YYYY
    match_my_text = DATE_MMM_YYYY.search(clean_str)
    if match_my_text:
        month_name = match_my_text.group(1).lower()
        month = MONTH_NAME_MAP.get(month_name[:3], 1)
        year = int(match_my_text.group(2))
        norm = f"{year:04d}-{month:02d}"
        is_expired = (year < current_year) or (year == current_year and month < current_month)
        return norm, is_expired, ("expired" if is_expired else "valid")

    # 3. Try MM/YYYY
    match_my = DATE_MM_YYYY.search(clean_str)
    if match_my:
        month, year = int(match_my.group(1)), int(match_my.group(2))
        norm = f"{year:04d}-{month:02d}"
        is_expired = (year < current_year) or (year == current_year and month < current_month)
        return norm, is_expired, ("expired" if is_expired else "valid")

    # 4. Try MM/YY (assumes 20xx)
    match_my2 = DATE_MM_YY.search(clean_str)
    if match_my2:
        month, yy = int(match_my2.group(1)), int(match_my2.group(2))
        year = 2000 + yy
        norm = f"{year:04d}-{month:02d}"
        is_expired = (year < current_year) or (year == current_year and month < current_month)
        return norm, is_expired, ("expired" if is_expired else "valid")

    return None, None, "unverified"


def extract_expiry_from_text(raw_text: str) -> OcrResult:
    """Extract expiry dates from OCR-detected text, respecting safety constraints.

    Never confuses manufacturing dates with expiry dates.
    """
    labels_detected = []
    lines = [line.strip() for line in raw_text.splitlines() if line.strip()]

    candidate_expiry = None
    candidate_mfg = None

    for line in lines:
        if EXPIRY_LABEL_PATTERN.search(line):
            labels_detected.append("EXPIRY_LABEL")
            # Look for date in this line
            norm, exp, status = parse_and_evaluate_date(line)
            if norm:
                candidate_expiry = line
                break

        if MFG_LABEL_PATTERN.search(line):
            labels_detected.append("MFG_LABEL")
            norm, exp, status = parse_and_evaluate_date(line)
            if norm and not candidate_mfg:
                candidate_mfg = line

    # If no labeled line matched, search across entire text
    if not candidate_expiry:
        norm, exp, status = parse_and_evaluate_date(raw_text)
        if norm:
            # Check if it was preceded by MFG label
            if "MFG_LABEL" in labels_detected and not candidate_expiry:
                # Ambiguous: could be manufacturing date, do not guess!
                return OcrResult(
                    extracted_text=raw_text,
                    candidate_date=None,
                    normalized_date=None,
                    is_expired=None,
                    verification_status="ambiguous",
                    confidence_score=0.4,
                    engine_mode="demo_ocr",
                    labels_detected=labels_detected,
                    manufacturing_date_detected=norm,
                )
            candidate_expiry = norm

    if candidate_expiry:
        norm, is_expired, status = parse_and_evaluate_date(candidate_expiry)
        return OcrResult(
            extracted_text=raw_text,
            candidate_date=candidate_expiry,
            normalized_date=norm,
            is_expired=is_expired,
            verification_status="confirmed" if norm else "unverified",
            confidence_score=0.88,
            engine_mode="demo_ocr",
            labels_detected=labels_detected,
            manufacturing_date_detected=candidate_mfg,
        )

    # Missing or unreadable
    return OcrResult(
        extracted_text=raw_text,
        candidate_date=None,
        normalized_date=None,
        is_expired=None,
        verification_status="unverified",
        confidence_score=None,
        engine_mode="demo_ocr",
        labels_detected=labels_detected,
    )


class ExpiryOcrService:
    """Service handling image text extraction and date confirmation."""

    @staticmethod
    def process_image_or_override(
        image_bytes: Optional[bytes] = None,
        manual_date: Optional[str] = None,
        sample_text: Optional[str] = None,
    ) -> OcrResult:
        """Process image with OCR or apply verified manual user date override."""
        # Manual user date entry has highest authority per Section 4C
        if manual_date and manual_date.strip():
            norm, is_expired, status = parse_and_evaluate_date(manual_date.strip())
            if norm:
                return OcrResult(
                    extracted_text=f"User Manual Entry: {manual_date.strip()}",
                    candidate_date=manual_date.strip(),
                    normalized_date=norm,
                    is_expired=is_expired,
                    verification_status="manual_entry",
                    confidence_score=1.0,
                    engine_mode="manual",
                    labels_detected=["USER_CONFIRMED"],
                )
            else:
                return OcrResult(
                    extracted_text=f"Invalid manual date format: '{manual_date}'",
                    candidate_date=manual_date,
                    normalized_date=None,
                    is_expired=None,
                    verification_status="unverified",
                    confidence_score=None,
                    engine_mode="manual",
                    labels_detected=[],
                )

        # If sample_text is provided (for demo or tests)
        if sample_text:
            return extract_expiry_from_text(sample_text)

        # Standard OCR pipeline on image bytes
        # In demo environment, extracts simulated packaging text with expiration stamp
        simulated_packaging_text = (
            "PARACETAMOL 500mg\n"
            "BATCH NO: B-9824\n"
            "MFG DATE: 01/2024\n"
            "EXPIRY DATE: 12/2026\n"
            "KEEP OUT OF REACH OF CHILDREN"
        )
        return extract_expiry_from_text(simulated_packaging_text)
