"""Frame decoding and annotation.

Resolves each frame's raw and processed (annotated) images as OpenCV BGR arrays:

  * raw image     – inline base64 if present, else fetched from Redis (claim-check).
  * processed     – inline base64 if present, else rendered by drawing the AI
                    detections onto the raw image (red box if the person is in
                    the ROI / a violation, green otherwise) with a label.

Frames that cannot be decoded are skipped by the caller.
"""

from __future__ import annotations

import base64
import logging

import cv2
import numpy as np

from src.models import FrameItem
from src.redis_frames import RedisFrameReader

logger = logging.getLogger(__name__)

_GREEN = (0, 200, 0)
_RED = (0, 0, 230)


def _decode_b64(data: str | None) -> np.ndarray | None:
    if not data:
        return None
    try:
        buf = base64.b64decode(data)
        return cv2.imdecode(np.frombuffer(buf, np.uint8), cv2.IMREAD_COLOR)
    except Exception:
        return None


def _decode_jpeg_bytes(buf: bytes | None) -> np.ndarray | None:
    if not buf:
        return None
    try:
        return cv2.imdecode(np.frombuffer(buf, np.uint8), cv2.IMREAD_COLOR)
    except Exception:
        return None


def annotate(image: np.ndarray, detections: list[dict]) -> np.ndarray:
    """Draw detection boxes + labels (AI output) onto a copy of the frame."""
    out = image.copy()
    for det in detections:
        bbox = det.get("bbox")
        if not bbox or len(bbox) != 4:
            continue
        x1, y1, x2, y2 = (int(v) for v in bbox)
        violation = bool(det.get("in_roi") or det.get("violation"))
        color = _RED if violation else _GREEN
        cv2.rectangle(out, (x1, y1), (x2, y2), color, 2)
        label = str(det.get("label", "person"))
        conf = det.get("confidence")
        text = f"{label} {conf:.2f}" if isinstance(conf, (int, float)) else label
        cv2.putText(out, text, (x1, max(0, y1 - 6)),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 1, cv2.LINE_AA)
    return out


class FrameResolver:
    def __init__(self, redis_reader: RedisFrameReader) -> None:
        self._redis = redis_reader

    def resolve_raw(self, frame: FrameItem) -> np.ndarray | None:
        img = _decode_b64(frame.raw_b64)
        if img is not None:
            return img
        if frame.redis_key:
            return _decode_jpeg_bytes(self._redis.get_frame(frame.redis_key, frame.redis_field))
        return None

    def resolve_processed(self, frame: FrameItem, raw: np.ndarray | None) -> np.ndarray | None:
        img = _decode_b64(frame.processed_b64)
        if img is not None:
            return img
        # No processed image supplied → render one from the raw frame + detections.
        if raw is not None:
            return annotate(raw, frame.detections)
        return None
