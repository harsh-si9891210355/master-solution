"""Frame decoding and annotation.

  * Raw image    – inline base64 if present, else fetched from Redis (claim-check).
  * Processed    – rendered by the Event Manager from the raw frame, layering:
        1. the ROI (no-walking zone) as a translucent overlay,
        2. the AI detection boxes (red = in-zone violation, green otherwise),
        3. an info banner with camera name, location and the frame timestamp.
    If a frame supplies a pre-rendered ``processed`` image and no raw frame is
    available, that image is used as-is.

Font sizes scale with frame height so text stays legible after the video is
resized to the evidence resolution.
"""

from __future__ import annotations

import base64
import logging
from datetime import datetime, timezone

import cv2
import numpy as np

from src.models import FrameItem
from src.redis_frames import RedisFrameReader
from src.roi import RoiZone

logger = logging.getLogger(__name__)

_GREEN = (0, 200, 0)
_RED = (0, 0, 230)
_ROI_COLOR = (0, 140, 255)   # orange
_WHITE = (255, 255, 255)


def _decode_b64(data: str | None) -> np.ndarray | None:
    if not data:
        return None
    try:
        return cv2.imdecode(np.frombuffer(base64.b64decode(data), np.uint8), cv2.IMREAD_COLOR)
    except Exception:
        return None


def _decode_jpeg_bytes(buf: bytes | None) -> np.ndarray | None:
    if not buf:
        return None
    try:
        return cv2.imdecode(np.frombuffer(buf, np.uint8), cv2.IMREAD_COLOR)
    except Exception:
        return None


def _font_scale(h: int) -> float:
    return max(0.4, h / 720.0 * 0.6)


def _thickness(h: int) -> int:
    return max(1, int(round(h / 720.0 * 2)))


def _fmt_timestamp(epoch_ms: int | None) -> str:
    if not epoch_ms:
        return ""
    try:
        return datetime.fromtimestamp(epoch_ms / 1000, tz=timezone.utc).strftime(
            "%Y-%m-%d %H:%M:%S UTC"
        )
    except (ValueError, OSError):
        return ""


def draw_detections(image: np.ndarray, detections: list[dict]) -> np.ndarray:
    """Draw AI detection boxes + labels. Red for an in-zone violation, else green."""
    h = image.shape[0]
    fs, th = _font_scale(h), _thickness(h)
    for det in detections:
        bbox = det.get("bbox")
        if not bbox or len(bbox) != 4:
            continue
        x1, y1, x2, y2 = (int(v) for v in bbox)
        violation = bool(det.get("in_roi") or det.get("violation"))
        color = _RED if violation else _GREEN
        cv2.rectangle(image, (x1, y1), (x2, y2), color, th)
        label = str(det.get("label", "person"))
        conf = det.get("confidence")
        text = f"{label} {conf:.2f}" if isinstance(conf, (int, float)) else label
        cv2.putText(image, text, (x1, max(12, y1 - 6)),
                    cv2.FONT_HERSHEY_SIMPLEX, fs, color, th, cv2.LINE_AA)
    return image


def draw_banner(image: np.ndarray, lines: list[str]) -> np.ndarray:
    """Draw a translucent top banner with the given text lines."""
    if not lines:
        return image
    h, w = image.shape[:2]
    fs = _font_scale(h)
    th = max(1, int(round(h / 720.0 * 1.5)))
    pad = int(round(h * 0.012)) + 4
    line_h = int(round(22 * fs)) + pad
    banner_h = line_h * len(lines) + pad

    overlay = image.copy()
    cv2.rectangle(overlay, (0, 0), (w, banner_h), (0, 0, 0), -1)
    cv2.addWeighted(overlay, 0.45, image, 0.55, 0, image)

    y = pad + int(round(16 * fs))
    for line in lines:
        cv2.putText(image, line, (pad, y), cv2.FONT_HERSHEY_SIMPLEX, fs, _WHITE, th, cv2.LINE_AA)
        y += line_h
    return image


class Annotator:
    """Renders the processed (annotated) frame for the evidence video."""

    def __init__(self, camera_name: str | None, location: str | None,
                 usecase_name: str | None, roi_spec: dict | None) -> None:
        self.camera_name = camera_name or ""
        self.location = location or ""
        self.usecase_name = usecase_name or ""
        self.roi_spec = roi_spec or {}

    def render(self, raw: np.ndarray, frame: FrameItem) -> np.ndarray:
        out = raw.copy()
        h, w = out.shape[:2]
        # 1. ROI (no-walking zone) overlay
        RoiZone.from_envelope(self.roi_spec, w, h).draw(out, color=_ROI_COLOR,
                                                        label="NO-WALKING ZONE")
        # 2. AI detections
        draw_detections(out, frame.detections)
        # 3. info banner: camera / location, then use-case / timestamp
        line1 = " | ".join(p for p in (
            f"Cam: {self.camera_name}" if self.camera_name else "",
            f"Loc: {self.location}" if self.location else "",
        ) if p)
        line2 = " | ".join(p for p in (
            self.usecase_name, _fmt_timestamp(frame.capture_epoch_ms),
        ) if p)
        draw_banner(out, [ln for ln in (line1, line2) if ln])
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

    def resolve_processed_inline(self, frame: FrameItem) -> np.ndarray | None:
        """A pre-rendered processed image, used only when no raw frame exists."""
        return _decode_b64(frame.processed_b64)
