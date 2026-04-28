from pydantic import BaseModel


class ResourceResponse(BaseModel):
    id: int
    name: str
    is_active: bool

    class Config:
        from_attributes = True


class ScopeResponse(BaseModel):
    id: int
    name: str
    is_active: bool

    class Config:
        from_attributes = True


class RolePermissionResponse(BaseModel):
    id: int
    role_id: int
    resource_id: int
    scope_id: int
    resource: ResourceResponse
    scope: ScopeResponse

    class Config:
        from_attributes = True


class RolePermissionsListResponse(BaseModel):
    permissions: list[RolePermissionResponse]


class RolePermissionsByRoleResponse(BaseModel):
    role_id: int
    permissions: list[RolePermissionResponse]


class ResourcesListResponse(BaseModel):
    resources: list[ResourceResponse]


class ScopesListResponse(BaseModel):
    scopes: list[ScopeResponse]

