from pydantic import BaseModel, Field

class UseCaseCreate(BaseModel):
    code: str = Field(min_length=2, max_length=100)
    name: str = Field(min_length=2, max_length=255)
    description: str | None = Field(default=None, max_length=1000)
    language_code: str = Field(default="en", max_length=10)
    status: bool = True


class UseCaseResponse(BaseModel):
    id: int
    code: str
    name: str
    description: str | None
    status: bool


class UseCasesResponse(BaseModel):
    usecases: list[UseCaseResponse]

class UseCaseDeleteResponse(BaseModel):
    message: str


class UseCaseStatusUpdate(BaseModel):
    status: bool