"""
Stream manager — owns one asyncio Task per active camera.

Each task runs a persistent FFmpeg loop that converts the camera's RTSP stream
into a rolling HLS fMP4 playlist on disk.  The reconcile loop polls the
database on POLL_INTERVAL and starts/stops/restarts tasks to match DB state.
"""

import asyncio
import contextlib
import logging
import time

from .config import settings
from .database import fetch_active_cameras
from .ffmpeg import CameraStream, StreamState, build_ffmpeg_cmd, is_hls_ready

log = logging.getLogger("media-service.manager")

# camera_id → (asyncio.Task, CameraStream)
_registry: dict[int, tuple[asyncio.Task, CameraStream]] = {}


# ── per-camera worker ─────────────────────────────────────────────────────────

async def _drain_stderr(
    proc: asyncio.subprocess.Process,
    stream: CameraStream,
) -> None:
    assert proc.stderr
    async for raw in proc.stderr:
        line = raw.decode(errors="replace").rstrip()
        if line:
            stream.last_error = line
            log.warning("camera-%d: %s", stream.camera_id, line)


async def _run_camera(stream: CameraStream) -> None:
    cam_id = stream.camera_id
    log.info("stream worker started for camera-%d", cam_id)

    while True:
        cmd    = build_ffmpeg_cmd(cam_id, stream.rtsp_url)
        stream.state      = StreamState.STARTING
        stream.started_at = time.time()
        stream.pid        = None

        try:
            proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.DEVNULL,
                stderr=asyncio.subprocess.PIPE,
            )
        except Exception as exc:
            stream.state      = StreamState.ERROR
            stream.last_error = str(exc)
            log.error("camera-%d: failed to launch FFmpeg: %s", cam_id, exc)
            await _sleep_backoff(stream)
            continue

        stream.pid   = proc.pid
        stream.state = StreamState.STREAMING
        log.info("camera-%d: FFmpeg started (pid=%d, restart#%d)", cam_id, proc.pid, stream.restart_count)

        drain = asyncio.ensure_future(_drain_stderr(proc, stream))
        try:
            await proc.wait()
        except asyncio.CancelledError:
            proc.terminate()
            with contextlib.suppress(asyncio.TimeoutError):
                await asyncio.wait_for(proc.wait(), timeout=5)
            if proc.returncode is None:
                proc.kill()
            stream.state = StreamState.STOPPED
            stream.pid   = None
            log.info("camera-%d: stream worker stopped", cam_id)
            raise
        finally:
            drain.cancel()
            with contextlib.suppress(asyncio.CancelledError, Exception):
                await drain

        stream.pid = None

        ran_for = time.time() - (stream.started_at or 0)
        if proc.returncode != 0:
            stream.state = StreamState.ERROR
            log.warning(
                "camera-%d: FFmpeg exited rc=%d after %.0fs",
                cam_id, proc.returncode, ran_for,
            )
        else:
            log.info("camera-%d: FFmpeg exited cleanly after %.0fs", cam_id, ran_for)

        # If FFmpeg ran for more than 30 s consider it healthy — reset backoff.
        if ran_for >= 30:
            stream.restart_count = 0

        await _sleep_backoff(stream)


async def _sleep_backoff(stream: CameraStream) -> None:
    delay = min(settings.max_backoff, settings.restart_delay * (2 ** min(stream.restart_count, 6)))
    stream.restart_count += 1
    log.info("camera-%d: restarting in %.0fs (attempt #%d)", stream.camera_id, delay, stream.restart_count)
    try:
        await asyncio.sleep(delay)
    except asyncio.CancelledError:
        stream.state = StreamState.STOPPED
        raise


# ── reconcile ─────────────────────────────────────────────────────────────────

async def reconcile() -> None:
    """Start/stop/restart workers so the running set matches the DB."""
    try:
        active: dict[int, str] = await asyncio.to_thread(fetch_active_cameras)
    except Exception as exc:
        log.error("DB poll failed: %s", exc)
        return

    current = set(_registry)
    desired = set(active)

    for cam_id in desired - current:
        _start_worker(cam_id, active[cam_id])

    for cam_id in current - desired:
        await _stop_worker(cam_id)

    # Restart workers whose RTSP URL changed in the DB.
    for cam_id in desired & current:
        _, stream = _registry[cam_id]
        if stream.rtsp_url != active[cam_id]:
            log.info("camera-%d: RTSP URL changed — restarting worker", cam_id)
            await _stop_worker(cam_id)
            _start_worker(cam_id, active[cam_id])

    log.debug("reconcile done — running: %d", len(_registry))


def _start_worker(cam_id: int, rtsp_url: str) -> None:
    stream = CameraStream(camera_id=cam_id, rtsp_url=rtsp_url)
    task   = asyncio.ensure_future(_run_camera(stream))
    _registry[cam_id] = (task, stream)
    log.info("camera-%d: worker started", cam_id)


async def _stop_worker(cam_id: int) -> None:
    task, stream = _registry.pop(cam_id)
    task.cancel()
    with contextlib.suppress(asyncio.CancelledError):
        await task
    log.info("camera-%d: worker stopped", cam_id)


async def reconcile_loop() -> None:
    while True:
        try:
            await reconcile()
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            log.error("unexpected error in reconcile loop: %s", exc, exc_info=True)
        await asyncio.sleep(settings.poll_interval)


async def shutdown() -> None:
    log.info("shutting down — stopping %d stream worker(s)…", len(_registry))
    items = list(_registry.items())
    _registry.clear()
    tasks = [task for _, (task, _) in items]
    for task in tasks:
        task.cancel()
    if tasks:
        await asyncio.gather(*tasks, return_exceptions=True)
    log.info("all stream workers stopped")


# ── read-only access for the API ──────────────────────────────────────────────

def _stream_to_dict(cam_id: int, stream: CameraStream) -> dict:
    return {
        "camera_id":     cam_id,
        "state":         stream.state,
        "hls_ready":     is_hls_ready(cam_id),
        "hls_url":       f"/streams/camera-{cam_id}/index.m3u8",
        "restart_count": stream.restart_count,
        "last_error":    stream.last_error,
        "started_at":    stream.started_at,
        "pid":           stream.pid,
    }


def get_all_streams() -> list[dict]:
    return [_stream_to_dict(cam_id, stream) for cam_id, (_, stream) in _registry.items()]


def get_stream(camera_id: int) -> dict | None:
    if camera_id not in _registry:
        return None
    _, stream = _registry[camera_id]
    return _stream_to_dict(camera_id, stream)


def stream_counts() -> dict[str, int]:
    counts: dict[str, int] = {s.value: 0 for s in StreamState}
    for _, (_, stream) in _registry.items():
        counts[stream.state.value] += 1
    return counts
