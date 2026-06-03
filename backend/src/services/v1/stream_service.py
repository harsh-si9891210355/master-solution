import asyncio
import logging

import httpx
from sqlalchemy.orm import Session

from src.core.config import settings

logger = logging.getLogger(__name__)


class StreamService:

    def get_stream_info(self, camera_id: int, rtsp_url: str) -> dict:
        """Return the HLS URL for a camera and its current stream state."""
        hls_url     = f"/streams/camera-{camera_id}/index.m3u8"
        stream_state = "unknown"

        # Best-effort: query media-service for live status.
        # If media-service is unreachable the HLS URL is still returned so
        # hls.js can attempt to play (it shows its own error if files are absent).
        try:
            resp = httpx.get(
                f"{settings.media_service_url}/streams/{camera_id}",
                timeout=2.0,
            )
            if resp.status_code == 200:
                stream_state = resp.json().get("state", "unknown")
        except Exception as exc:
            logger.debug("media-service status check skipped for camera-%d: %s", camera_id, exc)

        return {
            "camera_id":    camera_id,
            "hls_url":      hls_url,
            "stream_state": stream_state,
        }

    async def wait_and_sync(
        self,
        db: Session,           # kept for call-site compatibility
        max_retries: int = 10,
        retry_delay: float = 3.0,
    ) -> dict:
        """Ask media-service to do an immediate DB reconcile.

        Retries until media-service is reachable (it may still be starting up).
        Falls through silently — media-service has its own poll loop that will
        pick up cameras on the next POLL_INTERVAL tick regardless.
        """
        for attempt in range(1, max_retries + 1):
            try:
                async with httpx.AsyncClient(timeout=5) as client:
                    resp = await client.post(f"{settings.media_service_url}/streams/sync")
                    resp.raise_for_status()
                    logger.info("media-service sync triggered (attempt %d)", attempt)
                    return resp.json()
            except Exception as exc:
                logger.info(
                    "media-service not reachable yet, retrying in %.0fs (attempt %d/%d): %s",
                    retry_delay, attempt, max_retries, exc,
                )
            await asyncio.sleep(retry_delay)

        logger.warning(
            "media-service unreachable after %d attempts; "
            "streams will sync on their own schedule.",
            max_retries,
        )
        return {"synced": 0, "skipped": 0}

    def sync_all_cameras(self, db: Session) -> dict:
        """Synchronous variant — used by the /stream/sync REST endpoint."""
        try:
            resp = httpx.post(
                f"{settings.media_service_url}/streams/sync",
                timeout=5.0,
            )
            resp.raise_for_status()
            return resp.json()
        except Exception as exc:
            logger.error("media-service sync request failed: %s", exc)
            return {"error": str(exc)}
