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
