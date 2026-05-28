import uvicorn
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from pydantic import ValidationError

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
from src.services.translation import TranslationService
from src.services.translation.exceptions import TranslationInitializationError

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
async def on_startup() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_roles(db)
    finally:
        db.close()

    translation_service = TranslationService()
    try:
        await translation_service.initialize()
    except TranslationInitializationError:
        logger.exception("Failed to initialize the translation service during startup.")
        raise

    app.state.translation_service = translation_service


@app.exception_handler(RequestValidationError)
async def request_validation_exception_handler(
    request: Request,
    exc: RequestValidationError
):
    errors = []

    for err in exc.errors():
        errors.append({
            "field": ".".join(str(x) for x in err["loc"]),
            "message": err["msg"]
        })

    return JSONResponse(
        status_code=422,
        content={
            "code": 422,
            "message": "Validation Error",
            "errors": errors
        }
    )


@app.exception_handler(ValidationError)
async def pydantic_validation_exception_handler(
    request: Request,
    exc: ValidationError
):
    return JSONResponse(
        status_code=422,
        content={
            "code": 422,
            "message": "Pydantic Validation Error",
            "errors": exc.errors()
        }
    )

def start():
    logger.info("Initializing the FastAPI Backend Server...")
    uvicorn.run(app, host=settings.host, port=settings.port)

# Run the server if executed as a script
if __name__ == "__main__":
    start()
