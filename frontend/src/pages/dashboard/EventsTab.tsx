import { useState } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import type { EventsTabData } from './types/index';
import { useNsTranslation } from '@/hooks/Usetranslation';

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
        { label: t('events_tab.kpis.total'),    value: fmt(data.totalEvents),    sub: t('events_tab.kpis.total_sub'),                                                              accent: '#3B82F6', icon: '📋' },
        { label: t('events_tab.kpis.resolved'), value: fmt(data.resolvedEvents), sub: `${Math.round((data.resolvedEvents / data.totalEvents) * 100)}% ${t('events_tab.kpis.resolved_pct')}`, accent: '#10B981', icon: '✅' },
        { label: t('events_tab.kpis.pending'),  value: fmt(data.pendingEvents),  sub: t('events_tab.kpis.pending_sub'),                                                            accent: '#F59E0B', icon: '⏳' },
        { label: t('events_tab.kpis.critical'), value: fmt(data.criticalEvents), sub: t('events_tab.kpis.critical_sub'),                                                           accent: '#EF4444', icon: '🚨' },
    ];

    return (
        <div style={{ width: '100%' }}>
            {/* KPIs */}
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
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: 8, 
                background: 'rgba(16, 185, 129, 0.1)', 
                border: '1px solid rgba(16, 185, 129, 0.25)', 
                borderRadius: 99, 
                padding: '6px 16px', 
                marginBottom: 4 
            }}>
                <span style={{ filter: 'drop-shadow(0 0 4px #10B981)' }}>⚡</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#34d399' }}>
                    {t('events_tab.avg_resolution', { mins: data.avgResolutionMins })}
                </span>
            </div>
        </div>
    );
};

// export const EventsSeverity = ({ data, locale }: { data: EventsTabData; locale: string }) => {
//     const { t } = useNsTranslation('dashboard');
//     const [activeSeverity, setActiveSeverity] = useState<string | null>(null);
//     const fmt = (n: number) => n.toLocaleString(locale);
//     const total = data.severityBreakdown.reduce((s, b) => s + b.count, 0);

//     return (
//         <div className="db-panel db-widget-panel">
//             <p className="db-panel-title">{t('events_tab.severity.title')}</p>
//             <p className="db-panel-sub">Severity metrics mapped with triggers. Hover over slices to details.</p>
            
//             <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 32, alignItems: 'center' }}>
//                 {/* Donut with hover mapping */}
//                 <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
//                     <div style={{ position: 'relative', width: 170, height: 170, flexShrink: 0 }}>
//                         <ResponsiveContainer width="100%" height="100%">
//                             <PieChart>
//                                 <Pie 
//                                     data={data.severityBreakdown} 
//                                     dataKey="count" 
//                                     cx="50%" 
//                                     cy="50%" 
//                                     innerRadius={54} 
//                                     outerRadius={78} 
//                                     paddingAngle={4}
//                                     onMouseEnter={(event) => {
//                                         const severity = (event as any).severity || (event as any).payload?.severity;
//                                         if (severity) setActiveSeverity(severity);
//                                     }}
//                                     onMouseLeave={() => setActiveSeverity(null)}
//                                 >
//                                     {data.severityBreakdown.map((e, i) => (
//                                         <Cell 
//                                             key={i} 
//                                             fill={e.color} 
//                                             style={{ 
//                                                 outline: 'none', 
//                                                 transition: 'all 0.2s ease', 
//                                                 cursor: 'pointer',
//                                                 filter: activeSeverity === e.severity ? 'brightness(1.15) drop-shadow(0 0 5px rgba(255,255,255,0.2))' : 'none'
//                                             }} 
//                                         />
//                                     ))}
//                                 </Pie>
//                             </PieChart>
//                         </ResponsiveContainer>
                        
//                         {/* Dynamic terms details inside the pie donut hole! */}
//                         <div style={{ 
//                             position: 'absolute', 
//                             top: '50%', 
//                             left: '50%', 
//                             transform: 'translate(-50%, -50%)', 
//                             textAlign: 'center', 
//                             pointerEvents: 'none',
//                             width: 100,
//                             display: 'flex',
//                             flexDirection: 'column',
//                             alignItems: 'center',
//                             justifyContent: 'center'
//                         }}>
//                             {activeSeverity ? (
//                                 <>
//                                     <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: activeSeverity === 'high' ? '#f87171' : activeSeverity === 'medium' ? '#fbbf24' : '#34d399' }}>
//                                         {activeSeverity}
//                                     </span>
//                                     <span style={{ fontSize: 16, fontWeight: 800, color: '#fff', margin: '2px 0' }}>
//                                         {fmt(data.severityBreakdown.find(s => s.severity === activeSeverity)?.count || 0)}
//                                     </span>
//                                     <span style={{ fontSize: 8, color: 'var(--text-muted)', lineHeight: 1.1, display: 'block', maxWidth: 88, overflow: 'hidden', textOverflow: 'ellipsis' }}>
//                                         {severityDetails[activeSeverity]?.terms}
//                                     </span>
//                                 </>
//                             ) : (
//                                 <>
//                                     <span style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Total</span>
//                                     <span style={{ fontSize: 18, fontWeight: 800, color: '#fff', margin: '2px 0' }}>{fmt(total)}</span>
//                                     <span style={{ fontSize: 8, color: '#60a5fa' }}>Hover Slices</span>
//                                 </>
//                             )}
//                         </div>
//                     </div>

//                     <div className="db-donut-legend" style={{ minWidth: 120 }}>
//                         {data.severityBreakdown.map(entry => (
//                             <div key={entry.severity} className="db-donut-row" style={{ color: entry.color, padding: '4px 0' }}>
//                                 <span>{SEVERITY_ICON[entry.severity]}</span>
//                                 <span className="db-donut-label" style={{ textTransform: 'capitalize', color: 'var(--text-muted)', fontSize: 11 }}>
//                                     {t(`events_tab.severity.${entry.severity}`)}
//                                 </span>
//                                 <span className="db-donut-pct" style={{ color: '#fff', fontWeight: 600, fontSize: 11 }}>
//                                     {fmt(entry.count)} ({total > 0 ? Math.round((entry.count / total) * 100) : 0}%)
//                                 </span>
//                             </div>
//                         ))}
//                     </div>
//                 </div>

//                 {/* Explanatory Cards */}
//                 <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
//                     {data.severityBreakdown.map(entry => {
//                         const details = severityDetails[entry.severity];
//                         if (!details) return null;
//                         const count = entry.count;
//                         const pct = total > 0 ? Math.round((count / total) * 100) : 0;
//                         return (
//                             <div key={entry.severity} className={`db-severity-card ${details.class}`} style={{ background: 'rgba(30, 41, 59, 0.25)', padding: '12px 14px' }}>
//                                 <div className="db-severity-card-header" style={{ marginBottom: 4 }}>
//                                     <span className="db-severity-card-title" style={{ fontSize: 12 }}>
//                                         {SEVERITY_ICON[entry.severity]} {details.title}
//                                     </span>
//                                     <span className="db-severity-card-count" style={{ fontSize: 12 }}>
//                                         {fmt(count)} ({pct}%)
//                                     </span>
//                                 </div>
//                                 <p className="db-severity-card-desc" style={{ fontSize: 11, marginBottom: 4 }}>{details.desc}</p>
//                                 <div className="db-severity-card-footer" style={{ fontSize: 10 }}>
//                                     Typical Triggers: <strong style={{ color: 'var(--text-dimmer)' }}>{details.example}</strong>
//                                 </div>
//                             </div>
//                         );
//                     })}
//                 </div>
//             </div>
//         </div>
//     );
// };

export const EventsRecent = ({ data, locale }: { data: EventsTabData; locale: string }) => {
    const { t } = useNsTranslation('dashboard');

    return (
        <div className="db-panel db-widget-panel" style={{ width: '100%' }}>
            <p className="db-panel-title">{t('events_tab.recent.title')}</p>
            <p className="db-panel-sub">{t('events_tab.recent.subtitle')}</p>
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                            {(['time','event','location','camera','severity'] as const).map(col => (
                                <th key={col} style={{ padding: '12px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    {t(`events_tab.recent.col_${col}`)}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {data.recentEvents.map((ev, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}
                                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)')}
                                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                                <td style={{ padding: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{ev.time}</td>
                                <td style={{ padding: '12px', fontWeight: 600, color: 'var(--text-heading)' }}>{ev.event}</td>
                                <td style={{ padding: '12px', color: 'var(--text-dimmer)' }}>{ev.location}</td>
                                <td style={{ padding: '12px', color: 'var(--accent-blue)', fontFamily: 'var(--font-mono)' }}>{ev.camera}</td>
                                <td style={{ padding: '12px' }}>
                                    <span style={{
                                        display: 'inline-flex', alignItems: 'center', gap: 4,
                                        padding: '3px 12px', borderRadius: 99, fontSize: 11, fontWeight: 700,
                                        background: ev.severity === 'high' ? 'rgba(239, 68, 68, 0.15)' : ev.severity === 'medium' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                                        color:      ev.severity === 'high' ? '#f87171' : ev.severity === 'medium' ? '#fbbf24' : '#34d399',
                                        border:     ev.severity === 'high' ? '1px solid rgba(239, 68, 68, 0.2)' : ev.severity === 'medium' ? '1px solid rgba(245, 158, 11, 0.2)' : '1px solid rgba(16, 185, 129, 0.2)'
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