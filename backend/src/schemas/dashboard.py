from pydantic import BaseModel


class Summary(BaseModel):
    totalEvents: int
    todayEvents: int
    thisWeekEvents: int
    thisMonthEvents: int
    yesterdayEvents: int
    lastWeekEvents: int
    totalLikes: int
    totalDislikes: int
    totalNeutral: int
    aiInsight: str


class TodayVsYesterday(BaseModel):
    today: int
    yesterday: int
    percentChange: float


class WeekVsLastWeek(BaseModel):
    thisWeek: int
    lastWeek: int
    percentChange: float


class MonthVsLastMonth(BaseModel):
    thisMonth: int
    lastMonth: int
    percentChange: float


class ComparisonMetrics(BaseModel):
    todayVsYesterday: TodayVsYesterday
    weekVsLastWeek: WeekVsLastWeek
    monthVsLastMonth: MonthVsLastMonth


class DeviceStatus(BaseModel):
    online: int
    offline: int
    total: int


class Reactions(BaseModel):
    likes: int
    dislikes: int
    neutral: int


class MonthCount(BaseModel):
    month: str
    events: int


class HourCount(BaseModel):
    hour: str
    events: int


class TypeBreakdown(BaseModel):
    type: str
    count: int
    color: str


class TopCamera(BaseModel):
    id: str
    location: str
    events: int
    status: str


class RecentEvent(BaseModel):
    time: str
    event: str
    location: str
    camera: str
    severity: str


class LocationCount(BaseModel):
    location: str
    events: int


class SeverityBreakdown(BaseModel):
    severity: str
    count: int
    color: str


class EventsTab(BaseModel):
    totalEvents: int
    resolvedEvents: int
    pendingEvents: int
    criticalEvents: int
    avgResolutionMins: int
    severityBreakdown: list[SeverityBreakdown]
    topLocations: list[LocationCount]


class HealthTrend(BaseModel):
    date: str
    online: int
    offline: int


class LocationCoverage(BaseModel):
    location: str
    online: int
    maintenance: int
    offline: int


class CamerasTab(BaseModel):
    totalCameras: int
    onlineCameras: int
    offlineCameras: int
    maintenanceDue: int
    avgUptimePct: int
    healthTrend: list[HealthTrend]
    locationCoverage: list[LocationCoverage]


class RoleBreakdown(BaseModel):
    role: str
    count: int
    color: str


class LoginActivity(BaseModel):
    date: str
    logins: int


class UsersTab(BaseModel):
    totalUsers: int
    activeUsers: int
    pendingApprovals: int
    suspendedUsers: int
    newThisMonth: int
    activeThisMonth: int
    pendingToday: int
    roleBreakdown: list[RoleBreakdown]
    loginActivity: list[LoginActivity]


class DashboardResponse(BaseModel):
    summary: Summary
    comparisonMetrics: ComparisonMetrics
    deviceStatus: DeviceStatus
    reactions: Reactions
    eventsByMonth: list[MonthCount]
    eventsByHour: list[HourCount]
    eventTypeBreakdown: list[TypeBreakdown]
    topCameras: list[TopCamera]
    recentEvents: list[RecentEvent]
    locationEventCount: list[LocationCount]
    eventsTab: EventsTab
    camerasTab: CamerasTab
    usersTab: UsersTab
