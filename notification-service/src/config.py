"""Configuration for the Notification Service (prefix NS_).

Consumes built events from RabbitMQ ``notification-queue``, classifies them into
severity + category, persists an Alert row (shared Postgres), and fans the alert
out to recipients over in-app (Redis pub/sub → backend WebSocket), Web Push, and
email. Escalation timers ride a Redis sorted set.
"""

from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    service_name: str = "notification-service"
    app_env: str = "development"
    log_level: str = "INFO"

    # --- RabbitMQ ------------------------------------------------------------
    rabbitmq_url: str = "amqp://guest:guest@rabbitmq:5672/%2F"
    notification_queue: str = "notification-queue"
    prefetch: int = 20

    # --- Redis (pub/sub bridge + escalation timers) --------------------------
    redis_url: str = "redis://redis:6379/0"
    ws_broadcast_channel: str = "alerts:all"
    ws_user_channel_prefix: str = "alerts:user:"
    escalation_zset: str = "escalation:pending"
    escalation_cancel_channel: str = "escalation:cancel"

    # --- Database ------------------------------------------------------------
    database_url: str = "postgresql://postgres:postgres@db:5432/master_solution"

    # --- Routing -------------------------------------------------------------
    recipient_roles: str = "admin,manager"

    # --- Web Push (VAPID) ----------------------------------------------------
    vapid_public_key: str = ""
    vapid_private_key: str = ""
    vapid_subject: str = "mailto:admin@visionx.local"

    # --- Email (SMTP) --------------------------------------------------------
    email_enabled: bool = True
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = ""

    frontend_url: str = "http://localhost:8080"

    # --- Observability -------------------------------------------------------
    metrics_enabled: bool = True
    metrics_port: int = 9108

    @property
    def recipient_role_list(self) -> list[str]:
        return [r.strip() for r in self.recipient_roles.split(",") if r.strip()]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        env_prefix="NS_",
        case_sensitive=False,
        extra="ignore",
    )


settings = Settings()
