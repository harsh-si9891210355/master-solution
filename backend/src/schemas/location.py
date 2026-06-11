from pydantic import BaseModel, Field

class LocationCreate(BaseModel):

    name_en: str = Field(
        min_length=2,
        max_length=255,
    )

    name_es: str | None = Field(
        default=None,
        min_length=2,
        max_length=255,
    )

    name_fr: str | None = Field(
        default=None,
        min_length=2,
        max_length=255,
    )

    last_modified_by: int | None = None


class LocationUpdate(BaseModel):

    name_en: str | None = Field(
        default=None,
        min_length=2,
        max_length=255,
    )

    name_es: str | None = Field(
        default=None,
        min_length=2,
        max_length=255,
    )

    name_fr: str | None = Field(
        default=None,
        min_length=2,
        max_length=255,
    )

    last_modified_by: int | None = None


class LocationResponse(BaseModel):

    id: int

    name: str | None = None

    name_en: str | None = None
    name_es: str | None = None
    name_fr: str | None = None

    class Config:
        from_attributes = True


class LocationsResponse(BaseModel):
    locations: list[LocationResponse]


class CommonFailureResponse(BaseModel):
    code: int = 500
    message: str

class LocationDeleteResponse(BaseModel):
    message: str