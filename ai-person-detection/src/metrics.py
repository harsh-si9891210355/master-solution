"""Prometheus metrics, exposed on AI_METRICS_PORT (default 9106)."""

from __future__ import annotations

import logging

from prometheus_client import Counter, Gauge, Histogram, start_http_server

from src.config import settings

logger = logging.getLogger(__name__)

BATCHES_CONSUMED = Counter("aipd_batches_consumed_total", "Frame batches consumed")
BATCHES_FAILED = Counter("aipd_batches_failed_total", "Batches that failed processing")
FRAMES_ANALYZED = Counter("aipd_frames_analyzed_total", "Frames run through detection")
FRAMES_MISSING = Counter("aipd_frames_missing_total", "Referenced frames absent in Redis (expired)")
PERSONS_DETECTED = Counter("aipd_persons_detected_total", "Total person detections")
VIOLATIONS = Counter("aipd_zone_violations_total", "Frames with a person inside the ROI")
EVENTS_PUBLISHED = Counter("aipd_events_published_total", "Analysis events published")
PUBLISH_ERRORS = Counter("aipd_publish_errors_total", "Errors publishing an event")
INFERENCE_LATENCY = Histogram(
    "aipd_inference_seconds", "Per-frame inference latency",
    buckets=(0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.0),
)
BATCH_LATENCY = Histogram(
    "aipd_batch_seconds", "End-to-end per-batch processing latency",
    buckets=(0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0),
)
PIPELINE_TO_ANALYZED = Histogram(
    "aipd_captured_to_analyzed_seconds",
    "Latency from first-frame capture to this AI service publishing its event "
    "(StreamHandler + queue wait + redis fetch + inference)",
    buckets=(0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0, 20.0),
)
BROKER_UP = Gauge("aipd_broker_connected", "1 if connected to RabbitMQ")


def start_metrics_server() -> None:
    if not settings.metrics_enabled:
        logger.info("Metrics disabled (AI_METRICS_ENABLED=false).")
        return
    start_http_server(settings.metrics_port)
    logger.info("Metrics server listening on :%d/metrics", settings.metrics_port)
