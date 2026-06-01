export type TFunction = (key: string, options?: Record<string, unknown>) => string;

export type Preset = 'today' | 'yesterday' | '7d' | '30d' | '90d' | 'custom';

export interface DateRange {
    from: string;
    to: string;
}

export interface DateFilterBarProps {
    locale: string;
    preset: Preset;
    range: DateRange;
    onPreset: (preset: Preset) => void;
    onRange: (range: DateRange) => void;
    t: TFunction;
}

export type DashboardTab = 'events' | 'cameras' | 'users';

export type DashboardWidgetId =
    | 'kpis'
    | 'comparisons'
    | 'monthly_trend'
    | 'peak_hours'
    | 'event_types'
    | 'top_cameras'
    | 'status_reactions';

export type WidgetSpan = 'full' | 'half';

export interface DashboardWidget {
    id: DashboardWidgetId;
    title: string;
    span: WidgetSpan;
    content: React.ReactNode;
}

export interface ChartPoint {
    id: string;
    label: string;
    events: number;
}

export type TrendLevel = 'month' | 'week' | 'day' | 'hour';

export interface MonthPoint {
    monthKey: string;
    monthIndex: number;
    label: string;
    events: number;
}

export interface HourTemplatePoint {
    hour: string;
    events: number;
}

export interface MonthBreakdown {
    month: MonthPoint;
    days: ChartPoint[];
    weeks: ChartPoint[];
}

export interface EventTrendPanelProps {
    locale: string;
    monthlyData: MonthPoint[];
    hourlyTemplate: HourTemplatePoint[];
    t: TFunction;
}

export interface DeviceStatus {
    online: number;
    offline: number;
    total: number;
}

export interface Reactions {
    likes: number;
    dislikes: number;
    neutral: number;
}

export interface EventByMonth {
    month: string;
    events: number;
}

export interface EventByHour {
    hour: string;
    events: number;
}

export interface EventTypeBreakdown {
    type: string;
    count: number;
    color: string;
}

export interface TopCamera {
    id: string;
    location: string;
    events: number;
    status: 'online' | 'offline';
}

export interface ComparisonPair {
    today?: number;
    yesterday?: number;
    thisWeek?: number;
    lastWeek?: number;
    thisMonth?: number;
    lastMonth?: number;
    percentChange: number;
}

export interface ComparisonMetrics {
    todayVsYesterday: ComparisonPair;
    weekVsLastWeek: ComparisonPair;
    monthVsLastMonth: ComparisonPair;
}

export interface RecentEvent {
    time: string;
    event: string;
    location: string;
    camera: string;
    severity: 'low' | 'medium' | 'high';
}

export interface LocationEventCount {
    location: string;
    events: number;
}

export interface DashboardSummary {
    totalEvents: number;
    todayEvents: number;
    thisWeekEvents: number;
    thisMonthEvents: number;
    yesterdayEvents: number;
    lastWeekEvents: number;
    totalLikes: number;
    totalDislikes: number;
    totalNeutral: number;
    aiInsight: string;
}

export interface DashboardData {
    summary: DashboardSummary;
    deviceStatus: DeviceStatus;
    reactions: Reactions;
    eventsByMonth: EventByMonth[];
    eventsByHour: EventByHour[];
    eventTypeBreakdown: EventTypeBreakdown[];
    topCameras: TopCamera[];
    comparisonMetrics: ComparisonMetrics;
    recentEvents: RecentEvent[];
    locationEventCount: LocationEventCount[];
}

export interface UserRoleBreakdown {
    role: string;
    count: number;
    color: string;
}

export interface LoginActivityPoint {
    date: string;
    logins: number;
}

export interface UsersTabData {
    totalUsers: number;
    activeUsers: number;
    pendingApprovals: number;
    suspendedUsers: number;
    newThisMonth: number;
    activeThisMonth: number;
    pendingToday: number;
    roleBreakdown: UserRoleBreakdown[];
    loginActivity: LoginActivityPoint[];
}

export interface EventSeverityBreakdown {
    severity: 'low' | 'medium' | 'high';
    count: number;
    color: string;
}

export interface EventsTabData {
    totalEvents: number;
    resolvedEvents: number;
    pendingEvents: number;
    criticalEvents: number;
    avgResolutionMins: number;
    severityBreakdown: EventSeverityBreakdown[];
    recentEvents: RecentEvent[];
    topLocations: LocationEventCount[];
}

export interface CameraHealthPoint {
    date: string;
    online: number;
    offline: number;
}

export interface CamerasTabData {
    totalCameras: number;
    onlineCameras: number;
    offlineCameras: number;
    maintenanceDue: number;
    avgUptimePct: number;
    topCameras: TopCamera[];
    healthTrend: CameraHealthPoint[];
    locationCoverage: LocationEventCount[];
}