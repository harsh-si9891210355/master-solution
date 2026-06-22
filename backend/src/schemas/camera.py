from datetime import datetime

from pydantic import BaseModel, ConfigDict


class _Base(BaseModel):
    # Lenient: ignore unknown keys so config blobs / evolving frontends don't 422.
    model_config = ConfigDict(extra="ignore")


# --------------------------------------------------------------------------- #
# Nested sub-objects (mirror the frontend Camera interface)
# --------------------------------------------------------------------------- #
class Identity(_Base):
    id: int | None = None
    code: str | None = None
    # Resolved display name (current language) plus localized variants.
    displayName: str | None = None
    en: str | None = None
    es: str | None = None
    fr: str | None = None
    tags: list[str] | None = None


class LocationInfo(_Base):
    siteId: int | None = None
    locationId: int | None = None
    zoneId: int | None = None
    zoneType: str | None = None  # "public" | "restricted" | "critical"
    locationName: str | None = None  # convenience (not in the TS interface)


class Credentials(_Base):
    username: str | None = None
    passwordRef: str | None = None


class Connectivity(_Base):
    protocol: str | None = None  # "RTSP" | "HTTP" | "HTTPS"
    ipAddress: str | None = None
    port: int | None = None
    credentials: Credentials | None = None
    isOnline: bool | None = None
    lastHeartbeatAt: str | None = None
    # Explicit stream URLs kept for MediaMTX (the TS interface has none).
    rtspUrl: str | None = None
    substreamRtspUrl: str | None = None


class VideoStream(_Base):
    type: str | None = None  # "main" | "sub" | "mobile"
    resolution: str | None = None
    fps: int | None = None
    bitrate: int | None = None
    purpose: str | None = None  # "ai" | "recording" | "preview" | "mobile"


class Video(_Base):
    codec: str | None = None
    nativeResolution: str | None = None
    nativeFps: int | None = None
    height: float | None = None  # recording transcode knob (extra)
    streams: list[VideoStream] | None = None


class AiUseCase(_Base):
    code: str | None = None
    name: str | None = None
    modelVersion: str | None = None
    confidenceThreshold: float | None = None
    enabled: bool | None = None


class RegionOfInterest(_Base):
    id: str | None = None
    name: str | None = None
    type: str | None = None  # "line" | "polygon" | "area"
    coordinates: list[list[float]] | None = None


class AiSchedule(_Base):
    days: list[str] | None = None
    startTime: str | None = None
    endTime: str | None = None


class Ai(_Base):
    enabled: bool | None = None
    processingMode: str | None = None  # "edge" | "cloud" | "hybrid"
    useCases: list[AiUseCase] | None = None
    regionsOfInterest: list[RegionOfInterest] | None = None
    schedules: list[AiSchedule] | None = None


class Recording(_Base):
    enabled: bool | None = None
    retentionDays: int | None = None
    storageTier: str | None = None  # "hot" | "warm" | "cold"


class AlertRule(_Base):
    eventType: str | None = None
    minConfidence: float | None = None
    actions: list[str] | None = None


class Alerts(_Base):
    enabled: bool | None = None
    rules: list[AlertRule] | None = None


class Capabilities(_Base):
    isPTZ: bool | None = None
    supportsEdgeAI: bool | None = None
    supportsAudio: bool | None = None


class StatusInfo(_Base):
    active: bool | None = None
    createdAt: datetime | None = None
    createdBy: int | None = None
    updatedAt: datetime | None = None
    updatedBy: int | None = None


# --------------------------------------------------------------------------- #
# Request / response envelopes
# --------------------------------------------------------------------------- #
class CameraResponse(_Base):
    identity: Identity
    location: LocationInfo
    connectivity: Connectivity
    video: Video
    ai: Ai
    recording: Recording
    alerts: Alerts
    capabilities: Capabilities
    status: StatusInfo


class CameraCreate(_Base):
    identity: Identity
    location: LocationInfo
    video: Video
    status: StatusInfo
    connectivity: Connectivity | None = None
    ai: Ai | None = None
    recording: Recording | None = None
    alerts: Alerts | None = None
    capabilities: Capabilities | None = None


class CameraUpdate(_Base):
    identity: Identity | None = None
    location: LocationInfo | None = None
    connectivity: Connectivity | None = None
    video: Video | None = None
    ai: Ai | None = None
    recording: Recording | None = None
    alerts: Alerts | None = None
    capabilities: Capabilities | None = None
    status: StatusInfo | None = None


class CamerasResponse(BaseModel):
    cameras: list[CameraResponse]


class CameraDeleteSuccessResponse(BaseModel):
    code: int = 200
    message: str = "Camera deleted successfully"


class CameraStatusUpdate(BaseModel):
    status: bool


# --------------------------------------------------------------------------- #
# Use-case assignment (existing relational join — unchanged contract)
# --------------------------------------------------------------------------- #
class CameraUseCaseAssignment(BaseModel):
    usecase_id: int
    is_active: bool = False


class CameraUseCaseResponse(BaseModel):
    usecase_id: int
    is_active: bool


class UpdateCameraUseCaseRequest(BaseModel):
    usecases: list[CameraUseCaseAssignment]


class CommonFailureResponse(BaseModel):
    code: int = 500
    message: str
