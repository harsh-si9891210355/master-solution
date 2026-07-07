import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAlertStore } from '@/store/alertStore';
import { alertService } from '../api/alertService';
import { formatTime, SEVERITY_COLOR } from '../constants';
import type { Alert, Severity } from '../types';

const SEVERITY_RADIUS: Record<Severity, number> = { CRITICAL: 28, HIGH: 52, MEDIUM: 76, LOW: 100 };
const SIZE = 260;
const CENTER = SIZE / 2;

// Deterministic angle from location id so a zone always plots in the same place.
const angleFor = (locationId: number) => (locationId * 47) % 360;

function plot(alert: Alert): { x: number; y: number } {
    const radius = SEVERITY_RADIUS[alert.severity] ?? 100;
    const rad = (angleFor(alert.location_id) * Math.PI) / 180;
    return { x: CENTER + radius * Math.cos(rad), y: CENTER + radius * Math.sin(rad) };
}

export function ThreatRadar() {
    const liveAlerts = useAlertStore((s) => s.alerts);
    const { data, refetch } = useQuery({
        queryKey: ['alerts', 'radar'],
        queryFn: () => alertService.getAlerts({ page: 1, page_size: 50 }).then((r) => r.data),
    });

    useEffect(() => { if (liveAlerts.length) refetch(); }, [liveAlerts.length, refetch]);

    const alerts = data?.alerts ?? [];
    const critical = useMemo(
        () => alerts.filter((a) => a.severity === 'CRITICAL' || a.severity === 'HIGH').slice(0, 6),
        [alerts],
    );

    return (
        <div className="grid gap-4 lg:grid-cols-[auto_1fr]">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="mb-2 text-sm font-semibold text-slate-800">Threat Radar (Live)</p>
                <svg width={SIZE} height={SIZE} className="mx-auto block">
                    {[100, 76, 52, 28].map((r) => (
                        <circle key={r} cx={CENTER} cy={CENTER} r={r} fill="none" stroke="rgba(148,163,184,0.18)" />
                    ))}
                    <line x1={CENTER} y1={0} x2={CENTER} y2={SIZE} stroke="rgba(148,163,184,0.12)" />
                    <line x1={0} y1={CENTER} x2={SIZE} y2={CENTER} stroke="rgba(148,163,184,0.12)" />
                    {alerts.map((a) => {
                        const { x, y } = plot(a);
                        const color = SEVERITY_COLOR[a.severity];
                        return (
                            <g key={a.id}>
                                <circle cx={x} cy={y} r={6} fill={color} opacity={0.9}>
                                    <animate attributeName="r" values="6;10;6" dur="2s" repeatCount="indefinite" />
                                </circle>
                            </g>
                        );
                    })}
                </svg>
                <div className="mt-2 flex justify-center gap-4 text-[11px] text-slate-400">
                    {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as Severity[]).map((s) => (
                        <span key={s} className="flex items-center gap-1">
                            <span className="h-2 w-2 rounded-full" style={{ background: SEVERITY_COLOR[s] }} />{s}
                        </span>
                    ))}
                </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="mb-3 text-sm font-semibold text-slate-800">Recent Critical Alerts</p>
                {critical.length === 0 ? (
                    <p className="text-sm text-slate-400">No high-severity alerts.</p>
                ) : (
                    <ul className="space-y-2">
                        {critical.map((a) => (
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
        </div>
    );
}
