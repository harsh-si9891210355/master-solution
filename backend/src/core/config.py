from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path


class Settings(BaseSettings):
    app_name: str = "Master Solution Backend"
    app_env: str = "development"
    debug: bool = True
    api_v1_prefix: str = "/api/v1"
    database_url: str = "postgresql://postgres:postgres@db:5432/master_solution"
    secret_key: str = "qQQ759gTkmC1Apuv0bB7GYK8Nh4SQTxRTcb4yCFtMUk"
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
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_user: str = "harsh.si9891210355@gmail.com"
    smtp_password: str = "nzpb hkub mhlz djkk"
    argos_model_cache_dir: str = str(Path(".argos-models"))

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )


settings = Settings()
