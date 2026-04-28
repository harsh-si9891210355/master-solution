from pydantic import BaseModel, Field


class UseCaseResponse(BaseModel):
    id: int
    code: str
    name: str
    description: str | None
    status: bool


class UseCasesResponse(BaseModel):
    usecases: list[UseCaseResponse]


