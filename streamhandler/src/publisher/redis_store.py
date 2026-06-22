"""Redis frame store (claim-check pattern) with reference-counted cleanup.

JPEG payloads are binary and large relative to a sensible queue message; pushing
them through the broker bloats it and slows consumers. Instead each batch's
frames are written *once* to Redis under a single hash, and the queue envelope
for every use-case bound to that camera references the same key. Consumers read
the lightweight envelope, then ``HMGET`` only the frames they need.

Cleanup — two strategies (``SH_REDIS_CLEANUP``):

* ``refcount`` (default): the batch hash also holds a single counter field,
  ``meta:acks_remaining``, seeded with the number of use-cases the batch is
  published to. Each AI service, after fetching, calls :meth:`ack`, which
  decrements that counter; when it reaches zero — i.e. the *last* consumer has
  acked — the whole batch hash is deleted immediately. No second key: the ack
  counter lives inside the batch.

* ``ttl``: no acks; the batch simply expires.

In both cases the key carries a TTL. Under refcount it is a *backstop* so a
crashed or never-acking consumer can't leak frames forever; under ttl it is the
sole cleanup mechanism.

Note on the counter: it is a plain count, so an ack is expected exactly once per
use-case. A duplicate ack (e.g. an at-least-once queue redelivery of the same
batch to the same use-case) would over-decrement; the TTL backstop bounds the
blast radius, and consumers should ack once per batch after committing offsets.
"""

from __future__ import annotations

import logging

import redis

from src.config import settings
from src.models import FrameBatch

logger = logging.getLogger(__name__)

# Counter field kept inside the frames hash (never one of the frame:<i> fields,
# so HMGET of frame fields never touches it).
ACK_COUNTER_FIELD = "meta:acks_remaining"

# Atomic ack: decrement the in-batch counter; when it hits zero (last consumer)
# delete the whole batch hash. Runs as a single Redis script so concurrent acks
# from different services can't race.
#   KEYS[1] = frames hash key, ARGV[1] = counter field name
#   returns: remaining ack count (0 => batch deleted), or -1 if already gone.
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


class RedisFrameStore:
    def __init__(self, redis_url: str | None = None) -> None:
        # decode_responses=False — we store/return raw JPEG bytes.
        self._client = redis.Redis.from_url(
            redis_url or settings.redis_url, decode_responses=False
        )
        self._prefix = settings.redis_key_prefix
        self._ttl = settings.redis_frame_ttl_s
        self._ack_script = self._client.register_script(_ACK_LUA)

    def ping(self) -> None:
        self._client.ping()

    # -- key layout -----------------------------------------------------------
    def batch_key(self, camera_id: int, batch_id: str) -> str:
        """Frames hash: field frame:<i> -> JPEG bytes, plus the ack counter."""
        return f"{self._prefix}:frames:{camera_id}:{batch_id}"

    @staticmethod
    def frame_field(index: int) -> str:
        return f"frame:{index}"

    # -- producer side --------------------------------------------------------
    def store_batch(self, batch: FrameBatch, ack_count: int | None = None) -> str:
        """Write all frames of a batch into one hash with a TTL. When
        ``ack_count`` is given (refcount mode), seed the in-batch ack counter so
        the batch is deleted once that many acks arrive. Returns the frames key."""
        frames_key = self.batch_key(batch.camera.camera_id, batch.batch_id)
        mapping = {
            self.frame_field(i).encode(): f.data for i, f in enumerate(batch.frames)
        }
        if ack_count and ack_count > 0:
            mapping[ACK_COUNTER_FIELD.encode()] = str(ack_count).encode()
        pipe = self._client.pipeline(transaction=False)
        pipe.hset(frames_key, mapping=mapping)
        pipe.expire(frames_key, self._ttl)
        pipe.execute()
        return frames_key

    # -- consumer side --------------------------------------------------------
    def fetch_frames(self, frames_key: str, fields: list[str]) -> list[bytes | None]:
        """Pull the requested frame fields in one round-trip. A None element
        means that frame is gone (batch expired or was already cleaned up)."""
        return self._client.hmget(frames_key, [f.encode() for f in fields])

    def ack(self, frames_key: str) -> int:
        """Acknowledge consumption of a batch by one use-case. Decrements the
        in-batch ack counter; returns the number of acks still outstanding
        (0 => the batch was just deleted, -1 => it was already gone)."""
        result = self._ack_script(keys=[frames_key], args=[ACK_COUNTER_FIELD])
        return int(result)

    def close(self) -> None:
        try:
            self._client.close()
        except Exception:  # pragma: no cover - best effort
            logger.debug("Error closing Redis client", exc_info=True)
