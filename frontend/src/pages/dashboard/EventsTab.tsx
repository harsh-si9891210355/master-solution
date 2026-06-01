import {
    Bar, BarChart, CartesianGrid, Cell,
    Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import type { EventsTabData } from './types/index';
import { useNsTranslation } from '@/hooks/Usetranslation';

interface EventsTabProps {
    data:   EventsTabData;
    locale: string;
}

const SEVERITY_ICON: Record<string, string> = { low: '🟢', medium: '🟡', high: '🔴' };

export const EventsTab = ({ data, locale }: EventsTabProps) => {
    const { t } = useNsTranslation('dashboard');
    const fmt   = (n: number) => n.toLocaleString(locale);
    const total = data.severityBreakdown.reduce((s, b) => s + b.count, 0);

    const kpis = [
        { label: t('events_tab.kpis.total'),    value: fmt(data.totalEvents),    sub: t('events_tab.kpis.total_sub'),                                                              accent: '#3B82F6', icon: '📋' },
        { label: t('events_tab.kpis.resolved'), value: fmt(data.resolvedEvents), sub: `${Math.round((data.resolvedEvents / data.totalEvents) * 100)}% ${t('events_tab.kpis.resolved_pct')}`, accent: '#10B981', icon: '✅' },
        { label: t('events_tab.kpis.pending'),  value: fmt(data.pendingEvents),  sub: t('events_tab.kpis.pending_sub'),                                                            accent: '#F59E0B', icon: '⏳' },
        { label: t('events_tab.kpis.critical'), value: fmt(data.criticalEvents), sub: t('events_tab.kpis.critical_sub'),                                                           accent: '#EF4444', icon: '🚨' },
    ];

    return (
        <div className="db-tab-content">
            {/* KPIs */}
            <div className="db-grid-4 db-grid-4--compact" style={{ marginBottom: 24 }}>
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
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 99, padding: '6px 16px', marginBottom: 20 }}>
                <span>⚡</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#065F46' }}>
                    {t('events_tab.avg_resolution', { mins: data.avgResolutionMins })}
                </span>
            </div>

            {/* Charts */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                {/* Severity donut */}
                <div className="db-panel db-widget-panel">
                    <p className="db-panel-title">{t('events_tab.severity.title')}</p>
                    <p className="db-panel-sub">{t('events_tab.severity.subtitle')}</p>
                    <div className="db-donut-wrap">
                        <ResponsiveContainer width="45%" height={160}>
                            <PieChart>
                                <Pie data={data.severityBreakdown} dataKey="count" cx="50%" cy="50%" innerRadius={48} outerRadius={72} paddingAngle={3}>
                                    {data.severityBreakdown.map((e, i) => <Cell key={i} fill={e.color} />)}
                                </Pie>
                                <Tooltip formatter={(v: number) => [fmt(v), '']} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="db-donut-legend">
                            {data.severityBreakdown.map(entry => (
                                <div key={entry.severity} className="db-donut-row">
                                    <span>{SEVERITY_ICON[entry.severity]}</span>
                                    <span className="db-donut-label" style={{ textTransform: 'capitalize' }}>
                                        {t(`events_tab.severity.${entry.severity}`)}
                                    </span>
                                    <span className="db-donut-pct">{fmt(entry.count)} ({total > 0 ? Math.round((entry.count / total) * 100) : 0}%)</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Top locations bar */}
                <div className="db-panel db-widget-panel">
                    <p className="db-panel-title">{t('events_tab.top_locations.title')}</p>
                    <p className="db-panel-sub">{t('events_tab.top_locations.subtitle')}</p>
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={data.topLocations} layout="vertical" margin={{ top: 5, right: 20, bottom: 0, left: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
                            <XAxis type="number" tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} />
                            <YAxis type="category" dataKey="location" tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} width={100} />
                            <Tooltip formatter={(v: number) => [fmt(v), t('events_tab.top_locations.tooltip')]} />
                            <Bar dataKey="events" radius={[0, 4, 4, 0]}>
                                {data.topLocations.map((_, i) => <Cell key={i} fill={i === 0 ? '#EF4444' : '#3B82F6'} />)}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Recent events table */}
            <div className="db-panel db-widget-panel" style={{ marginTop: 20 }}>
                <p className="db-panel-title">{t('events_tab.recent.title')}</p>
                <p className="db-panel-sub">{t('events_tab.recent.subtitle')}</p>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                                {(['time','event','location','camera','severity'] as const).map(col => (
                                    <th key={col} style={{ padding: '8px 12px', textAlign: 'left', color: '#64748B', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        {t(`events_tab.recent.col_${col}`)}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {data.recentEvents.map((ev, i) => (
                                <tr key={i} style={{ borderBottom: '1px solid #F1F5F9' }}
                                    onMouseEnter={e => (e.currentTarget.style.background = '#F8FAFC')}
                                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                                    <td style={{ padding: '10px 12px', color: '#64748B', fontFamily: 'monospace' }}>{ev.time}</td>
                                    <td style={{ padding: '10px 12px', fontWeight: 500, color: '#1E293B' }}>{ev.event}</td>
                                    <td style={{ padding: '10px 12px', color: '#475569' }}>{ev.location}</td>
                                    <td style={{ padding: '10px 12px', color: '#3B82F6', fontFamily: 'monospace' }}>{ev.camera}</td>
                                    <td style={{ padding: '10px 12px' }}>
                                        <span style={{
                                            display: 'inline-flex', alignItems: 'center', gap: 4,
                                            padding: '2px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600,
                                            background: ev.severity === 'high' ? '#FEF2F2' : ev.severity === 'medium' ? '#FFFBEB' : '#F0FDF4',
                                            color:      ev.severity === 'high' ? '#DC2626' : ev.severity === 'medium' ? '#D97706' : '#059669',
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
        </div>
    );
};