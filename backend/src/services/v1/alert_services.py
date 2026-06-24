from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from src.crud.alert import (
    add_timeline_entry,
    get_alert_by_id,
    get_alerts,
    get_related_alerts,
    link_incident,
    update_alert_status,
)
from src.models.alert import STATUS_VALUES, Alert
from src.models.incident import Incident
from src.schemas.alert import (
    AlertDetailResponse,
    AlertResponse,
    AlertsResponse,
    AlertTimelineEntry,
)
from src.utils.translation import resolve_translation

VALID_STATUSES = set(STATUS_VALUES)


def _translated_name(translations, language: str, fallback: str) -> str:
    resolved = resolve_translation(translations, language) if translations else None
    if resolved and getattr(resolved, "name", None):
        return resolved.name
    english = resolve_translation(translations, "en") if translations else None
    if english and getattr(english, "name", None):
        return english.name
    return fallback


def _build_alert_response(alert: Alert, language: str) -> AlertResponse:
    return AlertResponse(
        id=alert.id,
        event_id=alert.event_id,
        camera_id=alert.camera_id,
        camera_name=_translated_name(alert.camera.translations if alert.camera else None, language, str(alert.camera_id)),
        location_id=alert.location_id,
        location_name=_translated_name(alert.location.translations if alert.location else None, language, str(alert.location_id)),
        usecase_id=alert.usecase_id,
        usecase_name=_translated_name(alert.usecase.translations if alert.usecase else None, language, str(alert.usecase_id)),
        title=alert.title,
        severity=alert.severity,
        category=alert.category,
        status=alert.status,
        evidence_url=alert.evidence_url,
        occurrence_count=alert.occurrence_count,
        event_start_time=alert.event_start_time,
        event_end_time=alert.event_end_time,
        acknowledged_by=alert.acknowledged_by,
        acknowledged_at=alert.acknowledged_at,
        incident_id=alert.incident_id,
        created_at=alert.created_at,
        updated_at=alert.updated_at,
    )


def list_alerts(
    db: Session,
    language: str,
    *,
    severity: str | None,
    status_filter: str | None,
    category: str | None,
    usecase_id: int | None,
    location_id: int | None,
    page: int,
    page_size: int,
) -> AlertsResponse:
    rows, total = get_alerts(
        db,
        severity=severity,
        status=status_filter,
        category=category,
        usecase_id=usecase_id,
        location_id=location_id,
        page=page,
        page_size=page_size,
    )
    return AlertsResponse(
        alerts=[_build_alert_response(a, language) for a in rows],
        total=total,
        page=page,
        page_size=page_size,
    )


def _require_alert(db: Session, alert_id: int) -> Alert:
    alert = get_alert_by_id(db, alert_id)
    if not alert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")
    return alert


def get_alert_detail(db: Session, alert_id: int, language: str) -> AlertDetailResponse:
    alert = _require_alert(db, alert_id)
    base = _build_alert_response(alert, language)
    timeline = [
        AlertTimelineEntry(
            id=entry.id,
            action=entry.action,
            from_status=entry.from_status,
            to_status=entry.to_status,
            note=entry.note,
            actor_id=entry.actor_id,
            actor_name=(f"{entry.actor.first_name} {entry.actor.last_name}".strip() if entry.actor else None),
            created_at=entry.created_at,
        )
        for entry in alert.timeline
    ]
    related = [_build_alert_response(r, language) for r in get_related_alerts(db, alert)]
    return AlertDetailResponse(**base.model_dump(), timeline=timeline, related_alerts=related)


def _broadcast(alert: Alert, language: str) -> AlertResponse:
    """Build the response and push the lifecycle change to connected clients."""
    response = _build_alert_response(alert, language)
    # Imported lazily so a missing Redis at import time never breaks the route.
    from src.realtime.publisher import publish_alert_update

    publish_alert_update(response.model_dump())
    return response


def acknowledge_alert(db: Session, alert_id: int, actor_id: int, language: str) -> AlertResponse:
    alert = _require_alert(db, alert_id)
    if alert.status in ("RESOLVED", "CLOSED"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Alert is already closed")
    alert = update_alert_status(db, alert=alert, new_status="ACK", actor_id=actor_id)
    # Cancel any pending escalation timers for this alert.
    from src.realtime.publisher import _publish  # reuse the sync redis publisher
    _publish("escalation:cancel", {"alert_id": alert.id})
    return _broadcast(alert, language)


def change_status(db: Session, alert_id: int, new_status: str, actor_id: int, note: str | None, language: str) -> AlertResponse:
    if new_status not in VALID_STATUSES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid status")
    alert = _require_alert(db, alert_id)
    alert = update_alert_status(db, alert=alert, new_status=new_status, actor_id=actor_id, note=note)
    return _broadcast(alert, language)


def snooze_alert(db: Session, alert_id: int, minutes: int, actor_id: int, language: str) -> AlertResponse:
    alert = _require_alert(db, alert_id)
    until = datetime.now(timezone.utc) + timedelta(minutes=minutes)
    add_timeline_entry(
        db,
        alert_id=alert.id,
        action="snooze",
        note=f"Snoozed until {until.isoformat()}",
        actor_id=actor_id,
    )
    db.refresh(alert)
    return _build_alert_response(alert, language)


def send_test_alert(user_id: int) -> dict:
    """Push a synthetic alert straight to this user's WebSocket channel so the
    real-time UI (toast + bell badge) can be verified without a camera event."""
    from src.realtime.publisher import publish_alert_new

    now = datetime.now(timezone.utc).isoformat()
    payload = {
        "id": 0,
        "event_id": None,
        "camera_id": 0,
        "camera_name": "Test Camera",
        "location_id": 0,
        "location_name": "Test Zone",
        "usecase_id": 0,
        "usecase_name": "Test",
        "title": "Test Alert — real-time check",
        "severity": "HIGH",
        "category": "OTHER",
        "status": "NEW",
        "evidence_url": None,
        "occurrence_count": 1,
        "event_start_time": now,
        "event_end_time": now,
        "acknowledged_by": None,
        "acknowledged_at": None,
        "incident_id": None,
        "created_at": now,
        "updated_at": None,
    }
    publish_alert_new(user_id, payload)
    return payload


def create_incident_from_alert(
    db: Session,
    alert_id: int,
    *,
    issue_type: str,
    priority: str,
    summary: str | None,
    description: str | None,
    actor_id: int,
    language: str,
) -> tuple[str, AlertResponse]:
    alert = _require_alert(db, alert_id)
    if priority not in ("Low", "Medium", "High", "Critical"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid priority")

    incident_code = f"INC-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{alert.id}"
    incident = Incident(
        incident_id=incident_code,
        issue_type=issue_type,
        priority=priority,
        summary=summary or alert.title,
        description=description,
        proof_attachment=alert.evidence_url,
        status="New",
        created_by=actor_id,
    )
    db.add(incident)
    db.commit()
    db.refresh(incident)

    alert = link_incident(db, alert=alert, incident_id=incident.id)
    add_timeline_entry(
        db,
        alert_id=alert.id,
        action="incident_created",
        to_status="INCIDENT",
        note=f"Incident {incident_code} created",
        actor_id=actor_id,
    )
    return incident_code, _broadcast(alert, language)
