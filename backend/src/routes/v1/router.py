from fastapi import APIRouter
from src.routes.v1.auth import router as auth_router
from src.routes.v1.camera import router as camera_router
from src.routes.v1.roi import router as roi_router
from src.routes.v1.event import router as event_router
from src.routes.v1.location import router as location_router
from src.routes.v1.usecase import router as usecase_router
from src.routes.v1.user import router as user_router
from src.routes.v1.onboarding import router as onboarding_router
from src.routes.v1.permission import router as permission_router
from src.routes.v1.roles import router as roles_router
from src.routes.v1.translation import router as translation_router
from src.routes.v1.stream import router as stream_router
from src.routes.v1.dashboard import router as dashboard_router


v1_router = APIRouter()

v1_router.include_router(auth_router, prefix="/auth", tags=["Authentication"])
v1_router.include_router(user_router, prefix="/user", tags=["User"])
v1_router.include_router(onboarding_router, prefix="/onboarding", tags=["Onboarding"])
v1_router.include_router(usecase_router, prefix="/usecase", tags=["UseCase"])
v1_router.include_router(location_router, prefix="/location", tags=["Location"])
v1_router.include_router(camera_router, prefix="/camera", tags=["Camera"])
v1_router.include_router(roi_router, prefix="/roi", tags=["ROI"])
v1_router.include_router(event_router, prefix="/event", tags=["Event"])
v1_router.include_router(permission_router, prefix="/permission", tags=["Permission"])
v1_router.include_router(roles_router, prefix="/roles", tags=["Roles"])
v1_router.include_router(translation_router, tags=["Translation"])
v1_router.include_router(stream_router, prefix="/stream", tags=["Stream"])
v1_router.include_router(dashboard_router, prefix="/dashboard", tags=["Dashboard"])
