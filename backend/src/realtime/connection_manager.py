"""Tracks active WebSocket connections per user."""

from __future__ import annotations

import asyncio
import logging

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self) -> None:
        self._connections: dict[int, set[WebSocket]] = {}
        self._lock = asyncio.Lock()

    async def connect(self, user_id: int, websocket: WebSocket) -> None:
        async with self._lock:
            self._connections.setdefault(user_id, set()).add(websocket)

    async def disconnect(self, user_id: int, websocket: WebSocket) -> None:
        async with self._lock:
            sockets = self._connections.get(user_id)
            if sockets:
                sockets.discard(websocket)
                if not sockets:
                    self._connections.pop(user_id, None)

    async def send_to_user(self, user_id: int, message: str) -> None:
        for ws in list(self._connections.get(user_id, set())):
            try:
                await ws.send_text(message)
            except Exception:
                logger.debug("Dropping dead socket for user %s", user_id)

    async def broadcast(self, message: str) -> None:
        for user_id in list(self._connections.keys()):
            await self.send_to_user(user_id, message)

    @property
    def connection_count(self) -> int:
        return sum(len(s) for s in self._connections.values())


manager = ConnectionManager()
