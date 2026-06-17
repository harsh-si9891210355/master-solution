"""Camera provider selection based on SH_CAMERA_SOURCE."""

from __future__ import annotations

from src.config import CameraSource, settings
from src.sources.base import CameraProvider


def create_provider() -> CameraProvider:
    if settings.camera_source == CameraSource.DATABASE:
        from src.sources.db_provider import DatabaseProvider

        return DatabaseProvider()
    from src.sources.static_provider import StaticFileProvider

    return StaticFileProvider(settings.cameras_file)
