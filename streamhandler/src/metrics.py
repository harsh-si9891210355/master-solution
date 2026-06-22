"""Prometheus metrics for the StreamHandler service.

Exposed on SH_METRICS_PORT (default 9105) via the prometheus_client HTTP
server so the existing Prometheus/Grafana stack can scrape per-camera decode,
encode and publish health. All metrics are labelled by camera so a single
unhealthy stream is immediately visible.
"""

from __future__ import annotations

import logging

from prometheus_client import Counter, Gauge, Histogram, start_http_server

from src.config import settings

logger = logging.getLogger(__name__)

FRAMES_DECODED = Counter(
    "sh_frames_decoded_total", "Frames decoded from the source stream", ["camera_id"]
)
FRAMES_DROPPED = Counter(
    "sh_frames_dropped_total",
    "Frames dropped before publishing",
    ["camera_id", "reason"],  # reason: throttle | encode_error | backpressure
)
FRAMES_PUBLISHED = Counter(
    "sh_frames_published_total", "Frames included in published batches", ["camera_id"]
)
BATCHES_PUBLISHED = Counter(
    "sh_batches_published_total",
    "Batches published to a use-case queue",
    ["camera_id", "usecase_id"],
)
PUBLISH_ERRORS = Counter(
    "sh_publish_errors_total",
    "Errors while publishing a batch",
    ["camera_id", "stage"],  # stage: redis | rabbitmq
)
STREAM_UP = Gauge(
    "sh_stream_up", "1 if the camera stream is currently connected", ["camera_id"]
)
STREAM_RECONNECTS = Counter(
    "sh_stream_reconnects_total", "Stream reconnect attempts", ["camera_id"]
)
ACTIVE_WORKERS = Gauge("sh_active_workers", "Number of running stream workers")
ENCODE_LATENCY = Histogram(
    "sh_encode_latency_seconds",
    "JPEG encode latency per frame",
    ["camera_id"],
    buckets=(0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5),
)
PUBLISH_LATENCY = Histogram(
    "sh_publish_latency_seconds",
    "End-to-end batch publish latency (store + enqueue)",
    ["camera_id"],
    buckets=(0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5),
)


def start_metrics_server() -> None:
    if not settings.metrics_enabled:
        logger.info("Metrics disabled (SH_METRICS_ENABLED=false).")
        return
    start_http_server(settings.metrics_port)
    logger.info("Metrics server listening on :%d/metrics", settings.metrics_port)
