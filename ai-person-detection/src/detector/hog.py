"""OpenCV HOG + SVM people detector.

A dependency-light, fully offline fallback (no torch, no model download) — it
uses OpenCV's built-in pedestrian detector. Lower accuracy than YOLO, but handy
for quick local testing or constrained environments. Select with
``AI_DETECTOR_BACKEND=hog``.
"""

from __future__ import annotations

import logging

import cv2
import numpy as np

from src.config import settings
from src.detector.base import PersonDetector
from src.models import Detection

logger = logging.getLogger(__name__)


class HogPersonDetector(PersonDetector):
    name = "hog"

    def __init__(self) -> None:
        self._hog = cv2.HOGDescriptor()
        self._hog.setSVMDetector(cv2.HOGDescriptor_getDefaultPeopleDetector())
        self._conf = settings.confidence_threshold
        logger.info("Initialised OpenCV HOG people detector")

    def detect(self, image_bgr: np.ndarray) -> list[Detection]:
        rects, weights = self._hog.detectMultiScale(
            image_bgr, winStride=(8, 8), padding=(8, 8), scale=1.05
        )
        h, w = image_bgr.shape[:2]
        detections: list[Detection] = []
        for (x, y, bw, bh), score in zip(rects, weights):
            # HOG weights are SVM scores (~0..2+); squash to a 0..1 confidence and
            # apply the same threshold for a consistent output contract.
            conf = float(1.0 / (1.0 + np.exp(-float(score))))
            if conf < self._conf:
                continue
            detections.append(
                Detection(
                    x1=max(0, int(x)), y1=max(0, int(y)),
                    x2=min(w, int(x + bw)), y2=min(h, int(y + bh)),
                    confidence=conf,
                )
            )
        return detections

    def describe(self) -> dict:
        return {"backend": self.name, "confidence_threshold": self._conf}
