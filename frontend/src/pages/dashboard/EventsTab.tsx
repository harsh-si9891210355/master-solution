import { useState } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import type { EventsTabData } from './types/index';
import { useNsTranslation } from '@/hooks/Usetranslation';

// ─── Neon Aqua Cyber Teal Palette ───────────────────────────────────────────
const COLOR_PRIMARY     = '#06B6D4'; // Cyan        — total / primary
const COLOR_ONLINE      = '#34D399'; // Bright Emerald — resolved / positive
const COLOR_MAINTENANCE = '#A78BFA'; // Lavender    — pending / warning
const COLOR_OFFLINE     = '#F472B6'; // Neon Pink   — critical / alert

// Severity → palette mapping
const SEVERITY_COLOR: Record<string, string> = {
    high:   COLOR_OFFLINE,      // Neon Pink
    medium: COLOR_MAINTENANCE,  // Lavender
    low:    COLOR_ONLINE,       // Bright Emerald
};

const SEVERITY_BG: Record<string, string> = {
    high:   'rgba(244,114,182,0.15)',
    medium: 'rgba(167,139,250,0.15)',
    low:    'rgba(52,211,153,0.15)',
};

const SEVERITY_BORDER: Record<string, string> = {
    high:   '1px solid rgba(244,114,182,0.2)',
    medium: '1px solid rgba(167,139,250,0.2)',
    low:    '1px solid rgba(52,211,153,0.2)',
};
// ────────────────────────────────────────────────────────────────────────────

export const SEVERITY_ICON: Record<string, string> = { low: '🟢', medium: '🟡', high: '🔴' };

export const severityDetails: Record<string, { title: string; desc: string; example: string; class: string; terms: string }> = {
    high: {
        title: "High - Critical Alerts",
        desc: "Security incidents that require immediate operational intervention. These threats represent active breaches, safety protocol violations, or system downtime.",
        example: "Intrusion Alerts, PPE Violations, Offline Cameras",
        class: "high",
        terms: "Intrusion, PPE, Outage"
    },
    medium: {
        title: "Medium - Warning Indicators",
        desc: "Anomalous activities that require observation and verification. These events pose potential risks if left unmonitored.",
        example: "Loitering in Restricted Zones, Vehicle After-Hours",
        class: "medium",
        terms: "Loitering, After-Hours"
    },
    low: {
        title: "Low - Standard Operations",
        desc: "Routine operational notifications and audit trails. These logs track everyday activity and system checkpoints.",
        example: "Standard Motion Detected, Authorized Personnel Recognized",
        class: "low",
        terms: "Motion, Face Audits"
    }
};

export const EventsKpis = ({ data, locale }: { data: EventsTabData; locale: string }) => {
    const { t } = useNsTranslation('dashboard');
    const fmt = (n: number) => n.toLocaleString(locale);

    const kpis = [
        { label: t('events_tab.kpis.total'),    value: fmt(data.totalEvents),    sub: t('events_tab.kpis.total_sub'),                                                                accent: COLOR_PRIMARY,     icon: '📋' },
        { label: t('events_tab.kpis.resolved'), value: fmt(data.resolvedEvents), sub: `${Math.round((data.resolvedEvents / data.totalEvents) * 100)}% ${t('events_tab.kpis.resolved_pct')}`, accent: COLOR_ONLINE,      icon: '✅' },
        { label: t('events_tab.kpis.pending'),  value: fmt(data.pendingEvents),  sub: t('events_tab.kpis.pending_sub'),                                                              accent: COLOR_MAINTENANCE, icon: '⏳' },
        { label: t('events_tab.kpis.critical'), value: fmt(data.criticalEvents), sub: t('events_tab.kpis.critical_sub'),                                                             accent: COLOR_OFFLINE,     icon: '🚨' },
    ];

    return (
        <div style={{ width: '100%' }}>
            <div className="db-grid-4 db-grid-4--compact" style={{ marginBottom: 20 }}>
                {kpis.map(kpi => (
                    <div key={kpi.label} className="db-kpi-card" style={{ border: `1px solid ${kpi.accent}22` }}>
                        <div className="db-kpi-orb" style={{ background: `${kpi.accent}18` }} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <span style={{ fontSize: 18 }}>{kpi.icon}</span>
                            <p className="db-kpi-label">{kpi.label}</p>
                        </div>
                        <p className="db-kpi-value">{kpi.value}</p>
                        <p className="db-kpi-sub" style={{ color: kpi.accent }}>{kpi.sub}</p>
                    </div>
                ))}
            </div>

            {/* Avg resolution badge */}
            <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: `${COLOR_ONLINE}1A`,
                border: `1px solid ${COLOR_ONLINE}40`,
                borderRadius: 99, padding: '6px 16px', marginBottom: 4
            }}>
                <span style={{ filter: `drop-shadow(0 0 4px ${COLOR_ONLINE})` }}>⚡</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: COLOR_ONLINE }}>
                    {t('events_tab.avg_resolution', { mins: data.avgResolutionMins })}
                </span>
            </div>
        </div>
    );
};

export const EventsRecent = ({ data, locale }: { data: EventsTabData; locale: string }) => {
    const { t } = useNsTranslation('dashboard');

    return (
        <div className="db-panel db-widget-panel" style={{ width: '100%' }}>
            <p className="db-panel-title">{t('events_tab.recent.title')}</p>
            <p className="db-panel-sub">{t('events_tab.recent.subtitle')}</p>
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                            {(['time','event','location','camera','severity'] as const).map(col => (
                                <th key={col} style={{ padding: '12px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    {t(`events_tab.recent.col_${col}`)}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {data.recentEvents.map((ev, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                                <td style={{ padding: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{ev.time}</td>
                                <td style={{ padding: '12px', fontWeight: 600, color: 'var(--text-heading)' }}>{ev.event}</td>
                                <td style={{ padding: '12px', color: 'var(--text-dimmer)' }}>{ev.location}</td>
                                <td style={{ padding: '12px', color: COLOR_PRIMARY, fontFamily: 'var(--font-mono)' }}>{ev.camera}</td>
                                <td style={{ padding: '12px' }}>
                                    <span style={{
                                        display: 'inline-flex', alignItems: 'center', gap: 4,
                                        padding: '3px 12px', borderRadius: 99, fontSize: 11, fontWeight: 700,
                                        background: SEVERITY_BG[ev.severity],
                                        color:      SEVERITY_COLOR[ev.severity],
                                        border:     SEVERITY_BORDER[ev.severity],
                                    }}>
                                        {SEVERITY_ICON[ev.severity]} {t(`events_tab.severity.${ev.severity}`)}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export const EventsTab = ({ data, locale }: { data: EventsTabData; locale: string }) => {
    return (
        <div className="db-tab-content">
            <EventsKpis data={data} locale={locale} />
            {/* <EventsSeverity data={data} locale={locale} /> */}
            <EventsRecent data={data} locale={locale} />
        </div>
    );
};