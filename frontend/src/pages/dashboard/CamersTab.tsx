import { useState } from 'react';
import { useNavigate } from 'react-router';
import {
    Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts';
import type { CamerasTabData, CamerasTabProps } from './types/index';
import { useNsTranslation } from '@/hooks/Usetranslation';



export const CamerasKpis = ({ data, locale }: { data: CamerasTabData; locale: string }) => {
    const { t } = useNsTranslation('dashboard');
    const navigate = useNavigate();
    const fmt = (n: number) => n.toLocaleString(locale);
    const fmtPct = (n: number) => `${n}%`;

    const kpis = [
        { label: t('cameras_tab.kpis.total'), value: fmt(194), sub: t('cameras_tab.kpis.total_sub'), accent: '#3B82F6', icon: '📹' },
        { label: t('cameras_tab.kpis.online'), value: fmt(5), sub: fmtPct(Math.round((5 / 194) * 100)) + ' ' + t('cameras_tab.kpis.online_pct'), accent: '#10B981', icon: '🟢' },
        {
            label: t('cameras_tab.kpis.offline'),
            value: fmt(166),
            sub: t('cameras_tab.kpis.offline_sub'),
            accent: '#EF4444',
            icon: '🔴',
            clickable: true,
            // Navigate with state so CameraList pre-applies the inactive filter
            onClick: () => navigate('/cameras', { state: { statusFilter: 'inactive' } }),
        },
        { label: t('cameras_tab.kpis.maintenance'), value: fmt(23), sub: t('cameras_tab.kpis.maintenance_sub'), accent: '#F59E0B', icon: '🔧' },
    ];

    return (
        <div className="db-grid-4 db-grid-4--compact" style={{ marginBottom: 20, width: '100%' }}>
            {kpis.map(kpi => (
                <div
                    key={kpi.label}
                    className={`db-kpi-card ${kpi.clickable ? 'is-clickable' : ''}`}
                    onClick={kpi.onClick}
                    style={{ border: `1px solid ${kpi.accent}22`, cursor: kpi.clickable ? 'pointer' : undefined }}
                >
                    <div className="db-kpi-orb" style={{ background: `${kpi.accent}18` }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 18 }}>{kpi.icon}</span>
                        <p className="db-kpi-label">{kpi.label}</p>
                    </div>
                    <p className="db-kpi-value">{kpi.value}</p>
                    <p className="db-kpi-sub" style={{ color: kpi.accent }}>
                        {kpi.sub}
                        {kpi.clickable && (
                            <span style={{ marginLeft: 6, fontSize: 10, opacity: 0.8 }}>
                                → {t('cameras_tab.kpis.view_all', { defaultValue: 'View all' })}
                            </span>
                        )}
                    </p>
                </div>
            ))}
        </div>
    );
};

export const CamerasTrend = ({ data, locale }: { data: CamerasTabData; locale: string }) => {
    const { t } = useNsTranslation('dashboard');
    const fmt = (n: number) => n.toLocaleString(locale);

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 20, marginBottom: 20, width: '100%' }}>
            {/* Health trend */}
            <div className="db-panel db-widget-panel">
                <p className="db-panel-title">{t('cameras_tab.health_trend.title')}</p>
                <p className="db-panel-sub">{t('cameras_tab.health_trend.subtitle')}</p>
                <ResponsiveContainer width="100%" height={210}>
                    <BarChart data={data.healthTrend} margin={{ top: 5, right: 10, bottom: 0, left: -20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                        <XAxis dataKey="date" tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} />
                        <Tooltip
                            contentStyle={{ background: '#0f172a', borderColor: 'rgba(255,255,255,0.1)', borderRadius: 8 }}
                            itemStyle={{ color: '#fff', fontSize: 12 }}
                            formatter={((v: any) => [fmt(Number(v)), '']) as any}
                        />
                        <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                        <Bar dataKey="online"  name={t('cameras_tab.health_trend.online_label')}  fill="#10B981" radius={[4,4,0,0]} stackId="a" />
                        <Bar dataKey="offline" name={t('cameras_tab.health_trend.offline_label')} fill="#EF4444" radius={[4,4,0,0]} stackId="a" />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Grid stats overview card */}
            <div className="db-panel db-widget-panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                    <p className="db-panel-title">Operations Control Center</p>
                    <p className="db-panel-sub" style={{ marginBottom: 16 }}>Unified diagnostics and system status signals.</p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: 6, border: '1px solid rgba(255,255,255,0.04)' }}>
                            <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Average Uptime</span>
                            <span style={{ color: '#10B981', fontWeight: 600, fontSize: 13 }}>99.85%</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: 6, border: '1px solid rgba(255,255,255,0.04)' }}>
                            <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Total Incidents Logged</span>
                            <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 13 }}>1,284 Events</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: 6, border: '1px solid rgba(255,255,255,0.04)' }}>
                            <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Pending Diagnostics</span>
                            <span style={{ color: '#F59E0B', fontWeight: 600, fontSize: 13 }}>3 Units</span>
                        </div>
                    </div>
                </div>

                <div style={{
                    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(139, 92, 246, 0.05) 100%)',
                    border: '1px solid rgba(59, 130, 246, 0.2)',
                    padding: 12,
                    borderRadius: 8,
                    marginTop: 16
                }}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>⚡ ENTERPRISE CONNECTIVITY</p>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: '1.4' }}>All video ingestion nodes operating over Secure RTSP tunnels. Direct edge analytics synchronized.</p>
                </div>
            </div>
        </div>
    );
};

export const CamerasHub = ({ data, locale }: { data: CamerasTabData; locale: string }) => {
    const { t } = useNsTranslation('dashboard');
    const [filter, setFilter] = useState<'all' | 'online' | 'offline' | 'maintenance'>('all');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(0);
    const [chartPage, setChartPage] = useState(0);
    const pageSize = 5;
    const chartPageSize = 6; // locations visible per chart page

    // ── Location health data straight from API ────────────────────────────────
    // locationCoverage shape: { location, online, maintenance, offline }[]
    const locationHealthData = (data.locationCoverage ?? [])
        .map(l => ({ name: l.location, online: l.online, maintenance: l.maintenance, offline: l.offline }))
        .sort((a, b) => a.name.localeCompare(b.name));

    // ── Camera ledger: still generated from totals for demo; swap with real API list when available ──
    const cameras = Array.from({ length: data.totalCameras ?? 194 }).map((_, i) => {
        const id = i + 1;
        const camId = `CAM-${String(id).padStart(3, '0')}`;

        let status: 'online' | 'offline' | 'maintenance' = 'offline';
        if (id <= (data.onlineCameras ?? 5)) status = 'online';
        else if (id <= (data.onlineCameras ?? 5) + (data.maintenanceDue ?? 23)) status = 'maintenance';

        const locationList = (data.locationCoverage ?? []).map(l => l.location);
        const fallback = ['Front Gate', 'Entry Gate', 'Exit Gate', 'Loading Bay', 'Warehouse', 'Parking Area'];
        const pool = locationList.length > 0 ? locationList : fallback;
        const location = pool[id % pool.length];

        const uptime = status === 'online' ? 99.9 : status === 'maintenance' ? 94.2 : 82.4;

        return { id: camId, status, location, uptime };
    });

    const chartPageCount = Math.ceil(locationHealthData.length / chartPageSize);
    const chartSlice = locationHealthData.slice(
        chartPage * chartPageSize,
        (chartPage + 1) * chartPageSize
    );

    const filteredCameras = cameras.filter(cam => {
        const matchesFilter = filter === 'all' || cam.status === filter;
        const matchesSearch = cam.id.toLowerCase().includes(search.toLowerCase()) ||
                            cam.location.toLowerCase().includes(search.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    const pageCount = Math.ceil(filteredCameras.length / pageSize);
    const paginatedCameras = filteredCameras.slice(page * pageSize, (page + 1) * pageSize);

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearch(e.target.value);
        setPage(0);
    };

    const handleFilterChange = (tab: 'all' | 'online' | 'offline' | 'maintenance') => {
        setFilter(tab);
        setPage(0);
    };

    return (
        <div className="db-panel db-widget-panel" style={{ width: '100%' }}>
            <p className="db-panel-title">Camera Health & Device Ledger</p>
            <p className="db-panel-sub" style={{ marginBottom: 20 }}>Live status breakdown across all locations with searchable camera index.</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.3fr', gap: 32, alignItems: 'start' }}>
                {/* Dynamic Location Health Chart */}
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-heading)' }}>
                            Device Status by Location
                        </p>
                        {chartPageCount > 1 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                                    {chartPage + 1} / {chartPageCount}
                                </span>
                                <button
                                    disabled={chartPage === 0}
                                    onClick={() => setChartPage(p => p - 1)}
                                    style={{
                                        padding: '2px 7px', fontSize: 11, borderRadius: 4,
                                        border: '1px solid rgba(255,255,255,0.06)',
                                        background: 'rgba(255,255,255,0.02)',
                                        color: chartPage === 0 ? 'var(--text-dim)' : '#fff',
                                        cursor: chartPage === 0 ? 'not-allowed' : 'pointer'
                                    }}
                                >‹</button>
                                <button
                                    disabled={chartPage === chartPageCount - 1}
                                    onClick={() => setChartPage(p => p + 1)}
                                    style={{
                                        padding: '2px 7px', fontSize: 11, borderRadius: 4,
                                        border: '1px solid rgba(255,255,255,0.06)',
                                        background: 'rgba(255,255,255,0.02)',
                                        color: chartPage === chartPageCount - 1 ? 'var(--text-dim)' : '#fff',
                                        cursor: chartPage === chartPageCount - 1 ? 'not-allowed' : 'pointer'
                                    }}
                                >›</button>
                            </div>
                        )}
                    </div>
                    <ResponsiveContainer width="100%" height={chartSlice.length * 38 + 40}>
                        <BarChart
                            data={chartSlice}
                            layout="vertical"
                            margin={{ top: 5, right: 10, left: 15, bottom: 5 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
                            <XAxis type="number" tick={{ fill: '#64748B', fontSize: 10 }} axisLine={false} tickLine={false} />
                            <YAxis dataKey="name" type="category" tick={{ fill: '#e2e8f0', fontSize: 11, fontWeight: 500 }} axisLine={false} tickLine={false} width={90} />
                            <Tooltip
                                contentStyle={{ background: '#0f172a', borderColor: 'rgba(255,255,255,0.1)', borderRadius: 8 }}
                                itemStyle={{ fontSize: 11, color: '#fff' }}
                            />
                            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                            <Bar dataKey="online" name="Online" stackId="a" fill="#10B981" />
                            <Bar dataKey="maintenance" name="Maintenance" stackId="a" fill="#F59E0B" />
                            <Bar dataKey="offline" name="Offline" stackId="a" fill="#EF4444" radius={[0, 4, 4, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Searchable and Paginated Ledger */}
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                        <div style={{ display: 'flex', gap: 4 }}>
                            {(['all', 'online', 'offline', 'maintenance'] as const).map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => handleFilterChange(tab)}
                                    style={{
                                        padding: '4px 8px',
                                        borderRadius: 4,
                                        fontSize: 10,
                                        fontWeight: 700,
                                        border: filter === tab ? '1px solid rgba(255,255,255,0.15)' : '1px solid transparent',
                                        background: filter === tab ? 'rgba(255,255,255,0.08)' : 'transparent',
                                        color: filter === tab ? '#fff' : 'var(--text-muted)',
                                        cursor: 'pointer',
                                        textTransform: 'uppercase'
                                    }}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>
                        <div className="db-search-wrapper" style={{ minWidth: 160 }}>
                            <span className="db-search-icon" style={{ fontSize: 11 }}>🔍</span>
                            <input
                                type="text"
                                placeholder="Search Cam ID..."
                                value={search}
                                onChange={handleSearchChange}
                                className="db-search-input"
                                style={{ padding: '4px 8px 4px 22px', fontSize: 11 }}
                            />
                        </div>
                    </div>

                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                                <th style={{ padding: '8px 10px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600 }}>Device ID</th>
                                <th style={{ padding: '8px 10px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600 }}>Location</th>
                                <th style={{ padding: '8px 10px', textAlign: 'right', color: 'var(--text-muted)', fontWeight: 600 }}>Uptime</th>
                                <th style={{ padding: '8px 10px', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 600 }}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedCameras.map(cam => (
                                <tr key={cam.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                                    <td style={{ padding: '8px 10px', color: 'var(--text-primary)', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{cam.id}</td>
                                    <td style={{ padding: '8px 10px', color: 'var(--text-dimmer)' }}>{cam.location}</td>
                                    <td style={{ padding: '8px 10px', color: 'var(--text-primary)', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{cam.uptime}%</td>
                                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                                        <span style={{
                                            display: 'inline-block',
                                            width: 6,
                                            height: 6,
                                            borderRadius: '50%',
                                            background: cam.status === 'online' ? '#10b981' : cam.status === 'offline' ? '#ef4444' : '#f59e0b',
                                            boxShadow: `0 0 6px ${cam.status === 'online' ? '#10b981' : cam.status === 'offline' ? '#ef4444' : '#f59e0b'}`
                                        }} />
                                    </td>
                                </tr>
                            ))}
                            {filteredCameras.length === 0 && (
                                <tr>
                                    <td colSpan={4} style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-dim)' }}>
                                        No devices matched criteria.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>

                    {/* Pagination */}
                    {pageCount > 1 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                Showing {page * pageSize + 1} - {Math.min((page + 1) * pageSize, filteredCameras.length)} of {filteredCameras.length}
                            </span>
                            <div style={{ display: 'flex', gap: 6 }}>
                                <button
                                    disabled={page === 0}
                                    onClick={() => setPage(p => p - 1)}
                                    style={{
                                        padding: '2px 8px',
                                        fontSize: 11,
                                        borderRadius: 4,
                                        border: '1px solid rgba(255,255,255,0.06)',
                                        background: 'rgba(255,255,255,0.02)',
                                        color: page === 0 ? 'var(--text-dim)' : '#fff',
                                        cursor: page === 0 ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    Prev
                                </button>
                                <button
                                    disabled={page === pageCount - 1}
                                    onClick={() => setPage(p => p + 1)}
                                    style={{
                                        padding: '2px 8px',
                                        fontSize: 11,
                                        borderRadius: 4,
                                        border: '1px solid rgba(255,255,255,0.06)',
                                        background: 'rgba(255,255,255,0.02)',
                                        color: page === pageCount - 1 ? 'var(--text-dim)' : '#fff',
                                        cursor: page === pageCount - 1 ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export const CamerasTab = ({ data, locale }: CamerasTabProps) => {
    return (
        <div className="db-tab-content">
            <CamerasKpis data={data} locale={locale} />
            <CamerasTrend data={data} locale={locale} />
            <CamerasHub data={data} locale={locale} />
        </div>
    );
};