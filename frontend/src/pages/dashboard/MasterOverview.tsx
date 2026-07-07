import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

import { EventTrendPanel } from '@/pages/dashboard/EventTrendPanel';
import { UsersLogin, UsersRole } from '@/pages/dashboard/UsersTab';
import { CamerasTrend } from '@/pages/dashboard/CamersTab';
import { ThreatRadar } from '@/pages/dashboard/notifications/components/ThreatRadar';
import type { DashboardTab, MonthPoint, TFunction } from '@/pages/dashboard/types';

// ── Neon Aqua Cyber Teal Palette (mirrors the tabs) ──────────────────────────
const COLOR_PRIMARY     = '#06B6D4'; // Cyan
const COLOR_ONLINE      = '#34D399'; // Bright Emerald
const COLOR_OFFLINE     = '#F472B6'; // Neon Pink
const COLOR_MAINTENANCE = '#A78BFA'; // Lavender
// ─────────────────────────────────────────────────────────────────────────────

interface EventTypePoint { type: string; label: string; count: number; color: string }

interface MasterOverviewProps {
    data: any;
    monthlyData: MonthPoint[];
    hourlyTemplate: { hour: string; events: number }[];
    eventTypes: EventTypePoint[];
    locale: string;
    t: TFunction;
    onNavigate: (tab: DashboardTab) => void;
}

// ── Section header with a "jump to full tab" link ───────────────────────────────
function SectionHeader({ icon, title, subtitle, openLabel, onOpen }: {
    icon: string; title: string; subtitle: string; openLabel: string; onOpen: () => void;
}) {
    return (
        <div className="db-master-section-head">
            <div className="db-master-section-headtext">
                <p className="db-master-section-title"><span aria-hidden="true">{icon}</span> {title}</p>
                <p className="db-master-section-sub">{subtitle}</p>
            </div>
            <button type="button" className="db-master-open-btn" onClick={onOpen}>
                {openLabel} <span aria-hidden="true">→</span>
            </button>
        </div>
    );
}

// ── Compact SVG health ring (mirrors the AI Insight health view) ────────────────
function HealthRing({ score, color, title, sub }: { score: number; color: string; title: string; sub: string }) {
    const r = 34, cx = 44, cy = 44, circ = 2 * Math.PI * r;
    return (
        <div className="db-master-ring-card">
            <svg width="88" height="88" viewBox="0 0 88 88">
                <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(15,23,42,0.07)" strokeWidth="8" />
                <circle
                    cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="8"
                    strokeDasharray={circ} strokeDashoffset={circ * (1 - score / 100)}
                    strokeLinecap="round" transform={`rotate(-90 ${cx} ${cy})`}
                    style={{ transition: 'stroke-dashoffset 1s ease' }}
                />
                <text x={cx} y={cy} fill={color} textAnchor="middle" dominantBaseline="middle"
                    fontSize="20" fontWeight="700" fontFamily="inherit">{score}</text>
            </svg>
            <p className="db-master-ring-title">{title}</p>
            <p className="db-master-ring-sub" style={{ color }}>{sub}</p>
        </div>
    );
}

export const MasterOverview = ({
    data, monthlyData, hourlyTemplate, eventTypes, locale, t, onNavigate,
}: MasterOverviewProps) => {
    const fmt = (n: number) => n.toLocaleString(locale);
    const pct = (n: number) => `${Math.round(n)}%`;

    const events = data.eventsTab;
    const cameras = data.camerasTab;
    const users = data.usersTab;

    const camOnlinePct = Math.round((cameras.onlineCameras / cameras.totalCameras) * 100);
    const usersActivePct = Math.round((users.activeUsers / users.totalUsers) * 100);
    const eventsResolvedPct = Math.round((events.resolvedEvents / events.totalEvents) * 100);

    // ── Executive snapshot — the one number that matters from each domain ──────
    const heroKpis = [
        { label: t('master.kpi.total_events'),   value: fmt(events.totalEvents),  sub: t('master.kpi.total_events_sub', { pct: pct(eventsResolvedPct) }), accent: COLOR_PRIMARY,     icon: '📋', tab: 'events'        as DashboardTab },
        { label: t('master.kpi.critical'),       value: fmt(events.criticalEvents), sub: t('master.kpi.critical_sub'),                                   accent: COLOR_OFFLINE,     icon: '🚨', tab: 'notifications' as DashboardTab },
        { label: t('master.kpi.cameras_online'), value: `${fmt(cameras.onlineCameras)}/${fmt(cameras.totalCameras)}`, sub: t('master.kpi.cameras_online_sub', { pct: pct(camOnlinePct) }), accent: COLOR_ONLINE, icon: '📹', tab: 'cameras' as DashboardTab },
        { label: t('master.kpi.active_users'),    value: fmt(users.activeUsers),   sub: t('master.kpi.active_users_sub', { pct: pct(usersActivePct) }),  accent: COLOR_MAINTENANCE, icon: '👥', tab: 'users'         as DashboardTab },
    ];

    const eventTypesTotal = eventTypes.reduce((s, e) => s + e.count, 0);

    return (
        <div className="db-master">
            {/* ── Executive snapshot KPIs (one per domain) ───────────────────── */}
            <div className="db-grid-4 db-grid-4--compact" style={{ marginBottom: 8 }}>
                {heroKpis.map(card => (
                    <button
                        key={card.label}
                        type="button"
                        className="db-kpi-card db-master-kpi"
                        onClick={() => onNavigate(card.tab)}
                        style={{ border: `1px solid ${card.accent}22` }}
                    >
                        <div className="db-kpi-orb" style={{ background: `${card.accent}18` }} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <span style={{ fontSize: 18 }}>{card.icon}</span>
                            <p className="db-kpi-label">{card.label}</p>
                        </div>
                        <p className="db-kpi-value">{card.value}</p>
                        <p className="db-kpi-sub" style={{ color: card.accent }}>{card.sub}</p>
                    </button>
                ))}
            </div>

            {/* ── AI Insights — system health at a glance ────────────────────── */}
            <SectionHeader
                icon="🤖" title={t('tabs.ai')} subtitle={t('master.ai_sub')}
                openLabel={t('master.open', { tab: t('tabs.ai') })} onOpen={() => onNavigate('ai')}
            />
            <div className="db-panel db-widget-panel" style={{ marginBottom: 20 }}>
                <div className="db-master-rings">
                    <HealthRing score={eventsResolvedPct} color={COLOR_PRIMARY}     title={t('tabs.events')}  sub={t('master.health.resolved', { pct: pct(eventsResolvedPct) })} />
                    <HealthRing score={camOnlinePct}      color={COLOR_OFFLINE}      title={t('tabs.cameras')} sub={t('master.health.online', { pct: pct(camOnlinePct) })} />
                    <HealthRing score={usersActivePct}    color={COLOR_MAINTENANCE}  title={t('tabs.users')}   sub={t('master.health.active', { pct: pct(usersActivePct) })} />
                </div>
            </div>

            {/* ── Events — trend + type breakdown ────────────────────────────── */}
            <SectionHeader
                icon="📊" title={t('tabs.events')} subtitle={t('master.events_sub')}
                openLabel={t('master.open', { tab: t('tabs.events') })} onOpen={() => onNavigate('events')}
            />
            <div className="db-master-events-grid">
                <EventTrendPanel locale={locale} monthlyData={monthlyData} hourlyTemplate={hourlyTemplate} t={t} />
                <div className="db-panel db-widget-panel">
                    <p className="db-panel-title">{t('panels.event_types.title')}</p>
                    <p className="db-panel-sub">{t('panels.event_types.subtitle')}</p>
                    <div className="db-donut-wrap">
                        <ResponsiveContainer width="45%" height={160}>
                            <PieChart>
                                <Pie data={eventTypes} dataKey="count" cx="50%" cy="50%" innerRadius={48} outerRadius={72} paddingAngle={3}>
                                    {eventTypes.map((item, i) => <Cell key={i} fill={item.color} />)}
                                </Pie>
                                <Tooltip formatter={((v: number | string) => typeof v === 'number' ? fmt(v) : String(v ?? '')) as any} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="db-donut-legend">
                            {eventTypes.map(item => (
                                <div key={item.type} className="db-donut-row">
                                    <span className="db-donut-dot" style={{ background: item.color }} />
                                    <span className="db-donut-label">{item.label}</span>
                                    <span className="db-donut-pct">{eventTypesTotal > 0 ? pct((item.count / eventTypesTotal) * 100) : '0%'}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Cameras — health trend + ops center ────────────────────────── */}
            <SectionHeader
                icon="📹" title={t('tabs.cameras')} subtitle={t('master.cameras_sub')}
                openLabel={t('master.open', { tab: t('tabs.cameras') })} onOpen={() => onNavigate('cameras')}
            />
            <CamerasTrend data={cameras} locale={locale} />

            {/* ── Users — login activity + role mix ──────────────────────────── */}
            <SectionHeader
                icon="👥" title={t('tabs.users')} subtitle={t('master.users_sub')}
                openLabel={t('master.open', { tab: t('tabs.users') })} onOpen={() => onNavigate('users')}
            />
            <div className="db-master-users-grid">
                <UsersLogin data={users} locale={locale} />
                <UsersRole data={users} locale={locale} />
            </div>

            {/* ── Notifications — live threat radar ──────────────────────────── */}
            <SectionHeader
                icon="🔔" title={t('tabs.notifications')} subtitle={t('master.notifications_sub')}
                openLabel={t('master.open', { tab: t('tabs.notifications') })} onOpen={() => onNavigate('notifications')}
            />
            <div style={{ marginBottom: 8 }}>
                <ThreatRadar />
            </div>
        </div>
    );
};

export default MasterOverview;
