"""OCR Text Extraction and Expiry Date Verification Service.

Implements Section 4C requirements:
- Attempts OCR text extraction using EasyOCR or PaddleOCR if installed.
- If OCR engine is not installed or fails, returns clear 'OCR unavailable' response. Does not fake OCR output.
- Date parser supporting MM/YYYY, MM/YY, DD/MM/YYYY, and MMM YYYY.
- Distinguishes EXP, EXPIRY, USE BEFORE, BEST BEFORE labels from MFG, MFD, and manufacturing dates.
- Never treats manufacturing dates as expiry dates.
- Returns raw extracted text, candidate dates with labels, and ambiguity flag.
- Handles missing, unreadable, ambiguous, and conflicting dates.
- Provides manual entry fallback marked as 'user-provided'.
- Maintains 'Expiry not verified' unless confirmed by user.
"""
import io
import logging
import re
from datetime import datetime, timezone
from typing import Any, List, Optional, Tuple
from pydantic import BaseModel

logger = logging.getLogger("pharmacycle.ocr_service")

# Global cached OCR reader instances
_EASYOCR_READER = None
_PADDLEOCR_READER = None

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
    r"\b(exp(?:iry)?|use\s*before|best\s*before|val(?:id)?\s*up\s*to|expires|exp\s*date)\b",
    re.IGNORECASE
)

# Regex for manufacturing labels (to avoid false assignment)
MFG_LABEL_PATTERN = re.compile(
    r"\b(mfg|mfd|mfr|manufactur(?:ed|ing)?|batch|lot|b\.no|mfg\s*date|mfd\s*date)\b",
    re.IGNORECASE
)

# Date patterns evaluated in order of specificity
DATE_PATTERNS = [
    # 1. DD MMM YYYY (e.g. 15 OCT 2026, 01-JAN-2025)
    (
        "DD_MMM_YYYY",
        re.compile(
            r"(?<![\/\-\.\d\w])(0?[1-9]|[12][0-9]|3[01])[\/\-\.\s]+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\/\-\.\s]+(20\d\d|\d{2})(?![\/\-\.\d\w])",
            re.IGNORECASE
        )
    ),
    # 2. MMM YYYY or MMM YY (e.g. OCT 2026, DEC-28)
    (
        "MMM_YYYY",
        re.compile(
            r"(?<![\/\-\.\d\w])(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\/\-\.\s]+(20\d\d|\d{2})(?![\/\-\.\d\w])",
            re.IGNORECASE
        )
    ),
    # 3. DD/MM/YYYY (e.g. 15/10/2026, 01-05-2024, 31.12.2025)
    (
        "DD_MM_YYYY",
        re.compile(
            r"(?<![\/\-\.\d])(0?[1-9]|[12][0-9]|3[01])[\/\-\.](0?[1-9]|1[0-2])[\/\-\.](20\d\d)(?![\/\-\.\d])"
        )
    ),
    # 4. DD/MM/YY (e.g. 15/10/26, 01-05-24)
    (
        "DD_MM_YY",
        re.compile(
            r"(?<![\/\-\.\d])(0?[1-9]|[12][0-9]|3[01])[\/\-\.](0?[1-9]|1[0-2])[\/\-\.](\d{2})(?![\/\-\.\d])"
        )
    ),
    # 5. MM/YYYY (e.g. 12/2026, 05-2024, 04.2028)
    (
        "MM_YYYY",
        re.compile(
            r"(?<![\/\-\.\d])(0?[1-9]|1[0-2])[\/\-\.](20\d\d)(?![\/\-\.\d])"
        )
    ),
    # 6. MM/YY (e.g. 12/26, 08/24, 03-25)
    (
        "MM_YY",
        re.compile(
            r"(?<![\/\-\.\d])(0?[1-9]|1[0-2])[\/\-\.](\d{2})(?![\/\-\.\d])"
        )
    ),
]


class CandidateDate(BaseModel):
    raw_date: str
    normalized_date: str
    label: str  # "EXPIRY" | "MFG" | "UNLABELED" | "USER_PROVIDED"
    is_expiry_label: bool
    is_mfg_label: bool
    is_in_past: bool


class OcrResult(BaseModel):
    extracted_text: str
    candidate_date: Optional[str] = None
    normalized_date: Optional[str] = None  # YYYY-MM or YYYY-MM-DD
    is_expired: Optional[bool] = None
    is_ambiguous: bool = False
    ambiguity_reason: Optional[str] = None
    ocr_available: bool = True
    verification_status: str  # "unverified" | "confirmed" | "user_provided" | "ambiguous"
    confidence_score: Optional[float] = None
    engine_mode: str  # "real_ocr" | "ocr_unavailable" | "user_provided" | "demo_ocr"
    labels_detected: List[str] = []
    candidate_dates: List[CandidateDate] = []
    manufacturing_date_detected: Optional[str] = None
    user_confirmed: bool = False
    disclaimer: str = (
        "Notice: OCR date extraction is an aid only. Visual confirmation by the user is required. "
        "Appearance of packaging does not determine whether a medicine is genuine, potent, or safe."
    )


def get_easyocr_reader():
    """Lazily load and cache EasyOCR reader if installed."""
    global _EASYOCR_READER
    if _EASYOCR_READER is None:
        import easyocr
        _EASYOCR_READER = easyocr.Reader(["en"], gpu=False)
    return _EASYOCR_READER


def get_paddleocr_reader():
    """Lazily load and cache PaddleOCR reader if installed."""
    global _PADDLEOCR_READER
    if _PADDLEOCR_READER is None:
        from paddleocr import PaddleOCR
        _PADDLEOCR_READER = PaddleOCR(use_angle_cls=True, lang="en")
    return _PADDLEOCR_READER


def run_real_ocr(image_bytes: bytes) -> Tuple[bool, str, Optional[str]]:
    """Attempt OCR using EasyOCR or PaddleOCR if installed.

    Returns:
        (ocr_available, extracted_text, error_message)
    """
    # 1. Try EasyOCR
    try:
        import easyocr  # noqa: F401
        import numpy as np
        from PIL import Image

        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        img_np = np.array(img)
        reader = get_easyocr_reader()
        results = reader.readtext(img_np)
        lines = [res[1] for res in results if res[1] and str(res[1]).strip()]
        return True, "\n".join(lines), None
    except ImportError:
        pass
    except Exception as e:
        logger.warning(f"EasyOCR installed but failed during inference: {e}")
        return False, "", f"EasyOCR execution error: {str(e)}"

    # 2. Try PaddleOCR
    try:
        from paddleocr import PaddleOCR  # noqa: F401
        import numpy as np
        from PIL import Image

        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        img_np = np.array(img)
        ocr = get_paddleocr_reader()
        results = ocr.ocr(img_np, cls=True)
        lines = []
        if results and results[0]:
            for line_info in results[0]:
                text = line_info[1][0]
                if text and str(text).strip():
                    lines.append(str(text).strip())
        return True, "\n".join(lines), None
    except ImportError:
        pass
    except Exception as e:
        logger.warning(f"PaddleOCR installed but failed during inference: {e}")
        return False, "", f"PaddleOCR execution error: {str(e)}"

    # Neither is installed
    return False, "", "OCR engine (EasyOCR or PaddleOCR) is not installed."


def parse_date_string(date_str: str, now_utc: Optional[datetime] = None) -> Optional[Tuple[str, str, bool]]:
    """Parse a single date string and evaluate if it is in the past.

    Returns:
        (raw_matched_string, normalized_date_iso, is_in_past)
    """
    if not now_utc:
        now_utc = datetime.now(timezone.utc)
    current_year = now_utc.year
    current_month = now_utc.month

    clean = date_str.strip()
    for kind, pattern in DATE_PATTERNS:
        match = pattern.search(clean)
        if match:
            raw = match.group(0)
            if kind == "DD_MMM_YYYY":
                day = int(match.group(1))
                month = MONTH_NAME_MAP[match.group(2).lower()[:3]]
                y_str = match.group(3)
                year = int(y_str) if len(y_str) == 4 else 2000 + int(y_str)
                norm = f"{year:04d}-{month:02d}-{day:02d}"
                target_dt = datetime(year, month, day, 23, 59, 59, tzinfo=timezone.utc)
                return raw, norm, now_utc > target_dt

            elif kind == "MMM_YYYY":
                month = MONTH_NAME_MAP[match.group(1).lower()[:3]]
                y_str = match.group(2)
                year = int(y_str) if len(y_str) == 4 else 2000 + int(y_str)
                norm = f"{year:04d}-{month:02d}"
                is_past = (year < current_year) or (year == current_year and month < current_month)
                return raw, norm, is_past

            elif kind == "DD_MM_YYYY":
                day, month, year = int(match.group(1)), int(match.group(2)), int(match.group(3))
                norm = f"{year:04d}-{month:02d}-{day:02d}"
                target_dt = datetime(year, month, day, 23, 59, 59, tzinfo=timezone.utc)
                return raw, norm, now_utc > target_dt

            elif kind == "DD_MM_YY":
                day, month, yy = int(match.group(1)), int(match.group(2)), int(match.group(3))
                year = 2000 + yy
                norm = f"{year:04d}-{month:02d}-{day:02d}"
                target_dt = datetime(year, month, day, 23, 59, 59, tzinfo=timezone.utc)
                return raw, norm, now_utc > target_dt

            elif kind == "MM_YYYY":
                month, year = int(match.group(1)), int(match.group(2))
                norm = f"{year:04d}-{month:02d}"
                is_past = (year < current_year) or (year == current_year and month < current_month)
                return raw, norm, is_past

            elif kind == "MM_YY":
                month, yy = int(match.group(1)), int(match.group(2))
                year = 2000 + yy
                norm = f"{year:04d}-{month:02d}"
                is_past = (year < current_year) or (year == current_year and month < current_month)
                return raw, norm, is_past

    return None


def extract_dates_from_line(line: str, now_utc: Optional[datetime] = None) -> List[Tuple[str, str, bool, int, int]]:
    """Find all date matches within a line along with start/end character offsets."""
    if not now_utc:
        now_utc = datetime.now(timezone.utc)
    current_year = now_utc.year
    current_month = now_utc.month

    results: List[Tuple[str, str, bool, int, int]] = []
    occupied_spans: List[Tuple[int, int]] = []

    for kind, pattern in DATE_PATTERNS:
        for match in pattern.finditer(line):
            start, end = match.span()
            if any(s <= start < e or s < end <= e for s, e in occupied_spans):
                continue

            raw = match.group(0)
            if kind == "DD_MMM_YYYY":
                day = int(match.group(1))
                month = MONTH_NAME_MAP[match.group(2).lower()[:3]]
                y_str = match.group(3)
                year = int(y_str) if len(y_str) == 4 else 2000 + int(y_str)
                norm = f"{year:04d}-{month:02d}-{day:02d}"
                target_dt = datetime(year, month, day, 23, 59, 59, tzinfo=timezone.utc)
                is_past = now_utc > target_dt
            elif kind == "MMM_YYYY":
                month = MONTH_NAME_MAP[match.group(1).lower()[:3]]
                y_str = match.group(2)
                year = int(y_str) if len(y_str) == 4 else 2000 + int(y_str)
                norm = f"{year:04d}-{month:02d}"
                is_past = (year < current_year) or (year == current_year and month < current_month)
            elif kind == "DD_MM_YYYY":
                day, month, year = int(match.group(1)), int(match.group(2)), int(match.group(3))
                norm = f"{year:04d}-{month:02d}-{day:02d}"
                target_dt = datetime(year, month, day, 23, 59, 59, tzinfo=timezone.utc)
                is_past = now_utc > target_dt
            elif kind == "DD_MM_YY":
                day, month, yy = int(match.group(1)), int(match.group(2)), int(match.group(3))
                year = 2000 + yy
                norm = f"{year:04d}-{month:02d}-{day:02d}"
                target_dt = datetime(year, month, day, 23, 59, 59, tzinfo=timezone.utc)
                is_past = now_utc > target_dt
            elif kind == "MM_YYYY":
                month, year = int(match.group(1)), int(match.group(2))
                norm = f"{year:04d}-{month:02d}"
                is_past = (year < current_year) or (year == current_year and month < current_month)
            elif kind == "MM_YY":
                month, yy = int(match.group(1)), int(match.group(2))
                year = 2000 + yy
                norm = f"{year:04d}-{month:02d}"
                is_past = (year < current_year) or (year == current_year and month < current_month)
            else:
                continue

            occupied_spans.append((start, end))
            results.append((raw, norm, is_past, start, end))

    results.sort(key=lambda x: x[3])
    return results


def extract_expiry_from_text(
    raw_text: str,
    user_confirmed: bool = False,
    now_utc: Optional[datetime] = None,
    engine_mode: str = "demo_ocr"
) -> OcrResult:
    """Extract candidate expiry dates from text, enforcing safety rules.

    - Distinguishes manufacturing dates from expiration dates.
    - Flags ambiguous and conflicting dates.
    - Only declares 'is_expired' when user_confirmed is True and date is in the past.
    """
    if not now_utc:
        now_utc = datetime.now(timezone.utc)

    labels_detected = []
    candidate_dates: List[CandidateDate] = []
    lines = [line.strip() for line in raw_text.splitlines() if line.strip()]

    if EXPIRY_LABEL_PATTERN.search(raw_text):
        labels_detected.append("EXPIRY_LABEL")
    if MFG_LABEL_PATTERN.search(raw_text):
        labels_detected.append("MFG_LABEL")

    for line in lines:
        line_dates = extract_dates_from_line(line, now_utc)
        if not line_dates:
            continue

        exp_matches = list(EXPIRY_LABEL_PATTERN.finditer(line))
        mfg_matches = list(MFG_LABEL_PATTERN.finditer(line))

        for raw_d, norm_d, is_past, d_start, d_end in line_dates:
            closest_label = "UNLABELED"
            closest_dist = float("inf")

            # Check preceding labels on same line
            for m in exp_matches:
                m_start, m_end = m.span()
                if m_end <= d_start:
                    dist = d_start - m_end
                    if dist < closest_dist:
                        closest_dist = dist
                        closest_label = "EXPIRY"

            for m in mfg_matches:
                m_start, m_end = m.span()
                if m_end <= d_start:
                    dist = d_start - m_end
                    if dist < closest_dist:
                        closest_dist = dist
                        closest_label = "MFG"

            # Check following label on same line if no preceding label
            if closest_label == "UNLABELED":
                for m in exp_matches:
                    m_start, m_end = m.span()
                    if m_start >= d_end:
                        dist = m_start - d_end
                        if dist < closest_dist and dist < 12:
                            closest_dist = dist
                            closest_label = "EXPIRY"

                for m in mfg_matches:
                    m_start, m_end = m.span()
                    if m_start >= d_end:
                        dist = m_start - d_end
                        if dist < closest_dist and dist < 12:
                            closest_dist = dist
                            closest_label = "MFG"

            candidate_dates.append(CandidateDate(
                raw_date=raw_d,
                normalized_date=norm_d,
                label=closest_label,
                is_expiry_label=(closest_label == "EXPIRY"),
                is_mfg_label=(closest_label == "MFG"),
                is_in_past=is_past
            ))

    expiry_cands = [c for c in candidate_dates if c.is_expiry_label]
    mfg_cands = [c for c in candidate_dates if c.is_mfg_label]
    unlabeled_cands = [c for c in candidate_dates if c.label == "UNLABELED"]
    mfg_date_str = mfg_cands[0].raw_date if mfg_cands else None

    # Case 1: Conflicting expiry dates
    unique_exp_norms = set(c.normalized_date for c in expiry_cands)
    if len(unique_exp_norms) > 1:
        dates_str = ", ".join([c.raw_date for c in expiry_cands])
        return OcrResult(
            extracted_text=raw_text,
            candidate_date=None,
            normalized_date=None,
            is_expired=None,
            is_ambiguous=True,
            ambiguity_reason=f"Conflicting expiry dates detected on packaging: {dates_str}",
            ocr_available=True,
            verification_status="unverified",
            confidence_score=0.4,
            engine_mode=engine_mode,
            labels_detected=labels_detected,
            candidate_dates=candidate_dates,
            manufacturing_date_detected=mfg_date_str,
            user_confirmed=False
        )

    # Case 2: Single clear expiry date candidate
    if len(unique_exp_norms) == 1:
        chosen = expiry_cands[0]
        is_exp = chosen.is_in_past if user_confirmed else None
        status = "confirmed" if user_confirmed else "unverified"
        return OcrResult(
            extracted_text=raw_text,
            candidate_date=chosen.raw_date,
            normalized_date=chosen.normalized_date,
            is_expired=is_exp,
            is_ambiguous=False,
            ambiguity_reason=None,
            ocr_available=True,
            verification_status=status,
            confidence_score=0.92,
            engine_mode=engine_mode,
            labels_detected=labels_detected,
            candidate_dates=candidate_dates,
            manufacturing_date_detected=mfg_date_str,
            user_confirmed=user_confirmed
        )

    # Case 3: Only manufacturing dates found (Never treat MFG as Expiry!)
    if mfg_cands and not expiry_cands and not unlabeled_cands:
        return OcrResult(
            extracted_text=raw_text,
            candidate_date=None,
            normalized_date=None,
            is_expired=None,
            is_ambiguous=True,
            ambiguity_reason="Only manufacturing date detected. Never treat a manufacturing date as an expiry date.",
            ocr_available=True,
            verification_status="ambiguous",
            confidence_score=0.4,
            engine_mode=engine_mode,
            labels_detected=labels_detected,
            candidate_dates=candidate_dates,
            manufacturing_date_detected=mfg_date_str,
            user_confirmed=False
        )

    # Case 4: Unlabeled candidate(s)
    if unlabeled_cands:
        unique_unlabeled = set(c.normalized_date for c in unlabeled_cands)
        if len(unique_unlabeled) > 1:
            return OcrResult(
                extracted_text=raw_text,
                candidate_date=None,
                normalized_date=None,
                is_expired=None,
                is_ambiguous=True,
                ambiguity_reason="Multiple ambiguous dates found without labels.",
                ocr_available=True,
                verification_status="ambiguous",
                confidence_score=0.3,
                engine_mode=engine_mode,
                labels_detected=labels_detected,
                candidate_dates=candidate_dates,
                manufacturing_date_detected=mfg_date_str,
                user_confirmed=False
            )
        else:
            chosen = unlabeled_cands[0]
            reason = "Date found without explicit expiry label. Verification required."
            if mfg_cands:
                reason = "Ambiguous date without expiry label detected alongside manufacturing details."
            is_exp = chosen.is_in_past if user_confirmed else None
            status = "confirmed" if user_confirmed else "ambiguous"
            return OcrResult(
                extracted_text=raw_text,
                candidate_date=chosen.raw_date,
                normalized_date=chosen.normalized_date,
                is_expired=is_exp,
                is_ambiguous=not user_confirmed,
                ambiguity_reason=reason if not user_confirmed else None,
                ocr_available=True,
                verification_status=status,
                confidence_score=0.5,
                engine_mode=engine_mode,
                labels_detected=labels_detected,
                candidate_dates=candidate_dates,
                manufacturing_date_detected=mfg_date_str,
                user_confirmed=user_confirmed
            )

    # Case 5: Missing or unreadable
    return OcrResult(
        extracted_text=raw_text,
        candidate_date=None,
        normalized_date=None,
        is_expired=None,
        is_ambiguous=True,
        ambiguity_reason="No recognizable date format found on packaging.",
        ocr_available=True,
        verification_status="unverified",
        confidence_score=None,
        engine_mode=engine_mode,
        labels_detected=labels_detected,
        candidate_dates=[],
        manufacturing_date_detected=None,
        user_confirmed=False
    )


def process_manual_date(manual_date: str, now_utc: Optional[datetime] = None) -> OcrResult:
    """Process manual date entry from user, marking as 'user-provided'."""
    if not now_utc:
        now_utc = datetime.now(timezone.utc)

    clean_d = manual_date.strip()
    parsed = parse_date_string(clean_d, now_utc)

    if parsed:
        raw_d, norm_d, is_past = parsed
        candidate = CandidateDate(
            raw_date=clean_d,
            normalized_date=norm_d,
            label="USER_PROVIDED",
            is_expiry_label=True,
            is_mfg_label=False,
            is_in_past=is_past
        )
        return OcrResult(
            extracted_text=f"User-provided expiry date: {clean_d}",
            candidate_date=clean_d,
            normalized_date=norm_d,
            is_expired=is_past,
            is_ambiguous=False,
            ambiguity_reason=None,
            ocr_available=True,
            verification_status="user_provided",
            confidence_score=1.0,
            engine_mode="user_provided",
            labels_detected=["USER_PROVIDED"],
            candidate_dates=[candidate],
            manufacturing_date_detected=None,
            user_confirmed=True
        )
    else:
        return OcrResult(
            extracted_text=f"Invalid manual date format: '{manual_date}'",
            candidate_date=manual_date,
            normalized_date=None,
            is_expired=None,
            is_ambiguous=True,
            ambiguity_reason=f"Unrecognized date format in manual entry: '{manual_date}'. Please enter MM/YYYY, MM/YY, or DD/MM/YYYY.",
            ocr_available=True,
            verification_status="unverified",
            confidence_score=None,
            engine_mode="user_provided",
            labels_detected=[],
            candidate_dates=[],
            manufacturing_date_detected=None,
            user_confirmed=False
        )


class ExpiryOcrService:
    """Service handling image text extraction, OCR engine fallback, and date confirmation."""

    @staticmethod
    def process_image_or_override(
        image_bytes: Optional[bytes] = None,
        manual_date: Optional[str] = None,
        sample_text: Optional[str] = None,
        user_confirmed: bool = False,
    ) -> OcrResult:
        """Process image with OCR or apply verified manual user date override.

        If OCR engine is not installed or fails:
        Returns clear 'OCR unavailable' response and does NOT fake OCR output.
        """
        # 1. Manual user date entry has highest authority
        if manual_date and manual_date.strip():
            return process_manual_date(manual_date.strip())

        # 2. Sample text (for demo test presets and testing)
        if sample_text:
            return extract_expiry_from_text(
                raw_text=sample_text,
                user_confirmed=user_confirmed,
                engine_mode="demo_ocr"
            )

        # 3. Process uploaded image bytes
        if image_bytes:
            ocr_ok, extracted_text, err_msg = run_real_ocr(image_bytes)
            if not ocr_ok:
                # Clear 'OCR unavailable' response - Do not fake OCR output!
                return OcrResult(
                    extracted_text="",
                    candidate_date=None,
                    normalized_date=None,
                    is_expired=None,
                    is_ambiguous=True,
                    ambiguity_reason=(
                        "OCR engine (EasyOCR/PaddleOCR) is not installed in this environment. "
                        "Please enter the expiry date manually."
                    ),
                    ocr_available=False,
                    verification_status="unverified",
                    confidence_score=None,
                    engine_mode="ocr_unavailable",
                    labels_detected=[],
                    candidate_dates=[],
                    manufacturing_date_detected=None,
                    user_confirmed=False
                )

            return extract_expiry_from_text(
                raw_text=extracted_text,
                user_confirmed=user_confirmed,
                engine_mode="real_ocr"
            )

        # 4. Fallback if no input provided
        return OcrResult(
            extracted_text="",
            candidate_date=None,
            normalized_date=None,
            is_expired=None,
            is_ambiguous=True,
            ambiguity_reason="No image, manual date, or sample text provided.",
            ocr_available=True,
            verification_status="unverified",
            confidence_score=None,
            engine_mode="demo_ocr",
            labels_detected=[],
            candidate_dates=[],
            manufacturing_date_detected=None,
            user_confirmed=False
        )
