// frontend/src/pages/dashboard/Dashboard.tsx
// Install recharts if not already: npm install recharts
// Place dashboardData.json at:  frontend/src/pages/dashboard/dashboardData.json
// Place Dashboard.css at:       frontend/src/pages/dashboard/Dashboard.css

import { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import data from "./dashboardData.json";
import "./Dashboard.css";

// ─── Sub-components ──────────────────────────────────────────────────────────
function AnimatedNumber({ target }: { target: number }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let v = 0;
    const step = target / 40;
    const t = setInterval(() => {
      v += step;
      if (v >= target) { setVal(target); clearInterval(t); }
      else setVal(Math.floor(v));
    }, 30);
    return () => clearInterval(t);
  }, [target]);
  return <>{val.toLocaleString()}</>;
}

function TypedText({ text }: { text: string }) {
  const [displayed, setDisplayed] = useState("");
  useEffect(() => {
    let i = 0;
    const t = setInterval(() => {
      setDisplayed(text.slice(0, i) + (i < text.length ? "|" : ""));
      i++;
      if (i > text.length) clearInterval(t);
    }, 22);
    return () => clearInterval(t);
  }, [text]);
  return <>{displayed}</>;
}

// Custom Recharts tooltip — keeps dark-theme styling via CSS class
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="db-tooltip">
      <p className="db-tooltip-label">{label}</p>
      <p className="db-tooltip-val">{Number(payload[0].value).toLocaleString()}</p>
    </div>
  );
};

// ─── Main ────────────────────────────────────────────────────────────────────
export const Dashboard = () => {
  const totalTypes   = data.eventTypeBreakdown.reduce((a, b) => a + b.count, 0);
  const totalTopFive = data.topCameras.reduce((a, b) => a + b.events, 0);
  const maxCam       = data.topCameras[0].events;

  // Amber = peak hours (8–10 AM, 5–7 PM), dark blue = normal
  const barColors = data.eventsByHour.map((_, i) =>
    (i >= 8 && i <= 10) || (i >= 17 && i <= 19) ? "#F59E0B" : "#1E3A5F"
  );

  const comparisonItems = [
    {
      label: "Today vs Yesterday",
      cur: data.comparisonMetrics.todayVsYesterday.today,
      prev: data.comparisonMetrics.todayVsYesterday.yesterday,
      pct: data.comparisonMetrics.todayVsYesterday.percentChange,
      curLabel: "Today",
      prevLabel: "Yesterday",
      accent: "#3B82F6",
    },
    {
      label: "This Week vs Last",
      cur: data.comparisonMetrics.weekVsLastWeek.thisWeek,
      prev: data.comparisonMetrics.weekVsLastWeek.lastWeek,
      pct: data.comparisonMetrics.weekVsLastWeek.percentChange,
      curLabel: "This week",
      prevLabel: "Last week",
      accent: "#10B981",
    },
    {
      label: "This Month vs Last",
      cur: data.comparisonMetrics.monthVsLastMonth.thisMonth,
      prev: data.comparisonMetrics.monthVsLastMonth.lastMonth,
      pct: data.comparisonMetrics.monthVsLastMonth.percentChange,
      curLabel: "This month",
      prevLabel: "Last month",
      accent: "#8B5CF6",
    },
  ];

  return (
    <div className="db-page">

      {/* ── Page header ── */}
      <div className="db-header">
        <h1>Analytics Dashboard</h1>
        <p>30 Mar 2026 → 30 Apr 2026 · All cameras · All use cases</p>
      </div>

      {/* ── AI Insight ── */}
      <div className="db-ai-banner">
        <div className="db-ai-icon">🤖</div>
        <div>
          <div className="db-ai-label-row">
            <span className="db-ai-label">AI Insight</span>
            <span className="db-ai-badge">GPT-Powered</span>
          </div>
          <p className="db-ai-text">
            <TypedText text={data.summary.aiInsight} />
          </p>
        </div>
      </div>

      {/* ── KPI Cards ──
          DISPLAY: Animated number cards
          DATA:    summary.totalEvents / todayEvents / thisWeekEvents / thisMonthEvents
          PURPOSE: Instant top-line numbers — how many events happened at each time scale
      */}
      <div className="db-grid-4">
        {[
          { label: "Total Events", value: data.summary.totalEvents,     sub: "All time",              accent: "#F59E0B" },
          { label: "Today",        value: data.summary.todayEvents,     sub: "+13.2% vs yesterday",   accent: "#3B82F6" },
          { label: "This Week",    value: data.summary.thisWeekEvents,  sub: "+13.8% vs last week",   accent: "#10B981" },
          { label: "This Month",   value: data.summary.thisMonthEvents, sub: "+19.8% vs last month",  accent: "#8B5CF6" },
        ].map((k) => (
          <div
            key={k.label}
            className="db-kpi-card"
            style={{ border: `1px solid ${k.accent}22` }}
          >
            <div className="db-kpi-orb" style={{ background: `${k.accent}18` }} />
            <p className="db-kpi-label">{k.label}</p>
            <p className="db-kpi-value"><AnimatedNumber target={k.value} /></p>
            <p className="db-kpi-sub" style={{ color: k.accent }}>{k.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Comparison Cards ──
          DISPLAY: Side-by-side bar comparison cards
          DATA:    comparisonMetrics (today/yesterday, week/lastWeek, month/lastMonth)
          PURPOSE: Clearly show current vs previous period with a visual bar ratio,
                   % change badge, and exact difference callout
      */}
      <div className="db-grid-3">
        {comparisonItems.map((c) => {
          const ratio = Math.round((c.prev / c.cur) * 100);
          return (
            <div
              key={c.label}
              className="db-cmp-card"
              style={{ border: `1px solid ${c.accent}22` }}
            >
              <div className="db-cmp-accent-bar" style={{ background: c.accent }} />
              <p className="db-cmp-title">{c.label}</p>

              {/* Current period number */}
              <p className="db-cmp-period-label">{c.curLabel}</p>
              <div className="db-cmp-cur-row">
                <span className="db-cmp-cur-val">{c.cur.toLocaleString()}</span>
                <span className="db-cmp-pct-badge">▲ {c.pct}%</span>
              </div>

              {/* Visual bar comparison */}
              <div className="db-cmp-bars">
                <div className="db-cmp-bar-row">
                  <span className="db-cmp-bar-period">{c.curLabel}</span>
                  <div className="db-cmp-bar-track">
                    <div
                      className="db-cmp-bar-fill current"
                      style={{ background: c.accent }}
                    />
                  </div>
                  <span className="db-cmp-bar-num bright">{c.cur.toLocaleString()}</span>
                </div>
                <div className="db-cmp-bar-row">
                  <span className="db-cmp-bar-period dim">{c.prevLabel}</span>
                  <div className="db-cmp-bar-track">
                    <div
                      className="db-cmp-bar-fill previous"
                      style={{ width: `${ratio}%` }}
                    />
                  </div>
                  <span className="db-cmp-bar-num dim">{c.prev.toLocaleString()}</span>
                </div>
              </div>

              <p className="db-cmp-diff">
                +{(c.cur - c.prev).toLocaleString()} more than {c.prevLabel.toLowerCase()}
              </p>
            </div>
          );
        })}
      </div>

      {/* ── Monthly Trend ──
          CHART:   Area Chart (Recharts AreaChart)
          DATA:    eventsByMonth — 12 monthly event totals
          PURPOSE: Shows whether security event volume is rising/falling over the year.
                   Rising line = more incidents over time.
      */}
      <div className="db-panel db-trend-panel">
        <p className="db-panel-title">Event Trend — Monthly</p>
        <p className="db-panel-sub">
          Each point = total events in that month. Rising line = more security events over time.
        </p>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={data.eventsByMonth} margin={{ top: 5, right: 10, bottom: 0, left: -10 }}>
            <defs>
              <linearGradient id="grad1" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#F59E0B" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
            <XAxis dataKey="month" tick={{ fill: "#64748B", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#64748B", fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="events"
              stroke="#F59E0B"
              strokeWidth={2.5}
              fill="url(#grad1)"
              dot={{ fill: "#F59E0B", r: 3 }}
              activeDot={{ r: 5 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* ── Peak Hours + Event Types ── */}
      <div className="db-grid-2">

        {/* Peak Activity Hours
            CHART:   Bar Chart (Recharts BarChart)
            DATA:    eventsByHour — 24 hourly buckets (00–23)
            PURPOSE: Find which times of day see the most security activity.
                     Amber bars = peak periods (8–10am, 5–7pm). Taller = more events.
        */}
        <div className="db-panel">
          <p className="db-panel-title">Peak Activity Hours</p>
          <p className="db-panel-sub">Each bar = events in that hour. Amber = busiest periods.</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={data.eventsByHour} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
              <XAxis
                dataKey="hour"
                tick={{ fill: "#64748B", fontSize: 9 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => (parseInt(v) % 6 === 0 ? v + "h" : "")}
              />
              <YAxis tick={{ fill: "#64748B", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="events" radius={[3, 3, 0, 0]}>
                {data.eventsByHour.map((_, i) => (
                  <Cell key={i} fill={barColors[i]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="db-legend">
            {[
              { color: "#F59E0B", label: "Peak hours (8–10am, 5–7pm)" },
              { color: "#1E3A5F", label: "Normal hours" },
            ].map((l) => (
              <div key={l.label} className="db-legend-item">
                <span className="db-legend-dot" style={{ background: l.color }} />
                {l.label}
              </div>
            ))}
          </div>
        </div>

        {/* Event Type Breakdown
            CHART:   Donut / Pie Chart (Recharts PieChart with innerRadius)
            DATA:    eventTypeBreakdown — 6 event categories with counts and colors
            PURPOSE: Show which types of security events happen most often.
                     Bigger slice = more frequent. Hover a slice for exact count.
        */}
        <div className="db-panel">
          <p className="db-panel-title">Event Type Breakdown</p>
          <p className="db-panel-sub">Bigger slice = more frequent. Hover for exact count.</p>
          <div className="db-donut-wrap">
            <ResponsiveContainer width="45%" height={160}>
              <PieChart>
                <Pie
                  data={data.eventTypeBreakdown}
                  dataKey="count"
                  cx="50%"
                  cy="50%"
                  innerRadius={48}
                  outerRadius={72}
                  paddingAngle={3}
                >
                  {data.eventTypeBreakdown.map((e, i) => (
                    <Cell key={i} fill={e.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => v.toLocaleString()} />
              </PieChart>
            </ResponsiveContainer>
            <div className="db-donut-legend">
              {data.eventTypeBreakdown.map((e) => (
                <div key={e.type} className="db-donut-row">
                  <span className="db-donut-dot" style={{ background: e.color }} />
                  <span className="db-donut-label">{e.type}</span>
                  <span className="db-donut-pct">
                    {Math.round((e.count / totalTypes) * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Top Cameras + Camera Status ──
          DISPLAY: Individual camera cards with progress bars
          DATA:    topCameras — camera ID, location, event count, online/offline status
          PURPOSE: See which cameras generate the most alerts and spot offline devices.
                   Bar width = events vs #1 camera. % = share of top-5 total.
                   Amber border = #1 camera. Red bar + pill = offline camera.
      */}
      <div className="db-grid-21">

        {/* Top Cameras */}
        <div className="db-panel">
          <p className="db-panel-title">Top Cameras by Events</p>
          <p className="db-panel-sub">
            Bar shows events vs #1 camera. % = share of top-5 total.
          </p>

          {/* Summary row */}
          <div className="db-cam-summary-grid">
            {[
              { val: totalTopFive.toLocaleString(),                                            label: "Events from top 5", color: "#F8FAFC" },
              { val: data.topCameras[0].id,                                                    label: "Most active camera", color: "#F59E0B" },
              { val: `${data.topCameras.filter(c => c.status === "offline").length} offline`,  label: "Need attention",     color: "#EF4444" },
            ].map((s) => (
              <div key={s.label} className="db-cam-summary-card">
                <p className="db-cam-summary-val" style={{ color: s.color }}>{s.val}</p>
                <p className="db-cam-summary-label">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Camera rows */}
          {data.topCameras.map((cam, i) => {
            const isOffline = cam.status === "offline";
            const isTop     = i === 0;
            const share     = Math.round((cam.events / totalTopFive) * 100);
            const barPct    = Math.round((cam.events / maxCam) * 100);
            const barColor  = isOffline ? "#EF4444" : isTop ? "#F59E0B" : "#3B82F6";

            return (
              <div
                key={cam.id}
                className={`db-cam-row${isTop ? " is-top" : ""}${isOffline ? " is-offline" : ""}`}
              >
                <div className="db-cam-top-row">
                  <div className="db-cam-left">
                    <span className={`db-cam-rank${isTop ? " is-top" : ""}`}>
                      #{i + 1}
                    </span>
                    <div>
                      <p className="db-cam-id">
                        {cam.id}
                        {isTop && <span className="db-cam-top-badge">TOP</span>}
                      </p>
                      <p className="db-cam-location">📍 {cam.location}</p>
                    </div>
                  </div>
                  <div className="db-cam-right">
                    <span className={`db-cam-status ${cam.status}`}>
                      {isOffline ? "● Offline" : "● Online"}
                    </span>
                    <div>
                      <p className="db-cam-events-val">{cam.events}</p>
                      <p className="db-cam-events-label">events</p>
                    </div>
                  </div>
                </div>

                <div className="db-cam-bar-row">
                  <div className="db-cam-bar-track">
                    <div
                      className="db-cam-bar-fill"
                      style={{ width: `${barPct}%`, background: barColor }}
                    />
                  </div>
                  <span className="db-cam-share">{share}% of top-5</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Camera Status
            DISPLAY: Status cards + ratio progress bar
            DATA:    deviceStatus — online, offline, total counts
            PURPOSE: At a glance — how many cameras are working vs broken.
                     Green = online, Red = offline. Bar = online ratio %.
        */}
        <div className="db-panel">
          <p className="db-panel-title">Camera Status</p>
          <p className="db-panel-sub">{data.deviceStatus.total} total devices</p>

          <div className="db-status-card online">
            <div className="db-status-icon online">📹</div>
            <div>
              <p className="db-status-num online">{data.deviceStatus.online}</p>
              <p className="db-status-text">Online</p>
            </div>
          </div>

          <div className="db-status-card offline">
            <div className="db-status-icon offline">📷</div>
            <div>
              <p className="db-status-num offline">{data.deviceStatus.offline}</p>
              <p className="db-status-text">Offline</p>
            </div>
          </div>

          <div className="db-ratio-section">
            <div className="db-ratio-row">
              <span className="db-ratio-label">Online ratio</span>
              <span className="db-ratio-pct">
                {Math.round((data.deviceStatus.online / data.deviceStatus.total) * 100)}%
              </span>
            </div>
            <div className="db-ratio-track">
              <div
                className="db-ratio-fill"
                style={{
                  width: `${Math.round((data.deviceStatus.online / data.deviceStatus.total) * 100)}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="db-footer">
        © 2025 SentinelAI · All rights reserved · Version v2.0.0
      </div>

    </div>
  );
};

export default Dashboard;