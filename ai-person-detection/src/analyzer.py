"""Batch analyzer — runs detection over a batch's frames and builds the event.

Given a frame-batch envelope and the JPEG bytes for each frame, it decodes each
frame, runs the person detector, tests every detection against the use-case ROI
(the "no-walking zone"), and assembles a detailed per-frame analysis plus a
batch-level summary. The result is the JSON pushed to the event queue.
"""

from __future__ import annotations

import logging
import time

import cv2
import numpy as np

from src.config import settings
from src.detector.base import PersonDetector
from src.metrics import FRAMES_ANALYZED, FRAMES_MISSING, INFERENCE_LATENCY, PERSONS_DETECTED, VIOLATIONS
from src.models import FrameAnalysis
from src.roi import RoiZone

logger = logging.getLogger(__name__)

SCHEMA_VERSION = "1.0"


class BatchAnalyzer:
    def __init__(self, detector: PersonDetector) -> None:
        self._detector = detector

    def analyze(self, envelope: dict, frames: list[bytes | None], now_ms: int) -> dict:
        started = time.monotonic()
        frames_meta = envelope.get("frames", {})
        meta_list = frames_meta.get("meta", [])
        default_w = int(frames_meta.get("width", 0) or 0)
        default_h = int(frames_meta.get("height", 0) or 0)
        roi_spec = envelope.get("roi", {})

        analyses: list[FrameAnalysis] = []
        for idx, blob in enumerate(frames):
            meta = meta_list[idx] if idx < len(meta_list) else {}
            w = int(meta.get("width", default_w) or default_w)
            h = int(meta.get("height", default_h) or default_h)
            fa = FrameAnalysis(
                index=idx,
                seq=meta.get("seq"),
                capture_epoch_ms=meta.get("capture_epoch_ms"),
                width=w,
                height=h,
            )

            if blob is None:
                fa.error = "frame_missing"
                FRAMES_MISSING.inc()
                analyses.append(fa)
                continue

            image = cv2.imdecode(np.frombuffer(blob, dtype=np.uint8), cv2.IMREAD_COLOR)
            if image is None:
                fa.error = "decode_failed"
                analyses.append(fa)
                continue

            fh, fw = image.shape[:2]
            fa.width, fa.height = fw, fh
            zone = RoiZone.from_envelope(roi_spec, fw, fh)

            t0 = time.monotonic()
            detections = self._detector.detect(image)
            INFERENCE_LATENCY.observe(time.monotonic() - t0)

            for det in detections:
                zone.annotate(det)
            fa.detections = detections

            FRAMES_ANALYZED.inc()
            PERSONS_DETECTED.inc(len(detections))
            if fa.violation:
                VIOLATIONS.inc()
            analyses.append(fa)

        return self._build_event(envelope, analyses, roi_spec, now_ms, started)

    def _build_event(self, envelope, analyses: list[FrameAnalysis], roi_spec, now_ms, started) -> dict:
        frames_with_person = sum(1 for a in analyses if a.person_count > 0)
        frames_with_violation = sum(1 for a in analyses if a.violation)
        total_detections = sum(a.person_count for a in analyses)
        max_in_frame = max((a.person_count for a in analyses), default=0)

        return {
            "schema_version": SCHEMA_VERSION,
            "service": settings.service_name,
            "event_type": "person_detection",
            "batch_id": envelope.get("batch_id"),
            "produced_at_ms": envelope.get("produced_at_ms"),
            "analyzed_at_ms": now_ms,
            "camera": envelope.get("camera", {}),
            "usecase": envelope.get("usecase", {}),
            "roi": roi_spec,
            "model": self._detector.describe(),
            "summary": {
                "frames_analyzed": len(analyses),
                "frames_with_person": frames_with_person,
                "frames_with_violation": frames_with_violation,
                "total_detections": total_detections,
                "max_persons_in_frame": max_in_frame,
                "violation": frames_with_violation > 0,
                "processing_ms": round((time.monotonic() - started) * 1000, 2),
            },
            "frames": [a.to_dict() for a in analyses],
        }
