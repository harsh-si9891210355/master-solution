"""Shared error handling for module-level service functions.

Mirrors the `handle_db_exceptions` decorator in camera_services, but works on
plain functions (not just class methods): it locates the SQLAlchemy Session in
the call args, rolls back on failure, logs the traceback, and returns a
`CommonFailureResponse` instead of letting an unhandled error become an opaque
500. Intended-error returns (a function returning its own CommonFailureResponse)
pass straight through.
"""

import logging
from functools import wraps
from typing import Callable

from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from src.schemas.common import CommonFailureResponse

logger = logging.getLogger(__name__)


def _find_session(args: tuple, kwargs: dict) -> Session | None:
    session = kwargs.get("db")
    if isinstance(session, Session):
        return session
    return next((a for a in args if isinstance(a, Session)), None)


def handle_db_exceptions(func: Callable) -> Callable:
    @wraps(func)
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except IntegrityError:
            session = _find_session(args, kwargs)
            if session is not None:
                session.rollback()
            logger.exception("Integrity error in %s", func.__name__)
            return CommonFailureResponse(code=409, message="Duplicate/constraint violation")
        except SQLAlchemyError:
            session = _find_session(args, kwargs)
            if session is not None:
                session.rollback()
            logger.exception("Database error in %s", func.__name__)
            return CommonFailureResponse(code=500, message="Database Error Occurred")
        except Exception:
            session = _find_session(args, kwargs)
            if session is not None:
                session.rollback()
            logger.exception("Unexpected error in %s", func.__name__)
            return CommonFailureResponse(code=500, message="Internal Server Error")

    return wrapper
