import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useToast } from '@/components/ui/ToastProvider';
import { escalationService, type EscalationRulePayload } from '../api/escalationService';
import type { EscalationRule, NotificationChannel } from '../types';

interface Role { id: number; code: string; name: string }
const CHANNELS: NotificationChannel[] = ['IN_APP', 'EMAIL', 'WEB_PUSH'];

interface DraftStep { wait_seconds: number; escalate_to_role_id: number | null; channels: NotificationChannel[] }

const emptyDraft = (): { name: string; severity_filter: string; steps: DraftStep[] } => ({
    name: '',
    severity_filter: '',
    steps: [{ wait_seconds: 60, escalate_to_role_id: null, channels: ['IN_APP'] }],
});

export function EscalationBuilderView() {
    const toast = useToast();
    const qc = useQueryClient();
    const [draft, setDraft] = useState(emptyDraft());

    const { data: rolesData } = useQuery({
        queryKey: ['roles'],
        queryFn: () => api.get<{ roles: Role[] }>('/roles').then((r) => r.data.roles),
    });
    const roles = rolesData ?? [];

    const { data } = useQuery({
        queryKey: ['escalation-rules'],
        queryFn: () => escalationService.getRules().then((r) => r.data.rules),
    });
    const rules = data ?? [];

    const createMut = useMutation({
        mutationFn: (payload: EscalationRulePayload) => escalationService.createRule(payload),
        onSuccess: () => {
            toast.success('Escalation rule saved');
            setDraft(emptyDraft());
            qc.invalidateQueries({ queryKey: ['escalation-rules'] });
        },
        onError: () => toast.error('Failed to save rule'),
    });

    const toggleMut = useMutation({
        mutationFn: (rule: EscalationRule) =>
            escalationService.updateRule(rule.id, { name: rule.name, enabled: !rule.enabled }),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['escalation-rules'] }),
    });

    const deleteMut = useMutation({
        mutationFn: (id: number) => escalationService.deleteRule(id),
        onSuccess: () => {
            toast.success('Rule deleted');
            qc.invalidateQueries({ queryKey: ['escalation-rules'] });
        },
    });

    const addStep = () =>
        setDraft((d) => ({ ...d, steps: [...d.steps, { wait_seconds: 60, escalate_to_role_id: null, channels: ['IN_APP'] }] }));

    const updateStep = (i: number, patch: Partial<DraftStep>) =>
        setDraft((d) => ({ ...d, steps: d.steps.map((s, idx) => (idx === i ? { ...s, ...patch } : s)) }));

    const removeStep = (i: number) =>
        setDraft((d) => ({ ...d, steps: d.steps.filter((_, idx) => idx !== i) }));

    const save = () => {
        if (!draft.name.trim()) { toast.warn('Rule name is required'); return; }
        createMut.mutate({
            name: draft.name,
            severity_filter: draft.severity_filter || null,
            enabled: true,
            steps: draft.steps.map((s, idx) => ({
                step_order: idx + 1,
                wait_seconds: s.wait_seconds,
                escalate_to_role_id: s.escalate_to_role_id,
                channels: s.channels,
            })),
        });
    };

    const input = 'rounded-lg border border-slate-300 px-3 py-2 text-sm';

    return (
        <div className="grid gap-5 lg:grid-cols-2">
            {/* Builder */}
            <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
                <h3 className="text-base font-semibold text-slate-800">Escalation Rule Builder</h3>
                <input className={`${input} w-full`} placeholder="Rule name (e.g. No Walking Zone — Escalation)" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
                <select className={`${input} w-full`} value={draft.severity_filter} onChange={(e) => setDraft({ ...draft, severity_filter: e.target.value })}>
                    <option value="">Any severity</option>
                    {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((s) => <option key={s} value={s}>{s}</option>)}
                </select>

                <p className="text-sm font-semibold text-slate-600">Escalation steps</p>
                <div className="space-y-3">
                    {draft.steps.map((step, i) => (
                        <div key={i} className="rounded-xl border border-slate-200 p-3">
                            <div className="mb-2 flex items-center justify-between">
                                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-500 text-xs font-bold text-white">{i + 1}</span>
                                {draft.steps.length > 1 && (
                                    <button type="button" onClick={() => removeStep(i)} className="text-xs text-rose-500">Remove</button>
                                )}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-sm">
                                <span className="text-slate-500">Wait</span>
                                <input type="number" min={0} className={`${input} w-24`} value={step.wait_seconds} onChange={(e) => updateStep(i, { wait_seconds: Number(e.target.value) })} />
                                <span className="text-slate-500">sec → escalate to</span>
                                <select className={input} value={step.escalate_to_role_id ?? ''} onChange={(e) => updateStep(i, { escalate_to_role_id: e.target.value ? Number(e.target.value) : null })}>
                                    <option value="">Select role</option>
                                    {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                                </select>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2">
                                {CHANNELS.map((ch) => {
                                    const active = step.channels.includes(ch);
                                    return (
                                        <button
                                            key={ch}
                                            type="button"
                                            onClick={() => updateStep(i, { channels: active ? step.channels.filter((c) => c !== ch) : [...step.channels, ch] })}
                                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${active ? 'bg-cyan-500 text-white' : 'bg-slate-100 text-slate-500'}`}
                                        >
                                            {ch.replace('_', '-')}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
                <button type="button" onClick={addStep} className="rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-500 hover:bg-slate-50">+ Add Step</button>

                <div className="flex justify-end">
                    <button type="button" disabled={createMut.isPending} onClick={save} className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-600 disabled:opacity-50">Save Rule</button>
                </div>
            </div>

            {/* Existing rules */}
            <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
                <h3 className="text-base font-semibold text-slate-800">Active Rules</h3>
                {rules.length === 0 && <p className="text-sm text-slate-400">No escalation rules yet.</p>}
                {rules.map((rule) => (
                    <div key={rule.id} className="rounded-xl border border-slate-200 p-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-semibold text-slate-700">{rule.name}</p>
                                <p className="text-xs text-slate-400">{rule.severity_filter || 'Any severity'} · {rule.steps.length} step{rule.steps.length === 1 ? '' : 's'}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button type="button" onClick={() => toggleMut.mutate(rule)} className={`rounded-full px-2.5 py-1 text-xs font-medium ${rule.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{rule.enabled ? 'Enabled' : 'Disabled'}</button>
                                <button type="button" onClick={() => deleteMut.mutate(rule.id)} className="text-xs text-rose-500">Delete</button>
                            </div>
                        </div>
                        <ol className="mt-2 space-y-1 text-xs text-slate-500">
                            {rule.steps.map((s) => (
                                <li key={s.step_order}>#{s.step_order} · wait {s.wait_seconds}s → {s.escalate_to_role_name ?? 'role'} ({s.channels.join(', ')})</li>
                            ))}
                        </ol>
                    </div>
                ))}
            </div>
        </div>
    );
}
