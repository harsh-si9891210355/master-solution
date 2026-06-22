"""Static YAML camera provider.

The default, dependency-free source: a YAML file describing each camera, its
RTSP URL, optional per-camera frame overrides, and its use-case bindings with
ROIs. Re-read on every ``load()`` so editing the file (or mounting a new one)
hot-reloads the fleet. See ``cameras.example.yaml`` for the format.
"""

from __future__ import annotations

import logging

import yaml

from src.models import (
    CameraStreamConfig,
    FrameOverrides,
    UsecaseBinding,
)
from src.sources.base import CameraProvider, parse_roi

logger = logging.getLogger(__name__)


class StaticFileProvider(CameraProvider):
    def __init__(self, path: str) -> None:
        self.path = path

    def load(self) -> list[CameraStreamConfig]:
        try:
            with open(self.path, encoding="utf-8") as fh:
                doc = yaml.safe_load(fh) or {}
        except FileNotFoundError:
            logger.error("Cameras file not found: %s", self.path)
            return []
        except yaml.YAMLError:
            logger.exception("Failed to parse cameras file %s", self.path)
            return []

        configs: list[CameraStreamConfig] = []
        for entry in doc.get("cameras", []):
            cfg = self._parse_camera(entry)
            if cfg is not None:
                configs.append(cfg)
        logger.info("Loaded %d camera(s) from %s", len(configs), self.path)
        return configs

    def _parse_camera(self, entry: dict) -> CameraStreamConfig | None:
        camera_id = entry.get("id")
        rtsp_url = entry.get("rtsp_url")
        if camera_id is None or not rtsp_url:
            logger.warning("Skipping camera without id/rtsp_url: %r", entry)
            return None
        if not entry.get("enabled", True):
            return None

        usecases: list[UsecaseBinding] = []
        for uc in entry.get("usecases", []):
            if not uc.get("enabled", True):
                continue
            uid = uc.get("id")
            if uid is None:
                logger.warning("Skipping use-case without id on camera %s", camera_id)
                continue
            slug = str(uc.get("slug") or f"usecase-{uid}")
            usecases.append(
                UsecaseBinding(
                    usecase_id=int(uid),
                    name=str(uc.get("name", slug)),
                    slug=slug,
                    roi=parse_roi(uc.get("roi")),
                )
            )
        if not usecases:
            logger.warning("Camera %s has no active use-cases; skipping.", camera_id)
            return None

        ov = entry.get("overrides", {}) or {}
        overrides = FrameOverrides(
            target_fps=ov.get("target_fps"),
            frame_width=ov.get("frame_width"),
            frame_height=ov.get("frame_height"),
            jpeg_quality=ov.get("jpeg_quality"),
        )
        return CameraStreamConfig(
            camera_id=int(camera_id),
            rtsp_url=str(rtsp_url),
            name=str(entry.get("name", f"camera-{camera_id}")),
            location=str(entry.get("location", "")),
            codec=str(entry.get("codec", "")),
            source_resolution=str(entry.get("resolution", "")),
            usecases=usecases,
            overrides=overrides,
        )
