"""OpenCV (FFmpeg-backed) RTSP decoder.

The portable fallback: works anywhere ``opencv-python`` is installed, no
GStreamer system stack required. Less efficient than the GStreamer pipeline
(no in-pipeline videorate/videoscale, copies through Python) but perfectly
adequate at the low sampling rates this service targets.
"""

from __future__ import annotations

import logging
import os

import cv2
import numpy as np

from src.decoder.base import DecoderError, FrameDecoder

logger = logging.getLogger(__name__)


class OpenCVDecoder(FrameDecoder):
    def __init__(self, *args, **kwargs) -> None:
        super().__init__(*args, **kwargs)
        self._cap: cv2.VideoCapture | None = None

    def open(self) -> None:
        # Steer the FFmpeg backend's RTSP transport via the documented env var
        # OpenCV forwards to FFmpeg. TCP avoids packet loss on lossy links.
        os.environ.setdefault(
            "OPENCV_FFMPEG_CAPTURE_OPTIONS",
            f"rtsp_transport;{self.rtsp_transport}|stimeout;5000000",
        )
        cap = cv2.VideoCapture(self.rtsp_url, cv2.CAP_FFMPEG)
        # Keep the internal buffer tiny so read() returns near-live frames
        # rather than draining a backlog after any stall.
        try:
            cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
        except cv2.error:
            pass
        if not cap.isOpened():
            cap.release()
            raise DecoderError(f"OpenCV could not open RTSP source: {self.rtsp_url}")
        self._cap = cap
        logger.info("OpenCV decoder opened %s", self.rtsp_url)

    def read(self) -> np.ndarray | None:
        if self._cap is None:
            raise DecoderError("read() called before open()")
        ok, frame = self._cap.read()
        if not ok or frame is None:
            # grab() failing on a network source is effectively a disconnect.
            raise DecoderError("OpenCV read failed — source disconnected")
        return frame

    def close(self) -> None:
        if self._cap is not None:
            self._cap.release()
            self._cap = None
