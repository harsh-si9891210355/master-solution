"""Aggregated dashboard data.

Most numbers are computed live from the DB (events, cameras, users, incidents).
A few fields in the agreed response shape have no backing data in the current
schema and are returned as honest zeros / empty lists (flagged with NO DATA):
  - reactions (likes/dislikes/neutral)        — no reactions table
  - recentEvents[].severity                   — events have no severity column
  - camerasTab.maintenanceDue / healthTrend   — no maintenance / history tracking
  - usersTab.activeThisMonth / loginActivity / suspendedUsers — no login/suspend tracking
Resolution/severity in eventsTab are sourced from the incidents table (the
entity that actually carries status + priority).
"""

from datetime import date, datetime, timedelta, timezone

from sqlalchemy import extract, func
from sqlalchemy.orm import Session

from src.models.camera import Camera, CameraTranslation
from src.models.event import Event
from src.models.incident import Incident
from src.models.location import LocationTranslation
from src.models.role import Role
from src.models.usecase import UseCaseTranslation
from src.models.user import User
from src.schemas.common import CommonFailureResponse
from src.schemas.dashboard import (
    CamerasTab,
    ComparisonMetrics,
    DashboardResponse,
    DeviceStatus,
    EventsTab,
    HourCount,
    LocationCount,
    LocationCoverage,
    MonthCount,
    MonthVsLastMonth,
    Reactions,
    RecentEvent,
    RoleBreakdown,
    SeverityBreakdown,
    Summary,
    TodayVsYesterday,
    TopCamera,
    TypeBreakdown,
    UsersTab,
    WeekVsLastWeek,
)
from src.utils.error_handler import handle_db_exceptions

_PALETTE = ["#06B6D4", "#34D399", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#3B82F6", "#F97316", "#10B981", "#14B8A6"]
_SEVERITY_COLORS = {"Low": "#34D399", "Medium": "#F59E0B", "High": "#F97316", "Critical": "#EF4444"}
_RESOLVED = ("Resolved", "Closed")
_PENDING = ("New", "In Progress")


def _pct(current: int, previous: int) -> float:
    if previous:
        return round((current - previous) / previous * 100, 1)
    return 100.0 if current else 0.0


def _count_events(db: Session, start: datetime, end: datetime) -> int:
    return (
        db.query(func.count(Event.id))
        .filter(Event.created_date_time >= start, Event.created_date_time < end)
        .scalar()
        or 0
    )


def _en_name_map(db: Session, model, id_column) -> dict[int, str]:
    rows = db.query(id_column, model.name).filter(model.language_code == "en").all()
    return {row[0]: row[1] for row in rows}


@handle_db_exceptions
def get_dashboard_data(db: Session, from_date: date | None, to_date: date | None) -> DashboardResponse | CommonFailureResponse:
    now = datetime.now(timezone.utc)
    today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    yesterday = today - timedelta(days=1)
    week = today - timedelta(days=7)
    last_week = today - timedelta(days=14)
    month = today.replace(day=1)
    last_month = (month - timedelta(days=1)).replace(day=1)

    # Selected range (defaults to all-time .. now).
    range_start = datetime(from_date.year, from_date.month, from_date.day, tzinfo=timezone.utc) if from_date else datetime(2000, 1, 1, tzinfo=timezone.utc)
    range_end = (datetime(to_date.year, to_date.month, to_date.day, tzinfo=timezone.utc) + timedelta(days=1)) if to_date else now

    def in_range(query):
        return query.filter(Event.created_date_time >= range_start, Event.created_date_time < range_end)

    # ---- name lookup maps ----
    usecase_names = _en_name_map(db, UseCaseTranslation, UseCaseTranslation.usecase_id)
    location_names = _en_name_map(db, LocationTranslation, LocationTranslation.location_id)
    camera_names = _en_name_map(db, CameraTranslation, CameraTranslation.camera_id)
    camera_location = {c.id: c.location_id for c in db.query(Camera.id, Camera.location_id).all()}
    camera_status = {c.id: c.status for c in db.query(Camera.id, Camera.status).all()}

    def loc_name(lid):
        return location_names.get(lid, f"Location {lid}")

    def cam_label(cid):
        return camera_names.get(cid, f"CAM-{cid}")

    # ---- summary / comparison ----
    total_events = _count_events(db, range_start, range_end)
    today_e = _count_events(db, today, now)
    yest_e = _count_events(db, yesterday, today)
    week_e = _count_events(db, week, now)
    last_week_e = _count_events(db, last_week, week)
    month_e = _count_events(db, month, now)
    last_month_e = _count_events(db, last_month, month)

    online = db.query(func.count(Camera.id)).filter(Camera.status.is_(True)).scalar() or 0
    offline = db.query(func.count(Camera.id)).filter(Camera.status.is_(False)).scalar() or 0

    day_pct = _pct(today_e, yest_e)
    direction = "spiked" if day_pct > 0 else ("dropped" if day_pct < 0 else "held steady")
    ai_insight = f"Activity {direction} {abs(day_pct)}% today vs yesterday. {offline} cameras offline."

    summary = Summary(
        totalEvents=total_events, todayEvents=today_e, thisWeekEvents=week_e, thisMonthEvents=month_e,
        yesterdayEvents=yest_e, lastWeekEvents=last_week_e,
        totalLikes=0, totalDislikes=0, totalNeutral=0,  # NO DATA: no reactions table
        aiInsight=ai_insight,
    )
    comparison = ComparisonMetrics(
        todayVsYesterday=TodayVsYesterday(today=today_e, yesterday=yest_e, percentChange=day_pct),
        weekVsLastWeek=WeekVsLastWeek(thisWeek=week_e, lastWeek=last_week_e, percentChange=_pct(week_e, last_week_e)),
        monthVsLastMonth=MonthVsLastMonth(thisMonth=month_e, lastMonth=last_month_e, percentChange=_pct(month_e, last_month_e)),
    )

    # ---- events by month (last 12) ----
    events_by_month = []
    for i in range(11, -1, -1):
        ordinal = now.month - i
        y = now.year + (ordinal - 1) // 12
        m = (ordinal - 1) % 12 + 1
        start = datetime(y, m, 1, tzinfo=timezone.utc)
        end = datetime(y + 1, 1, 1, tzinfo=timezone.utc) if m == 12 else datetime(y, m + 1, 1, tzinfo=timezone.utc)
        events_by_month.append(MonthCount(month=start.strftime("%b"), events=_count_events(db, start, end)))

    # ---- events by hour (within range) ----
    hour_rows = in_range(db.query(extract("hour", Event.created_date_time).label("h"), func.count(Event.id))).group_by("h").all()
    hour_map = {int(h): c for h, c in hour_rows}
    events_by_hour = [HourCount(hour=f"{h:02d}", events=hour_map.get(h, 0)) for h in range(24)]

    # ---- event type breakdown (by usecase, within range) ----
    type_rows = in_range(db.query(Event.usecase_id, func.count(Event.id))).group_by(Event.usecase_id).order_by(func.count(Event.id).desc()).all()
    event_type_breakdown = [
        TypeBreakdown(type=usecase_names.get(uid, f"Usecase {uid}"), count=cnt, color=_PALETTE[idx % len(_PALETTE)])
        for idx, (uid, cnt) in enumerate(type_rows)
    ]

    # ---- top cameras (within range) ----
    cam_rows = in_range(db.query(Event.camera_id, func.count(Event.id))).group_by(Event.camera_id).order_by(func.count(Event.id).desc()).limit(10).all()
    top_cameras = [
        TopCamera(
            id=cam_label(cid),
            location=loc_name(camera_location.get(cid)),
            events=cnt,
            status="online" if camera_status.get(cid) else "offline",
        )
        for cid, cnt in cam_rows
    ]

    # ---- recent events (within range) ----
    recent_rows = in_range(db.query(Event)).order_by(Event.created_date_time.desc()).limit(10).all()
    recent_events = [
        RecentEvent(
            time=(e.created_date_time.strftime("%I:%M %p") if e.created_date_time else ""),
            event=usecase_names.get(e.usecase_id, f"Usecase {e.usecase_id}"),
            location=loc_name(e.location_id),
            camera=cam_label(e.camera_id),
            severity="low",  # NO DATA: events have no severity column
        )
        for e in recent_rows
    ]

    # ---- location event count (within range) ----
    loc_rows = in_range(db.query(Event.location_id, func.count(Event.id))).group_by(Event.location_id).order_by(func.count(Event.id).desc()).all()
    location_event_count = [LocationCount(location=loc_name(lid), events=cnt) for lid, cnt in loc_rows]

    # ---- events tab (resolution/severity from incidents) ----
    resolved = db.query(func.count(Incident.id)).filter(Incident.status.in_(_RESOLVED)).scalar() or 0
    pending = db.query(func.count(Incident.id)).filter(Incident.status.in_(_PENDING)).scalar() or 0
    critical = db.query(func.count(Incident.id)).filter(Incident.priority == "Critical").scalar() or 0
    avg_secs = (
        db.query(func.avg(extract("epoch", Incident.updated_at - Incident.created_at)))
        .filter(Incident.status.in_(_RESOLVED), Incident.updated_at.isnot(None), Incident.created_at.isnot(None))
        .scalar()
    )
    avg_resolution_mins = int((avg_secs or 0) / 60)
    sev_rows = dict(db.query(Incident.priority, func.count(Incident.id)).group_by(Incident.priority).all())
    severity_breakdown = [
        SeverityBreakdown(severity=sev, count=sev_rows.get(sev, 0), color=_SEVERITY_COLORS[sev])
        for sev in ("Low", "Medium", "High", "Critical")
    ]
    events_tab = EventsTab(
        totalEvents=total_events, resolvedEvents=resolved, pendingEvents=pending, criticalEvents=critical,
        avgResolutionMins=avg_resolution_mins, severityBreakdown=severity_breakdown,
        topLocations=location_event_count[:5],
    )

    # ---- cameras tab ----
    total_cameras = online + offline
    coverage_rows = db.query(Camera.location_id, Camera.status, func.count(Camera.id)).group_by(Camera.location_id, Camera.status).all()
    coverage: dict[int, dict[str, int]] = {}
    for lid, st, cnt in coverage_rows:
        bucket = coverage.setdefault(lid, {"online": 0, "offline": 0})
        bucket["online" if st else "offline"] += cnt
    location_coverage = [
        LocationCoverage(location=loc_name(lid), online=b["online"], maintenance=0, offline=b["offline"])
        for lid, b in coverage.items()
    ]
    cameras_tab = CamerasTab(
        totalCameras=total_cameras, onlineCameras=online, offlineCameras=offline,
        maintenanceDue=0,  # NO DATA: no maintenance tracking
        avgUptimePct=round(online / total_cameras * 100) if total_cameras else 0,
        healthTrend=[],  # NO DATA: no historical camera status
        locationCoverage=location_coverage,
    )

    # ---- users tab ----
    total_users = db.query(func.count(User.id)).scalar() or 0
    active_users = db.query(func.count(User.id)).filter(User.is_active.is_(True)).scalar() or 0
    pending_approvals = db.query(func.count(User.id)).filter(User.is_active.is_(False)).scalar() or 0
    new_this_month = db.query(func.count(User.id)).filter(User.created_at >= month).scalar() or 0
    pending_today = db.query(func.count(User.id)).filter(User.is_active.is_(False), User.created_at >= today).scalar() or 0
    role_names = {r.id: r.name_en for r in db.query(Role.id, Role.name_en).all()}
    role_rows = db.query(User.role_id, func.count(User.id)).group_by(User.role_id).order_by(func.count(User.id).desc()).all()
    role_breakdown = [
        RoleBreakdown(role=role_names.get(rid, f"Role {rid}"), count=cnt, color=_PALETTE[idx % len(_PALETTE)])
        for idx, (rid, cnt) in enumerate(role_rows)
    ]
    users_tab = UsersTab(
        totalUsers=total_users, activeUsers=active_users, pendingApprovals=pending_approvals,
        suspendedUsers=0,  # NO DATA: no suspended flag
        newThisMonth=new_this_month,
        activeThisMonth=0,  # NO DATA: no login tracking
        pendingToday=pending_today,
        roleBreakdown=role_breakdown,
        loginActivity=[],  # NO DATA: no login tracking
    )

    return DashboardResponse(
        summary=summary,
        comparisonMetrics=comparison,
        deviceStatus=DeviceStatus(online=online, offline=offline, total=total_cameras),
        reactions=Reactions(likes=0, dislikes=0, neutral=0),  # NO DATA
        eventsByMonth=events_by_month,
        eventsByHour=events_by_hour,
        eventTypeBreakdown=event_type_breakdown,
        topCameras=top_cameras,
        recentEvents=recent_events,
        locationEventCount=location_event_count,
        eventsTab=events_tab,
        camerasTab=cameras_tab,
        usersTab=users_tab,
    )
