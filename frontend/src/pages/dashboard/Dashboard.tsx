import { type ReactNode, useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { useNsTranslation } from "@/hooks/Usetranslation";
import { EventTrendPanel } from "@/pages/dashboard/EventTrendPanel";
import type { DashboardWidget, DashboardWidgetId, DateFilterBarProps, DateRange, Preset } from "@/pages/dashboard/types";

import data from "./dashboardData.json";
import "../../assets/Style/dashboard.css";

const DAY_MS = 86_400_000;
const DASHBOARD_LAYOUT_STORAGE_KEY = "master-solution-dashboard-layout-v1";
const MONTH_KEYS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"] as const;
const PRESETS: Preset[] = ["today", "yesterday", "7d", "30d", "90d", "custom"];
const DEFAULT_WIDGET_ORDER: DashboardWidgetId[] = [
    "ai_insight",
    "kpis",
    "comparisons",
    "monthly_trend",
    "peak_hours",
    "event_types",
    "top_cameras",
    "status_reactions",
];

const EVENT_TYPE_KEY_MAP: Record<string, string> = {
    "Motion Detected": "motion_detected",
    "Intrusion Alert": "intrusion_alert",
    "Face Recognized": "face_recognized",
    "Vehicle Detected": "vehicle_detected",
    Loitering: "loitering",
    "PPE Violation": "ppe_violation",
};

const toYMD = (date: Date) => date.toISOString().slice(0, 10);

const daysBetween = (from: string, to: string) =>
    Math.round((new Date(to).getTime() - new Date(from).getTime()) / DAY_MS) + 1;

const scale = (value: number, days: number) =>
    Math.round((value / 31) * Math.min(days, 31));

const getPresetRange = (preset: Preset): DateRange => {
    const now = new Date();
    const today = toYMD(now);
    const minus = (days: number) => toYMD(new Date(now.getTime() - days * DAY_MS));

    switch (preset) {
        case "today":
            return { from: today, to: today };
        case "yesterday":
            return { from: minus(1), to: minus(1) };
        case "7d":
            return { from: minus(6), to: today };
        case "30d":
            return { from: minus(29), to: today };
        case "90d":
            return { from: minus(89), to: today };
        default:
            return { from: minus(29), to: today };
    }
};

const normalizeLocale = (language: string) => {
    const lang = language?.slice(0, 2);
    return lang === "es" ? "es-ES" : "en-US";
};

const isValidWidgetOrder = (value: unknown): value is DashboardWidgetId[] => {
    if (!Array.isArray(value) || value.length !== DEFAULT_WIDGET_ORDER.length) {
        return false;
    }

    const expected = new Set(DEFAULT_WIDGET_ORDER);
    return value.every((item) => typeof item === "string" && expected.has(item as DashboardWidgetId));
};

function AnimatedNumber({ locale, target }: { locale: string; target: number }) {
    const [value, setValue] = useState(0);

    useEffect(() => {
        let nextValue = 0;
        const step = Math.max(target / 40, 1);
        const interval = window.setInterval(() => {
            nextValue += step;
            if (nextValue >= target) {
                setValue(target);
                window.clearInterval(interval);
            } else {
                setValue(Math.floor(nextValue));
            }
        }, 30);

        return () => window.clearInterval(interval);
    }, [target]);

    return <>{value.toLocaleString(locale)}</>;
}

function TypedText({ text }: { text: string }) {
    const [displayed, setDisplayed] = useState("");

    useEffect(() => {
        setDisplayed("");
        let index = 0;
        const interval = window.setInterval(() => {
            setDisplayed(text.slice(0, index) + (index < text.length ? "|" : ""));
            index += 1;
            if (index > text.length) {
                window.clearInterval(interval);
            }
        }, 18);

        return () => window.clearInterval(interval);
    }, [text]);

    return <>{displayed}</>;
}

const CustomTooltip = ({
    active,
    payload,
    label,
    locale,
}: {
    active?: boolean;
    payload?: Array<{ value: number }>;
    label?: string;
    locale: string;
}) => {
    if (!active || !payload?.length) {
        return null;
    }

    return (
        <div className="db-tooltip">
            <p className="db-tooltip-label">{label}</p>
            <p className="db-tooltip-val">{Number(payload[0].value).toLocaleString(locale)}</p>
        </div>
    );
};

function DateFilterBar({ locale, preset, range, onPreset, onRange, t }: DateFilterBarProps) {
    const formatDate = (value: string) =>
        new Intl.DateTimeFormat(locale, {
            day: "2-digit",
            month: "short",
            year: "numeric",
        }).format(new Date(`${value}T00:00:00`));

    return (
        <div className="db-filter-bar">
            <div className="db-filter-presets">
                {PRESETS.map((presetKey) => (
                    <button
                        key={presetKey}
                        className={`db-filter-pill${preset === presetKey ? " active" : ""}`}
                        onClick={() => onPreset(presetKey)}
                        type="button"
                    >
                        {t(`presets.${presetKey}`)}
                    </button>
                ))}
            </div>

            <div className={`db-filter-inputs${preset === "custom" ? " is-custom" : ""}`}>
                <div className="db-filter-input-wrap">
                    <span className="db-filter-input-label">{t("filters.from")}</span>
                    <input
                        type="date"
                        className="db-filter-date"
                        value={range.from}
                        max={range.to}
                        onChange={(event) => {
                            onRange({ ...range, from: event.target.value });
                            onPreset("custom");
                        }}
                    />
                </div>
                <span className="db-filter-arrow">{t("filters.arrow")}</span>
                <div className="db-filter-input-wrap">
                    <span className="db-filter-input-label">{t("filters.to")}</span>
                    <input
                        type="date"
                        className="db-filter-date"
                        value={range.to}
                        min={range.from}
                        max={toYMD(new Date())}
                        onChange={(event) => {
                            onRange({ ...range, to: event.target.value });
                            onPreset("custom");
                        }}
                    />
                </div>
            </div>

            <div className="db-filter-badge">
                <span className="db-filter-badge-icon">{t("filters.badge_icon")}</span>
                {t("filters.range_summary", {
                    from: formatDate(range.from),
                    to: formatDate(range.to),
                })}
                <span className="db-filter-badge-days">
                    {t("filters.days_short", { count: daysBetween(range.from, range.to) })}
                </span>
            </div>
        </div>
    );
}

export const Dashboard = () => {
    const { t, i18n } = useNsTranslation("dashboard");
    const locale = normalizeLocale(i18n.language);

    const [preset, setPreset] = useState<Preset>("30d");
    const [range, setRange] = useState<DateRange>(getPresetRange("30d"));
    const [isEditMode, setIsEditMode] = useState(false);
    const [draggedWidgetId, setDraggedWidgetId] = useState<DashboardWidgetId | null>(null);
    const [widgetOrder, setWidgetOrder] = useState<DashboardWidgetId[]>(DEFAULT_WIDGET_ORDER);
    const [hasUnsavedLayout, setHasUnsavedLayout] = useState(false);

    useEffect(() => {
        try {
            const savedLayout = window.localStorage.getItem(DASHBOARD_LAYOUT_STORAGE_KEY);
            if (!savedLayout) {
                return;
            }

            const parsed = JSON.parse(savedLayout);
            if (isValidWidgetOrder(parsed)) {
                setWidgetOrder(parsed);
            }
        } catch {
            window.localStorage.removeItem(DASHBOARD_LAYOUT_STORAGE_KEY);
        }
    }, []);

    const handlePreset = (nextPreset: Preset) => {
        setPreset(nextPreset);
        if (nextPreset !== "custom") {
            setRange(getPresetRange(nextPreset));
        }
    };

    const saveLayout = () => {
        window.localStorage.setItem(DASHBOARD_LAYOUT_STORAGE_KEY, JSON.stringify(widgetOrder));
        setHasUnsavedLayout(false);
        setIsEditMode(false);
    };

    const resetLayout = () => {
        setWidgetOrder(DEFAULT_WIDGET_ORDER);
        window.localStorage.removeItem(DASHBOARD_LAYOUT_STORAGE_KEY);
        setHasUnsavedLayout(false);
        setDraggedWidgetId(null);
    };

    const moveWidget = (sourceId: DashboardWidgetId, targetId: DashboardWidgetId) => {
        if (sourceId === targetId) {
            return;
        }

        setWidgetOrder((currentOrder) => {
            const nextOrder = [...currentOrder];
            const sourceIndex = nextOrder.indexOf(sourceId);
            const targetIndex = nextOrder.indexOf(targetId);

            if (sourceIndex === -1 || targetIndex === -1) {
                return currentOrder;
            }

            const [movedWidget] = nextOrder.splice(sourceIndex, 1);
            nextOrder.splice(targetIndex, 0, movedWidget);
            return nextOrder;
        });
        setHasUnsavedLayout(true);
    };

    const formatNumber = (value: number) => value.toLocaleString(locale);

    const formatDate = (value: string) =>
        new Intl.DateTimeFormat(locale, {
            day: "2-digit",
            month: "short",
            year: "numeric",
        }).format(new Date(`${value}T00:00:00`));

    const formatPercent = (value: number) =>
        new Intl.NumberFormat(locale, {
            style: "percent",
            maximumFractionDigits: 0,
        }).format(value / 100);

    const localizeEventType = (type: string) => {
        const key = EVENT_TYPE_KEY_MAP[type];
        return key ? t(`event_types.${key}`) : type;
    };

    const localizeMonth = (month: string) => {
        const monthIndex = MONTH_KEYS.findIndex((key) => key === month.toLowerCase());
        if (monthIndex === -1) {
            return month;
        }

        return new Intl.DateTimeFormat(locale, { month: "short" }).format(
            new Date(Date.UTC(2026, monthIndex, 1))
        );
    };

    const days = daysBetween(range.from, range.to);
    const reactions = data.reactions;
    const totalReactions = reactions.likes + reactions.dislikes + reactions.neutral;

    const scaled = useMemo(() => {
        const scaledValue = (value: number) => scale(value, days);

        return {
            totalEvents: scaledValue(data.summary.totalEvents),
            thisWeekEvents: scaledValue(data.summary.thisWeekEvents),
            thisMonthEvents: scaledValue(data.summary.thisMonthEvents),
            dailyAvg: Math.round(scaledValue(data.summary.totalEvents) / Math.max(days, 1)),
            cmpCur: scaledValue(data.comparisonMetrics.todayVsYesterday.today),
            cmpPrev: scaledValue(data.comparisonMetrics.todayVsYesterday.yesterday),
            weekCur: scaledValue(data.comparisonMetrics.weekVsLastWeek.thisWeek),
            weekPrev: scaledValue(data.comparisonMetrics.weekVsLastWeek.lastWeek),
            monthCur: scaledValue(data.comparisonMetrics.monthVsLastMonth.thisMonth),
            monthPrev: scaledValue(data.comparisonMetrics.monthVsLastMonth.lastMonth),
            eventsByMonth: data.eventsByMonth.map((item, index) => ({
                ...item,
                label: localizeMonth(item.month),
                monthIndex: index,
                monthKey: item.month,
                events: scaledValue(item.events),
            })),
            eventsByHour: data.eventsByHour.map((item) => ({
                ...item,
                events: scaledValue(item.events),
            })),
            eventTypeBreakdown: data.eventTypeBreakdown.map((item) => ({
                ...item,
                label: localizeEventType(item.type),
                count: scaledValue(item.count),
            })),
            topCameras: data.topCameras.map((item) => ({
                ...item,
                events: scaledValue(item.events),
            })),
        };
    }, [days, locale, t]);

    const totalTypes = scaled.eventTypeBreakdown.reduce((sum, item) => sum + item.count, 0);
    const totalTopFive = scaled.topCameras.reduce((sum, item) => sum + item.events, 0);
    const maxCam = scaled.topCameras[0]?.events || 1;
    const onlineRatio = data.deviceStatus.total > 0
        ? Math.round((data.deviceStatus.online / data.deviceStatus.total) * 100)
        : 0;

    const percentDelta = (current: number, previous: number) =>
        previous === 0 ? 0 : Math.abs(Math.round(((current - previous) / previous) * 100));

    const barColors = data.eventsByHour.map((_, index) =>
        (index >= 8 && index <= 10) || (index >= 17 && index <= 19) ? "#F59E0B" : "#1E3A5F"
    );

    const comparisonItems = [
        {
            label: t("comparison.period_activity"),
            current: scaled.cmpCur,
            previous: scaled.cmpPrev,
            percent: percentDelta(scaled.cmpCur, scaled.cmpPrev),
            currentLabel: t("comparison.this_period"),
            previousLabel: t("comparison.prior_period"),
            accent: "#3B82F6",
        },
        {
            label: t("comparison.weekly_activity"),
            current: scaled.weekCur,
            previous: scaled.weekPrev,
            percent: percentDelta(scaled.weekCur, scaled.weekPrev),
            currentLabel: t("comparison.this_week"),
            previousLabel: t("comparison.last_week"),
            accent: "#10B981",
        },
        {
            label: t("comparison.monthly_activity"),
            current: scaled.monthCur,
            previous: scaled.monthPrev,
            percent: percentDelta(scaled.monthCur, scaled.monthPrev),
            currentLabel: t("comparison.this_month"),
            previousLabel: t("comparison.last_month"),
            accent: "#8B5CF6",
        },
    ];

    const kpiCards = [
        {
            label: t("kpis.total_events"),
            value: scaled.totalEvents,
            sub: t("kpis.selected_days", { count: days }),
            accent: "#F59E0B",
        },
        {
            label: t("kpis.daily_avg"),
            value: scaled.dailyAvg,
            sub: t("kpis.events_per_day"),
            accent: "#3B82F6",
        },
        {
            label: t("kpis.this_week"),
            value: scaled.thisWeekEvents,
            sub: t("kpis.vs_last_week", { percent: formatPercent(percentDelta(scaled.weekCur, scaled.weekPrev)) }),
            accent: "#10B981",
        },
        {
            label: t("kpis.this_month"),
            value: scaled.thisMonthEvents,
            sub: t("kpis.vs_last_month", { percent: formatPercent(percentDelta(scaled.monthCur, scaled.monthPrev)) }),
            accent: "#8B5CF6",
        },
    ];

    const topCameraSummary = [
        {
            value: formatNumber(totalTopFive),
            label: t("top_cameras.summary.top_five_events"),
            color: "#F8FAFC",
        },
        {
            value: scaled.topCameras[0]?.id ?? "-",
            label: t("top_cameras.summary.most_active_camera"),
            color: "#F59E0B",
        },
        {
            value: t("top_cameras.summary.need_attention_value", {
                count: scaled.topCameras.filter((camera) => camera.status === "offline").length,
            }),
            label: t("top_cameras.summary.need_attention"),
            color: "#EF4444",
        },
    ];

    const aiInsightText = t("ai_banner.message", {
        count: days,
        from: formatDate(range.from),
        to: formatDate(range.to),
        insight: data.summary.aiInsight,
    });

    const widgetsById: Record<DashboardWidgetId, DashboardWidget> = {
        ai_insight: {
            id: "ai_insight",
            title: t("widgets.ai_insight"),
            span: "full",
            content: (
                <div className="db-ai-banner">
                    <div className="db-ai-icon">{t("ai_banner.icon")}</div>
                    <div>
                        <div className="db-ai-label-row">
                            <span className="db-ai-label">{t("ai_banner.label")}</span>
                            <span className="db-ai-badge">{t("ai_banner.badge")}</span>
                        </div>
                        <p className="db-ai-text">
                            <TypedText text={aiInsightText} />
                        </p>
                    </div>
                </div>
            ),
        },
        kpis: {
            id: "kpis",
            title: t("widgets.kpis"),
            span: "full",
            content: (
                <div className="db-grid-4 db-grid-4--compact">
                    {kpiCards.map((card) => (
                        <div key={card.label} className="db-kpi-card" style={{ border: `1px solid ${card.accent}22` }}>
                            <div className="db-kpi-orb" style={{ background: `${card.accent}18` }} />
                            <p className="db-kpi-label">{card.label}</p>
                            <p className="db-kpi-value">
                                <AnimatedNumber locale={locale} target={card.value} />
                            </p>
                            <p className="db-kpi-sub" style={{ color: card.accent }}>
                                {card.sub}
                            </p>
                        </div>
                    ))}
                </div>
            ),
        },
        comparisons: {
            id: "comparisons",
            title: t("widgets.comparisons"),
            span: "full",
            content: (
                <div className="db-grid-3 db-grid-3--compact">
                    {comparisonItems.map((item) => {
                        const ratio = item.current === 0 ? 0 : Math.round((item.previous / item.current) * 100);
                        const isUp = item.current >= item.previous;

                        return (
                            <div key={item.label} className="db-cmp-card" style={{ border: `1px solid ${item.accent}22` }}>
                                <div className="db-cmp-accent-bar" style={{ background: item.accent }} />
                                <p className="db-cmp-title">{item.label}</p>
                                <p className="db-cmp-period-label">{item.currentLabel}</p>
                                <div className="db-cmp-cur-row">
                                    <span className="db-cmp-cur-val">{formatNumber(item.current)}</span>
                                    <span className={`db-cmp-pct-badge ${isUp ? "up" : "down"}`}>
                                        {isUp ? t("comparison.up_arrow") : t("comparison.down_arrow")} {formatPercent(item.percent)}
                                    </span>
                                </div>
                                <div className="db-cmp-bars">
                                    <div className="db-cmp-bar-row">
                                        <span className="db-cmp-bar-period">{item.currentLabel}</span>
                                        <div className="db-cmp-bar-track">
                                            <div className="db-cmp-bar-fill current" style={{ background: item.accent }} />
                                        </div>
                                        <span className="db-cmp-bar-num bright">{formatNumber(item.current)}</span>
                                    </div>
                                    <div className="db-cmp-bar-row">
                                        <span className="db-cmp-bar-period dim">{item.previousLabel}</span>
                                        <div className="db-cmp-bar-track">
                                            <div className="db-cmp-bar-fill previous" style={{ width: `${ratio}%` }} />
                                        </div>
                                        <span className="db-cmp-bar-num dim">{formatNumber(item.previous)}</span>
                                    </div>
                                </div>
                                <p className="db-cmp-diff">
                                    {t("comparison.diff_vs_period", {
                                        direction: isUp ? "+" : "-",
                                        amount: formatNumber(Math.abs(item.current - item.previous)),
                                        period: item.previousLabel.toLowerCase(),
                                    })}
                                </p>
                            </div>
                        );
                    })}
                </div>
            ),
        },
        monthly_trend: {
            id: "monthly_trend",
            title: t("widgets.monthly_trend"),
            span: "full",
            content: (
                <EventTrendPanel
                    locale={locale}
                    monthlyData={scaled.eventsByMonth}
                    hourlyTemplate={data.eventsByHour}
                    t={t}
                />
            ),
        },
        peak_hours: {
            id: "peak_hours",
            title: t("widgets.peak_hours"),
            span: "half",
            content: (
                <div className="db-panel db-widget-panel">
                    <p className="db-panel-title">{t("panels.peak_hours.title")}</p>
                    <p className="db-panel-sub">{t("panels.peak_hours.subtitle")}</p>
                    <ResponsiveContainer width="100%" height={180}>
                        <BarChart data={scaled.eventsByHour} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                            <XAxis
                                dataKey="hour"
                                tick={{ fill: "#64748B", fontSize: 9 }}
                                axisLine={false}
                                tickLine={false}
                                tickFormatter={(value) => (parseInt(value, 10) % 6 === 0 ? `${value}${t("panels.peak_hours.hour_suffix")}` : "")}
                            />
                            <YAxis tick={{ fill: "#64748B", fontSize: 10 }} axisLine={false} tickLine={false} />
                            <Tooltip content={<CustomTooltip locale={locale} />} />
                            <Bar dataKey="events" radius={[3, 3, 0, 0]}>
                                {scaled.eventsByHour.map((_, index) => (
                                    <Cell key={index} fill={barColors[index]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                    <div className="db-legend">
                        {[
                            { color: "#F59E0B", label: t("panels.peak_hours.legend_peak") },
                            { color: "#1E3A5F", label: t("panels.peak_hours.legend_normal") },
                        ].map((item) => (
                            <div key={item.label} className="db-legend-item">
                                <span className="db-legend-dot" style={{ background: item.color }} />
                                {item.label}
                            </div>
                        ))}
                    </div>
                </div>
            ),
        },
        event_types: {
            id: "event_types",
            title: t("widgets.event_types"),
            span: "half",
            content: (
                <div className="db-panel db-widget-panel">
                    <p className="db-panel-title">{t("panels.event_types.title")}</p>
                    <p className="db-panel-sub">{t("panels.event_types.subtitle")}</p>
                    <div className="db-donut-wrap">
                        <ResponsiveContainer width="45%" height={160}>
                            <PieChart>
                                <Pie
                                    data={scaled.eventTypeBreakdown}
                                    dataKey="count"
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={48}
                                    outerRadius={72}
                                    paddingAngle={3}
                                >
                                    {scaled.eventTypeBreakdown.map((item, index) => (
                                        <Cell key={index} fill={item.color} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    formatter={(value) =>
                                        typeof value === "number" ? formatNumber(value) : String(value ?? "")
                                    }
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="db-donut-legend">
                            {scaled.eventTypeBreakdown.map((item) => (
                                <div key={item.type} className="db-donut-row">
                                    <span className="db-donut-dot" style={{ background: item.color }} />
                                    <span className="db-donut-label">{item.label}</span>
                                    <span className="db-donut-pct">
                                        {totalTypes > 0 ? formatPercent(Math.round((item.count / totalTypes) * 100)) : formatPercent(0)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ),
        },
        top_cameras: {
            id: "top_cameras",
            title: t("widgets.top_cameras"),
            span: "half",
            content: (
                <div className="db-panel db-widget-panel">
                    <p className="db-panel-title">{t("top_cameras.title")}</p>
                    <p className="db-panel-sub">{t("top_cameras.subtitle")}</p>
                    <div className="db-cam-summary-grid">
                        {topCameraSummary.map((item) => (
                            <div key={item.label} className="db-cam-summary-card">
                                <p className="db-cam-summary-val" style={{ color: item.color }}>
                                    {item.value}
                                </p>
                                <p className="db-cam-summary-label">{item.label}</p>
                            </div>
                        ))}
                    </div>
                    {scaled.topCameras.map((camera, index) => {
                        const isOffline = camera.status === "offline";
                        const isTop = index === 0;
                        const share = totalTopFive > 0 ? Math.round((camera.events / totalTopFive) * 100) : 0;
                        const barPct = Math.round((camera.events / maxCam) * 100);
                        const barColor = isOffline ? "#EF4444" : isTop ? "#F59E0B" : "#3B82F6";

                        return (
                            <div
                                key={camera.id}
                                className={`db-cam-row${isTop ? " is-top" : ""}${isOffline ? " is-offline" : ""}`}
                            >
                                <div className="db-cam-top-row">
                                    <div className="db-cam-left">
                                        <span className={`db-cam-rank${isTop ? " is-top" : ""}`}>#{index + 1}</span>
                                        <div>
                                            <p className="db-cam-id">
                                                {camera.id}
                                                {isTop && <span className="db-cam-top-badge">{t("top_cameras.top_badge")}</span>}
                                            </p>
                                            <p className="db-cam-location">
                                                {t("top_cameras.location_prefix")} {camera.location}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="db-cam-right">
                                        <span className={`db-cam-status ${camera.status}`}>
                                            {isOffline ? t("status.offline_indicator") : t("status.online_indicator")}
                                        </span>
                                        <div>
                                            <p className="db-cam-events-val">{formatNumber(camera.events)}</p>
                                            <p className="db-cam-events-label">{t("top_cameras.events_label")}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="db-cam-bar-row">
                                    <div className="db-cam-bar-track">
                                        <div className="db-cam-bar-fill" style={{ width: `${barPct}%`, background: barColor }} />
                                    </div>
                                    <span className="db-cam-share">{t("top_cameras.share_of_top_five", { percent: formatPercent(share) })}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ),
        },
        status_reactions: {
            id: "status_reactions",
            title: t("widgets.status_reactions"),
            span: "half",
            content: (
                <div className="db-panel db-widget-panel">
                    <p className="db-panel-title">{t("status.title")}</p>
                    <p className="db-panel-sub">{t("status.total_devices", { count: data.deviceStatus.total })}</p>

                    <div className="db-status-card online">
                        <div className="db-status-icon online">{t("status.online_icon")}</div>
                        <div>
                            <p className="db-status-num online">{formatNumber(data.deviceStatus.online)}</p>
                            <p className="db-status-text">{t("status.online")}</p>
                        </div>
                    </div>

                    <div className="db-status-card offline">
                        <div className="db-status-icon offline">{t("status.offline_icon")}</div>
                        <div>
                            <p className="db-status-num offline">{formatNumber(data.deviceStatus.offline)}</p>
                            <p className="db-status-text">{t("status.offline")}</p>
                        </div>
                    </div>

                    <div className="db-ratio-section">
                        <div className="db-ratio-row">
                            <span className="db-ratio-label">{t("status.online_ratio")}</span>
                            <span className="db-ratio-pct">{formatPercent(onlineRatio)}</span>
                        </div>
                        <div className="db-ratio-track">
                            <div className="db-ratio-fill" style={{ width: `${onlineRatio}%` }} />
                        </div>
                    </div>

                    <div className="db-reactions-section">
                        <p className="db-reactions-title">{t("reactions.title")}</p>
                        <p className="db-reactions-sub">{t("reactions.total_responses", { count: formatNumber(totalReactions) })}</p>

                        <div className="db-reaction-card likes">
                            <div className="db-reaction-icon">{t("reactions.likes_icon")}</div>
                            <div className="db-reaction-body">
                                <p className="db-reaction-num likes">{formatNumber(reactions.likes)}</p>
                                <p className="db-reaction-label">{t("reactions.likes")}</p>
                            </div>
                            <span className="db-reaction-pct likes-pct">
                                {formatPercent(Math.round((reactions.likes / totalReactions) * 100))}
                            </span>
                        </div>

                        <div className="db-reaction-card dislikes">
                            <div className="db-reaction-icon">{t("reactions.dislikes_icon")}</div>
                            <div className="db-reaction-body">
                                <p className="db-reaction-num dislikes">{formatNumber(reactions.dislikes)}</p>
                                <p className="db-reaction-label">{t("reactions.dislikes")}</p>
                            </div>
                            <span className="db-reaction-pct dislikes-pct">
                                {formatPercent(Math.round((reactions.dislikes / totalReactions) * 100))}
                            </span>
                        </div>

                        <div className="db-reaction-card neutral">
                            <div className="db-reaction-icon">{t("reactions.neutral_icon")}</div>
                            <div className="db-reaction-body">
                                <p className="db-reaction-num neutral">{formatNumber(reactions.neutral)}</p>
                                <p className="db-reaction-label">{t("reactions.neutral")}</p>
                            </div>
                            <span className="db-reaction-pct neutral-pct">
                                {formatPercent(Math.round((reactions.neutral / totalReactions) * 100))}
                            </span>
                        </div>

                        <div className="db-reaction-bar-track">
                            <div
                                className="db-reaction-bar-seg likes-seg"
                                style={{ width: `${Math.round((reactions.likes / totalReactions) * 100)}%` }}
                            />
                            <div
                                className="db-reaction-bar-seg neutral-seg"
                                style={{ width: `${Math.round((reactions.neutral / totalReactions) * 100)}%` }}
                            />
                            <div
                                className="db-reaction-bar-seg dislikes-seg"
                                style={{ width: `${Math.round((reactions.dislikes / totalReactions) * 100)}%` }}
                            />
                        </div>
                    </div>
                </div>
            ),
        },
    };

    const orderedWidgets = widgetOrder.map((widgetId) => widgetsById[widgetId]);

    return (
        <div className="db-page">
            <div className="db-header">
                <div className="db-header-top">
                    <div>
                        <h1>{t("title")}</h1>
                        <p>{t("subtitle")}</p>
                    </div>

                    <div className="db-layout-actions">
                        <button
                            type="button"
                            className={`db-layout-btn ${isEditMode ? "is-active" : ""}`}
                            onClick={() => {
                                setIsEditMode((current) => !current);
                                setDraggedWidgetId(null);
                            }}
                        >
                            {isEditMode ? t("layout.done") : t("layout.customize")}
                        </button>
                        <button
                            type="button"
                            className="db-layout-btn db-layout-btn--secondary"
                            onClick={saveLayout}
                            disabled={!hasUnsavedLayout}
                        >
                            {t("layout.save")}
                        </button>
                        <button
                            type="button"
                            className="db-layout-btn db-layout-btn--ghost"
                            onClick={resetLayout}
                        >
                            {t("layout.reset")}
                        </button>
                    </div>
                </div>

                {isEditMode && (
                    <p className="db-layout-help">
                        {t("layout.helper")}
                    </p>
                )}

                <DateFilterBar
                    locale={locale}
                    preset={preset}
                    range={range}
                    onPreset={handlePreset}
                    onRange={(nextRange) => {
                        setRange(nextRange);
                        setPreset("custom");
                    }}
                    t={t}
                />
            </div>

            <div className={`db-widget-grid ${isEditMode ? "is-editing" : ""}`}>
                {orderedWidgets.map((widget) => (
                    <section
                        key={widget.id}
                        className={`db-widget-shell db-widget-shell--${widget.span}${draggedWidgetId === widget.id ? " is-dragging" : ""}`}
                        draggable={isEditMode}
                        onDragStart={(event) => {
                            if (!isEditMode) {
                                return;
                            }

                            setDraggedWidgetId(widget.id);
                            event.dataTransfer.effectAllowed = "move";
                            event.dataTransfer.setData("text/plain", widget.id);
                        }}
                        onDragOver={(event) => {
                            if (!isEditMode || !draggedWidgetId || draggedWidgetId === widget.id) {
                                return;
                            }

                            event.preventDefault();
                            event.dataTransfer.dropEffect = "move";
                        }}
                        onDrop={(event) => {
                            if (!isEditMode) {
                                return;
                            }

                            event.preventDefault();
                            const sourceId = event.dataTransfer.getData("text/plain") as DashboardWidgetId;
                            moveWidget(sourceId, widget.id);
                            setDraggedWidgetId(null);
                        }}
                        onDragEnd={() => setDraggedWidgetId(null)}
                    >
                        {isEditMode && (
                            <div className="db-widget-editor">
                                <div className="db-widget-editor__handle">
                                    <span className="db-widget-editor__grip" aria-hidden="true">⋮⋮</span>
                                    <span>{widget.title}</span>
                                </div>
                                <span className="db-widget-editor__hint">{t("layout.drag_label")}</span>
                            </div>
                        )}
                        {widget.content}
                    </section>
                ))}
            </div>

            <div className="db-footer">{t("footer")}</div>
        </div>
    );
};

export default Dashboard;
