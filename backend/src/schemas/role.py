from pydantic import BaseModel
from typing import List


class RoleResponse(BaseModel):
    id: int
    code: str
    name: str


class RolesResponse(BaseModel):
    roles: List[RoleResponse]