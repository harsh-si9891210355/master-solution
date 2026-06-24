"""Redis clients for the real-time alert bridge.

The notification-service publishes new alerts to per-user channels
(``alerts:user:<id>``) and the backend publishes lifecycle updates to a shared
``alerts:all`` channel. The WebSocket endpoint subscribes (async) and request
handlers publish (sync).
"""

from __future__ import annotations

import redis
import redis.asyncio as aioredis

from src.core.config import settings

# Sync client for publishing from FastAPI request handlers.
_sync_client: redis.Redis | None = None


def get_sync_redis() -> redis.Redis:
    global _sync_client
    if _sync_client is None:
        _sync_client = redis.Redis.from_url(settings.redis_url, decode_responses=True)
    return _sync_client


def get_async_redis() -> aioredis.Redis:
    """A fresh async client — used by each WebSocket's pub/sub subscriber task."""
    return aioredis.Redis.from_url(settings.redis_url, decode_responses=True)
