"""Decoder abstraction.

A decoder owns the connection to a single RTSP source and yields decoded BGR
frames. It is deliberately a *pull* iterator (``frames()``) rather than a
callback source so the worker thread stays in control of pacing, batching and
shutdown. Decoders are not thread-safe; one instance per worker thread.
"""

from __future__ import annotations

import abc
from collections.abc import Iterator

import numpy as np


class DecoderError(RuntimeError):
    """Raised when a decoder cannot start or its source has failed fatally."""


class FrameDecoder(abc.ABC):
    """Base class for RTSP frame decoders."""

    def __init__(self, rtsp_url: str, *, width: int, height: int, rtsp_transport: str,
                 latency_ms: int) -> None:
        self.rtsp_url = rtsp_url
        # Target decode resolution; 0 means "keep source dimension". A decoder
        # may honour this in-pipeline (GStreamer) or leave it to the processor
        # (OpenCV) — either way the processor enforces the final shape.
        self.width = width
        self.height = height
        self.rtsp_transport = rtsp_transport
        self.latency_ms = latency_ms

    @abc.abstractmethod
    def open(self) -> None:
        """Establish the connection / build the pipeline. Raises DecoderError."""

    @abc.abstractmethod
    def read(self) -> np.ndarray | None:
        """Return the next BGR frame, or None on a transient read miss/timeout.

        Raise DecoderError when the source has failed and must be reopened.
        """

    @abc.abstractmethod
    def close(self) -> None:
        """Tear down the connection / pipeline. Must be idempotent."""

    def frames(self) -> Iterator[np.ndarray]:
        """Yield frames until the source fails (then raises DecoderError)."""
        while True:
            frame = self.read()
            if frame is not None:
                yield frame

    def __enter__(self) -> "FrameDecoder":
        self.open()
        return self

    def __exit__(self, *exc) -> None:
        self.close()
