import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { AlertCenterView } from './components/AlertCenterView';
import { CommandView } from './components/CommandView';
import { NotificationSettingsView } from './components/NotificationSettingsView';

type View = 'overview' | 'alerts' | 'settings';

const VIEWS: { key: View; label: string; icon: string; hint: string }[] = [
    { key: 'overview', label: 'Overview', icon: '📡', hint: 'Live status and recent activity at a glance' },
    { key: 'alerts', label: 'Alerts', icon: '🔔', hint: 'Review, filter and act on every alert' },
    { key: 'settings', label: 'Settings', icon: '⚙️', hint: 'Channels, quiet hours, sound and escalation rules' },
];

const isView = (v: string | null): v is View =>
    v === 'overview' || v === 'alerts' || v === 'settings';

export function NotificationTab() {
    const [searchParams] = useSearchParams();
    const initial = searchParams.get('view');
    const [view, setView] = useState<View>(isView(initial) ? initial : 'overview');

    const active = VIEWS.find((v) => v.key === view) ?? VIEWS[0];

    return (
        <div className="space-y-5">
            {/* Sub-nav */}
            <div className="flex flex-wrap gap-2">
                {VIEWS.map((v) => (
                    <button
                        key={v.key}
                        type="button"
                        onClick={() => setView(v.key)}
                        title={v.hint}
                        className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                            view === v.key
                                ? 'bg-blue-700 text-white'
                                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                        }`}
                    >
                        <span>{v.icon}</span>
                        <span>{v.label}</span>
                    </button>
                ))}
            </div>

            {/* Plain-language description of the active view */}
            <p className="text-sm text-slate-400">{active.hint}</p>

            {view === 'overview' && <CommandView />}
            {view === 'alerts' && <AlertCenterView />}
            {view === 'settings' && <NotificationSettingsView />}
        </div>
    );
}
