"""Ultralytics YOLOv8 person detector.

YOLOv8n ("nano") is a small, fast, accurate model — a good lightweight default
for testing and a reasonable production baseline on CPU/GPU. Weights are loaded
from ``model_weights`` (a bundled name like ``yolov8n.pt`` auto-downloads on
first use, or a path to a local file). Detection is filtered to the COCO
``person`` class (id 0).
"""

from __future__ import annotations

import logging

import numpy as np

from src.config import settings
from src.detector.base import PersonDetector
from src.models import Detection

logger = logging.getLogger(__name__)

_PERSON_CLASS_ID = 0  # COCO "person"


class YoloPersonDetector(PersonDetector):
    name = "yolo"

    def __init__(self) -> None:
        # Imported lazily so the HOG backend works without torch/ultralytics.
        from ultralytics import YOLO

        self._weights = settings.model_weights
        self._device = settings.device
        self._conf = settings.confidence_threshold
        self._imgsz = settings.inference_imgsz
        logger.info("Loading YOLO weights '%s' on device '%s'", self._weights, self._device)
        self._model = YOLO(self._weights)
        # Warm up + pin device so the first real frame isn't slow / surprising.
        self._model.to(self._device)

    def detect(self, image_bgr: np.ndarray) -> list[Detection]:
        results = self._model.predict(
            source=image_bgr,
            classes=[_PERSON_CLASS_ID],
            conf=self._conf,
            imgsz=self._imgsz,
            device=self._device,
            verbose=False,
        )
        detections: list[Detection] = []
        if not results:
            return detections
        boxes = results[0].boxes
        if boxes is None:
            return detections
        xyxy = boxes.xyxy.cpu().numpy()
        confs = boxes.conf.cpu().numpy()
        h, w = image_bgr.shape[:2]
        for (x1, y1, x2, y2), conf in zip(xyxy, confs):
            detections.append(
                Detection(
                    x1=max(0, int(x1)), y1=max(0, int(y1)),
                    x2=min(w, int(x2)), y2=min(h, int(y2)),
                    confidence=float(conf),
                )
            )
        return detections

    def describe(self) -> dict:
        return {
            "backend": self.name,
            "weights": self._weights,
            "device": self._device,
            "confidence_threshold": self._conf,
            "imgsz": self._imgsz,
        }
