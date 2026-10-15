"""Server-side image validation service for PharmaCycle AI.

Validates image files by:
1. Size limits (preventing oversized uploads / DoS).
2. Content verification via magic bytes / file signatures (preventing spoofed extensions).
3. Restricting to permitted formats: JPG, JPEG, PNG, WEBP.
"""
from typing import Tuple
from fastapi import HTTPException, status
from app.config import settings

# Supported format signatures
# JPEG: \xFF\xD8\xFF
# PNG: \x89PNG\r\n\x1a\n
# WEBP: RIFF....WEBP

SUPPORTED_FORMATS = {"jpg", "jpeg", "png", "webp"}


class ImageValidationError(HTTPException):
    """Specific HTTP exception for image validation failures."""
    def __init__(self, detail: str, status_code: int = status.HTTP_400_BAD_REQUEST):
        super().__init__(status_code=status_code, detail=detail)


def detect_image_format(content: bytes) -> str:
    """Detect image format by inspecting file magic bytes/header signatures.

    Returns:
        One of 'jpeg', 'png', 'webp' if recognized.

    Raises:
        ImageValidationError: If format is unknown or unsupported.
    """
    if len(content) < 12:
        raise ImageValidationError(
            "Invalid file content: file is too small or empty to be a valid image."
        )

    # Check JPEG: \xFF\xD8\xFF
    if content.startswith(b"\xff\xd8\xff"):
        return "jpeg"

    # Check PNG: \x89PNG\r\n\x1a\n
    if content.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png"

    # Check WEBP: starts with 'RIFF' and bytes 8..12 are 'WEBP'
    if content.startswith(b"RIFF") and content[8:12] == b"WEBP":
        return "webp"

    # Specific informative errors for other common types
    if content.startswith(b"%PDF"):
        raise ImageValidationError(
            "Unsupported file type: PDF documents are not accepted. Please upload JPG, PNG, or WEBP images.",
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE
        )
    if content.startswith((b"GIF87a", b"GIF89a")):
        raise ImageValidationError(
            "Unsupported file type: Animated GIF is not supported. Please upload JPG, PNG, or WEBP images.",
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE
        )
    if content.startswith(b"BM"):
        raise ImageValidationError(
            "Unsupported file type: BMP images are not supported. Please upload JPG, PNG, or WEBP images.",
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE
        )
    if content.startswith(b"PK\x03\x04"):
        raise ImageValidationError(
            "Unsupported file type: Archive/zip packages are not accepted.",
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE
        )

    raise ImageValidationError(
        "Invalid file content: file signature does not match supported image formats (JPG, PNG, WEBP). "
        "File extension alone is not sufficient; the actual file content must be a valid image.",
        status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE
    )


def validate_image_upload(
    content: bytes,
    filename: str,
    max_size: int = settings.MAX_UPLOAD_SIZE_BYTES
) -> Tuple[str, int]:
    """Validate image payload size and content.

    Args:
        content: The raw byte content of the uploaded file.
        filename: Original file name.
        max_size: Maximum allowed size in bytes.

    Returns:
        Tuple of (detected_format, file_size_bytes)

    Raises:
        ImageValidationError: If file violates size or format constraints.
    """
    file_size = len(content)

    # 1. Check empty file
    if file_size == 0:
        raise ImageValidationError("Uploaded file is empty (0 bytes).")

    # 2. Check maximum size limit
    if file_size > max_size:
        max_mb = max_size / (1024 * 1024)
        actual_mb = file_size / (1024 * 1024)
        raise ImageValidationError(
            f"File size exceeds maximum limit of {max_mb:.1f} MB (uploaded file is {actual_mb:.2f} MB).",
            status_code=status.HTTP_413_CONTENT_TOO_LARGE
        )

    # 3. Verify magic bytes / file signature
    detected_format = detect_image_format(content)

    return detected_format, file_size
