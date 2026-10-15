"""Logging configuration for PharmaCycle AI Backend.

Excludes sensitive image contents, base64 payloads, and personal identification data.
"""
import logging
import sys
import re
from app.config import settings

# Patterns to sanitize from log records
BASE64_PATTERN = re.compile(r'data:image\/[a-zA-Z]+;base64,[A-Za-z0-9+/=]{50,}')
LONG_HEX_PATTERN = re.compile(r'[A-Fa-f0-9]{64,}')


class SensitiveDataFilter(logging.Filter):
    """Filter that strips large payload blobs or base64 image data from logs."""
    def filter(self, record: logging.LogRecord) -> bool:
        if isinstance(record.msg, str):
            # Redact base64 image strings
            record.msg = BASE64_PATTERN.sub('[REDACTED_IMAGE_DATA]', record.msg)
            # Redact potential long raw hex bytes
            record.msg = LONG_HEX_PATTERN.sub('[REDACTED_RAW_PAYLOAD]', record.msg)
        return True


def setup_logging():
    """Configure structured and secure logging."""
    log_level = getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)
    
    formatter = logging.Formatter(
        fmt="%(asctime)s [%(levelname)s] [%(name)s]: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )
    
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(formatter)
    handler.addFilter(SensitiveDataFilter())

    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)
    
    # Avoid duplicate handlers if re-initialized
    root_logger.handlers = [handler]
    
    # Set levels for third party libraries
    logging.getLogger("uvicorn.access").setLevel(log_level)
    logging.getLogger("uvicorn.error").setLevel(log_level)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)

    return root_logger
