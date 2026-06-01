import {
    Bar, BarChart, CartesianGrid, Cell,
    Legend, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import type { CamerasTabData } from './types/index';
import { useNsTranslation } from '@/hooks/Usetranslation';

interface CamerasTabProps {
    data:   CamerasTabData;
    locale: string;
}

export const CamerasTab = ({ data, locale }: CamerasTabProps) => {
    const { t } = useNsTranslation('dashboard');
    const fmt    = (n: number) => n.toLocaleString(locale);
    const fmtPct = (n: number) => `${n}%`;
    const maxCam = data.topCameras[0]?.events || 1;
    const total  = data.topCameras.reduce((s, c) => s + c.events, 0);

    const kpis = [
        { label: t('cameras_tab.kpis.total'),       value: fmt(data.totalCameras),   sub: t('cameras_tab.kpis.total_sub'),                                                                                   accent: '#3B82F6', icon: '📹' },
        { label: t('cameras_tab.kpis.online'),      value: fmt(data.onlineCameras),  sub: fmtPct(Math.round((data.onlineCameras / data.totalCameras) * 100)) + ' ' + t('cameras_tab.kpis.online_pct'),       accent: '#10B981', icon: '🟢' },
        { label: t('cameras_tab.kpis.offline'),     value: fmt(data.offlineCameras), sub: t('cameras_tab.kpis.offline_sub'),                                                                                  accent: '#EF4444', icon: '🔴' },
        { label: t('cameras_tab.kpis.maintenance'), value: fmt(data.maintenanceDue), sub: t('cameras_tab.kpis.maintenance_sub'),                                                                              accent: '#F59E0B', icon: '🔧' },
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

            {/* Avg uptime badge */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 99, padding: '6px 16px', marginBottom: 20 }}>
                <span>📶</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#1D4ED8' }}>
                    {t('cameras_tab.avg_uptime', { pct: fmtPct(data.avgUptimePct) })}
                </span>
            </div>

            {/* Charts */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                {/* Health trend */}
                <div className="db-panel db-widget-panel">
                    <p className="db-panel-title">{t('cameras_tab.health_trend.title')}</p>
                    <p className="db-panel-sub">{t('cameras_tab.health_trend.subtitle')}</p>
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={data.healthTrend} margin={{ top: 5, right: 10, bottom: 0, left: -10 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                            <XAxis dataKey="date" tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} />
                            <YAxis                tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} />
                            <Tooltip formatter={(v: number) => [fmt(v), '']} />
                            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                            <Bar dataKey="online"  name={t('cameras_tab.health_trend.online_label')}  fill="#10B981" radius={[4,4,0,0]} stackId="a" />
                            <Bar dataKey="offline" name={t('cameras_tab.health_trend.offline_label')} fill="#EF4444" radius={[4,4,0,0]} stackId="a" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Location coverage */}
                <div className="db-panel db-widget-panel">
                    <p className="db-panel-title">{t('cameras_tab.location_coverage.title')}</p>
                    <p className="db-panel-sub">{t('cameras_tab.location_coverage.subtitle')}</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
                        {data.locationCoverage.map((loc, i) => {
                            const maxLoc = data.locationCoverage[0]?.events || 1;
                            const pct    = Math.round((loc.events / maxLoc) * 100);
                            const colors = ['#3B82F6','#10B981','#8B5CF6','#F59E0B','#F97316'];
                            return (
                                <div key={loc.location}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                        <span style={{ fontSize: 12, color: '#475569', fontWeight: 500 }}>{loc.location}</span>
                                        <span style={{ fontSize: 12, color: '#94A3B8' }}>{loc.events} {t('cameras_tab.location_coverage.cam_label')}</span>
                                    </div>
                                    <div style={{ height: 6, background: '#E2E8F0', borderRadius: 99 }}>
                                        <div style={{ width: `${pct}%`, height: '100%', background: colors[i % colors.length], borderRadius: 99, transition: 'width 0.6s ease' }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Top cameras list */}
            <div className="db-panel db-widget-panel" style={{ marginTop: 20 }}>
                <p className="db-panel-title">{t('cameras_tab.top_cameras.title')}</p>
                <p className="db-panel-sub">{t('cameras_tab.top_cameras.subtitle')}</p>
                {data.topCameras.map((cam, i) => {
                    const isOffline = cam.status === 'offline';
                    const isTop     = i === 0;
                    const barPct    = Math.round((cam.events / maxCam) * 100);
                    const share     = total > 0 ? Math.round((cam.events / total) * 100) : 0;
                    const barColor  = isOffline ? '#EF4444' : isTop ? '#F59E0B' : '#3B82F6';
                    return (
                        <div key={cam.id} className={`db-cam-row${isTop ? ' is-top' : ''}${isOffline ? ' is-offline' : ''}`}>
                            <div className="db-cam-top-row">
                                <div className="db-cam-left">
                                    <span className={`db-cam-rank${isTop ? ' is-top' : ''}`}>#{i + 1}</span>
                                    <div>
                                        <p className="db-cam-id">{cam.id}{isTop && <span className="db-cam-top-badge">{t('top_cameras.top_badge')}</span>}</p>
                                        <p className="db-cam-location">{t('top_cameras.location_prefix')} {cam.location}</p>
                                    </div>
                                </div>
                                <div className="db-cam-right">
                                    <span className={`db-cam-status ${cam.status}`}>{isOffline ? t('status.offline_indicator') : t('status.online_indicator')}</span>
                                    <div>
                                        <p className="db-cam-events-val">{fmt(cam.events)}</p>
                                        <p className="db-cam-events-label">{t('top_cameras.events_label')}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="db-cam-bar-row">
                                <div className="db-cam-bar-track"><div className="db-cam-bar-fill" style={{ width: `${barPct}%`, background: barColor }} /></div>
                                <span className="db-cam-share">{share}% {t('cameras_tab.top_cameras.of_total')}</span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};