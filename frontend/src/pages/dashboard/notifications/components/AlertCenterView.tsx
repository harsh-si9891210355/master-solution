import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAlertStore } from '@/store/alertStore';
import { alertService, type AlertFilters } from '../api/alertService';
import { CATEGORIES, CATEGORY_LABEL, formatTime, SEVERITIES, SEVERITY_COLOR, STATUS_COLOR, STATUSES } from '../constants';
import type { Alert } from '../types';
import { AlertDrawer } from './AlertDrawer';

const Pill = ({ label, color }: { label: string; color: string }) => (
    <span
        className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold"
        style={{ color, background: `${color}1f`, border: `1px solid ${color}40` }}
    >
        {label}
    </span>
);

export function AlertCenterView() {
    const [filters, setFilters] = useState<AlertFilters>({ page: 1, page_size: 25 });
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const isConnected = useAlertStore((s) => s.isConnected);
    const liveAlerts = useAlertStore((s) => s.alerts);

    const { data, isLoading, refetch } = useQuery({
        queryKey: ['alerts', filters],
        queryFn: () => alertService.getAlerts(filters).then((r) => r.data),
        placeholderData: (prev) => prev,
    });

    // Refetch whenever a live alert arrives so the table stays current.
    useEffect(() => {
        if (liveAlerts.length) refetch();
    }, [liveAlerts.length, refetch]);

    const rows = data?.alerts ?? [];
    const total = data?.total ?? 0;
    const pageSize = filters.page_size ?? 25;
    const page = filters.page ?? 1;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    const updateFilter = (patch: Partial<AlertFilters>) =>
        setFilters((f) => ({ ...f, ...patch, page: patch.page ?? 1 }));

    const selectClass =
        'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-400/40';

    const activeCount = useMemo(
        () => rows.filter((a) => !['RESOLVED', 'CLOSED'].includes(a.status)).length,
        [rows],
    );

    return (
        <div className="space-y-4">
            {/* Header / filters */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold text-slate-800">Alert Center</h3>
                    <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-600">
                        {activeCount} active
                    </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                    <span
                        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium"
                        style={{ background: isConnected ? '#34D39922' : '#9CA3AF22', color: isConnected ? '#0e9f6e' : '#6b7280' }}
                    >
                        <span className="h-2 w-2 rounded-full" style={{ background: isConnected ? '#34D399' : '#9CA3AF' }} />
                        {isConnected ? 'Live' : 'Reconnecting…'}
                    </span>
                </div>
            </div>

            <div className="flex flex-wrap gap-2">
                <select className={selectClass} value={filters.severity ?? ''} onChange={(e) => updateFilter({ severity: e.target.value || undefined })}>
                    <option value="">All Severities</option>
                    {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <select className={selectClass} value={filters.status ?? ''} onChange={(e) => updateFilter({ status: e.target.value || undefined })}>
                    <option value="">All Status</option>
                    {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <select className={selectClass} value={filters.category ?? ''} onChange={(e) => updateFilter({ category: e.target.value || undefined })}>
                    <option value="">All Categories</option>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
                </select>
            </div>

            {/* Table */}
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                            <th className="px-4 py-3">Time</th>
                            <th className="px-4 py-3">Severity</th>
                            <th className="px-4 py-3">Alert</th>
                            <th className="px-4 py-3">Category</th>
                            <th className="px-4 py-3">Location</th>
                            <th className="px-4 py-3">Camera</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading && (
                            <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-400">Loading alerts…</td></tr>
                        )}
                        {!isLoading && rows.length === 0 && (
                            <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-400">No alerts yet. Detections will appear here in real time.</td></tr>
                        )}
                        {rows.map((alert: Alert) => (
                            <tr key={alert.id} className="border-b border-slate-50 hover:bg-slate-50/70">
                                <td className="px-4 py-3 whitespace-nowrap text-slate-500">{formatTime(alert.event_start_time)}</td>
                                <td className="px-4 py-3"><Pill label={alert.severity} color={SEVERITY_COLOR[alert.severity]} /></td>
                                <td className="px-4 py-3 font-medium text-slate-800">
                                    {alert.title}
                                    {alert.occurrence_count > 1 && (
                                        <span className="ml-2 text-xs text-slate-400">×{alert.occurrence_count}</span>
                                    )}
                                </td>
                                <td className="px-4 py-3 text-slate-600">{CATEGORY_LABEL[alert.category]}</td>
                                <td className="px-4 py-3 text-slate-600">{alert.location_name}</td>
                                <td className="px-4 py-3 text-slate-600">{alert.camera_name}</td>
                                <td className="px-4 py-3"><Pill label={alert.status} color={STATUS_COLOR[alert.status]} /></td>
                                <td className="px-4 py-3 text-right">
                                    <button
                                        type="button"
                                        onClick={() => setSelectedId(alert.id)}
                                        className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-medium text-cyan-600 hover:bg-cyan-50"
                                    >
                                        View
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{total} alert{total === 1 ? '' : 's'}</span>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        disabled={page <= 1}
                        onClick={() => updateFilter({ page: page - 1 })}
                        className="rounded-lg border border-slate-200 px-3 py-1 disabled:opacity-40"
                    >Prev</button>
                    <span>Page {page} / {totalPages}</span>
                    <button
                        type="button"
                        disabled={page >= totalPages}
                        onClick={() => updateFilter({ page: page + 1 })}
                        className="rounded-lg border border-slate-200 px-3 py-1 disabled:opacity-40"
                    >Next</button>
                </div>
            </div>

            <AlertDrawer alertId={selectedId} onClose={() => setSelectedId(null)} onChanged={() => refetch()} />
        </div>
    );
}
