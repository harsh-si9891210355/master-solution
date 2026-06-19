"""Prometheus metrics for the Event Manager, exposed on EM_METRICS_PORT (9107)."""

from __future__ import annotations

import logging

from prometheus_client import Counter, Gauge, Histogram, start_http_server

from src.config import settings

logger = logging.getLogger(__name__)

BATCHES_RECEIVED = Counter("em_batches_received_total", "Batches pulled off RabbitMQ", ["queue"])
BATCHES_PROCESSED = Counter("em_batches_processed_total", "Batches processed by a worker")
BATCHES_FAILED = Counter("em_batches_failed_total", "Batches that failed processing")
EVENTS_CREATED = Counter("em_events_created_total", "New events (with evidence video)")
EVENTS_EXTENDED = Counter("em_events_extended_total", "Existing events extended (debounced)")
VIDEOS_BUILT = Counter("em_videos_built_total", "Evidence videos built", ["quality"])
FRAMES_DECODED = Counter("em_frames_decoded_total", "Frames decoded for video building")
FRAMES_FAILED = Counter("em_frames_failed_total", "Frames that failed to decode")
UPLOADS = Counter("em_minio_uploads_total", "Objects uploaded to MinIO")
NOTIFICATIONS = Counter("em_notifications_published_total", "Events pushed to the notification queue")
STAGE_ERRORS = Counter("em_stage_errors_total", "Errors by stage", ["stage"])  # redis|video|minio|db|notify
INMEM_QUEUE_DEPTH = Gauge("em_inmem_queue_depth", "Items waiting in the in-memory buffer")
ACTIVE_WORKERS = Gauge("em_active_workers", "Analysis worker threads running")
BUILD_LATENCY = Histogram(
    "em_event_build_seconds", "Time to build+store+persist a new event",
    buckets=(0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0, 30.0),
)


def start_metrics_server() -> None:
    if not settings.metrics_enabled:
        logger.info("Metrics disabled (EM_METRICS_ENABLED=false).")
        return
    start_http_server(settings.metrics_port)
    logger.info("Metrics server listening on :%d/metrics", settings.metrics_port)
