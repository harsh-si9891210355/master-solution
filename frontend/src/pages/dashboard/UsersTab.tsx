import {
    Area, AreaChart, CartesianGrid, Cell,
    Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import type { UsersTabData } from './types/index';
import { useNsTranslation } from '@/hooks/Usetranslation';

interface UsersTabProps {
    data:   UsersTabData;
    locale: string;
}

const KpiCard = ({ label, value, sub, subColor, accent, icon }: {
    label: string; value: number | string; sub: string;
    subColor?: string; accent: string; icon: string;
}) => (
    <div className="db-kpi-card" style={{ border: `1px solid ${accent}22` }}>
        <div className="db-kpi-orb" style={{ background: `${accent}18` }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 18 }}>{icon}</span>
            <p className="db-kpi-label">{label}</p>
        </div>
        <p className="db-kpi-value">{value}</p>
        <p className="db-kpi-sub" style={{ color: subColor ?? accent }}>{sub}</p>
    </div>
);

export const UsersTab = ({ data, locale }: UsersTabProps) => {
    const { t } = useNsTranslation('dashboard');
    const fmt   = (n: number) => n.toLocaleString(locale);
    const total = data.roleBreakdown.reduce((s, r) => s + r.count, 0);

    return (
        <div className="db-tab-content">
            <div className="db-grid-4 db-grid-4--compact" style={{ marginBottom: 24 }}>
                <KpiCard label={t('users_tab.kpis.total')}    value={fmt(data.totalUsers)}       sub={t('users_tab.kpis.new_month',    { count: data.newThisMonth })}  accent="#3B82F6" icon="👥" />
                <KpiCard label={t('users_tab.kpis.active')}   value={fmt(data.activeUsers)}      sub={t('users_tab.kpis.active_month', { count: data.activeThisMonth })} subColor="#10B981" accent="#10B981" icon="✅" />
                <KpiCard label={t('users_tab.kpis.pending')}  value={fmt(data.pendingApprovals)} sub={t('users_tab.kpis.pending_today',{ count: data.pendingToday })}  subColor="#F59E0B" accent="#F59E0B" icon="⏳" />
                <KpiCard label={t('users_tab.kpis.suspended')}value={fmt(data.suspendedUsers)}   sub={t('users_tab.kpis.no_change')}                                   subColor="#94A3B8" accent="#EF4444" icon="🚫" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                {/* Login activity */}
                <div className="db-panel db-widget-panel">
                    <p className="db-panel-title">{t('users_tab.login_activity.title')}</p>
                    <p className="db-panel-sub">{t('users_tab.login_activity.subtitle')}</p>
                    <ResponsiveContainer width="100%" height={200}>
                        <AreaChart data={data.loginActivity} margin={{ top: 5, right: 10, bottom: 0, left: -10 }}>
                            <defs>
                                <linearGradient id="loginGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%"  stopColor="#3B82F6" stopOpacity={0.25} />
                                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                            <XAxis dataKey="date"  tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} />
                            <YAxis               tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} />
                            <Tooltip formatter={(v: number) => [v.toLocaleString(locale), t('users_tab.login_activity.tooltip_label')]} />
                            <Area type="monotone" dataKey="logins" stroke="#3B82F6" strokeWidth={2}
                                fill="url(#loginGrad)" dot={{ fill: '#3B82F6', r: 3 }} activeDot={{ r: 5 }} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* By role donut */}
                <div className="db-panel db-widget-panel">
                    <p className="db-panel-title">{t('users_tab.by_role.title')}</p>
                    <p className="db-panel-sub">{t('users_tab.by_role.subtitle', { total: fmt(total) })}</p>
                    <div className="db-donut-wrap" style={{ alignItems: 'center' }}>
                        <div style={{ position: 'relative', width: '45%', height: 160 }}>
                            <ResponsiveContainer width="100%" height={160}>
                                <PieChart>
                                    <Pie data={data.roleBreakdown} dataKey="count"
                                        cx="50%" cy="50%" innerRadius={48} outerRadius={72} paddingAngle={3}>
                                        {data.roleBreakdown.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                                    </Pie>
                                    <Tooltip formatter={(v: number) => [fmt(v), '']} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                                <span style={{ fontSize: 22, fontWeight: 800, color: '#0F172A' }}>{fmt(total)}</span>
                                <span style={{ fontSize: 10, color: '#94A3B8' }}>{t('users_tab.by_role.total_label')}</span>
                            </div>
                        </div>
                        <div className="db-donut-legend">
                            {data.roleBreakdown.map(entry => (
                                <div key={entry.role} className="db-donut-row">
                                    <span className="db-donut-dot" style={{ background: entry.color }} />
                                    <span className="db-donut-label">{entry.role}</span>
                                    <span className="db-donut-pct">{fmt(entry.count)} ({Math.round((entry.count / total) * 100)}%)</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};