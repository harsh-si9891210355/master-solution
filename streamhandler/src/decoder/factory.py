"""Decoder selection.

Resolves the configured backend into a concrete decoder, transparently falling
back to OpenCV when GStreamer's Python bindings are unavailable.
"""

from __future__ import annotations

import logging

from src.config import DecoderBackend, settings
from src.decoder.base import FrameDecoder
from src.decoder.opencv_decoder import OpenCVDecoder

logger = logging.getLogger(__name__)


def _gstreamer_available() -> bool:
    try:
        import gi  # noqa: F401

        gi.require_version("Gst", "1.0")
        from gi.repository import Gst  # noqa: F401

        return True
    except Exception:
        return False


def create_decoder(rtsp_url: str, *, width: int, height: int) -> FrameDecoder:
    backend = settings.decoder_backend
    use_gstreamer = backend == DecoderBackend.GSTREAMER or (
        backend == DecoderBackend.AUTO and _gstreamer_available()
    )

    if use_gstreamer:
        if not _gstreamer_available():
            raise RuntimeError(
                "SH_DECODER_BACKEND=gstreamer but GStreamer python bindings are "
                "not installed. Install python3-gi + gstreamer1.0-* or use opencv."
            )
        from src.decoder.gstreamer_decoder import GStreamerDecoder

        decoder_cls: type[FrameDecoder] = GStreamerDecoder
    else:
        decoder_cls = OpenCVDecoder

    logger.info("Using %s decoder for %s", decoder_cls.__name__, rtsp_url)
    return decoder_cls(
        rtsp_url,
        width=width,
        height=height,
        rtsp_transport=settings.rtsp_transport,
        latency_ms=settings.rtsp_latency_ms,
    )
