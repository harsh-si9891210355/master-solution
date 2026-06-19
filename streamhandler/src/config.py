"""Central, environment-driven configuration for the StreamHandler service.

Everything operationally interesting — target FPS, output resolution, JPEG
quality, batch size, decoder backend, Redis/RabbitMQ endpoints, frame TTL — is
configurable here and overridable per environment via ``.env`` or real env
vars. Per-camera overrides (a camera that needs a different FPS/resolution) are
layered on top of these defaults by the camera provider.
"""

from __future__ import annotations

from enum import Enum

from pydantic_settings import BaseSettings, SettingsConfigDict


class DecoderBackend(str, Enum):
    AUTO = "auto"          # prefer GStreamer, fall back to OpenCV
    GSTREAMER = "gstreamer"
    OPENCV = "opencv"


class FrameTransport(str, Enum):
    # Claim-check: JPEG bytes are stored in Redis, the queue carries a compact
    # envelope referencing them. Default — keeps queue messages small and lets
    # multiple use-cases share one stored copy of each frame batch.
    CLAIM_CHECK = "claim_check"
    # Inline: base64-encoded JPEGs are embedded directly in the queue message.
    # Simpler for low-FPS / small-frame deployments, no Redis dependency.
    INLINE = "inline"


class CameraSource(str, Enum):
    STATIC = "static"   # read cameras + ROIs from a YAML file
    DATABASE = "database"  # read cameras/use-cases from the Postgres schema


class RedisCleanup(str, Enum):
    # Reference-counted: a batch records the set of use-cases expected to
    # consume it; each AI service acks after fetching, and the batch is deleted
    # the moment the last use-case acks. The TTL is only a safety net for
    # consumers that crash/never ack.
    REFCOUNT = "refcount"
    # TTL-only: no acks; batches live exactly redis_frame_ttl_s then expire.
    TTL = "ttl"


class Settings(BaseSettings):
    # --- Service identity ----------------------------------------------------
    service_name: str = "streamhandler"
    app_env: str = "development"
    log_level: str = "INFO"

    # --- Decoding ------------------------------------------------------------
    decoder_backend: DecoderBackend = DecoderBackend.AUTO
    # RTSP transport: "tcp" is reliable across NAT/firewalls; "udp" is lower
    # latency on clean LANs.
    rtsp_transport: str = "tcp"
    # Jitter buffer / latency hint for the RTSP source (milliseconds).
    rtsp_latency_ms: int = 200
    # Seconds with no decoded frame before a stream is considered stalled and
    # the worker tears the pipeline down and reconnects.
    stream_stale_timeout_s: float = 15.0
    # Base/max backoff (seconds) for reconnect attempts after a stream drops.
    reconnect_backoff_base_s: float = 2.0
    reconnect_backoff_max_s: float = 30.0

    # --- Output frame shape --------------------------------------------------
    # Sampling rate handed downstream. The decoder/throttle decimates the source
    # stream to this rate; it never interpolates above the source FPS.
    target_fps: float = 5.0
    # Output resolution. 0 on either axis keeps the source dimension. When both
    # are set and keep_aspect is True the frame is letterboxed to fit.
    frame_width: int = 1280
    frame_height: int = 720
    frame_keep_aspect: bool = True
    # JPEG encode quality (1-100).
    jpeg_quality: int = 80

    # --- Batching ------------------------------------------------------------
    batch_size: int = 10
    # Flush a partial batch after this many seconds even if it has not reached
    # batch_size, so low-FPS streams are not starved. 0 disables time flushing.
    batch_max_age_s: float = 5.0

    # --- Queue transport -----------------------------------------------------
    frame_transport: FrameTransport = FrameTransport.CLAIM_CHECK

    # --- Redis (claim-check frame store) -------------------------------------
    redis_url: str = "redis://redis:6379/0"
    redis_key_prefix: str = "sh"
    # Cleanup strategy for stored batches:
    #   refcount -> delete as soon as every use-case has acked (TTL is a backstop)
    #   ttl      -> delete purely on expiry, no acks
    redis_cleanup: RedisCleanup = RedisCleanup.REFCOUNT
    # Each use-case's frames are consumed by this many downstream stages — the AI
    # service that runs detection AND the Event Manager that builds evidence (=2).
    # With refcount cleanup the per-batch ack counter is seeded to
    # len(usecases) * this, so the batch stays in Redis until *both* stages have
    # acked every use-case. Set to 1 if no Event Manager consumes the frames.
    frame_consumers_per_usecase: int = 2
    # TTL after which a batch is force-deleted regardless of acks. With refcount
    # cleanup this is a safety net for crashed/slow consumers, so it should be a
    # bit longer than your worst-case consumer processing lag (the Event Manager
    # builds video, so allow for that).
    redis_frame_ttl_s: int = 300

    # --- RabbitMQ (per-use-case queue) ---------------------------------------
    # %2F is the URL-encoded default vhost "/".
    rabbitmq_url: str = "amqp://guest:guest@rabbitmq:5672/%2F"
    # A durable direct exchange; the producer publishes each batch with the
    # use-case slug as the routing key, and declares+binds one durable queue per
    # use-case so messages accumulate even while that AI service is offline.
    rabbitmq_exchange: str = "frames"
    # Queue name template per use-case. {usecase_slug} (derived from the use-case
    # name) and {usecase_id} are both available. The queue is named after the
    # use-case slug, e.g. "carrying-cell-phone-in-the-working-zone".
    rabbitmq_queue_template: str = "{usecase_slug}"
    # Wait for a broker publish-confirm on each message (reliability over raw
    # throughput). Disable for fire-and-forget.
    rabbitmq_publish_confirms: bool = True
    # Consumer-side prefetch (unacked messages in flight) for FrameBatchClient.
    rabbitmq_prefetch: int = 20

    # --- Camera source -------------------------------------------------------
    # Default to the Postgres schema so the StreamHandler stays in lock-step
    # with the cameras/use-cases configured in the main app. Set to STATIC to
    # drive it from a self-contained YAML file instead.
    camera_source: CameraSource = CameraSource.DATABASE
    # STATIC: path to the YAML describing cameras, use-case bindings and ROIs.
    cameras_file: str = "cameras.yaml"
    # DATABASE: connection string + optional ROI overlay file (the existing
    # schema has no ROI column, so ROIs are supplied as an overlay keyed by
    # "<camera_id>:<usecase_id>"). Without an overlay a full-frame ROI is used.
    database_url: str = "postgresql://postgres:postgres@db:5432/master_solution"
    roi_overlay_file: str = ""
    # How often (seconds) to re-read the camera source and reconcile workers
    # (start new cameras, stop removed ones). 0 disables hot-reload.
    reload_interval_s: float = 30.0

    # --- Observability -------------------------------------------------------
    metrics_enabled: bool = True
    metrics_port: int = 9105

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        env_prefix="SH_",
        case_sensitive=False,
        extra="ignore",
    )


settings = Settings()
