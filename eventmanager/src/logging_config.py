"""Logging setup — stdout, level via EM_LOG_LEVEL, stack-consistent format."""

from __future__ import annotations

import logging
import sys

from src.config import settings

_LOG_FORMAT = "%(asctime)s - %(name)s - %(levelname)s <-> %(message)s"
_TIME_FORMAT = "%Y-%m-%d %H:%M:%S"


def setup_logging() -> logging.Logger:
    root = logging.getLogger()
    root.setLevel(getattr(logging, settings.log_level.upper(), logging.INFO))
    if root.hasHandlers():
        root.handlers.clear()
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(logging.Formatter(_LOG_FORMAT, datefmt=_TIME_FORMAT))
    root.addHandler(handler)
    for noisy in ("pika", "urllib3", "redis", "minio"):
        logging.getLogger(noisy).setLevel(logging.WARNING)
    return root
