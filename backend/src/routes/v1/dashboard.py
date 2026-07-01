from datetime import date

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session

from src.db.db_connection import get_db
from src.schemas.common import CommonFailureResponse
from src.schemas.dashboard import DashboardResponse
from src.services.v1.dashboard_services import get_dashboard_data
from src.utils.auth.auth import require_permission


router = APIRouter()


@router.get(
    "",
    response_model=DashboardResponse | CommonFailureResponse,
    dependencies=[Depends(require_permission("event:read"))],
)
def get_dashboard(
    request: Request,
    db: Session = Depends(get_db),
    from_: date | None = Query(default=None, alias="from", description="Range start (YYYY-MM-DD)"),
    to: date | None = Query(default=None, description="Range end (YYYY-MM-DD)"),
):
    """Aggregated dashboard data. Optional ?from=&to= scope the event-based
    range metrics; relative buckets (today/week/month) are always now-relative."""
    return get_dashboard_data(db, from_, to)
