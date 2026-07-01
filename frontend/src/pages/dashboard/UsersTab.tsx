import { useNavigate } from 'react-router';
import {
    Area, AreaChart, CartesianGrid, Cell,
    Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import type { UsersTabData, UsersTabProps } from './types/index';
import { useNsTranslation } from '@/hooks/Usetranslation';

// ─── Neon Aqua Cyber Teal Palette ───────────────────────────────────────────
const COLOR_PRIMARY     = '#06B6D4'; // Cyan        — total / primary
const COLOR_ONLINE      = '#34D399'; // Bright Emerald — active / positive
const COLOR_ACCENT      = '#818CF8'; // Soft Indigo — accent
const COLOR_MAINTENANCE = '#A78BFA'; // Lavender    — pending / warning
const COLOR_OFFLINE     = '#F472B6'; // Neon Pink   — suspended / alert

// Role donut override — replaces whatever colors come from the API/mock data
// Cycles through the palette so every slice gets a distinct cyber-teal color.
const ROLE_PALETTE = [
    COLOR_PRIMARY,
    COLOR_ONLINE,
    COLOR_ACCENT,
    COLOR_MAINTENANCE,
    COLOR_OFFLINE,
    '#22D3EE', // extra cyan variant if more than 5 roles
];
// ────────────────────────────────────────────────────────────────────────────

const KpiCard = ({ label, value, sub, subColor, accent, icon, className, onClick }: {
    label: string; value: number | string; sub: string;
    subColor?: string; accent: string; icon: string;
    className?: string; onClick?: () => void;
}) => (
    <div
        className={`db-kpi-card ${className || ''}`}
        onClick={onClick}
        style={{ border: `1px solid ${accent}22` }}
    >
        <div className="db-kpi-orb" style={{ background: `${accent}18` }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 18 }}>{icon}</span>
            <p className="db-kpi-label">{label}</p>
        </div>
        <p className="db-kpi-value">{value}</p>
        <p className="db-kpi-sub" style={{ color: subColor ?? accent }}>{sub}</p>
    </div>
);

export const UsersKpis = ({ data, locale }: { data: UsersTabData; locale: string }) => {
    const { t } = useNsTranslation('dashboard');
    const navigate = useNavigate();
    const fmt = (n: number) => n.toLocaleString(locale);

    return (
        <div className="db-grid-4 db-grid-4--compact" style={{ marginBottom: 20, width: '100%' }}>
            <KpiCard label={t('users_tab.kpis.total')}     value={fmt(data.totalUsers)}       sub={t('users_tab.kpis.new_month',    { count: data.newThisMonth })}   accent={COLOR_PRIMARY}     icon="👥" />
            <KpiCard label={t('users_tab.kpis.active')}    value={fmt(data.activeUsers)}      sub={t('users_tab.kpis.active_month', { count: data.activeThisMonth })} subColor={COLOR_ONLINE}     accent={COLOR_ONLINE}      icon="✅" />
            <KpiCard
                label={t('users_tab.kpis.pending')}
                value={fmt(data.pendingApprovals)}
                sub={t('users_tab.kpis.pending_today', { count: data.pendingToday })}
                subColor={COLOR_MAINTENANCE}
                accent={COLOR_MAINTENANCE}
                icon="⏳"
                className="is-clickable-pending"
                onClick={() => navigate('/users')}
            />
            <KpiCard label={t('users_tab.kpis.suspended')} value={fmt(data.suspendedUsers)}   sub={t('users_tab.kpis.no_change')}                                    subColor="#94A3B8"          accent={COLOR_OFFLINE}     icon="🚫" />
        </div>
    );
};

export const UsersLogin = ({ data, locale }: { data: UsersTabData; locale: string }) => {
    const { t } = useNsTranslation('dashboard');

    return (
        <div className="db-panel db-widget-panel" style={{ width: '100%' }}>
            <p className="db-panel-title">{t('users_tab.login_activity.title')}</p>
            <p className="db-panel-sub">{t('users_tab.login_activity.subtitle')}</p>
            <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={data.loginActivity} margin={{ top: 5, right: 10, bottom: 0, left: -10 }}>
                    <defs>
                        <linearGradient id="loginGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor={COLOR_PRIMARY} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={COLOR_PRIMARY} stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.06)" vertical={false} />
                    <XAxis dataKey="date" tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={((v: any) => [Number(v).toLocaleString(locale), t('users_tab.login_activity.tooltip_label')]) as any} />
                    <Area
                        type="monotone"
                        dataKey="logins"
                        stroke={COLOR_PRIMARY}
                        strokeWidth={2}
                        fill="url(#loginGrad)"
                        dot={{ fill: COLOR_PRIMARY, r: 3 }}
                        activeDot={{ r: 5, fill: COLOR_ONLINE, stroke: COLOR_PRIMARY, strokeWidth: 2 }}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};

export const UsersRole = ({ data, locale }: { data: UsersTabData; locale: string }) => {
    const { t } = useNsTranslation('dashboard');
    const fmt = (n: number) => n.toLocaleString(locale);
    const total = data.roleBreakdown.reduce((s, r) => s + r.count, 0);

    return (
        <div className="db-panel db-widget-panel" style={{ width: '100%' }}>
            <p className="db-panel-title">{t('users_tab.by_role.title')}</p>
            <p className="db-panel-sub">{t('users_tab.by_role.subtitle', { total: fmt(total) })}</p>
            <div className="db-donut-wrap" style={{ alignItems: 'center' }}>
                <div style={{ position: 'relative', width: '45%', height: 160 }}>
                    <ResponsiveContainer width="100%" height={160}>
                        <PieChart>
                            <Pie
                                data={data.roleBreakdown}
                                dataKey="count"
                                cx="50%" cy="50%"
                                innerRadius={48} outerRadius={72}
                                paddingAngle={3}
                            >
                                {data.roleBreakdown.map((_, i) => (
                                    // Override entry.color with our cyber-teal palette
                                    <Cell key={i} fill={ROLE_PALETTE[i % ROLE_PALETTE.length]} />
                                ))}
                            </Pie>
                            <Tooltip formatter={((v: any) => [fmt(Number(v)), '']) as any} />
                        </PieChart>
                    </ResponsiveContainer>
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                        <span style={{ fontSize: 22, fontWeight: 800, color: '#ffffff' }}>{fmt(total)}</span>
                        <span style={{ fontSize: 10, color: '#94A3B8' }}>{t('users_tab.by_role.total_label')}</span>
                    </div>
                </div>
                <div className="db-donut-legend">
                    {data.roleBreakdown.map((entry, i) => (
                        <div key={entry.role} className="db-donut-row" style={{ padding: '4px 0' }}>
                            <span className="db-donut-dot" style={{ background: ROLE_PALETTE[i % ROLE_PALETTE.length] }} />
                            <span className="db-donut-label">{entry.role}</span>
                            <span className="db-donut-pct">{fmt(entry.count)} ({Math.round((entry.count / total) * 100)}%)</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export const UsersTab = ({ data, locale }: UsersTabProps) => {
    return (
        <div className="db-tab-content">
            <UsersKpis data={data} locale={locale} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <UsersLogin data={data} locale={locale} />
                <UsersRole data={data} locale={locale} />
            </div>
        </div>
    );
};