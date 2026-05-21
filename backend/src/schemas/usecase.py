from pydantic import BaseModel, Field

from pydantic import BaseModel, Field


class UseCaseCreate(BaseModel):
    name_en: str = Field( min_length=2, max_length=255,)
    name_es: str | None = Field(default=None, min_length=2, max_length=255,)
    name_fr: str | None = Field(default=None, min_length=2, max_length=255,)
    description_en: str | None = Field( default=None, max_length=1000,)
    description_es: str | None = Field( default=None, max_length=1000,)
    description_fr: str | None = Field( default=None, max_length=1000,)
    status: bool = True

class UseCaseUpdate(BaseModel):

    name_en: str | None = Field(default=None, min_length=2, max_length=255,)
    name_es: str | None = Field(default=None, min_length=2, max_length=255,)
    name_fr: str | None = Field(default=None, min_length=2, max_length=255,)
    description_en: str | None = Field(default=None, max_length=1000,)
    description_es: str | None = Field(default=None, max_length=1000,)
    description_fr: str | None = Field(default=None, max_length=1000,)
    status: bool | None = None

class UseCaseResponse(BaseModel):
    id: int
    name_en: str | None
    name_es: str | None
    name_fr: str | None
    name: str | None
    description_en: str | None
    description_es: str | None
    description_fr: str | None
    description: str | None
    status: bool


class UseCasesResponse(BaseModel):
    usecases: list[UseCaseResponse]


class UseCaseDeleteResponse(BaseModel):
    message: str


class UseCaseStatusUpdate(BaseModel):
    status: bool


class LinkedCameraResponse(BaseModel):
    id: int
    name: str | None = None
    status: bool

class UseCaseDeleteResponse(BaseModel):
    code: int = 200
    message: str = "Camera deleted successfully"
 
class LinkedCamerasResponse(BaseModel):
    cameras: list[LinkedCameraResponse]

class CommonFailureResponse(BaseModel):
    code: int = 500
    message: str