"""Event aggregation — the gap-threshold debounce and evidence building.

For each batch:

  * Look up the most recent event for this camera + use-case.
  * Compute gap = first_frame_time - last_event.event_end_time.
      - no prior event          -> NEW event (build video)
      - gap < threshold         -> EXTEND (push event_end_time forward, no video)
      - gap >= threshold        -> NEW event (build video)

A NEW event decodes the batch's frames, builds raw + processed evidence videos,
uploads them to MinIO, inserts the event row (evidence_url chosen by stream
quality), then publishes a notification. The video contains only this triggering
batch's frames; in-threshold follow-up batches just extend the end-time.

A per-(camera, use-case) lock makes the read-decide-write atomic so two workers
processing the same stream can't create duplicate events.
"""

from __future__ import annotations

import logging
import os
import threading
from collections import defaultdict

from src.config import settings
from src.db import EventStore
from src.frame_codec import FrameResolver
from src.metrics import (
    EVENTS_CREATED,
    EVENTS_EXTENDED,
    FRAMES_DECODED,
    FRAMES_FAILED,
    STAGE_ERRORS,
    UPLOADS,
    VIDEOS_BUILT,
    BUILD_LATENCY,
)
from src.models import BuiltEvent, EventBatch
from src.notifier import Notifier
from src.storage import EvidenceStore
from src import video_builder

logger = logging.getLogger(__name__)


class _KeyedLocks:
    """One lock per key, created on demand (guarded by a global lock)."""

    def __init__(self) -> None:
        self._locks: dict = defaultdict(threading.Lock)
        self._guard = threading.Lock()

    def get(self, key) -> threading.Lock:
        with self._guard:
            return self._locks[key]


class EventAggregator:
    def __init__(self, resolver: FrameResolver, store: EventStore,
                 evidence: EvidenceStore, notifier: Notifier) -> None:
        self._resolver = resolver
        self._db = store
        self._evidence = evidence
        self._notifier = notifier
        self._locks = _KeyedLocks()

    def analyse(self, batch: EventBatch) -> None:
        if not batch.frames:
            logger.debug("Empty batch for camera=%s usecase=%s; skipping",
                         batch.camera_id, batch.usecase_id)
            return

        lock = self._locks.get((batch.camera_id, batch.usecase_id))
        with lock:  # serialise decisions for one stream
            self._analyse_locked(batch)

    def _analyse_locked(self, batch: EventBatch) -> None:
        first_t = batch.first_frame_time()
        last_t = batch.last_frame_time()
        last_event = self._db.last_event(batch.camera_id, batch.usecase_id)

        if last_event is not None:
            gap = (first_t - last_event["event_end_time"]).total_seconds()
            if gap < settings.event_gap_threshold_s:
                # Same ongoing incident — just push the end-time forward.
                self._db.extend_event(last_event["id"], last_t)
                EVENTS_EXTENDED.inc()
                logger.info(
                    "Extended event %s (camera=%s usecase=%s) gap=%.1fs -> end=%s",
                    last_event["id"], batch.camera_id, batch.usecase_id, gap, last_t.isoformat(),
                )
                return

        self._build_new_event(batch, first_t, last_t)

    @BUILD_LATENCY.time()
    def _build_new_event(self, batch: EventBatch, start_t, end_t) -> None:
        # --- resolve location (events.location_id is NOT NULL) ---
        location_id = batch.location_id or self._db.location_id_for_camera(batch.camera_id)
        if location_id is None:
            STAGE_ERRORS.labels(stage="db").inc()
            logger.error("No location_id for camera %s; cannot persist event", batch.camera_id)
            return

        # --- decode frames (raw + processed) ---
        raw_frames, processed_frames = [], []
        for frame in batch.frames:
            raw = self._resolver.resolve_raw(frame)
            if raw is None:
                FRAMES_FAILED.inc()
                continue
            processed = self._resolver.resolve_processed(frame, raw)
            raw_frames.append(raw)
            processed_frames.append(processed if processed is not None else raw)
            FRAMES_DECODED.inc()

        if not raw_frames:
            logger.warning("No frames decoded for camera=%s usecase=%s; no video built",
                           batch.camera_id, batch.usecase_id)
            return

        # --- build videos (raw + processed) ---
        raw_path = processed_path = None
        raw_url = processed_url = None
        try:
            raw_path = video_builder.build_video(raw_frames, "raw")
            processed_path = video_builder.build_video(processed_frames, "processed")
            for q in ("raw", "processed"):
                VIDEOS_BUILT.labels(quality=q).inc()
        except Exception:
            STAGE_ERRORS.labels(stage="video").inc()
            logger.exception("Video build failed for camera=%s usecase=%s",
                             batch.camera_id, batch.usecase_id)
            video_builder.cleanup(raw_path, processed_path)
            return

        # --- upload to MinIO ---
        try:
            base = f"camera-{batch.camera_id}/usecase-{batch.usecase_id}/{batch.batch_id or 'evt'}"
            if raw_path:
                raw_url = self._evidence.upload(raw_path, f"{base}-raw.mp4")
                UPLOADS.inc()
            if processed_path:
                processed_url = self._evidence.upload(processed_path, f"{base}-processed.mp4")
                UPLOADS.inc()
        except Exception:
            STAGE_ERRORS.labels(stage="minio").inc()
            logger.exception("MinIO upload failed for camera=%s usecase=%s",
                             batch.camera_id, batch.usecase_id)
            video_builder.cleanup(raw_path, processed_path)
            return
        finally:
            video_builder.cleanup(raw_path, processed_path)

        # --- choose evidence URL by stream quality ---
        quality = (batch.stream_quality or settings.default_stream_quality).lower()
        evidence_url = processed_url if quality == "processed" else raw_url
        evidence_url = evidence_url or processed_url or raw_url

        # --- persist event ---
        try:
            event_id = self._db.insert_event(
                camera_id=batch.camera_id, location_id=location_id,
                usecase_id=batch.usecase_id, evidence_url=evidence_url,
                start=start_t, end=end_t,
            )
        except Exception:
            STAGE_ERRORS.labels(stage="db").inc()
            logger.exception("DB insert failed for camera=%s usecase=%s",
                             batch.camera_id, batch.usecase_id)
            return

        EVENTS_CREATED.inc()
        built = BuiltEvent(
            camera_id=batch.camera_id, usecase_id=batch.usecase_id, location_id=location_id,
            event_start_time=start_t, event_end_time=end_t, evidence_url=evidence_url,
            raw_url=raw_url, processed_url=processed_url, is_new=True, event_id=event_id,
        )
        logger.info(
            "Created event %s camera=%s usecase=%s frames=%d evidence=%s",
            event_id, batch.camera_id, batch.usecase_id, len(raw_frames), evidence_url,
        )

        # --- notify ---
        try:
            self._notifier.publish(built.to_notification(batch.usecase_slug, batch.batch_id))
        except Exception:
            STAGE_ERRORS.labels(stage="notify").inc()
            logger.exception("Notification publish failed for event %s", event_id)
