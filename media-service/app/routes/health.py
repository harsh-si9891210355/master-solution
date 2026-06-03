from fastapi import APIRouter
from .. import manager

router = APIRouter()


@router.get("/health")
async def health():
    counts = manager.stream_counts()
    total  = len(manager.get_all_streams())
    return {
        "status":   "ok",
        "total":    total,
        "streaming": counts.get("streaming", 0),
        "starting":  counts.get("starting",  0),
        "error":     counts.get("error",     0),
        "stopped":   counts.get("stopped",   0),
        "idle":      counts.get("idle",      0),
    }
