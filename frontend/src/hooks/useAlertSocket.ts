import { useEffect, useRef } from 'react';
import { useAlertStore } from '@/store/alertStore';
import { useAuthStore } from '@/store/authStore';
import { getFreshAccessToken } from '@/lib/auth0Token';
import { useToast } from '@/components/ui/ToastProvider';
import type { Alert, AlertSocketMessage } from '@/pages/dashboard/notifications/types';

/** Derive the ws(s):// URL for /ws/alerts from VITE_WS_URL or VITE_API_URL. */
function resolveWsUrl(): string {
    const explicit = import.meta.env.VITE_WS_URL as string | undefined;
    if (explicit) return explicit;
    const apiUrl = (import.meta.env.VITE_API_URL as string | undefined) ?? '';
    try {
        const url = new URL(apiUrl, window.location.origin);
        url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
        url.pathname = `${url.pathname.replace(/\/$/, '')}/ws/alerts`;
        url.search = '';
        return url.toString();
    } catch {
        const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        return `${proto}//${window.location.host}/api/v1/ws/alerts`;
    }
}

const severityToToast = (severity: string): 'error' | 'warn' | 'info' => {
    if (severity === 'CRITICAL' || severity === 'HIGH') return 'error';
    if (severity === 'MEDIUM') return 'warn';
    return 'info';
};

/**
 * Opens a single authenticated WebSocket to the backend, funnels alert events
 * into the alert store, and raises a toast for each new alert. Auto-reconnects
 * with capped exponential backoff. Mount ONCE (in MasterLayout).
 *
 * The effect deliberately depends only on the auth token: store actions are read
 * via getState() and the toast helper via a ref, so a re-render never tears down
 * and re-opens the socket (which would make "live" alerts flap).
 */
export function useAlertSocket(): void {
    const toast = useToast();
    const token = useAuthStore((s) => s.token);

    // Latest toast helper, kept in a ref so it's never an effect dependency.
    const toastRef = useRef(toast);
    toastRef.current = toast;

    const wsRef = useRef<WebSocket | null>(null);
    const reconnectRef = useRef<number>(0);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const closedByUs = useRef(false);

    useEffect(() => {
        closedByUs.current = false;

        const connect = async () => {
            const authToken = (await getFreshAccessToken()) ?? token ?? useAuthStore.getState().token;
            if (!authToken) return; // not logged in yet

            const url = `${resolveWsUrl()}?token=${encodeURIComponent(authToken)}`;
            const ws = new WebSocket(url);
            wsRef.current = ws;

            ws.onopen = () => {
                reconnectRef.current = 0;
                useAlertStore.getState().setConnected(true);
            };

            ws.onmessage = (event) => {
                let msg: AlertSocketMessage;
                try {
                    msg = JSON.parse(event.data);
                } catch {
                    return;
                }
                if (msg.type === 'alert.new') {
                    const alert = msg.alert as Alert;
                    useAlertStore.getState().addAlert(alert);
                    const severity = severityToToast(alert.severity);
                    toastRef.current[severity](
                        `${alert.severity} · ${alert.title}`,
                        `${alert.camera_name} — ${alert.location_name}`,
                    );
                } else if (msg.type === 'alert.update') {
                    useAlertStore.getState().upsertAlert(msg.alert as Alert);
                }
            };

            ws.onclose = () => {
                useAlertStore.getState().setConnected(false);
                wsRef.current = null;
                if (closedByUs.current) return;
                const delay = Math.min(1000 * 2 ** reconnectRef.current, 30000);
                reconnectRef.current += 1;
                timerRef.current = setTimeout(connect, delay);
            };

            ws.onerror = () => ws.close();
        };

        connect();

        return () => {
            closedByUs.current = true;
            if (timerRef.current) clearTimeout(timerRef.current);
            wsRef.current?.close();
            useAlertStore.getState().setConnected(false);
        };
        // Only re-run when the auth token changes (login/logout).
    }, [token]);
}
