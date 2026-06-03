import asyncio
import logging
import signal
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from . import manager
from .routes.health import router as health_router
from .routes.streams import router as streams_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
log = logging.getLogger("media-service")


@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info(
        "media-service starting — hls_base=%s  dvr=%.1fh  seg=%ds  poll=%ds",
        settings.hls_base,
        settings.dvr_hours,
        settings.segment_duration,
        settings.poll_interval,
    )

    loop = asyncio.get_event_loop()
    reconcile_task = asyncio.ensure_future(manager.reconcile_loop())

    def _handle_signal() -> None:
        asyncio.ensure_future(manager.shutdown())

    for sig in (signal.SIGTERM, signal.SIGINT):
        loop.add_signal_handler(sig, _handle_signal)

    yield

    reconcile_task.cancel()
    with __import__("contextlib").suppress(asyncio.CancelledError):
        await reconcile_task
    await manager.shutdown()
    log.info("media-service stopped")


app = FastAPI(
    title="Media Service",
    description="RTSP → HLS/fMP4 pipeline with DVR rewind",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router,  tags=["Health"])
app.include_router(streams_router, tags=["Streams"])
