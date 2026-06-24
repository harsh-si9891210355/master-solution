import type { AlertCategory, AlertStatus, Severity } from './types';

// Aligned with the dashboard's neon palette.
export const SEVERITY_COLOR: Record<Severity, string> = {
    LOW: '#06B6D4',
    MEDIUM: '#F59E0B',
    HIGH: '#FB923C',
    CRITICAL: '#F472B6',
};

export const STATUS_COLOR: Record<AlertStatus, string> = {
    NEW: '#F472B6',
    ACK: '#06B6D4',
    INVESTIGATING: '#A78BFA',
    INCIDENT: '#FB923C',
    RESOLVED: '#34D399',
    CLOSED: '#64748B',
};

export const CATEGORY_LABEL: Record<AlertCategory, string> = {
    SAFETY_VIOLATION: 'Safety Violation',
    SECURITY: 'Security',
    INTRUSION: 'Intrusion',
    PPE: 'PPE',
    CROWD: 'Crowd',
    OTHER: 'Other',
};

export const SEVERITIES: Severity[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
export const STATUSES: AlertStatus[] = ['NEW', 'ACK', 'INVESTIGATING', 'INCIDENT', 'RESOLVED', 'CLOSED'];
export const CATEGORIES: AlertCategory[] = [
    'SAFETY_VIOLATION', 'SECURITY', 'INTRUSION', 'PPE', 'CROWD', 'OTHER',
];

export const formatTime = (iso: string | null): string => {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString(undefined, {
        month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit',
    });
};
