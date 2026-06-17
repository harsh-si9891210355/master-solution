"""Resize + JPEG encode.

Turns a decoded BGR frame into an ``EncodedFrame``. Resizing here is the final
authority on output shape (the GStreamer decoder usually pre-sizes, so this is
a no-op for that path; the OpenCV path relies on it). Supports aspect-preserving
letterbox so ROI normalisation stays valid across the resize.
"""

from __future__ import annotations

import time

import cv2
import numpy as np

from src.models import DecodedFrame, EncodedFrame


class JpegEncoder:
    def __init__(self, *, width: int, height: int, keep_aspect: bool, quality: int) -> None:
        self.width = width
        self.height = height
        self.keep_aspect = keep_aspect
        self._encode_params = [int(cv2.IMWRITE_JPEG_QUALITY), int(quality)]

    def _resize(self, image: np.ndarray) -> np.ndarray:
        h, w = image.shape[:2]
        tw, th = self.width, self.height

        # 0 means "keep this axis from source".
        if tw <= 0 and th <= 0:
            return image
        if tw <= 0:
            tw = int(round(w * (th / h)))
        if th <= 0:
            th = int(round(h * (tw / w)))
        if (w, h) == (tw, th):
            return image

        interp = cv2.INTER_AREA if (tw < w or th < h) else cv2.INTER_LINEAR
        if not self.keep_aspect:
            return cv2.resize(image, (tw, th), interpolation=interp)

        # Letterbox: scale to fit, pad to target with black bars. Keeps the
        # subject undistorted so normalised ROIs map cleanly.
        scale = min(tw / w, th / h)
        nw, nh = max(1, int(round(w * scale))), max(1, int(round(h * scale)))
        resized = cv2.resize(image, (nw, nh), interpolation=interp)
        canvas = np.zeros((th, tw, 3), dtype=image.dtype)
        x0, y0 = (tw - nw) // 2, (th - nh) // 2
        canvas[y0 : y0 + nh, x0 : x0 + nw] = resized
        return canvas

    def encode(self, frame: DecodedFrame) -> EncodedFrame:
        image = self._resize(frame.image)
        ok, buf = cv2.imencode(".jpg", image, self._encode_params)
        if not ok:
            raise ValueError("cv2.imencode failed to encode frame to JPEG")
        h, w = image.shape[:2]
        return EncodedFrame(
            data=buf.tobytes(),
            seq=frame.seq,
            capture_epoch_ms=frame.capture_epoch_ms,
            width=w,
            height=h,
        )


def now_epoch_ms() -> int:
    return int(time.time() * 1000)
