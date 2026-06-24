import { create } from 'zustand';
import type { Alert } from '@/pages/dashboard/notifications/types';

const MAX_LIVE_ALERTS = 200;

interface AlertState {
    /** Most-recent-first list of alerts seen this session (live + last fetch). */
    alerts: Alert[];
    unreadCount: number;
    isConnected: boolean;

    setConnected: (connected: boolean) => void;
    /** Replace the list from a REST fetch (does not change unreadCount). */
    setAlerts: (alerts: Alert[]) => void;
    /** A new alert arrived over the socket. */
    addAlert: (alert: Alert) => void;
    /** A lifecycle update arrived — merge by id. */
    upsertAlert: (alert: Alert) => void;
    markAllRead: () => void;
    reset: () => void;
}

export const useAlertStore = create<AlertState>((set) => ({
    alerts: [],
    unreadCount: 0,
    isConnected: false,

    setConnected: (connected) => set({ isConnected: connected }),

    setAlerts: (alerts) => set({ alerts }),

    addAlert: (alert) =>
        set((state) => {
            if (state.alerts.some((a) => a.id === alert.id)) return state;
            return {
                alerts: [alert, ...state.alerts].slice(0, MAX_LIVE_ALERTS),
                unreadCount: state.unreadCount + 1,
            };
        }),

    upsertAlert: (alert) =>
        set((state) => {
            const idx = state.alerts.findIndex((a) => a.id === alert.id);
            if (idx === -1) return { alerts: [alert, ...state.alerts].slice(0, MAX_LIVE_ALERTS) };
            const next = [...state.alerts];
            next[idx] = { ...next[idx], ...alert };
            return { alerts: next };
        }),

    markAllRead: () => set({ unreadCount: 0 }),

    reset: () => set({ alerts: [], unreadCount: 0 }),
}));
