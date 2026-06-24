from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session

from src.db.db_connection import get_db
from src.schemas.alert import (
    AlertActionResponse,
    AlertDetailResponse,
    AlertSnoozeRequest,
    AlertsResponse,
    AlertStatusUpdate,
    CreateIncidentFromAlertRequest,
    CreateIncidentFromAlertResponse,
)
from src.services.v1.alert_services import (
    acknowledge_alert,
    change_status,
    create_incident_from_alert,
    get_alert_detail,
    list_alerts,
    send_test_alert,
    snooze_alert,
)
from src.utils.auth.auth import require_permission

router = APIRouter()


@router.post("/test")
def send_test_alert_route(
    current=Depends(require_permission("alert:read")),
) -> dict:
    """Fire a synthetic alert to the caller's own WebSocket channel — used to
    verify the real-time toast + bell without a live detection."""
    send_test_alert(current["user"].id)
    return {"message": "Test alert sent"}


@router.get("", response_model=AlertsResponse, dependencies=[Depends(require_permission("alert:read"))])
def get_alerts_route(
    request: Request,
    db: Session = Depends(get_db),
    severity: str | None = Query(default=None),
    status: str | None = Query(default=None),
    category: str | None = Query(default=None),
    usecase_id: int | None = Query(default=None),
    location_id: int | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=25, ge=1, le=100),
) -> AlertsResponse:
    return list_alerts(
        db,
        request.state.lang,
        severity=severity,
        status_filter=status,
        category=category,
        usecase_id=usecase_id,
        location_id=location_id,
        page=page,
        page_size=page_size,
    )


@router.get("/{alert_id}", response_model=AlertDetailResponse, dependencies=[Depends(require_permission("alert:read"))])
def get_alert_route(alert_id: int, request: Request, db: Session = Depends(get_db)) -> AlertDetailResponse:
    return get_alert_detail(db, alert_id, request.state.lang)


@router.post("/{alert_id}/acknowledge", response_model=AlertActionResponse)
def acknowledge_alert_route(
    alert_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current=Depends(require_permission("alert:update")),
) -> AlertActionResponse:
    alert = acknowledge_alert(db, alert_id, current["user"].id, request.state.lang)
    return AlertActionResponse(message="Alert acknowledged", alert=alert)


@router.post("/{alert_id}/status", response_model=AlertActionResponse)
def change_status_route(
    alert_id: int,
    payload: AlertStatusUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current=Depends(require_permission("alert:update")),
) -> AlertActionResponse:
    alert = change_status(db, alert_id, payload.status, current["user"].id, payload.note, request.state.lang)
    return AlertActionResponse(message="Alert status updated", alert=alert)


@router.post("/{alert_id}/snooze", response_model=AlertActionResponse)
def snooze_alert_route(
    alert_id: int,
    payload: AlertSnoozeRequest,
    request: Request,
    db: Session = Depends(get_db),
    current=Depends(require_permission("alert:update")),
) -> AlertActionResponse:
    alert = snooze_alert(db, alert_id, payload.minutes, current["user"].id, request.state.lang)
    return AlertActionResponse(message="Alert snoozed", alert=alert)


@router.post("/{alert_id}/incident", response_model=CreateIncidentFromAlertResponse)
def create_incident_route(
    alert_id: int,
    payload: CreateIncidentFromAlertRequest,
    request: Request,
    db: Session = Depends(get_db),
    current=Depends(require_permission("alert:update")),
) -> CreateIncidentFromAlertResponse:
    incident_code, alert = create_incident_from_alert(
        db,
        alert_id,
        issue_type=payload.issue_type,
        priority=payload.priority,
        summary=payload.summary,
        description=payload.description,
        actor_id=current["user"].id,
        language=request.state.lang,
    )
    return CreateIncidentFromAlertResponse(
        message="Incident created from alert", incident_id=incident_code, alert=alert
    )
