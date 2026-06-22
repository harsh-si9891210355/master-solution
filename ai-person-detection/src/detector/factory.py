"""Detector selection based on AI_DETECTOR_BACKEND."""

from __future__ import annotations

import logging

from src.config import DetectorBackend, settings
from src.detector.base import PersonDetector

logger = logging.getLogger(__name__)


def create_detector() -> PersonDetector:
    backend = settings.detector_backend
    if backend == DetectorBackend.HOG:
        from src.detector.hog import HogPersonDetector

        return HogPersonDetector()
    from src.detector.yolo import YoloPersonDetector

    return YoloPersonDetector()
