export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type AlertStatus = 'NEW' | 'ACK' | 'INVESTIGATING' | 'INCIDENT' | 'RESOLVED' | 'CLOSED';
export type AlertCategory =
    | 'SAFETY_VIOLATION' | 'SECURITY' | 'INTRUSION' | 'PPE' | 'CROWD' | 'OTHER';
export type NotificationChannel = 'IN_APP' | 'WEB_PUSH' | 'EMAIL';

export interface Alert {
    id: number;
    event_id: number | null;
    camera_id: number;
    camera_name: string;
    location_id: number;
    location_name: string;
    usecase_id: number;
    usecase_name: string;
    title: string;
    severity: Severity;
    category: AlertCategory;
    status: AlertStatus;
    evidence_url: string | null;
    occurrence_count: number;
    event_start_time: string;
    event_end_time: string;
    acknowledged_by: number | null;
    acknowledged_at: string | null;
    incident_id: number | null;
    created_at: string;
    updated_at: string | null;
}

export interface AlertsResponse {
    alerts: Alert[];
    total: number;
    page: number;
    page_size: number;
}

export interface AlertTimelineEntry {
    id: number;
    action: string;
    from_status: string | null;
    to_status: string | null;
    note: string | null;
    actor_id: number | null;
    actor_name: string | null;
    created_at: string;
}

export interface AlertDetail extends Alert {
    timeline: AlertTimelineEntry[];
    related_alerts: Alert[];
}

export interface NotificationPreference {
    user_id: number;
    in_app_enabled: boolean;
    web_push_enabled: boolean;
    email_enabled: boolean;
    min_severity: Severity;
    quiet_hours_enabled: boolean;
    quiet_hours_start: string | null;
    quiet_hours_end: string | null;
    quiet_hours_timezone: string;
    override_critical: boolean;
    muted_until: string | null;
    sound_enabled: boolean;
    sound_name: string;
}

export interface EscalationStep {
    id?: number;
    step_order: number;
    wait_seconds: number;
    escalate_to_role_id: number | null;
    escalate_to_role_name?: string | null;
    channels: NotificationChannel[];
}

export interface EscalationRule {
    id: number;
    name: string;
    alias_name: string | null;
    usecase_id: number | null;
    event_type: string | null;
    severity_filter: string | null;
    enabled: boolean;
    created_by: number | null;
    created_at: string;
    updated_at: string | null;
    steps: EscalationStep[];
}

/** Real-time WebSocket message envelope. */
export type AlertSocketMessage =
    | { type: 'connected'; user_id: number }
    | { type: 'ping' }
    | { type: 'alert.new'; alert: Alert }
    | { type: 'alert.update'; alert: Alert };
