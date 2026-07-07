import { useState } from 'react';
import { Dialog } from 'primereact/dialog';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/components/ui/ToastProvider';
import { alertService } from '../api/alertService';
import { CATEGORY_LABEL, formatTime, SEVERITY_COLOR, STATUS_COLOR } from '../constants';
import { AlertTimeline } from './AlertTimeline';

interface Props {
    alertId: number | null;
    onClose: () => void;
    onChanged: () => void;
}

const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];

export function AlertDrawer({ alertId, onClose, onChanged }: Props) {
    const toast = useToast();
    const [busy, setBusy] = useState(false);
    const [showIncidentForm, setShowIncidentForm] = useState(false);
    const [incident, setIncident] = useState({ issue_type: '', priority: 'High', summary: '', description: '' });

    const { data: alert, refetch, isLoading } = useQuery({
        queryKey: ['alert', alertId],
        queryFn: () => alertService.getAlert(alertId as number).then((r) => r.data),
        enabled: alertId != null,
    });

    const run = async (fn: () => Promise<unknown>, ok: string) => {
        setBusy(true);
        try {
            await fn();
            toast.success(ok);
            await refetch();
            onChanged();
        } catch {
            toast.error('Action failed');
        } finally {
            setBusy(false);
        }
    };

    const submitIncident = async () => {
        if (!alert) return;
        if (!incident.issue_type.trim()) { toast.warn('Issue type is required'); return; }
        await run(
            () => alertService.createIncident(alert.id, incident).then((r) => {
                toast.success('Incident created', r.data.incident_id);
            }),
            'Incident created',
        );
        setShowIncidentForm(false);
    };

    const actionBtn = 'rounded-lg px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50';

    return (
        <Dialog
            visible={alertId != null}
            onHide={onClose}
            header={alert ? alert.title : 'Alert details'}
            style={{ width: 'min(94vw, 44rem)' }}
            modal
            dismissableMask
        >
            {isLoading || !alert ? (
                <div className="py-10 text-center text-slate-400">Loading…</div>
            ) : (
                <div className="space-y-5">
                    {/* Badges */}
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full px-2.5 py-1 text-xs font-semibold" style={{ color: SEVERITY_COLOR[alert.severity], background: `${SEVERITY_COLOR[alert.severity]}1f` }}>{alert.severity}</span>
                        <span className="rounded-full px-2.5 py-1 text-xs font-semibold" style={{ color: STATUS_COLOR[alert.status], background: `${STATUS_COLOR[alert.status]}1f` }}>{alert.status}</span>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{CATEGORY_LABEL[alert.category]}</span>
                    </div>

                    {/* Evidence */}
                    {alert.evidence_url && (
                        <video src={alert.evidence_url} controls className="w-full rounded-xl bg-black" style={{ maxHeight: 320 }} />
                    )}

                    {/* Meta grid */}
                    <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                        <Meta label="Camera" value={alert.camera_name} />
                        <Meta label="Location" value={alert.location_name} />
                        <Meta label="Type" value={alert.usecase_name} />
                        <Meta label="Occurred" value={formatTime(alert.event_start_time)} />
                        <Meta label="Occurrences" value={String(alert.occurrence_count)} />
                        {alert.incident_id && <Meta label="Incident" value={`#${alert.incident_id}`} />}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                        <button type="button" disabled={busy} onClick={() => run(() => alertService.acknowledge(alert.id), 'Acknowledged')} className={`${actionBtn} bg-blue-50 text-blue-700 hover:bg-blue-100`}>Acknowledge</button>
                        <button type="button" disabled={busy} onClick={() => run(() => alertService.changeStatus(alert.id, 'INVESTIGATING'), 'Investigating')} className={`${actionBtn} bg-violet-50 text-violet-700 hover:bg-violet-100`}>Investigate</button>
                        <button type="button" disabled={busy} onClick={() => setShowIncidentForm((v) => !v)} className={`${actionBtn} bg-orange-50 text-orange-700 hover:bg-orange-100`}>Create Incident</button>
                        <button type="button" disabled={busy} onClick={() => run(() => alertService.changeStatus(alert.id, 'RESOLVED'), 'Resolved')} className={`${actionBtn} bg-emerald-50 text-emerald-700 hover:bg-emerald-100`}>Resolve</button>
                        <button type="button" disabled={busy} onClick={() => run(() => alertService.snooze(alert.id, 60), 'Snoozed 1h')} className={`${actionBtn} bg-slate-100 text-slate-600 hover:bg-slate-200`}>Snooze</button>
                    </div>

                    {/* Incident form */}
                    {showIncidentForm && (
                        <div className="space-y-3 rounded-xl border border-orange-200 bg-orange-50/50 p-4">
                            <p className="text-sm font-semibold text-slate-700">Create Incident</p>
                            <input
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                                placeholder="Issue type (e.g. No Walking Zone Violation)"
                                value={incident.issue_type}
                                onChange={(e) => setIncident({ ...incident, issue_type: e.target.value })}
                            />
                            <div className="flex gap-3">
                                <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={incident.priority} onChange={(e) => setIncident({ ...incident, priority: e.target.value })}>
                                    {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
                                </select>
                                <input className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Summary" value={incident.summary} onChange={(e) => setIncident({ ...incident, summary: e.target.value })} />
                            </div>
                            <textarea className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" rows={2} placeholder="Description" value={incident.description} onChange={(e) => setIncident({ ...incident, description: e.target.value })} />
                            <div className="flex justify-end gap-2">
                                <button type="button" onClick={() => setShowIncidentForm(false)} className={`${actionBtn} bg-slate-100 text-slate-600`}>Cancel</button>
                                <button type="button" disabled={busy} onClick={submitIncident} className={`${actionBtn} bg-orange-500 text-white hover:bg-orange-600`}>Create</button>
                            </div>
                        </div>
                    )}

                    {/* Timeline */}
                    <div className="border-t border-slate-100 pt-4">
                        <p className="mb-3 text-sm font-semibold text-slate-700">Timeline</p>
                        <AlertTimeline entries={alert.timeline} />
                    </div>

                    {/* Related */}
                    {alert.related_alerts.length > 0 && (
                        <div className="border-t border-slate-100 pt-4">
                            <p className="mb-2 text-sm font-semibold text-slate-700">Related alerts</p>
                            <ul className="space-y-1 text-sm text-slate-600">
                                {alert.related_alerts.map((r) => (
                                    <li key={r.id} className="flex items-center justify-between">
                                        <span>{r.title}</span>
                                        <span className="text-xs text-slate-400">{formatTime(r.event_start_time)}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </Dialog>
    );
}

const Meta = ({ label, value }: { label: string; value: string }) => (
    <div>
        <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
        <p className="font-medium text-slate-700">{value}</p>
    </div>
);
