#!/usr/bin/env python3
"""
DVR worker — polls MediaMTX for registered camera paths, then runs a
persistent FFmpeg process per camera that writes a rolling HLS fMP4
playlist to /var/www/hls/camera-{id}/.

Manifest layout (per camera):
  index.m3u8          rolling sliding-window playlist
  init.mp4            codec init segment (EXT-X-MAP target)
  seg000000.m4s ...   4-second fMP4 segments

The playlist keeps the last DVR_HOURS * 3600 / SEGMENT_DURATION segments.
Older segment files are deleted by FFmpeg (delete_segments flag).
"""

import asyncio
import contextlib
import logging
import os
import signal
from pathlib import Path

import httpx

MEDIAMTX_API     = os.getenv("MEDIAMTX_API",     "http://mediamtx:9997")
MEDIAMTX_RTSP    = os.getenv("MEDIAMTX_RTSP",    "rtsp://mediamtx:8554")
HLS_BASE         = Path(os.getenv("HLS_BASE",     "/var/www/hls"))
SEGMENT_DURATION = int(os.getenv("SEGMENT_DURATION", "4"))   # seconds per segment
DVR_HOURS        = float(os.getenv("DVR_HOURS",   "2"))      # rolling DVR window
POLL_INTERVAL    = int(os.getenv("POLL_INTERVAL", "15"))     # seconds between path polls
RESTART_DELAY    = int(os.getenv("RESTART_DELAY", "5"))      # seconds before FFmpeg restart

log = logging.getLogger("dvr-worker")

# camera_id (str) → asyncio.Task
_tasks: dict[str, asyncio.Task] = {}


def hls_dir(cam_id: str) -> Path:
    d = HLS_BASE / f"camera-{cam_id}"
    d.mkdir(parents=True, exist_ok=True)
    return d


def ffmpeg_cmd(cam_id: str) -> list[str]:
    out       = hls_dir(cam_id)
    list_size = max(1, int(DVR_HOURS * 3600 / SEGMENT_DURATION))
    return [
        "ffmpeg", "-y",
        "-loglevel", "warning",
        # Bypass internal I/O buffer so packets reach the muxer immediately.
        "-fflags", "+nobuffer",
        # Shorten probe to 1 s / 1 MB (default: 5 s / 5 MB) — eliminates the
        # long black-screen delay before the first segment appears.
        "-analyzeduration", "500000",
        "-probesize",       "500000",
        "-rtsp_transport", "tcp",
        "-i", f"{MEDIAMTX_RTSP}/camera-{cam_id}",
        "-map", "0:v:0",
        "-c:v", "copy",
        "-an",
        # Restamp negative or discontinuous PTS/DTS to zero before fMP4
        # packaging.  Without this, timestamp gaps from cameras that reset
        # their clock on reconnect produce decoder artefacts (green blocks,
        # pixelation) in the browser.
        "-avoid_negative_ts", "make_zero",
        "-f", "hls",
        "-hls_time",      str(SEGMENT_DURATION),
        "-hls_list_size", str(list_size),
        # independent_segments — emits EXT-X-INDEPENDENT-SEGMENTS so players
        # know every segment can be decoded without the preceding one; required
        # for correct DVR seeking in fMP4 HLS.
        "-hls_flags",     "delete_segments+append_list+program_date_time+independent_segments",
        "-hls_segment_type",       "fmp4",
        "-hls_fmp4_init_filename", "init.mp4",
        "-hls_segment_filename",   str(out / "seg%06d.m4s"),
        str(out / "index.m3u8"),
    ]


async def _drain_stderr(proc: asyncio.subprocess.Process, cam_id: str) -> None:
    """Forward FFmpeg stderr lines to the Python logger."""
    assert proc.stderr
    async for raw in proc.stderr:
        line = raw.decode(errors="replace").rstrip()
        if line:
            log.warning("FFmpeg camera-%s: %s", cam_id, line)


async def run_camera(cam_id: str) -> None:
    """Persistent loop: run FFmpeg for one camera, restarting on failure."""
    log.info("DVR worker started for camera-%s", cam_id)

    while True:
        cmd = ffmpeg_cmd(cam_id)
        log.info("Launching: %s", " ".join(cmd))
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.DEVNULL,
            stderr=asyncio.subprocess.PIPE,
        )
        log_task = asyncio.ensure_future(_drain_stderr(proc, cam_id))

        try:
            await proc.wait()
        except asyncio.CancelledError:
            proc.terminate()
            with contextlib.suppress(asyncio.TimeoutError):
                await asyncio.wait_for(proc.wait(), timeout=5)
            if proc.returncode is None:
                proc.kill()
            log.info("DVR worker stopped for camera-%s", cam_id)
            raise
        finally:
            log_task.cancel()
            with contextlib.suppress(asyncio.CancelledError, Exception):
                await log_task

        if proc.returncode != 0:
            log.warning(
                "FFmpeg camera-%s exited with rc=%d, restarting in %ds",
                cam_id, proc.returncode, RESTART_DELAY,
            )
        else:
            log.info("FFmpeg camera-%s exited cleanly", cam_id)

        try:
            await asyncio.sleep(RESTART_DELAY)
        except asyncio.CancelledError:
            log.info("DVR worker cancelled during restart delay for camera-%s", cam_id)
            raise


async def get_registered_camera_ids() -> set[str]:
    """Return camera IDs currently registered in MediaMTX."""
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            resp = await client.get(f"{MEDIAMTX_API}/v3/paths/list")
            resp.raise_for_status()
            return {
                item["name"].removeprefix("camera-")
                for item in resp.json().get("items", [])
                if item["name"].startswith("camera-")
            }
    except Exception as exc:
        log.error("MediaMTX poll failed: %s", exc)
        return set()


async def reconcile() -> None:
    """Start workers for new cameras; cancel workers for removed cameras."""
    registered = await get_registered_camera_ids()
    running     = set(_tasks.keys())

    for cam_id in registered - running:
        task = asyncio.ensure_future(run_camera(cam_id))
        _tasks[cam_id] = task
        log.info("Launched DVR task for camera-%s", cam_id)

    for cam_id in running - registered:
        task = _tasks.pop(cam_id)
        task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await task
        log.info("Removed DVR task for camera-%s", cam_id)


async def shutdown() -> None:
    log.info("Shutting down — cancelling %d worker(s)…", len(_tasks))
    for task in list(_tasks.values()):
        task.cancel()
    await asyncio.gather(*_tasks.values(), return_exceptions=True)


async def main() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )
    log.info(
        "Starting — HLS_BASE=%s  DVR=%.1fh  seg=%ds  poll=%ds",
        HLS_BASE, DVR_HOURS, SEGMENT_DURATION, POLL_INTERVAL,
    )

    loop = asyncio.get_event_loop()
    for sig in (signal.SIGTERM, signal.SIGINT):
        loop.add_signal_handler(sig, lambda: asyncio.ensure_future(shutdown()))

    while True:
        await reconcile()
        await asyncio.sleep(POLL_INTERVAL)


if __name__ == "__main__":
    asyncio.run(main())
