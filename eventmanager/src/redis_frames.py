"""Redis access for fetching raw frame bytes (claim-check) and acknowledging.

The Event Manager is the *second* consumer of each batch (after the AI service).
It fetches frames by key/field, and once done acks the shared reference count —
the same atomic decrement the StreamHandler expects — so the batch is deleted
only after every AI service and the Event Manager have acked.
"""

from __future__ import annotations

import logging

import redis

from src.config import settings

logger = logging.getLogger(__name__)

# Mirror of the StreamHandler's ack script: decrement the counter field and
# delete the batch when it reaches zero.
_ACK_LUA = """
if redis.call('EXISTS', KEYS[1]) == 0 then
    return -1
end
local remaining = redis.call('HINCRBY', KEYS[1], ARGV[1], -1)
if remaining <= 0 then
    redis.call('DEL', KEYS[1])
    return 0
end
return remaining
"""


class RedisFrameReader:
    def __init__(self) -> None:
        self._client = redis.Redis.from_url(settings.redis_url, decode_responses=False)
        self._ack_field = settings.redis_ack_counter_field
        self._ack_script = self._client.register_script(_ACK_LUA)

    def ping(self) -> None:
        self._client.ping()

    def ack(self, redis_key: str) -> int:
        """Decrement the batch's shared reference count. Returns acks still
        outstanding (0 => batch deleted, -1 => already gone)."""
        return int(self._ack_script(keys=[redis_key], args=[self._ack_field]))

    def get_frame(self, redis_key: str, field: str | None) -> bytes | None:
        """Return JPEG bytes for one frame, or None if absent/expired."""
        try:
            if field:
                return self._client.hget(redis_key, field.encode())
            # No field: treat the key as a plain string value holding the JPEG.
            return self._client.get(redis_key)
        except Exception:
            logger.warning("Redis get failed for %s/%s", redis_key, field, exc_info=True)
            return None

    def close(self) -> None:
        try:
            self._client.close()
        except Exception:  # pragma: no cover
            pass
