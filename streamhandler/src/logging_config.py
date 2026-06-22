"""Logging setup for the StreamHandler service.

Mirrors the backend's console format so logs are consistent across the stack
and can be scraped by promtail/Loki. Writes to stdout only (the container
runtime / promtail handles persistence), at the level configured via SH_LOG_LEVEL.
"""

from __future__ import annotations

import logging
import sys

from src.config import settings

_LOG_FORMAT = "%(asctime)s - %(name)s - %(levelname)s <-> %(message)s"
_TIME_FORMAT = "%Y-%m-%d %H:%M:%S"


def setup_logging() -> logging.Logger:
    root = logging.getLogger()
    level = getattr(logging, settings.log_level.upper(), logging.INFO)
    root.setLevel(level)

    if root.hasHandlers():
        root.handlers.clear()

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(logging.Formatter(_LOG_FORMAT, datefmt=_TIME_FORMAT))
    root.addHandler(handler)

    # Third-party libraries are noisy at DEBUG; keep them at WARNING.
    for noisy in ("pika", "urllib3", "redis"):
        logging.getLogger(noisy).setLevel(logging.WARNING)

    return root
