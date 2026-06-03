from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url:     str   = "postgresql://postgres:postgres@db:5432/master_solution"
    hls_base:         Path  = Path("/var/www/hls")
    segment_duration: int   = 2
    dvr_hours:        float = 2.0
    poll_interval:    int   = 15
    restart_delay:    int   = 5
    max_backoff:      int   = 60

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=False,
        extra="ignore",
    )


settings = Settings()
