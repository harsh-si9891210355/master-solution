import enum
from dataclasses import dataclass
from pathlib import Path

from .config import settings


class StreamState(str, enum.Enum):
    IDLE      = "idle"
    STARTING  = "starting"
    STREAMING = "streaming"
    ERROR     = "error"
    STOPPED   = "stopped"


@dataclass
class CameraStream:
    camera_id:     int
    rtsp_url:      str
    state:         StreamState = StreamState.IDLE
    restart_count: int         = 0
    last_error:    str | None  = None
    started_at:    float | None = None
    pid:           int | None  = None


def hls_dir(camera_id: int) -> Path:
    d = settings.hls_base / f"camera-{camera_id}"
    d.mkdir(parents=True, exist_ok=True)
    return d


def is_hls_ready(camera_id: int) -> bool:
    """True once FFmpeg has produced a valid manifest (first segment written)."""
    return (settings.hls_base / f"camera-{camera_id}" / "index.m3u8").exists()


def build_ffmpeg_cmd(camera_id: int, rtsp_url: str) -> list[str]:
    out = hls_dir(camera_id)
    list_size = max(1, int(settings.dvr_hours * 3600 / settings.segment_duration))
    return [
        "ffmpeg", "-y",
        "-loglevel", "warning",
        # Bypass internal I/O buffer so packets reach the muxer immediately.
        "-fflags", "+nobuffer",
        # Cap stream analysis to 1 s / 1 MB (default: 5 s / 5 MB) to eliminate
        # the multi-second black screen before the first segment appears.
        "-analyzeduration", "1000000",
        "-probesize",       "1000000",
        "-rtsp_transport",  "tcp",
        "-i", rtsp_url,
        "-map", "0:v:0",
        "-map", "0:a:0?",   # audio is optional; '?' must trail the full specifier
        "-c:v", "copy",
        "-c:a", "copy",
        # Restamp negative / discontinuous PTS to zero before fMP4 packaging.
        # Camera clock resets on reconnect produce timestamp gaps that the browser
        # decoder surfaces as green blocks or pixelation — this flag eliminates them.
        "-avoid_negative_ts", "make_zero",
        "-f", "hls",
        "-hls_time",      str(settings.segment_duration),
        "-hls_list_size", str(list_size),
        # independent_segments — EXT-X-INDEPENDENT-SEGMENTS tag; required for
        # correct DVR seeking in fMP4 HLS (each segment self-decodable).
        "-hls_flags",
            "delete_segments+append_list+program_date_time+independent_segments",
        "-hls_segment_type",       "fmp4",
        "-hls_fmp4_init_filename", "init.mp4",
        "-hls_segment_filename",   str(out / "seg%06d.m4s"),
        str(out / "index.m3u8"),
    ]
