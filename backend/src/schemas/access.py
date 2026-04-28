from pydantic import BaseModel


class AccessCreate(BaseModel):
    role_id: int
    permission_id: int

    class Config:
        from_attributes = True


class AccessResponse(BaseModel):
    role_id: int
    permission_id: int

    class Config:
        from_attributes = True
