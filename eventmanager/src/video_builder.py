"""Evidence video building.

Two-step, matching the spec:
  1. OpenCV VideoWriter writes a temp .mp4 (mp4v) at the configured FPS, with
     every frame resized to evidence width x height.
  2. ffmpeg re-encodes it to a browser-playable H.264 file
     (libx264 -crf <crf> -pix_fmt yuv420p).

Raw and processed frame sequences are built into separate files. Temp files are
cleaned up by the caller after upload.
"""

from __future__ import annotations

import logging
import os
import subprocess
import uuid

import cv2
import numpy as np

from src.config import settings

logger = logging.getLogger(__name__)


class VideoBuildError(RuntimeError):
    pass


def _ensure_temp_dir() -> str:
    os.makedirs(settings.temp_dir, exist_ok=True)
    return settings.temp_dir


def build_video(frames: list[np.ndarray], tag: str) -> str | None:
    """Build one H.264 .mp4 from the given frames. Returns the final file path,
    or None if there were no usable frames."""
    if not frames:
        return None

    w, h = settings.evidence_width, settings.evidence_height
    tmp_dir = _ensure_temp_dir()
    uid = uuid.uuid4().hex
    raw_path = os.path.join(tmp_dir, f"{tag}_{uid}_tmp.mp4")
    final_path = os.path.join(tmp_dir, f"{tag}_{uid}.mp4")

    # --- step 1: OpenCV VideoWriter (mp4v) ---
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    writer = cv2.VideoWriter(raw_path, fourcc, float(settings.video_fps), (w, h))
    if not writer.isOpened():
        raise VideoBuildError(f"OpenCV VideoWriter failed to open {raw_path}")
    try:
        for img in frames:
            if img is None:
                continue
            if img.shape[1] != w or img.shape[0] != h:
                img = cv2.resize(img, (w, h))
            writer.write(img)
    finally:
        writer.release()

    # --- step 2: ffmpeg re-encode to browser-playable H.264 ---
    cmd = [
        "ffmpeg", "-y", "-loglevel", "error",
        "-i", raw_path,
        "-c:v", "libx264", "-crf", str(settings.video_crf),
        "-pix_fmt", "yuv420p", "-movflags", "+faststart",
        final_path,
    ]
    try:
        subprocess.run(cmd, check=True, capture_output=True)
    except FileNotFoundError as exc:
        raise VideoBuildError("ffmpeg not found on PATH") from exc
    except subprocess.CalledProcessError as exc:
        raise VideoBuildError(f"ffmpeg failed: {exc.stderr.decode(errors='ignore')[:500]}") from exc
    finally:
        _safe_remove(raw_path)

    return final_path


def _safe_remove(path: str | None) -> None:
    if path and os.path.exists(path):
        try:
            os.remove(path)
        except OSError:
            logger.debug("Could not remove temp file %s", path, exc_info=True)


def cleanup(*paths: str | None) -> None:
    for p in paths:
        _safe_remove(p)
