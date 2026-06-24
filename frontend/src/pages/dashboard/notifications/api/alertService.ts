import api from '@/lib/api';
import type { Alert, AlertDetail, AlertsResponse } from '../types';

export interface AlertFilters {
    severity?: string;
    status?: string;
    category?: string;
    usecase_id?: number;
    location_id?: number;
    page?: number;
    page_size?: number;
}

export interface AlertActionResponse {
    message: string;
    alert: Alert;
}

export const alertService = {
    getAlerts: (filters: AlertFilters = {}) =>
        api.get<AlertsResponse>('/alert', { params: filters }),
    getAlert: (id: number) => api.get<AlertDetail>(`/alert/${id}`),
    acknowledge: (id: number) => api.post<AlertActionResponse>(`/alert/${id}/acknowledge`),
    changeStatus: (id: number, status: string, note?: string) =>
        api.post<AlertActionResponse>(`/alert/${id}/status`, { status, note }),
    snooze: (id: number, minutes: number) =>
        api.post<AlertActionResponse>(`/alert/${id}/snooze`, { minutes }),
    createIncident: (
        id: number,
        body: { issue_type: string; priority: string; summary?: string; description?: string },
    ) => api.post<{ message: string; incident_id: string; alert: Alert }>(`/alert/${id}/incident`, body),
    sendTest: () => api.post<{ message: string }>('/alert/test'),
};
