from datetime import datetime

from pydantic import BaseModel, Field


class CameraUseCaseAssignment(BaseModel):
    usecase_id: int
    is_active: bool = False


class CameraCreate(BaseModel):
    name_en: str = Field(min_length=2, max_length=255)
    name_es: str | None = Field(default=None, min_length=2, max_length=255)
    name_fr: str | None = Field(default=None, min_length=2, max_length=255)
    location_id: int
    codec: str = Field(min_length=1, max_length=255)
    resolution: str = Field(min_length=1, max_length=255)
    height: float | None = None
    fps: str = Field(default="5", min_length=1, max_length=50)
    rtsp_url: str | None = Field(default=None, max_length=255)
    status: bool = True
    status_modified_by: int
    usecases: list[CameraUseCaseAssignment] = []


class CameraUpdate(BaseModel):
    name_en: str | None = Field(default=None, min_length=2, max_length=255)
    name_es: str | None = Field(default=None, min_length=2, max_length=255)
    name_fr: str | None = Field(default=None, min_length=2, max_length=255)
    location_id: int | None = None
    codec: str | None = Field(default=None, min_length=1, max_length=255)
    resolution: str | None = Field(default=None, min_length=1, max_length=255)
    height: float | None = None
    fps: str | None = Field(default=None, min_length=1, max_length=50)
    rtsp_url: str | None = Field(default=None, max_length=255)
    status: bool | None = None
    status_modified_by: int | None = None
    usecases: list[CameraUseCaseAssignment] | None = None


class CameraUseCaseResponse(BaseModel):
    usecase_id: int
    is_active: bool


class CameraResponse(BaseModel):
    id: int
    name_en: str
    name_es: str | None = None
    name_fr: str | None = None
    name: str
    location_id: int
    location_name: str
    codec: str
    resolution: str
    height: float | None
    fps: str
    rtsp_url: str | None
    status: bool
    status_modified_by: int
    usecases: list[CameraUseCaseResponse]
    last_modified_at: datetime | None
    created_at: datetime | None


class CamerasResponse(BaseModel):
    cameras: list[CameraResponse]


class CameraDeleteResponse(BaseModel):
    message: str
