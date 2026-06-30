import { useEffect, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/components/ui/ToastProvider';
import { notificationService } from '../api/notificationService';
import { disableWebPush, enableWebPush, isWebPushSupported } from '@/lib/webpush';
import type { NotificationPreference, Severity } from '../types';
import { EscalationBuilderView } from './EscalationBuilderView';

const Toggle = ({ on, onChange, disabled }: { on: boolean; onChange: () => void; disabled?: boolean }) => (
    <button
        type="button"
        disabled={disabled}
        onClick={onChange}
        className={`relative h-6 w-11 rounded-full transition-colors ${on ? 'bg-cyan-500' : 'bg-slate-300'} disabled:opacity-50`}
    >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
);

const Row = ({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) => (
    <div className="flex items-center justify-between border-b border-slate-100 py-3 last:border-0">
        <div>
            <p className="text-sm font-medium text-slate-700">{title}</p>
            {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
        </div>
        {children}
    </div>
);

type TabKey = 'channels' | 'preferences' | 'quiet' | 'sound' | 'escalation';

export function NotificationSettingsView() {
    const toast = useToast();
    const [tab, setTab] = useState<TabKey>('channels');
    const [pref, setPref] = useState<NotificationPreference | null>(null);
    const [saving, setSaving] = useState(false);

    const { data } = useQuery({
        queryKey: ['notification-preferences'],
        queryFn: () => notificationService.getPreferences().then((r) => r.data),
    });
    useEffect(() => { if (data) setPref(data); }, [data]);

    const patch = (p: Partial<NotificationPreference>) =>
        setPref((prev) => (prev ? { ...prev, ...p } : prev));

    const persist = async (p: Partial<NotificationPreference>) => {
        setSaving(true);
        try {
            const { data: updated } = await notificationService.updatePreferences(p);
            setPref(updated);
            toast.success('Preferences saved');
        } catch {
            toast.error('Failed to save');
        } finally {
            setSaving(false);
        }
    };

    const toggleWebPush = async () => {
        if (!pref) return;
        if (!pref.web_push_enabled) {
            const result = await enableWebPush();
            if (!result.ok) {
                toast.error('Web Push not enabled', result.reason === 'denied' ? 'Permission denied' : result.reason);
                return;
            }
            await persist({ web_push_enabled: true });
        } else {
            await disableWebPush();
            await persist({ web_push_enabled: false });
        }
    };

    const TABS: { key: TabKey; label: string }[] = [
        { key: 'channels', label: 'Channels' },
        { key: 'preferences', label: 'User Preferences' },
        { key: 'quiet', label: 'Quiet Hours' },
        { key: 'sound', label: 'Sound' },
        { key: 'escalation', label: 'Escalation' },
    ];

    const input = 'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700';

    return (
        <div className="space-y-4">
            <div className="flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white px-3">
                {TABS.map((t) => (
                    <button
                        key={t.key}
                        type="button"
                        onClick={() => setTab(t.key)}
                        className={`whitespace-nowrap px-3 py-3 text-sm font-medium ${tab === t.key ? 'border-b-2 border-cyan-500 text-cyan-600' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {tab === 'escalation' && <EscalationBuilderView />}

            {!pref && tab !== 'escalation' && (
                <div className="rounded-2xl border border-slate-200 bg-white p-5 py-10 text-center text-slate-400">
                    Loading settings…
                </div>
            )}

            {pref && tab !== 'escalation' && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
            {tab === 'channels' && (
                <div>
                    <Row title="In-App (Web)" subtitle="Real-time alerts inside the application">
                        <Toggle on={pref.in_app_enabled} onChange={() => persist({ in_app_enabled: !pref.in_app_enabled })} disabled={saving} />
                    </Row>
                    <Row title="Web Push" subtitle="Browser push notifications even when the tab is closed">
                        <Toggle on={pref.web_push_enabled} onChange={toggleWebPush} disabled={saving || !isWebPushSupported()} />
                    </Row>
                    <Row title="Email" subtitle="Receive alerts via email">
                        <Toggle on={pref.email_enabled} onChange={() => persist({ email_enabled: !pref.email_enabled })} disabled={saving} />
                    </Row>
                    {!isWebPushSupported() && (
                        <p className="mt-2 text-xs text-amber-500">Web Push is not supported in this browser.</p>
                    )}
                </div>
            )}

            {tab === 'preferences' && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-700">Minimum severity</p>
                            <p className="text-xs text-slate-400">Don't notify below this level</p>
                        </div>
                        <select className={input} value={pref.min_severity} onChange={(e) => patch({ min_severity: e.target.value as Severity })}>
                            {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <Row title="Mute all notifications for 1 hour" subtitle={pref.muted_until ? `Muted until ${new Date(pref.muted_until).toLocaleString()}` : 'Not muted'}>
                        <button type="button" className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200" onClick={() => persist({ muted_until: new Date(Date.now() + 3600_000).toISOString() })}>Mute 1h</button>
                    </Row>
                    <div className="flex justify-end">
                        <button type="button" disabled={saving} onClick={() => persist({ min_severity: pref.min_severity })} className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-600 disabled:opacity-50">Save</button>
                    </div>
                </div>
            )}

            {tab === 'quiet' && (
                <div className="space-y-4">
                    <Row title="Enable quiet hours" subtitle="Suppress non-critical alerts during these hours">
                        <Toggle on={pref.quiet_hours_enabled} onChange={() => patch({ quiet_hours_enabled: !pref.quiet_hours_enabled })} />
                    </Row>
                    <div className="flex flex-wrap items-center gap-3">
                        <label className="text-sm text-slate-600">From
                            <input type="time" className={`${input} ml-2`} value={pref.quiet_hours_start ?? ''} onChange={(e) => patch({ quiet_hours_start: e.target.value })} />
                        </label>
                        <label className="text-sm text-slate-600">To
                            <input type="time" className={`${input} ml-2`} value={pref.quiet_hours_end ?? ''} onChange={(e) => patch({ quiet_hours_end: e.target.value })} />
                        </label>
                    </div>
                    <Row title="Let CRITICAL alerts break through" subtitle="Critical alerts are always delivered">
                        <Toggle on={pref.override_critical} onChange={() => patch({ override_critical: !pref.override_critical })} />
                    </Row>
                    <div className="flex justify-end">
                        <button type="button" disabled={saving} onClick={() => persist({ quiet_hours_enabled: pref.quiet_hours_enabled, quiet_hours_start: pref.quiet_hours_start, quiet_hours_end: pref.quiet_hours_end, override_critical: pref.override_critical })} className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-600 disabled:opacity-50">Save</button>
                    </div>
                </div>
            )}

            {tab === 'sound' && (
                <div className="space-y-4">
                    <Row title="Alert sound" subtitle="Play a sound on new alerts">
                        <Toggle on={pref.sound_enabled} onChange={() => patch({ sound_enabled: !pref.sound_enabled })} />
                    </Row>
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-slate-700">Sound</p>
                        <select className={input} value={pref.sound_name} onChange={(e) => patch({ sound_name: e.target.value })}>
                            {['default', 'chime', 'alarm', 'subtle'].map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div className="flex justify-end">
                        <button type="button" disabled={saving} onClick={() => persist({ sound_enabled: pref.sound_enabled, sound_name: pref.sound_name })} className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-600 disabled:opacity-50">Save</button>
                    </div>
                </div>
            )}
            </div>
            )}
        </div>
    );
}
