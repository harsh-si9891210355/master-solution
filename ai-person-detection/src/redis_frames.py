"""Redis claim-check client (consumer side).

Fetches the JPEG frame bytes a batch envelope references, and acknowledges the
batch so the StreamHandler's reference-counted cleanup can release it. The ack
runs the same atomic Lua script the producer expects: decrement the in-batch
counter and delete the batch when it reaches zero (the TTL is the backstop).
"""

from __future__ import annotations

import logging

import redis

from src.config import settings

logger = logging.getLogger(__name__)

# Mirror of the StreamHandler's ack script: decrement meta:acks_remaining and
# delete the batch when the last use-case acks.
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


class RedisFrameClient:
    def __init__(self) -> None:
        self._client = redis.Redis.from_url(settings.redis_url, decode_responses=False)
        self._ack_field = settings.redis_ack_counter_field
        self._ack_script = self._client.register_script(_ACK_LUA)

    def ping(self) -> None:
        self._client.ping()

    def fetch_frames(self, redis_key: str, fields: list[str]) -> list[bytes | None]:
        """Pull the requested frame fields in one round-trip. A None element
        means that frame expired / was already cleaned up."""
        return self._client.hmget(redis_key, [f.encode() for f in fields])

    def ack(self, redis_key: str) -> int:
        """Acknowledge consumption of a batch. Returns acks still outstanding
        (0 => batch deleted, -1 => already gone)."""
        return int(self._ack_script(keys=[redis_key], args=[self._ack_field]))

    def close(self) -> None:
        try:
            self._client.close()
        except Exception:  # pragma: no cover
            logger.debug("Error closing Redis client", exc_info=True)
