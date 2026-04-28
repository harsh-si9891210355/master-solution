import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config.logging_config import LoggingConfig
from src.core.config import settings
from src.crud.role import seed_roles
from src.db.db_connection import Base, engine
from src.db.db_connection import SessionLocal
from src.models.camera import Camera  # noqa: F401
from src.models.camera_usecase import CameraUsecase  # noqa: F401
from src.models.event import Event  # noqa: F401
from src.models.incident import Incident  # noqa: F401
from src.models.incident_comment import IncidentComment  # noqa: F401
from src.models.location import Location  # noqa: F401
from src.models.role import Role  # noqa: F401
from src.models.usecase import UseCase  # noqa: F401
from src.models.user import User  # noqa: F401
from src.models.users_token import UsersToken  # noqa: F401
from src.models.resource import Resource  # noqa: F401
from src.models.scope import Scope  # noqa: F401
from src.models.role_permission import RolePermission  # noqa: F401
from src.middleware.language import LanguageMiddleware
from src.routes.router import api_router

logger = LoggingConfig().setup_logging()

# Initialize FastAPI application
app = FastAPI(title=settings.app_name, version="1.0.0", debug=settings.debug)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow requests from any origin (change this for security)
    allow_credentials=True,
    allow_methods=["*"],  # Allow all HTTP methods (GET, POST, PUT, DELETE, etc.)
    allow_headers=["*"],  # Allow all headers
)
app.add_middleware(LanguageMiddleware)

# Include all API routes from the router
app.include_router(api_router)

# Health Check API
@app.get("/health", tags=["Health Check"])
def health_check():
    return {"status": "healthy", "environment": settings.app_env}


@app.on_event("startup")
def on_startup() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_roles(db)
    finally:
        db.close()


def start():
    logger.info("Initializing the FastAPI Backend Server...")
    uvicorn.run(app, host=settings.host, port=settings.port)

# Run the server if executed as a script
if __name__ == "__main__":
    start()
