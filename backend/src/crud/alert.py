from datetime import datetime, timezone

from sqlalchemy import func
from sqlalchemy.orm import Session, selectinload

from src.models.alert import Alert, AlertTimeline
from src.models.camera import Camera
from src.models.location import Location
from src.models.usecase import UseCase


def _with_relations(query):
    return query.options(
        selectinload(Alert.camera).selectinload(Camera.translations),
        selectinload(Alert.location).selectinload(Location.translations),
        selectinload(Alert.usecase).selectinload(UseCase.translations),
    )


def get_alert_by_id(db: Session, alert_id: int) -> Alert | None:
    return (
        _with_relations(db.query(Alert))
        .options(selectinload(Alert.timeline).selectinload(AlertTimeline.actor))
        .filter(Alert.id == alert_id)
        .first()
    )


def get_alerts(
    db: Session,
    *,
    severity: str | None = None,
    status: str | None = None,
    category: str | None = None,
    usecase_id: int | None = None,
    location_id: int | None = None,
    page: int = 1,
    page_size: int = 25,
) -> tuple[list[Alert], int]:
    query = _with_relations(db.query(Alert))
    if severity:
        query = query.filter(Alert.severity == severity)
    if status:
        query = query.filter(Alert.status == status)
    if category:
        query = query.filter(Alert.category == category)
    if usecase_id:
        query = query.filter(Alert.usecase_id == usecase_id)
    if location_id:
        query = query.filter(Alert.location_id == location_id)

    total = query.with_entities(func.count(Alert.id)).scalar() or 0
    offset = max(page - 1, 0) * page_size
    rows = query.order_by(Alert.created_at.desc()).offset(offset).limit(page_size).all()
    return rows, int(total)


def get_related_alerts(db: Session, alert: Alert, limit: int = 5) -> list[Alert]:
    """Recent alerts on the same camera + use-case, excluding this one."""
    return (
        _with_relations(db.query(Alert))
        .filter(
            Alert.camera_id == alert.camera_id,
            Alert.usecase_id == alert.usecase_id,
            Alert.id != alert.id,
        )
        .order_by(Alert.created_at.desc())
        .limit(limit)
        .all()
    )


def add_timeline_entry(
    db: Session,
    *,
    alert_id: int,
    action: str,
    from_status: str | None = None,
    to_status: str | None = None,
    note: str | None = None,
    actor_id: int | None = None,
) -> AlertTimeline:
    entry = AlertTimeline(
        alert_id=alert_id,
        action=action,
        from_status=from_status,
        to_status=to_status,
        note=note,
        actor_id=actor_id,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


def update_alert_status(
    db: Session,
    *,
    alert: Alert,
    new_status: str,
    actor_id: int | None,
    note: str | None = None,
) -> Alert:
    previous = alert.status
    alert.status = new_status
    if new_status == "ACK" and alert.acknowledged_by is None:
        alert.acknowledged_by = actor_id
        alert.acknowledged_at = datetime.now(timezone.utc)
    db.add(alert)
    db.commit()
    db.refresh(alert)
    add_timeline_entry(
        db,
        alert_id=alert.id,
        action=f"status:{new_status.lower()}",
        from_status=previous,
        to_status=new_status,
        note=note,
        actor_id=actor_id,
    )
    return alert


def link_incident(db: Session, *, alert: Alert, incident_id: int) -> Alert:
    alert.incident_id = incident_id
    alert.status = "INCIDENT"
    db.add(alert)
    db.commit()
    db.refresh(alert)
    return alert
