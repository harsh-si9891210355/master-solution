import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAlertStore } from '@/store/alertStore';
import { useToast } from '@/components/ui/ToastProvider';
import { alertService } from '../api/alertService';
import { formatTime, SEVERITY_COLOR } from '../constants';
import { ThreatRadar } from './ThreatRadar';

const Kpi = ({ label, value, accent }: { label: string; value: number; accent: string }) => (
    <div className="rounded-2xl border border-slate-200 bg-white p-4" style={{ borderColor: `${accent}33` }}>
        <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
        <p className="mt-1 text-3xl font-bold" style={{ color: accent }}>{value}</p>
    </div>
);

export function CommandView() {
    const toast = useToast();
    const liveAlerts = useAlertStore((s) => s.alerts);
    const isConnected = useAlertStore((s) => s.isConnected);

    const sendTest = async () => {
        try {
            await alertService.sendTest();
            // The alert arrives back over the WebSocket → toast + bell fire on their own.
        } catch {
            toast.error('Could not send test', 'Is the backend reachable?');
        }
    };

    const { data, refetch } = useQuery({
        queryKey: ['alerts', 'command'],
        queryFn: () => alertService.getAlerts({ page: 1, page_size: 50 }).then((r) => r.data),
    });
    useEffect(() => { if (liveAlerts.length) refetch(); }, [liveAlerts.length, refetch]);

    const alerts = data?.alerts ?? [];
    const stats = useMemo(() => ({
        critical: alerts.filter((a) => a.severity === 'CRITICAL').length,
        high: alerts.filter((a) => a.severity === 'HIGH').length,
        total: data?.total ?? alerts.length,
        active: alerts.filter((a) => !['RESOLVED', 'CLOSED'].includes(a.status)).length,
    }), [alerts, data]);

    const feed = alerts.slice(0, 8);

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between">
                <span
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
                    style={{ background: isConnected ? '#34D39922' : '#9CA3AF22', color: isConnected ? '#0e9f6e' : '#6b7280' }}
                >
                    <span className="h-2 w-2 rounded-full" style={{ background: isConnected ? '#34D399' : '#9CA3AF' }} />
                    {isConnected ? 'Real-time connected' : 'Reconnecting…'}
                </span>
                <button
                    type="button"
                    onClick={sendTest}
                    className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
                >
                    Send Test Alert
                </button>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Kpi label="Critical" value={stats.critical} accent={SEVERITY_COLOR.CRITICAL} />
                <Kpi label="High" value={stats.high} accent={SEVERITY_COLOR.HIGH} />
                <Kpi label="Total Alerts" value={stats.total} accent="#06B6D4" />
                <Kpi label="Active" value={stats.active} accent="#A78BFA" />
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="mb-3 flex items-center justify-between">
                        <p className="text-sm font-semibold text-slate-800">Live Alert Feed</p>
                        <span className="flex items-center gap-1.5 text-xs text-slate-400">
                            <span className="h-2 w-2 rounded-full" style={{ background: isConnected ? '#34D399' : '#9CA3AF' }} />
                            {isConnected ? 'Live' : 'Offline'}
                        </span>
                    </div>
                    {feed.length === 0 ? (
                        <p className="text-sm text-slate-400">No alerts yet.</p>
                    ) : (
                        <ul className="space-y-2">
                            {feed.map((a) => (
                                <li key={a.id} className="flex items-center gap-3 rounded-lg border border-slate-100 px-3 py-2">
                                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: SEVERITY_COLOR[a.severity] }} />
                                    <span className="flex-1 text-sm font-medium text-slate-700">{a.title}</span>
                                    <span className="text-xs text-slate-500">{a.location_name}</span>
                                    <span className="text-xs text-slate-400">{formatTime(a.event_start_time)}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
                <ThreatRadar />
            </div>
        </div>
    );
}
