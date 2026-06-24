import { formatTime } from '../constants';
import type { AlertTimelineEntry } from '../types';

const ACTION_LABEL: Record<string, string> = {
    created: 'Alert created',
    'status:ack': 'Acknowledged',
    'status:investigating': 'Under investigation',
    'status:resolved': 'Resolved',
    'status:closed': 'Closed',
    'status:incident': 'Incident created',
    incident_created: 'Incident created',
    snooze: 'Snoozed',
};

export function AlertTimeline({ entries }: { entries: AlertTimelineEntry[] }) {
    if (!entries.length) {
        return <p className="text-sm text-slate-400">No timeline entries.</p>;
    }
    return (
        <ol className="relative space-y-4 border-l border-slate-200 pl-5">
            {entries.map((e) => (
                <li key={e.id} className="relative">
                    <span className="absolute -left-[23px] top-1 h-3 w-3 rounded-full border-2 border-white bg-cyan-400" />
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-slate-700">
                            {ACTION_LABEL[e.action] ?? e.action}
                        </p>
                        <span className="text-xs text-slate-400">{formatTime(e.created_at)}</span>
                    </div>
                    {e.note && <p className="text-xs text-slate-500">{e.note}</p>}
                    {e.actor_name && <p className="text-xs text-slate-400">by {e.actor_name}</p>}
                </li>
            ))}
        </ol>
    );
}
