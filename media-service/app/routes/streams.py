from fastapi import APIRouter, HTTPException
from .. import manager

router = APIRouter(prefix="/streams")


@router.get("")
async def list_streams():
    """Return status for every tracked camera stream."""
    return manager.get_all_streams()


@router.get("/{camera_id}")
async def get_stream(camera_id: int):
    """Return status and HLS URL for a single camera."""
    info = manager.get_stream(camera_id)
    if info is None:
        raise HTTPException(
            status_code=404,
            detail=f"No active stream for camera {camera_id}",
        )
    return info


@router.post("/sync")
async def sync_streams():
    """Trigger an immediate DB reconcile — picks up new/removed cameras without
    waiting for the next poll interval."""
    await manager.reconcile()
    streams = manager.get_all_streams()
    return {
        "status":  "synced",
        "total":   len(streams),
        "streams": streams,
    }


@router.delete("/{camera_id}")
async def stop_stream(camera_id: int):
    """Force-stop the stream worker for a specific camera.
    The reconcile loop will restart it on the next poll if the camera is still active in the DB."""
    if camera_id not in manager._registry:
        raise HTTPException(
            status_code=404,
            detail=f"No active stream for camera {camera_id}",
        )
    task, stream = manager._registry.pop(camera_id)
    task.cancel()
    import asyncio, contextlib
    with contextlib.suppress(asyncio.CancelledError):
        await task
    return {"status": "stopped", "camera_id": camera_id}
