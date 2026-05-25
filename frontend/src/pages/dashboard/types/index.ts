import type { ReactNode } from "react";

export type Preset = "today" | "yesterday" | "7d" | "30d" | "90d" | "custom";

export type DashboardWidgetId =
    | "ai_insight"
    | "kpis"
    | "comparisons"
    | "monthly_trend"
    | "peak_hours"
    | "event_types"
    | "top_cameras"
    | "status_reactions";

export type TrendLevel = "month" | "week" | "day" | "hour";

export interface DateRange {
    from: string;
    to: string;
}

export interface DashboardWidget {
    id: DashboardWidgetId;
    title: string;
    span: "full" | "half";
    content: ReactNode;
}

export interface MonthPoint {
    events: number;
    label: string;
    monthIndex: number;
    monthKey: string;
}

export interface HourTemplatePoint {
    events: number;
    hour: string;
}

export interface ChartPoint {
    events: number;
    id: string;
    label: string;
}

export interface MonthBreakdown {
    days: ChartPoint[];
    month: MonthPoint;
    weeks: ChartPoint[];
}

export interface DashboardTranslationFn {
    (key: string, options?: Record<string, unknown>): string;
}

export interface DateFilterBarProps {
    locale: string;
    preset: Preset;
    range: DateRange;
    onPreset: (preset: Preset) => void;
    onRange: (range: DateRange) => void;
    t: DashboardTranslationFn;
}

export interface EventTrendPanelProps {
    locale: string;
    monthlyData: MonthPoint[];
    hourlyTemplate: HourTemplatePoint[];
    t: DashboardTranslationFn;
}
