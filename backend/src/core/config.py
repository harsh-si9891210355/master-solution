from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path


class Settings(BaseSettings):
    app_name: str = "Master Solution Backend"
    app_env: str = "development"
    debug: bool = True
    api_v1_prefix: str = "/api/v1"
    database_url: str = "postgresql://postgres:postgres@db:5432/master_solution"
    secret_key: str = ""
    algorithm: str = "HS256"
    host: str = "0.0.0.0"
    port: int = 8000
    access_token_expire_minutes: int = 60
    # MediaMTX — internal API URL (within docker network)
    mediamtx_api_url: str = "http://mediamtx:9997"
    mediamtx_playback_api_url: str = "http://mediamtx:9996"
    mediamtx_webrtc_public_url: str = "http://localhost:8889"
    mediamtx_playback_public_url: str = "http://localhost:9996"
    stream_recording_poll_interval_ms: int = 15000
    stream_live_edge_threshold_s: int = 20
    stream_playback_format: str = "fmp4"
    stream_playback_padding_before_s: int = 30
    stream_playback_padding_after_s: int = 300
    stream_playback_min_duration_s: int = 60
    stream_playback_max_duration_s: int = 900

    # --- Recording transcode -------------------------------------------------
    # MediaMTX never re-encodes, so to store recordings at a lower quality than
    # the live stream we run an FFmpeg transcode (launched via the live path's
    # runOnReady) that publishes a reduced-quality "<path>-rec" sibling, and we
    # record only that sibling. All knobs below are env-configurable.
    #
    # rec_enabled=False falls back to the old behaviour: record the live path
    # directly at full source quality (no transcode).
    rec_enabled: bool = True
    # If a camera has a low-quality substream URL configured, record that directly
    # (no FFmpeg / zero transcode CPU) instead of transcoding the main stream.
    # Set False to ignore substreams and always use the transcode path.
    rec_prefer_substream: bool = True
    # Encoder: "cpu" -> libx264, "nvenc" -> h264_nvenc (needs NVIDIA GPU + toolkit).
    rec_encoder: str = "cpu"
    # Target recording height in pixels (width auto, keeps aspect): 480, 360, 240…
    rec_height: int = 480
    # Recording frame rate; 0 keeps the camera's source fps.
    rec_fps: int = 15
    # Keep only the last X hours of recordings (MediaMTX recordDeleteAfter).
    rec_retention_hours: int = 12
    # Optional constant target bitrate, e.g. "800k". Empty = encoder default (CRF/CQ).
    rec_video_bitrate: str = ""
    # Extra FFmpeg flags appended verbatim to the transcode command (space-separated).
    rec_extra_ffmpeg_flags: str = ""
    # MediaMTX record storage settings for the recorded sibling path.
    rec_record_path: str = "/recordings/%path/%Y-%m-%d_%H-%M-%S-%f"
    rec_record_format: str = "fmp4"
    rec_part_duration: str = "1s"
    rec_segment_duration: str = "1h"

    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    argos_model_cache_dir: str = str(Path(".argos-models"))

    auth0_domain: str = ""
    auth0_client_id: str = ""
    auth0_audience: str = ""
    auth0_mgmt_client_id: str = ""
    auth0_mgmt_client_secret: str = ""
    auth0_connection: str = ""

    frontend_url: str = "http://localhost:8080"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )


settings = Settings()
