"""StreamHandler manager.

Owns the shared infrastructure (RabbitMQ producer, Redis store, frame publisher)
and the set of per-camera workers. Periodically reconciles running workers
against the camera provider's desired state so cameras can be added, removed or
reconfigured at runtime without restarting the service.
"""

from __future__ import annotations

import logging
import threading

from src.config import FrameTransport, settings
from src.metrics import ACTIVE_WORKERS
from src.models import CameraStreamConfig
from src.publisher.frame_publisher import FramePublisher
from src.publisher.rabbitmq_publisher import RabbitMQPublisher
from src.publisher.redis_store import RedisFrameStore
from src.sources.base import CameraProvider
from src.worker import StreamWorker

logger = logging.getLogger(__name__)


class StreamHandlerManager:
    def __init__(self, provider: CameraProvider) -> None:
        self._provider = provider
        self._stop = threading.Event()
        self._workers: dict[int, StreamWorker] = {}
        self._fingerprints: dict[int, tuple] = {}

        self._broker = RabbitMQPublisher()
        self._redis: RedisFrameStore | None = None
        if settings.frame_transport == FrameTransport.CLAIM_CHECK:
            self._redis = RedisFrameStore()
            self._redis.ping()
            logger.info("Connected to Redis frame store at %s", settings.redis_url)
        self._publisher = FramePublisher(self._broker, self._redis)

    # -- public API -----------------------------------------------------------
    def run(self) -> None:
        """Reconcile once, then loop on the reload interval until stopped."""
        logger.info(
            "StreamHandler manager started (source=%s, transport=%s)",
            settings.camera_source.value, settings.frame_transport.value,
        )
        self._reconcile()
        if settings.reload_interval_s <= 0:
            # No hot-reload: just wait for shutdown.
            while not self._stop.wait(1.0):
                self._supervise()
            return
        while not self._stop.wait(settings.reload_interval_s):
            self._reconcile()
        logger.info("Manager run loop exiting")

    def shutdown(self) -> None:
        logger.info("Shutting down %d worker(s)…", len(self._workers))
        self._stop.set()
        for worker in self._workers.values():
            worker.stop()
        for worker in self._workers.values():
            worker.join(timeout=10.0)
        self._workers.clear()
        ACTIVE_WORKERS.set(0)

        # Workers (which own the thread-local broker channels) have stopped;
        # close the broker connections and the Redis store.
        self._broker.close()
        if self._redis is not None:
            self._redis.close()
        logger.info("StreamHandler manager shut down cleanly")

    # -- internals ------------------------------------------------------------
    def _reconcile(self) -> None:
        """Start/stop/restart workers to match the provider's desired state."""
        try:
            desired = self._provider.load()
        except Exception:
            logger.exception("Camera provider load() failed; keeping current workers")
            return

        desired_by_id: dict[int, CameraStreamConfig] = {c.camera_id: c for c in desired}
        desired_ids = set(desired_by_id)
        running_ids = set(self._workers)

        for camera_id in running_ids - desired_ids:
            self._stop_worker(camera_id, reason="removed from source")

        for camera_id in desired_ids:
            cfg = desired_by_id[camera_id]
            fp = cfg.fingerprint()
            if camera_id not in self._workers:
                self._start_worker(cfg, fp)
            elif self._fingerprints.get(camera_id) != fp:
                logger.info("Camera %s config changed — restarting worker", camera_id)
                self._stop_worker(camera_id, reason="config changed")
                self._start_worker(cfg, fp)

        self._supervise()

    def _supervise(self) -> None:
        """Restart workers whose threads have died unexpectedly."""
        for camera_id, worker in list(self._workers.items()):
            if not worker.is_alive and not self._stop.is_set():
                logger.warning("Worker for camera %s died — restarting", camera_id)
                fp = self._fingerprints.get(camera_id)
                cfg = worker.camera
                del self._workers[camera_id]
                self._start_worker(cfg, fp)
        ACTIVE_WORKERS.set(len(self._workers))

    def _start_worker(self, cfg: CameraStreamConfig, fingerprint: tuple | None) -> None:
        worker = StreamWorker(cfg, self._publisher)
        self._workers[cfg.camera_id] = worker
        self._fingerprints[cfg.camera_id] = fingerprint
        worker.start()
        ACTIVE_WORKERS.set(len(self._workers))
        logger.info("Started worker for camera %s (%s)", cfg.camera_id, cfg.name)

    def _stop_worker(self, camera_id: int, *, reason: str) -> None:
        worker = self._workers.pop(camera_id, None)
        self._fingerprints.pop(camera_id, None)
        if worker is None:
            return
        logger.info("Stopping worker for camera %s (%s)", camera_id, reason)
        worker.stop()
        worker.join(timeout=10.0)
        ACTIVE_WORKERS.set(len(self._workers))
