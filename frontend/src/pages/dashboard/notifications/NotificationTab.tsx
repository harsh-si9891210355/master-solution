import { useState } from 'react';
import { AlertCenterView } from './components/AlertCenterView';
import { CommandView } from './components/CommandView';
import { EscalationBuilderView } from './components/EscalationBuilderView';
import { NotificationSettingsView } from './components/NotificationSettingsView';
import { ThreatRadar } from './components/ThreatRadar';

type View = 'command' | 'alerts' | 'radar' | 'escalation' | 'settings';

const VIEWS: { key: View; label: string; icon: string }[] = [
    { key: 'command', label: 'Command', icon: '🛰️' },
    { key: 'alerts', label: 'Alert Center', icon: '🔔' },
    { key: 'radar', label: 'Threat Radar', icon: '🎯' },
    { key: 'escalation', label: 'Escalation', icon: '⏫' },
    { key: 'settings', label: 'Settings', icon: '⚙️' },
];

export function NotificationTab() {
    const [view, setView] = useState<View>('command');

    return (
        <div className="space-y-5">
            {/* Sub-nav */}
            <div className="flex flex-wrap gap-2">
                {VIEWS.map((v) => (
                    <button
                        key={v.key}
                        type="button"
                        onClick={() => setView(v.key)}
                        className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                            view === v.key
                                ? 'bg-slate-900 text-white'
                                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                        }`}
                    >
                        <span>{v.icon}</span>
                        <span>{v.label}</span>
                    </button>
                ))}
            </div>

            {view === 'command' && <CommandView />}
            {view === 'alerts' && <AlertCenterView />}
            {view === 'radar' && <ThreatRadar />}
            {view === 'escalation' && <EscalationBuilderView />}
            {view === 'settings' && <NotificationSettingsView />}
        </div>
    );
}
