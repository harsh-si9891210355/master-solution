// Web Push (VAPID) enrolment helpers. Registers the service worker, requests
// notification permission, subscribes via the PushManager, and syncs the
// subscription with the backend.

import { notificationService } from '@/pages/dashboard/notifications/api/notificationService';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw = window.atob(base64);
    const output = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
    return output;
}

export function isWebPushSupported(): boolean {
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

async function getRegistration(): Promise<ServiceWorkerRegistration> {
    const existing = await navigator.serviceWorker.getRegistration('/sw.js');
    if (existing) return existing;
    return navigator.serviceWorker.register('/sw.js');
}

export async function enableWebPush(): Promise<{ ok: boolean; reason?: string }> {
    if (!isWebPushSupported()) return { ok: false, reason: 'unsupported' };

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return { ok: false, reason: 'denied' };

    const { data } = await notificationService.getVapidPublicKey();
    if (!data.public_key) return { ok: false, reason: 'no_vapid_key' };

    const registration = await getRegistration();
    await navigator.serviceWorker.ready;

    const existing = await registration.pushManager.getSubscription();
    const subscription =
        existing ??
        (await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(data.public_key),
        }));

    await notificationService.subscribe(subscription.toJSON() as PushSubscriptionJSON);
    return { ok: true };
}

export async function disableWebPush(): Promise<void> {
    if (!isWebPushSupported()) return;
    const registration = await navigator.serviceWorker.getRegistration('/sw.js');
    const subscription = await registration?.pushManager.getSubscription();
    if (subscription) {
        try {
            await notificationService.unsubscribe(subscription.endpoint);
        } catch {
            /* ignore */
        }
        await subscription.unsubscribe();
    }
}
