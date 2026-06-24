import api from '@/lib/api';
import type { EscalationRule, EscalationStep } from '../types';

export interface EscalationRulePayload {
    name: string;
    alias_name?: string | null;
    usecase_id?: number | null;
    event_type?: string | null;
    severity_filter?: string | null;
    enabled?: boolean;
    steps?: Omit<EscalationStep, 'id' | 'escalate_to_role_name'>[];
}

export const escalationService = {
    getRules: () => api.get<{ rules: EscalationRule[] }>('/escalation/rules'),
    createRule: (body: EscalationRulePayload) => api.post<EscalationRule>('/escalation/rules', body),
    updateRule: (id: number, body: EscalationRulePayload) =>
        api.put<EscalationRule>(`/escalation/rules/${id}`, body),
    deleteRule: (id: number) => api.delete<{ message: string }>(`/escalation/rules/${id}`),
};
