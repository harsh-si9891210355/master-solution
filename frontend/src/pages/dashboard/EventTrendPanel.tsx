import { useMemo, useState } from "react";
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import type {
    ChartPoint,
    EventTrendPanelProps,
    HourTemplatePoint,
    MonthBreakdown,
    MonthPoint,
    TrendLevel,
} from "./types";

const DRILLDOWN_YEAR = 2026;

const distributeTotal = (total: number, weights: number[]) => {
    const weightSum = weights.reduce((sum, value) => sum + value, 0);
    const rawValues = weights.map((value) => (weightSum === 0 ? 0 : (total * value) / weightSum));
    const baseValues = rawValues.map((value) => Math.floor(value));
    let remainder = total - baseValues.reduce((sum, value) => sum + value, 0);

    const ranked = rawValues
        .map((value, index) => ({ fraction: value - baseValues[index], index }))
        .sort((left, right) => right.fraction - left.fraction);

    let rankedIndex = 0;
    while (remainder > 0 && ranked.length > 0) {
        baseValues[ranked[rankedIndex % ranked.length].index] += 1;
        rankedIndex += 1;
        remainder -= 1;
    }

    return baseValues;
};

const buildMonthBreakdown = (month: MonthPoint, locale: string) => {
    const daysInMonth = new Date(DRILLDOWN_YEAR, month.monthIndex + 1, 0).getDate();
    const dayWeights = Array.from({ length: daysInMonth }, (_, index) => {
        const weekday = new Date(DRILLDOWN_YEAR, month.monthIndex, index + 1).getDay();
        const weekdayBoost = weekday === 0 || weekday === 6 ? 0.88 : 1.12;
        const patternBoost = 1 + ((index + month.monthIndex) % 5) * 0.06;
        return weekdayBoost * patternBoost;
    });

    const dayTotals = distributeTotal(month.events, dayWeights);
    const dayFormatter = new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short" });

    const days = dayTotals.map((events, index) => ({
        id: `day-${month.monthIndex}-${index + 1}`,
        label: dayFormatter.format(new Date(DRILLDOWN_YEAR, month.monthIndex, index + 1)),
        events,
    }));

    const weeks: ChartPoint[] = [];
    for (let index = 0; index < days.length; index += 7) {
        const slice = days.slice(index, index + 7);
        weeks.push({
            id: `week-${month.monthIndex}-${weeks.length + 1}`,
            label: `W${weeks.length + 1}`,
            events: slice.reduce((sum, item) => sum + item.events, 0),
        });
    }

    return { month, days, weeks };
};

const buildHourlyBreakdown = (total: number, template: HourTemplatePoint[]) => {
    const hourWeights = template.map((item) => Math.max(item.events, 1));
    const hourTotals = distributeTotal(total, hourWeights);

    return template.map((item, index) => ({
        id: `hour-${item.hour}`,
        label: `${item.hour}:00`,
        events: hourTotals[index],
    }));
};

const DrilldownTooltip = ({
    active,
    payload,
    label,
    locale,
}: {
    active?: boolean;
    label?: string;
    locale: string;
    payload?: Array<{ value: number }>;
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

// Neon aqua cyber teal palette
// Drillable bars: primary #06B6D4 (Cyan) / accent #818CF8 (Soft Indigo) alternating
// Hour/leaf level: #A78BFA (Lavender) — was amber #F59E0B
const DRILL_COLOR_A = "#06B6D4"; // Cyan — even bars
const DRILL_COLOR_B = "#818CF8"; // Soft Indigo — odd bars
const LEAF_COLOR    = "#A78BFA"; // Lavender — deepest / hour level

export const EventTrendPanel = ({ locale, monthlyData, hourlyTemplate, t }: EventTrendPanelProps) => {
    const [selectedMonthIndex, setSelectedMonthIndex] = useState<number | null>(null);
    const [selectedWeekIndex, setSelectedWeekIndex] = useState<number | null>(null);
    const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);

    const monthBreakdowns = useMemo(
        () => monthlyData.map((month) => buildMonthBreakdown(month, locale)),
        [locale, monthlyData]
    );

    const selectedMonth = selectedMonthIndex !== null ? monthBreakdowns[selectedMonthIndex] : null;
    const selectedWeekDays = selectedMonth && selectedWeekIndex !== null
        ? selectedMonth.days.slice(selectedWeekIndex * 7, selectedWeekIndex * 7 + 7)
        : null;
    const selectedDay = selectedWeekDays && selectedDayIndex !== null ? selectedWeekDays[selectedDayIndex] : null;

    const { level, chartData, subtitle, canDrill, activePath } = useMemo(() => {
        if (!selectedMonth) {
            return {
                level: "month" as TrendLevel,
                chartData: monthlyData.map((month) => ({
                    id: month.monthKey,
                    label: month.label,
                    events: month.events,
                })),
                subtitle: t("drilldown.month_hint"),
                canDrill: true,
                activePath: [t("drilldown.all_months")],
            };
        }

        if (selectedWeekIndex === null) {
            return {
                level: "week" as TrendLevel,
                chartData: selectedMonth.weeks,
                subtitle: t("drilldown.week_hint", { month: selectedMonth.month.label }),
                canDrill: true,
                activePath: [t("drilldown.all_months"), selectedMonth.month.label],
            };
        }

        if (selectedDayIndex === null && selectedWeekDays) {
            return {
                level: "day" as TrendLevel,
                chartData: selectedWeekDays,
                subtitle: t("drilldown.day_hint", { week: t("drilldown.week_label", { index: selectedWeekIndex + 1 }) }),
                canDrill: true,
                activePath: [
                    t("drilldown.all_months"),
                    selectedMonth.month.label,
                    t("drilldown.week_label", { index: selectedWeekIndex + 1 }),
                ],
            };
        }

        return {
            level: "hour" as TrendLevel,
            chartData: buildHourlyBreakdown(selectedDay?.events ?? 0, hourlyTemplate),
            subtitle: t("drilldown.hour_hint", { day: selectedDay?.label ?? "" }),
            canDrill: false,
            activePath: [
                t("drilldown.all_months"),
                selectedMonth.month.label,
                t("drilldown.week_label", { index: (selectedWeekIndex ?? 0) + 1 }),
                selectedDay?.label ?? "",
            ],
        };
    }, [hourlyTemplate, monthlyData, selectedDay, selectedMonth, selectedWeekDays, selectedWeekIndex, selectedDayIndex, t]);

    const handleBarClick = (_: unknown, index: number) => {
        if (level === "month") {
            setSelectedMonthIndex(index);
            setSelectedWeekIndex(null);
            setSelectedDayIndex(null);
            return;
        }

        if (level === "week") {
            setSelectedWeekIndex(index);
            setSelectedDayIndex(null);
            return;
        }

        if (level === "day") {
            setSelectedDayIndex(index);
        }
    };

    const stepBack = () => {
        if (level === "hour") {
            setSelectedDayIndex(null);
            return;
        }

        if (level === "day") {
            setSelectedWeekIndex(null);
            return;
        }

        if (level === "week") {
            setSelectedMonthIndex(null);
        }
    };

    const resetDrilldown = () => {
        setSelectedMonthIndex(null);
        setSelectedWeekIndex(null);
        setSelectedDayIndex(null);
    };

    return (
        <div className="db-panel db-trend-panel db-widget-panel">
            <div className="db-panel-toolbar">
                <div>
                    <p className="db-panel-title">{t("panels.monthly_trend.title")}</p>
                    <p className="db-panel-sub">{subtitle}</p>
                </div>
                <div className="db-drilldown-actions">
                    {level !== "month" && (
                        <button type="button" className="db-drilldown-btn" onClick={stepBack}>
                            {t("drilldown.back")}
                        </button>
                    )}
                    <button type="button" className="db-drilldown-btn db-drilldown-btn--ghost" onClick={resetDrilldown}>
                        {t("drilldown.reset")}
                    </button>
                </div>
            </div>

            <div className="db-breadcrumbs">
                {activePath.map((item) => (
                    <span key={item} className="db-breadcrumb">
                        {item}
                    </span>
                ))}
            </div>

            <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} margin={{ top: 5, right: 10, bottom: 0, left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: "#64748B", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#64748B", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<DrilldownTooltip locale={locale} />} />
                    <Bar dataKey="events" radius={[8, 8, 0, 0]} onClick={handleBarClick} cursor={canDrill ? "pointer" : "default"}>
                        {chartData.map((item, index) => (
                            <Cell
                                key={item.id}
                                fill={canDrill ? (index % 2 === 0 ? DRILL_COLOR_A : DRILL_COLOR_B) : LEAF_COLOR}
                                style={{ cursor: canDrill ? "pointer" : "default" }}
                            />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};