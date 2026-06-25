"""Configuration for the Event Manager service.

Environment-driven (prefix EM_). The Event Manager consumes detection-event
batches from one or more use-case event queues, groups them into events using a
time-gap debounce, builds annotated video evidence, stores it on MinIO,
persists the event in Postgres, and pushes the event onto a notification queue.
"""

from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # --- Service identity ----------------------------------------------------
    service_name: str = "eventmanager"
    app_env: str = "development"
    log_level: str = "INFO"

    # --- RabbitMQ ------------------------------------------------------------
    rabbitmq_url: str = "amqp://guest:guest@rabbitmq:5672/%2F"
    # Comma-separated list of event queues to consume (one receiver thread each).
    # These are the AI services' output queues, e.g. "<usecase>-event-queue".
    input_queues: str = "walking-in-no-walking-zone-event-queue"
    # Queue the built events are published to for the notification service.
    notification_queue: str = "notification-queue"
    # Unacked messages in flight per receiver (backpressure with the in-mem queue).
    prefetch: int = 20

    # --- In-memory pipeline --------------------------------------------------
    # Bounded buffer decoupling fast RabbitMQ ingest from slow video building.
    queue_maxsize: int = 10000
    # Number of analysis worker threads (video building is the slow stage).
    analysis_workers: int = 4

    # --- Redis (claim-check frame store) -------------------------------------
    redis_url: str = "redis://redis:6379/0"
    # Hash field holding the StreamHandler's reference count. The Event Manager
    # acks (decrements) it once per consumed batch; the batch is deleted when it
    # reaches zero — i.e. after every AI service AND the Event Manager have acked.
    redis_ack_counter_field: str = "meta:acks_remaining"

    # --- Database ------------------------------------------------------------
    database_url: str = "postgresql://postgres:postgres@db:5432/master_solution"

    # --- Event grouping (time-gap debounce) ----------------------------------
    # If fresh detections arrive within this many seconds of the last event's
    # end-time, it's the same ongoing incident (extend); otherwise a new event.
    event_gap_threshold_s: float = 30.0

    # --- Evidence video ------------------------------------------------------
    evidence_width: int = 854
    evidence_height: int = 480
    video_fps: int = 1
    video_crf: int = 20
    # Which rendered video to store as the event's evidence_url: raw | processed.
    # A message may override this per batch via its "stream_quality" field.
    default_stream_quality: str = "processed"
    temp_dir: str = "/tmp/eventmanager"

    # --- MinIO ---------------------------------------------------------------
    minio_endpoint: str = "minio:9000"          # internal SDK endpoint (host:port)
    minio_public_url: str = "http://localhost:9000"  # base for the stored evidence URL
    minio_access_key: str = "minioadmin"
    minio_secret_key: str = "minioadmin"
    minio_bucket: str = "evidence"
    minio_secure: bool = False

    # --- Observability -------------------------------------------------------
    metrics_enabled: bool = True
    metrics_port: int = 9107

    @property
    def input_queue_list(self) -> list[str]:
        return [q.strip() for q in self.input_queues.split(",") if q.strip()]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        env_prefix="EM_",
        case_sensitive=False,
        extra="ignore",
    )


settings = Settings()
