from pydantic import BaseModel, Field


class UseCaseResponse(BaseModel):
    id: int
    name: str
    description: str | None
    status: bool


class UseCasesResponse(BaseModel):
    usecases: list[UseCaseResponse]

