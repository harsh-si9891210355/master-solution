from pydantic import BaseModel, Field



class LocationResponse(BaseModel):
    id: int
    name: str


class LocationsResponse(BaseModel):
    locations: list[LocationResponse]


