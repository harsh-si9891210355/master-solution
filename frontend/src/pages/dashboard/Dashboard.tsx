import { type ReactNode, useEffect, useMemo, useState } from 'react';
import {
    Bar, BarChart, CartesianGrid, Cell,
    Pie, PieChart, ResponsiveContainer,
    Tooltip, XAxis, YAxis,
} from 'recharts';

import { useNsTranslation } from '@/hooks/Usetranslation';
import { EventTrendPanel } from '@/pages/dashboard/EventTrendPanel';
import { UsersTab, UsersKpis, UsersLogin, UsersRole } from '@/pages/dashboard/UsersTab';
import { EventsTab, EventsKpis, EventsRecent } from '@/pages/dashboard/EventsTab';
import { CamerasTab, CamerasKpis, CamerasTrend, CamerasHub } from '@/pages/dashboard/CamersTab';
import type {
    DashboardWidget,
    DashboardWidgetId,
    DashboardTab,
    DateFilterBarProps,
    DateRange,
    Preset,
    TFunction,
} from '@/pages/dashboard/types';

import data from './dashboardData.json';
import '../../assets/Style/dashboard.css';

// ── Constants ─────────────────────────────────────────────────────────────────
const DAY_MS = 86_400_000;
const STORAGE_KEY_PREFIX = 'master-solution-dashboard-layout-v2';
const MONTH_KEYS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'] as const;
const PRESETS: Preset[] = ['today', 'yesterday', '7d', '30d', '90d', 'custom'];

const EVENTS_WIDGET_IDS: DashboardWidgetId[] = [
    'kpis', 'comparisons', 'monthly_trend', 'peak_hours', 'event_types', 'events_recent',
];
const CAMERAS_WIDGET_IDS: DashboardWidgetId[] = [
    'cameras_kpis', 'cameras_trend', 'cameras_hub', 'top_cameras', 'status_reactions',
];
const USERS_WIDGET_IDS: DashboardWidgetId[] = [
    'users_kpis', 'users_login', 'users_role',
];

const EVENT_TYPE_KEY_MAP: Record<string, string> = {
    'Motion Detected': 'motion_detected',
    'Intrusion Alert': 'intrusion_alert',
    'Face Recognized': 'face_recognized',
    'Vehicle Detected': 'vehicle_detected',
    'Loitering': 'loitering',
    'PPE Violation': 'ppe_violation',
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const toYMD = (date: Date) => date.toISOString().slice(0, 10);
const daysBetween = (from: string, to: string) =>
    Math.round((new Date(to).getTime() - new Date(from).getTime()) / DAY_MS) + 1;
const scale = (value: number, days: number) =>
    Math.round((value / 31) * Math.min(days, 31));
const normalizeLocale = (language: string) =>
    language?.slice(0, 2) === 'es' ? 'es-ES' : 'en-US';

const getPresetRange = (preset: Preset): DateRange => {
    const now = new Date();
    const today = toYMD(now);
    const minus = (days: number) => toYMD(new Date(now.getTime() - days * DAY_MS));
    switch (preset) {
        case 'today': return { from: today, to: today };
        case 'yesterday': return { from: minus(1), to: minus(1) };
        case '7d': return { from: minus(6), to: today };
        case '30d': return { from: minus(29), to: today };
        case '90d': return { from: minus(89), to: today };
        default: return { from: minus(29), to: today };
    }
};

const isValidWidgetOrder = (value: unknown, expected: DashboardWidgetId[]): value is DashboardWidgetId[] => {
    if (!Array.isArray(value) || value.length !== expected.length) return false;
    const expectedSet = new Set(expected);
    return value.every(item => typeof item === 'string' && expectedSet.has(item as DashboardWidgetId));
};

// ── Sub-components ────────────────────────────────────────────────────────────
function AnimatedNumber({ locale, target }: { locale: string; target: number }) {
    const [value, setValue] = useState(0);
    useEffect(() => {
        let next = 0;
        const step = Math.max(target / 40, 1);
        const interval = window.setInterval(() => {
            next += step;
            if (next >= target) { setValue(target); window.clearInterval(interval); }
            else { setValue(Math.floor(next)); }
        }, 30);
        return () => window.clearInterval(interval);
    }, [target]);
    return <>{value.toLocaleString(locale)}</>;
}

function TypedText({ text }: { text: string }) {
    const [displayed, setDisplayed] = useState('');
    useEffect(() => {
        setDisplayed('');
        let index = 0;
        const interval = window.setInterval(() => {
            setDisplayed(text.slice(0, index) + (index < text.length ? '|' : ''));
            index += 1;
            if (index > text.length) window.clearInterval(interval);
        }, 18);
        return () => window.clearInterval(interval);
    }, [text]);
    return <>{displayed}</>;
}

const CustomTooltip = ({ active, payload, label, locale }: {
    active?: boolean; payload?: Array<{ value: number }>; label?: string; locale: string;
}) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="db-tooltip">
            <p className="db-tooltip-label">{label}</p>
            <p className="db-tooltip-val">{Number(payload[0].value).toLocaleString(locale)}</p>
        </div>
    );
};

function DateFilterBar({ locale, preset, range, onPreset, onRange, t }: DateFilterBarProps) {
    const formatDate = (value: string) =>
        new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short', year: 'numeric' })
            .format(new Date(`${value}T00:00:00`));

    return (
        <div className="db-filter-bar">
            <div className="db-filter-presets">
                {PRESETS.map(presetKey => (
                    <button
                        key={presetKey}
                        className={`db-filter-pill${preset === presetKey ? ' active' : ''}`}
                        onClick={() => onPreset(presetKey)}
                        type="button"
                    >
                        {t(`presets.${presetKey}`)}
                    </button>
                ))}
            </div>
            <div className={`db-filter-inputs${preset === 'custom' ? ' is-custom' : ''}`}>
                <div className="db-filter-input-wrap">
                    <span className="db-filter-input-label">{t('filters.from')}</span>
                    <input type="date" className="db-filter-date" value={range.from} max={range.to}
                        onChange={e => { onRange({ ...range, from: e.target.value }); onPreset('custom'); }} />
                </div>
                <span className="db-filter-arrow">{t('filters.arrow')}</span>
                <div className="db-filter-input-wrap">
                    <span className="db-filter-input-label">{t('filters.to')}</span>
                    <input type="date" className="db-filter-date" value={range.to} min={range.from} max={toYMD(new Date())}
                        onChange={e => { onRange({ ...range, to: e.target.value }); onPreset('custom'); }} />
                </div>
            </div>
            <div className="db-filter-badge">
                <span className="db-filter-badge-icon">{t('filters.badge_icon')}</span>
                {t('filters.range_summary', { from: formatDate(range.from), to: formatDate(range.to) })}
                <span className="db-filter-badge-days">
                    {t('filters.days_short', { count: daysBetween(range.from, range.to) })}
                </span>
            </div>
        </div>
    );
}

// ── Tab bar ───────────────────────────────────────────────────────────────────
const TABS: { id: DashboardTab; icon: string; labelKey: string }[] = [
    { id: 'events', icon: '🔔', labelKey: 'tabs.events' },
    { id: 'cameras', icon: '📹', labelKey: 'tabs.cameras' },
    { id: 'users', icon: '👥', labelKey: 'tabs.users' },
];

function TabBar({ active, onChange, t }: {
    active: DashboardTab;
    onChange: (tab: DashboardTab) => void;
    t: TFunction;
}) {
    return (
        <div className="db-tab-bar">
            {TABS.map(tab => (
                <button
                    key={tab.id}
                    type="button"
                    className={`db-tab-btn${active === tab.id ? ' db-tab-btn--active' : ''}`}
                    onClick={() => onChange(tab.id)}
                >
                    <span className="db-tab-icon">{tab.icon}</span>
                    <span>{t(tab.labelKey)}</span>
                </button>
            ))}
        </div>
    );
}

// ── Draggable widget grid ─────────────────────────────────────────────────────
interface WidgetGridProps {
    widgets: DashboardWidget[];
    isEditMode: boolean;
    draggedId: DashboardWidgetId | null;
    onDragStart: (id: DashboardWidgetId) => void;
    onDrop: (sourceId: string, targetId: DashboardWidgetId) => void;
    onDragEnd: () => void;
    t: TFunction;
}

function WidgetGrid({ widgets, isEditMode, draggedId, onDragStart, onDrop, onDragEnd, t }: WidgetGridProps) {
    return (
        <div className={`db-widget-grid ${isEditMode ? 'is-editing' : ''}`}>
            {widgets.map(widget => (
                <section
                    key={widget.id}
                    className={`db-widget-shell db-widget-shell--${widget.span}${draggedId === widget.id ? ' is-dragging' : ''}`}
                    draggable={isEditMode}
                    onDragStart={e => {
                        if (!isEditMode) return;
                        onDragStart(widget.id);
                        e.dataTransfer.effectAllowed = 'move';
                        e.dataTransfer.setData('text/plain', widget.id);
                    }}
                    onDragOver={e => {
                        if (!isEditMode || !draggedId || draggedId === widget.id) return;
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                    }}
                    onDrop={e => {
                        if (!isEditMode) return;
                        e.preventDefault();
                        onDrop(e.dataTransfer.getData('text/plain'), widget.id);
                        onDragEnd();
                    }}
                    onDragEnd={onDragEnd}
                >
                    {isEditMode && (
                        <div className="db-widget-editor">
                            <div className="db-widget-editor__handle">
                                <span className="db-widget-editor__grip" aria-hidden="true">⋮⋮</span>
                                <span>{widget.title}</span>
                            </div>
                            <span className="db-widget-editor__hint">{t('layout.drag_label')}</span>
                        </div>
                    )}
                    {widget.content}
                </section>
            ))}
        </div>
    );
}

// ── Layout controls ───────────────────────────────────────────────────────────
function LayoutControls({ isEditMode, hasUnsaved, onToggle, onSave, onReset, t }: {
    isEditMode: boolean;
    hasUnsaved: boolean;
    onToggle: () => void;
    onSave: () => void;
    onReset: () => void;
    t: TFunction;
}) {
    return (
        <div className="db-layout-actions">
            <button type="button" className={`db-layout-btn ${isEditMode ? 'is-active' : ''}`} onClick={onToggle}>
                {isEditMode ? t('layout.done') : t('layout.customize')}
            </button>
            <button type="button" className="db-layout-btn db-layout-btn--secondary"
                onClick={onSave} disabled={!hasUnsaved}>
                {t('layout.save')}
            </button>
            <button type="button" className="db-layout-btn db-layout-btn--ghost" onClick={onReset}>
                {t('layout.reset')}
            </button>
        </div>
    );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export const Dashboard = () => {
    const { t, i18n } = useNsTranslation('dashboard');
    const locale = normalizeLocale(i18n.language);

    const [activeTab, setActiveTab] = useState<DashboardTab>('events');
    const [preset, setPreset] = useState<Preset>('30d');
    const [range, setRange] = useState<DateRange>(getPresetRange('30d'));
    const [isEditMode, setIsEditMode] = useState(false);
    const [draggedWidgetId, setDraggedWidgetId] = useState<DashboardWidgetId | null>(null);
    const [hasUnsavedLayout, setHasUnsavedLayout] = useState(false);

    const [eventsWidgetOrder, setEventsWidgetOrder] = useState<DashboardWidgetId[]>(EVENTS_WIDGET_IDS);
    const [camerasWidgetOrder, setCamerasWidgetOrder] = useState<DashboardWidgetId[]>(CAMERAS_WIDGET_IDS);
    const [usersWidgetOrder, setUsersWidgetOrder] = useState<DashboardWidgetId[]>(USERS_WIDGET_IDS);

    useEffect(() => {
        try {
            const savedEvents = window.localStorage.getItem(`${STORAGE_KEY_PREFIX}-events`);
            if (savedEvents) {
                const parsed = JSON.parse(savedEvents);
                if (isValidWidgetOrder(parsed, EVENTS_WIDGET_IDS)) setEventsWidgetOrder(parsed);
            }
            const savedCameras = window.localStorage.getItem(`${STORAGE_KEY_PREFIX}-cameras`);
            if (savedCameras) {
                const parsed = JSON.parse(savedCameras);
                if (isValidWidgetOrder(parsed, CAMERAS_WIDGET_IDS)) setCamerasWidgetOrder(parsed);
            }
            const savedUsers = window.localStorage.getItem(`${STORAGE_KEY_PREFIX}-users`);
            if (savedUsers) {
                const parsed = JSON.parse(savedUsers);
                if (isValidWidgetOrder(parsed, USERS_WIDGET_IDS)) setUsersWidgetOrder(parsed);
            }
        } catch {
            // ignore corrupt storage
        }
    }, []);

    const handlePreset = (nextPreset: Preset) => {
        setPreset(nextPreset);
        if (nextPreset !== 'custom') setRange(getPresetRange(nextPreset));
    };

    // Layout controls shown on all tabs since they all have draggable widgets now
    const tabHasWidgets = true;

    const currentOrder = activeTab === 'events' ? eventsWidgetOrder : activeTab === 'cameras' ? camerasWidgetOrder : usersWidgetOrder;

    const saveLayout = () => {
        const key = `${STORAGE_KEY_PREFIX}-${activeTab}`;
        window.localStorage.setItem(key, JSON.stringify(currentOrder));
        setHasUnsavedLayout(false);
        setIsEditMode(false);
    };

    const resetLayout = () => {
        const defaults = activeTab === 'events' ? EVENTS_WIDGET_IDS : activeTab === 'cameras' ? CAMERAS_WIDGET_IDS : USERS_WIDGET_IDS;
        if (activeTab === 'events') setEventsWidgetOrder(defaults);
        else if (activeTab === 'cameras') setCamerasWidgetOrder(defaults);
        else setUsersWidgetOrder(defaults);
        window.localStorage.removeItem(`${STORAGE_KEY_PREFIX}-${activeTab}`);
        setHasUnsavedLayout(false);
        setDraggedWidgetId(null);
    };

    const moveWidget = (sourceId: DashboardWidgetId, targetId: DashboardWidgetId) => {
        if (sourceId === targetId) return;
        const setter = activeTab === 'events' ? setEventsWidgetOrder : activeTab === 'cameras' ? setCamerasWidgetOrder : setUsersWidgetOrder;
        setter(curr => {
            const next = [...curr];
            const srcIdx = next.indexOf(sourceId);
            const tgtIdx = next.indexOf(targetId);
            if (srcIdx === -1 || tgtIdx === -1) return curr;
            const [moved] = next.splice(srcIdx, 1);
            next.splice(tgtIdx, 0, moved);

            // Persist directly to localStorage on customization!
            const key = `${STORAGE_KEY_PREFIX}-${activeTab}`;
            window.localStorage.setItem(key, JSON.stringify(next));

            return next;
        });
    };

    const formatNumber = (value: number) => value.toLocaleString(locale);
    const formatDate = (value: string) =>
        new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short', year: 'numeric' })
            .format(new Date(`${value}T00:00:00`));
    const formatPercent = (value: number) =>
        new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 0 }).format(value / 100);

    const localizeEventType = (type: string) => {
        const key = EVENT_TYPE_KEY_MAP[type];
        return key ? t(`event_types.${key}`) : type;
    };

    const localizeMonth = (month: string) => {
        const idx = MONTH_KEYS.findIndex(k => k === month.toLowerCase());
        if (idx === -1) return month;
        return new Intl.DateTimeFormat(locale, { month: 'short' }).format(new Date(Date.UTC(2026, idx, 1)));
    };

    const days = daysBetween(range.from, range.to);
    const reactions = data.reactions;
    const totalReactions = reactions.likes + reactions.dislikes + reactions.neutral;

    const scaled = useMemo(() => {
        const s = (v: number) => scale(v, days);
        return {
            totalEvents: s(data.summary.totalEvents),
            thisWeekEvents: s(data.summary.thisWeekEvents),
            thisMonthEvents: s(data.summary.thisMonthEvents),
            dailyAvg: Math.round(s(data.summary.totalEvents) / Math.max(days, 1)),
            cmpCur: s(data.comparisonMetrics.todayVsYesterday.today ?? 0),
            cmpPrev: s(data.comparisonMetrics.todayVsYesterday.yesterday ?? 0),
            weekCur: s(data.comparisonMetrics.weekVsLastWeek.thisWeek ?? 0),
            weekPrev: s(data.comparisonMetrics.weekVsLastWeek.lastWeek ?? 0),
            monthCur: s(data.comparisonMetrics.monthVsLastMonth.thisMonth ?? 0),
            monthPrev: s(data.comparisonMetrics.monthVsLastMonth.lastMonth ?? 0),
            eventsByMonth: data.eventsByMonth.map((item, index) => ({
                ...item, label: localizeMonth(item.month),
                monthIndex: index, monthKey: item.month, events: s(item.events),
            })),
            eventsByHour: data.eventsByHour.map(item => ({ ...item, events: s(item.events) })),
            eventTypeBreakdown: data.eventTypeBreakdown.map(item => ({ ...item, label: localizeEventType(item.type), count: s(item.count) })),
            topCameras: data.topCameras.map(item => ({ ...item, events: s(item.events) })),
        };
    }, [days, locale, t]);

    const totalTypes = scaled.eventTypeBreakdown.reduce((sum, item) => sum + item.count, 0);
    const totalTopFive = scaled.topCameras.reduce((sum, item) => sum + item.events, 0);
    const maxCam = scaled.topCameras[0]?.events || 1;
    const onlineRatio = data.deviceStatus.total > 0
        ? Math.round((data.deviceStatus.online / data.deviceStatus.total) * 100) : 0;

    const percentDelta = (cur: number, prev: number) =>
        prev === 0 ? 0 : Math.abs(Math.round(((cur - prev) / prev) * 100));

    const barColors = data.eventsByHour.map((_, i) =>
        (i >= 8 && i <= 10) || (i >= 17 && i <= 19) ? '#F59E0B' : '#3B82F6'
    );

    const comparisonItems = [
        { label: t('comparison.period_activity'), current: scaled.cmpCur, previous: scaled.cmpPrev, percent: percentDelta(scaled.cmpCur, scaled.cmpPrev), currentLabel: t('comparison.this_period'), previousLabel: t('comparison.prior_period'), accent: '#3B82F6' },
        { label: t('comparison.weekly_activity'), current: scaled.weekCur, previous: scaled.weekPrev, percent: percentDelta(scaled.weekCur, scaled.weekPrev), currentLabel: t('comparison.this_week'), previousLabel: t('comparison.last_week'), accent: '#10B981' },
        { label: t('comparison.monthly_activity'), current: scaled.monthCur, previous: scaled.monthPrev, percent: percentDelta(scaled.monthCur, scaled.monthPrev), currentLabel: t('comparison.this_month'), previousLabel: t('comparison.last_month'), accent: '#8B5CF6' },
    ];

    const kpiCards = [
        { label: t('kpis.total_events'), value: scaled.totalEvents, sub: t('kpis.selected_days', { count: days }), accent: '#F59E0B' },
        { label: t('kpis.daily_avg'), value: scaled.dailyAvg, sub: t('kpis.events_per_day'), accent: '#3B82F6' },
        { label: t('kpis.this_week'), value: scaled.thisWeekEvents, sub: t('kpis.vs_last_week', { percent: formatPercent(percentDelta(scaled.weekCur, scaled.weekPrev)) }), accent: '#10B981' },
        { label: t('kpis.this_month'), value: scaled.thisMonthEvents, sub: t('kpis.vs_last_month', { percent: formatPercent(percentDelta(scaled.monthCur, scaled.monthPrev)) }), accent: '#8B5CF6' },
    ];

    const aiInsightText = t('ai_banner.message', {
        count: days, from: formatDate(range.from), to: formatDate(range.to), insight: data.summary.aiInsight,
    });

    // ── Widget definitions ────────────────────────────────────────────────────
    const widgetsById: Record<DashboardWidgetId, DashboardWidget> = {
        kpis: {
            id: 'kpis', title: t('widgets.kpis'), span: 'full',
            content: (
                <div className="db-grid-4 db-grid-4--compact">
                    {kpiCards.map(card => (
                        <div key={card.label} className="db-kpi-card" style={{ border: `1px solid ${card.accent}22` }}>
                            <div className="db-kpi-orb" style={{ background: `${card.accent}18` }} />
                            <p className="db-kpi-label">{card.label}</p>
                            <p className="db-kpi-value"><AnimatedNumber locale={locale} target={card.value} /></p>
                            <p className="db-kpi-sub" style={{ color: card.accent }}>{card.sub}</p>
                        </div>
                    ))}
                </div>
            ),
        },
        comparisons: {
            id: 'comparisons', title: t('widgets.comparisons'), span: 'full',
            content: (
                <div className="db-grid-3 db-grid-3--compact">
                    {comparisonItems.map(item => {
                        const ratio = item.current === 0 ? 0 : Math.round((item.previous / item.current) * 100);
                        const isUp = item.current >= item.previous;
                        return (
                            <div key={item.label} className="db-cmp-card" style={{ border: `1px solid ${item.accent}22` }}>
                                <div className="db-cmp-accent-bar" style={{ background: item.accent }} />
                                <p className="db-cmp-title">{item.label}</p>
                                <p className="db-cmp-period-label">{item.currentLabel}</p>
                                <div className="db-cmp-cur-row">
                                    <span className="db-cmp-cur-val">{formatNumber(item.current)}</span>
                                    <span className={`db-cmp-pct-badge ${isUp ? 'up' : 'down'}`}>
                                        {isUp ? t('comparison.up_arrow') : t('comparison.down_arrow')} {formatPercent(item.percent)}
                                    </span>
                                </div>
                                <div className="db-cmp-bars">
                                    <div className="db-cmp-bar-row">
                                        <span className="db-cmp-bar-period">{item.currentLabel}</span>
                                        <div className="db-cmp-bar-track"><div className="db-cmp-bar-fill current" style={{ background: item.accent }} /></div>
                                        <span className="db-cmp-bar-num bright">{formatNumber(item.current)}</span>
                                    </div>
                                    <div className="db-cmp-bar-row">
                                        <span className="db-cmp-bar-period dim">{item.previousLabel}</span>
                                        <div className="db-cmp-bar-track"><div className="db-cmp-bar-fill previous" style={{ width: `${ratio}%` }} /></div>
                                        <span className="db-cmp-bar-num dim">{formatNumber(item.previous)}</span>
                                    </div>
                                </div>
                                <p className="db-cmp-diff">{t('comparison.diff_vs_period', { direction: isUp ? '+' : '-', amount: formatNumber(Math.abs(item.current - item.previous)), period: item.previousLabel.toLowerCase() })}</p>
                            </div>
                        );
                    })}
                </div>
            ),
        },
        monthly_trend: {
            id: 'monthly_trend', title: t('widgets.monthly_trend'), span: 'full',
            content: <EventTrendPanel locale={locale} monthlyData={scaled.eventsByMonth} hourlyTemplate={data.eventsByHour} t={t} />,
        },
        peak_hours: {
            id: 'peak_hours', title: t('widgets.peak_hours'), span: 'half',
            content: (
                <div className="db-panel db-widget-panel">
                    <p className="db-panel-title">{t('panels.peak_hours.title')}</p>
                    <p className="db-panel-sub">{t('panels.peak_hours.subtitle')}</p>
                    <ResponsiveContainer width="100%" height={180}>
                        <BarChart data={scaled.eventsByHour} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                            <XAxis dataKey="hour" tick={{ fill: '#64748B', fontSize: 9 }} axisLine={false} tickLine={false}
                                tickFormatter={v => parseInt(v, 10) % 6 === 0 ? `${v}${t('panels.peak_hours.hour_suffix')}` : ''} />
                            <YAxis tick={{ fill: '#64748B', fontSize: 10 }} axisLine={false} tickLine={false} />
                            <Tooltip content={<CustomTooltip locale={locale} />} />
                            <Bar dataKey="events" radius={[3, 3, 0, 0]}>
                                {scaled.eventsByHour.map((_, i) => <Cell key={i} fill={barColors[i]} />)}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                    <div className="db-legend">
                        {[{ color: '#F59E0B', label: t('panels.peak_hours.legend_peak') }, { color: '#1E3A5F', label: t('panels.peak_hours.legend_normal') }].map(item => (
                            <div key={item.label} className="db-legend-item">
                                <span className="db-legend-dot" style={{ background: item.color }} />{item.label}
                            </div>
                        ))}
                    </div>
                </div>
            ),
        },
        event_types: {
            id: 'event_types', title: t('widgets.event_types'), span: 'half',
            content: (
                <div className="db-panel db-widget-panel">
                    <p className="db-panel-title">{t('panels.event_types.title')}</p>
                    <p className="db-panel-sub">{t('panels.event_types.subtitle')}</p>
                    <div className="db-donut-wrap">
                        <ResponsiveContainer width="45%" height={160}>
                            <PieChart>
                                <Pie data={scaled.eventTypeBreakdown} dataKey="count" cx="50%" cy="50%" innerRadius={48} outerRadius={72} paddingAngle={3}>
                                    {scaled.eventTypeBreakdown.map((item, i) => <Cell key={i} fill={item.color} />)}
                                </Pie>
                                <Tooltip formatter={(v) => typeof v === 'number' ? formatNumber(v) : String(v ?? '')} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="db-donut-legend">
                            {scaled.eventTypeBreakdown.map(item => (
                                <div key={item.type} className="db-donut-row">
                                    <span className="db-donut-dot" style={{ background: item.color }} />
                                    <span className="db-donut-label">{item.label}</span>
                                    <span className="db-donut-pct">{totalTypes > 0 ? formatPercent(Math.round((item.count / totalTypes) * 100)) : formatPercent(0)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ),
        },
        top_cameras: {
            id: 'top_cameras', title: t('widgets.top_cameras'), span: 'half',
            content: (
                <div className="db-panel db-widget-panel">
                    <p className="db-panel-title">Camera Health Matrix (Quick View)</p>
                    <p className="db-panel-sub">Real-time status grid for all 194 cameras. Hover for quick details.</p>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(13px, 1fr))',
                        gap: 5,
                        maxHeight: 180,
                        overflowY: 'auto',
                        paddingRight: 4,
                        background: 'rgba(0,0,0,0.2)',
                        padding: 12,
                        borderRadius: 8,
                        boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.5)'
                    }}>
                        {Array.from({ length: 194 }).map((_, i) => {
                            const id = i + 1;
                            let status: 'online' | 'offline' | 'maintenance' = 'offline';
                            if (id <= 5) status = 'online';
                            else if (id <= 28) status = 'maintenance';

                            const color = status === 'online' ? '#10b981' : status === 'offline' ? '#ef4444' : '#f59e0b';
                            const camId = `CAM-${String(id).padStart(3, '0')}`;
                            return (
                                <div
                                    key={i}
                                    style={{
                                        aspectRatio: '1',
                                        borderRadius: 3,
                                        background: color,
                                        cursor: 'pointer',
                                        boxShadow: `0 0 3px ${color}44`,
                                        opacity: status === 'online' ? 1 : 0.75,
                                        transition: 'all 0.15s ease'
                                    }}
                                    title={`${camId} (${status.toUpperCase()})`}
                                />
                            );
                        })}
                    </div>
                    <div style={{ display: 'flex', gap: 12, marginTop: 12, fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981' }} /> Online (5)
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 6px #ef4444' }} /> Offline (166)
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b', boxShadow: '0 0 6px #f59e0b' }} /> Maint (23)
                        </div>
                    </div>
                </div>
            ),
        },
        status_reactions: {
            id: 'status_reactions', title: t('widgets.status_reactions'), span: 'half',
            content: (
                <div className="db-panel db-widget-panel">
                    <p className="db-panel-title">{t('status.title')}</p>
                    <p className="db-panel-sub">{t('status.total_devices', { count: data.deviceStatus.total })}</p>
                    <div className="db-status-card online"><div className="db-status-icon online">{t('status.online_icon')}</div><div><p className="db-status-num online">{formatNumber(data.deviceStatus.online)}</p><p className="db-status-text">{t('status.online')}</p></div></div>
                    <div className="db-status-card offline"><div className="db-status-icon offline">{t('status.offline_icon')}</div><div><p className="db-status-num offline">{formatNumber(data.deviceStatus.offline)}</p><p className="db-status-text">{t('status.offline')}</p></div></div>
                    <div className="db-ratio-section">
                        <div className="db-ratio-row"><span className="db-ratio-label">{t('status.online_ratio')}</span><span className="db-ratio-pct">{formatPercent(onlineRatio)}</span></div>
                        <div className="db-ratio-track"><div className="db-ratio-fill" style={{ width: `${onlineRatio}%` }} /></div>
                    </div>
                    <div className="db-reactions-section">
                        <p className="db-reactions-title">{t('reactions.title')}</p>
                        <p className="db-reactions-sub">{t('reactions.total_responses', { count: formatNumber(totalReactions) })}</p>
                        {[
                            { key: 'likes', icon: t('reactions.likes_icon'), num: reactions.likes, cls: 'likes' },
                            { key: 'dislikes', icon: t('reactions.dislikes_icon'), num: reactions.dislikes, cls: 'dislikes' },
                            { key: 'neutral', icon: t('reactions.neutral_icon'), num: reactions.neutral, cls: 'neutral' },
                        ].map(r => (
                            <div key={r.key} className={`db-reaction-card ${r.cls}`}>
                                <div className="db-reaction-icon">{r.icon}</div>
                                <div className="db-reaction-body">
                                    <p className={`db-reaction-num ${r.cls}`}>{formatNumber(r.num)}</p>
                                    <p className="db-reaction-label">{t(`reactions.${r.key}`)}</p>
                                </div>
                                <span className={`db-reaction-pct ${r.cls}-pct`}>{formatPercent(Math.round((r.num / totalReactions) * 100))}</span>
                            </div>
                        ))}
                        <div className="db-reaction-bar-track">
                            <div className="db-reaction-bar-seg likes-seg" style={{ width: `${Math.round((reactions.likes / totalReactions) * 100)}%` }} />
                            <div className="db-reaction-bar-seg neutral-seg" style={{ width: `${Math.round((reactions.neutral / totalReactions) * 100)}%` }} />
                            <div className="db-reaction-bar-seg dislikes-seg" style={{ width: `${Math.round((reactions.dislikes / totalReactions) * 100)}%` }} />
                        </div>
                    </div>
                </div>
            ),
        },
        // events_severity: {
        //     id: 'events_severity', title: 'Events Severity Breakdown', span: 'full',
        //     content: <EventsSeverity data={{ ...(data as any).eventsTab }} locale={locale} />
        // },
        events_recent: {
            id: 'events_recent', title: 'Recent Events Index', span: 'full',
            content: <EventsRecent data={{ ...(data as any).eventsTab, recentEvents: data.recentEvents }} locale={locale} />
        },
        cameras_kpis: {
            id: 'cameras_kpis', title: 'Cameras Operational Health KPIs', span: 'full',
            content: <CamerasKpis data={{ ...(data as any).camerasTab }} locale={locale} />
        },
        cameras_trend: {
            id: 'cameras_trend', title: 'Cameras Health Trend & Operations Center', span: 'full',
            content: <CamerasTrend data={{ ...(data as any).camerasTab }} locale={locale} />
        },
        cameras_hub: {
            id: 'cameras_hub', title: 'Cameras Location Health Ledger', span: 'full',
            content: <CamerasHub data={{ ...(data as any).camerasTab }} locale={locale} />
        },
        users_kpis: {
            id: 'users_kpis', title: 'Users Performance & Approval KPIs', span: 'full',
            content: <UsersKpis data={{ ...(data as any).usersTab }} locale={locale} />
        },
        users_login: {
            id: 'users_login', title: 'Users Active Session Traffic Chart', span: 'half',
            content: <UsersLogin data={{ ...(data as any).usersTab }} locale={locale} />
        },
        users_role: {
            id: 'users_role', title: 'Users Department Role Breakdown', span: 'half',
            content: <UsersRole data={{ ...(data as any).usersTab }} locale={locale} />
        },
    };

    const orderedEventsWidgets = eventsWidgetOrder.map(id => widgetsById[id]);
    const orderedCamerasWidgets = camerasWidgetOrder.map(id => widgetsById[id]);
    const orderedUsersWidgets = usersWidgetOrder.map(id => widgetsById[id]);

    return (
        <div className="db-page">
            <div className="db-header">
                <div className="db-header-top">
                    <div>
                        <h1>{t('title')}</h1>
                        <p>{t('subtitle')}</p>
                    </div>
                    {tabHasWidgets && (
                        <LayoutControls
                            isEditMode={isEditMode}
                            hasUnsaved={hasUnsavedLayout}
                            onToggle={() => { setIsEditMode(c => !c); setDraggedWidgetId(null); }}
                            onSave={saveLayout}
                            onReset={resetLayout}
                            t={t}
                        />
                    )}
                </div>

                {isEditMode && tabHasWidgets && (
                    <p className="db-layout-help">{t('layout.helper')}</p>
                )}

                <DateFilterBar
                    locale={locale} preset={preset} range={range}
                    onPreset={handlePreset}
                    onRange={nextRange => { setRange(nextRange); setPreset('custom'); }}
                    t={t}
                />
            </div>

            {/* ── AI Insight — pinned above tabs, visible on every tab ─────── */}
            <div className="db-ai-banner">
                <div className="db-ai-icon">{t('ai_banner.icon')}</div>
                <div>
                    <div className="db-ai-label-row">
                        <span className="db-ai-label">{t('ai_banner.label')}</span>
                        <span className="db-ai-badge">{t('ai_banner.badge')}</span>
                    </div>
                    <p className="db-ai-text"><TypedText text={aiInsightText} /></p>
                </div>
            </div>

            {/* ── Tab bar — below AI insight ───────────────────────────────── */}
            <TabBar
                active={activeTab}
                onChange={tab => { setActiveTab(tab); setIsEditMode(false); setDraggedWidgetId(null); }}
                t={t}
            />

            {/* ── Events tab ──────────────────────────────────────────────── */}
            {activeTab === 'events' && (
                <WidgetGrid
                    widgets={orderedEventsWidgets}
                    isEditMode={isEditMode}
                    draggedId={draggedWidgetId}
                    onDragStart={id => setDraggedWidgetId(id)}
                    onDrop={(src, tgt) => moveWidget(src as DashboardWidgetId, tgt)}
                    onDragEnd={() => setDraggedWidgetId(null)}
                    t={t}
                />
            )}

            {/* ── Cameras tab ─────────────────────────────────────────────── */}
            {activeTab === 'cameras' && (
                <WidgetGrid
                    widgets={orderedCamerasWidgets}
                    isEditMode={isEditMode}
                    draggedId={draggedWidgetId}
                    onDragStart={id => setDraggedWidgetId(id)}
                    onDrop={(src, tgt) => moveWidget(src as DashboardWidgetId, tgt)}
                    onDragEnd={() => setDraggedWidgetId(null)}
                    t={t}
                />
            )}

            {/* ── Users tab ───────────────────────────────────────────────── */}
            {activeTab === 'users' && (
                <WidgetGrid
                    widgets={orderedUsersWidgets}
                    isEditMode={isEditMode}
                    draggedId={draggedWidgetId}
                    onDragStart={id => setDraggedWidgetId(id)}
                    onDrop={(src, tgt) => moveWidget(src as DashboardWidgetId, tgt)}
                    onDragEnd={() => setDraggedWidgetId(null)}
                    t={t}
                />
            )}

            <div className="db-footer">{t('footer')}</div>
        </div>
    );
};

export default Dashboard;