"""Configuration for the ai-person-detection service.

Environment-driven (prefix AI_), overridable via .env or real env vars. The
service consumes frame batches from one use-case queue, runs person detection,
and publishes a detailed per-frame analysis to an event queue.
"""

from __future__ import annotations

from enum import Enum

from pydantic_settings import BaseSettings, SettingsConfigDict


class DetectorBackend(str, Enum):
    YOLO = "yolo"   # Ultralytics YOLOv8n (accurate, needs torch; weights auto-download)
    HOG = "hog"     # OpenCV HOG+SVM people detector (no torch, offline, lighter/weaker)


class Settings(BaseSettings):
    # --- Service identity ----------------------------------------------------
    service_name: str = "ai-person-detection"
    app_env: str = "development"
    log_level: str = "INFO"

    # --- RabbitMQ ------------------------------------------------------------
    rabbitmq_url: str = "amqp://guest:guest@rabbitmq:5672/%2F"
    # The StreamHandler's durable direct exchange that frame queues are bound to.
    rabbitmq_exchange: str = "frames"
    # Input queue (the use-case slug) carrying frame-batch envelopes to analyse.
    input_queue: str = "walking-in-no-walking-zone"
    # Output queue for the detailed analysis events this service emits.
    output_queue: str = "walking-in-no-walking-zone-event-queue"
    # Unacked messages allowed in flight (consumer prefetch). Keep low — each
    # message is a heavy batch of frames to run inference on.
    prefetch: int = 4
    # Wait for a broker publish-confirm on each emitted event (reliability).
    publish_confirms: bool = True

    # --- Redis (claim-check frame store) -------------------------------------
    redis_url: str = "redis://redis:6379/0"
    # Hash field holding the reference-count (must match the StreamHandler).
    redis_ack_counter_field: str = "meta:acks_remaining"

    # --- Detector ------------------------------------------------------------
    detector_backend: DetectorBackend = DetectorBackend.YOLO
    # YOLO weights — a name (auto-downloaded) or a path to a local .pt file.
    model_weights: str = "yolov8n.pt"
    # Inference device: "cpu" or "cuda" / "cuda:0".
    device: str = "cpu"
    # Minimum confidence to keep a detection.
    confidence_threshold: float = 0.4
    # Long edge to resize frames to before inference (speed/accuracy trade-off).
    inference_imgsz: int = 640

    # --- Analysis ------------------------------------------------------------
    # Reference point on a person's bbox used for the in-zone test:
    # "foot" (bottom-centre, best for floor zones) | "center".
    roi_reference_point: str = "foot"

    # --- Observability -------------------------------------------------------
    metrics_enabled: bool = True
    metrics_port: int = 9106

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        env_prefix="AI_",
        case_sensitive=False,
        extra="ignore",
    )


settings = Settings()
