"""GStreamer RTSP decoder.

Builds an ``rtspsrc ! decodebin ! videoconvert ! videoscale ! appsink``
pipeline and pulls BGR frames off the appsink. Scaling is done in-pipeline so
the frames arrive at the target resolution (cheaper than copying full-size
frames into Python and resizing there). The decoder uses ``try_pull_sample``
with a timeout instead of a GLib main loop so the worker thread keeps full
control of pacing and shutdown.

Hardware decode: ``decodebin`` auto-selects a hardware decoder element when one
is registered (e.g. nvdec/vaapi), so enabling GPU decode is a deployment
concern (install the plugin) rather than a code change.

Import-guards on ``gi``: if PyGObject/GStreamer is not installed, importing this
module raises ImportError and the factory falls back to OpenCV.
"""

from __future__ import annotations

import logging

import gi

gi.require_version("Gst", "1.0")
from gi.repository import Gst  # noqa: E402

import numpy as np  # noqa: E402

from src.decoder.base import DecoderError, FrameDecoder  # noqa: E402

logger = logging.getLogger(__name__)

_GST_INITIALISED = False


def _ensure_gst() -> None:
    global _GST_INITIALISED
    if not _GST_INITIALISED:
        Gst.init(None)
        _GST_INITIALISED = True


class GStreamerDecoder(FrameDecoder):
    # How long to block waiting for a single frame before returning None so the
    # worker can check its stop flag and stale-timeout.
    _PULL_TIMEOUT_NS = 1_000_000_000  # 1s

    def __init__(self, *args, **kwargs) -> None:
        super().__init__(*args, **kwargs)
        _ensure_gst()
        self._pipeline: Gst.Pipeline | None = None
        self._appsink = None

    def _build_pipeline_str(self) -> str:
        # Cap to BGR (3 channels) for OpenCV/JPEG compatibility. Add explicit
        # width/height to the caps only when configured so source resolution is
        # preserved otherwise. videoscale handles the actual resize.
        caps = "video/x-raw,format=BGR"
        if self.width > 0:
            caps += f",width={self.width}"
        if self.height > 0:
            caps += f",height={self.height}"
        return (
            f'rtspsrc location="{self.rtsp_url}" protocols={self.rtsp_transport} '
            f"latency={self.latency_ms} drop-on-latency=true ! "
            "rtpjitterbuffer ! decodebin ! "
            "videoconvert ! videoscale ! "
            f"{caps} ! "
            # drop=true + small max-buffers keeps us at the live edge under load.
            "appsink name=sink emit-signals=false sync=false max-buffers=2 drop=true"
        )

    def open(self) -> None:
        pipeline_str = self._build_pipeline_str()
        logger.info("GStreamer pipeline: %s", pipeline_str)
        try:
            self._pipeline = Gst.parse_launch(pipeline_str)
        except Exception as exc:  # GLib.Error
            raise DecoderError(f"Failed to build GStreamer pipeline: {exc}") from exc

        self._appsink = self._pipeline.get_by_name("sink")
        ret = self._pipeline.set_state(Gst.State.PLAYING)
        if ret == Gst.StateChangeReturn.FAILURE:
            self.close()
            raise DecoderError(f"GStreamer pipeline failed to start: {self.rtsp_url}")

    def _check_bus(self) -> None:
        """Surface fatal pipeline errors (e.g. source gone) as DecoderError."""
        if self._pipeline is None:
            return
        bus = self._pipeline.get_bus()
        msg = bus.pop_filtered(Gst.MessageType.ERROR | Gst.MessageType.EOS)
        if msg is None:
            return
        if msg.type == Gst.MessageType.EOS:
            raise DecoderError("GStreamer stream ended (EOS)")
        err, _debug = msg.parse_error()
        raise DecoderError(f"GStreamer error: {err.message}")

    def read(self) -> np.ndarray | None:
        if self._appsink is None:
            raise DecoderError("read() called before open()")
        sample = self._appsink.try_pull_sample(self._PULL_TIMEOUT_NS)
        if sample is None:
            # Timed out without a frame — let the worker decide if it's stale.
            self._check_bus()
            return None
        return self._sample_to_ndarray(sample)

    @staticmethod
    def _sample_to_ndarray(sample) -> np.ndarray:
        buf = sample.get_buffer()
        caps_struct = sample.get_caps().get_structure(0)
        width = caps_struct.get_value("width")
        height = caps_struct.get_value("height")

        ok, mapinfo = buf.map(Gst.MapFlags.READ)
        if not ok:
            raise DecoderError("Failed to map GStreamer buffer")
        try:
            # Copy out of the mapped buffer before unmapping; rows may be padded
            # but for BGR the common case is tightly packed width*3 stride.
            frame = np.frombuffer(mapinfo.data, dtype=np.uint8)
            frame = frame[: height * width * 3].reshape((height, width, 3)).copy()
        finally:
            buf.unmap(mapinfo)
        return frame

    def close(self) -> None:
        if self._pipeline is not None:
            self._pipeline.set_state(Gst.State.NULL)
            self._pipeline = None
        self._appsink = None
