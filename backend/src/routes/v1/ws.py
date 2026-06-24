"""Real-time alert WebSocket.

Clients connect to ``/api/v1/ws/alerts?token=<jwt>``. The token is validated
with the same resolver used by the REST auth dependency. Each connection
subscribes to a shared ``alerts:all`` channel (lifecycle updates) plus its own
``alerts:user:<id>`` channel (new alerts routed to this user), and relays every
message to the browser. A periodic ping keeps the socket alive.
"""

from __future__ import annotations

import asyncio
import contextlib
import json
import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from src.core.config import settings
from src.db.db_connection import SessionLocal
from src.realtime.connection_manager import manager
from src.realtime.redis_client import get_async_redis
from src.services.v1.auth_services import resolve_user_from_token

logger = logging.getLogger(__name__)

router = APIRouter()

HEARTBEAT_SECONDS = 25


def _authenticate(token: str | None) -> int | None:
    if not token:
        return None
    db = SessionLocal()
    try:
        user = resolve_user_from_token(db, token)
        return user.id
    except Exception:
        return None
    finally:
        db.close()


async def _redis_subscriber(websocket: WebSocket, user_id: int) -> None:
    """Forward Redis pub/sub messages to this socket until cancelled."""
    client = get_async_redis()
    pubsub = client.pubsub()
    user_channel = f"{settings.ws_user_channel_prefix}{user_id}"
    await pubsub.subscribe(settings.ws_broadcast_channel, user_channel)
    try:
        async for message in pubsub.listen():
            if message.get("type") != "message":
                continue
            data = message.get("data")
            if data is not None:
                await websocket.send_text(data if isinstance(data, str) else json.dumps(data))
    finally:
        with contextlib.suppress(Exception):
            await pubsub.unsubscribe(settings.ws_broadcast_channel, user_channel)
            await pubsub.close()
            await client.close()


@router.websocket("/alerts")
async def alerts_ws(websocket: WebSocket) -> None:
    token = websocket.query_params.get("token")
    user_id = await asyncio.to_thread(_authenticate, token)
    if user_id is None:
        await websocket.close(code=1008)
        return

    await websocket.accept()
    await manager.connect(user_id, websocket)
    await websocket.send_text(json.dumps({"type": "connected", "user_id": user_id}))

    subscriber = asyncio.create_task(_redis_subscriber(websocket, user_id))
    try:
        while True:
            # Either the client sends something, or we time out and ping.
            try:
                await asyncio.wait_for(websocket.receive_text(), timeout=HEARTBEAT_SECONDS)
            except asyncio.TimeoutError:
                await websocket.send_text(json.dumps({"type": "ping"}))
    except WebSocketDisconnect:
        pass
    except Exception:
        logger.debug("WebSocket error for user %s", user_id, exc_info=True)
    finally:
        subscriber.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await subscriber
        await manager.disconnect(user_id, websocket)
