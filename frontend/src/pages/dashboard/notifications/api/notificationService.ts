import api from '@/lib/api';
import type { NotificationPreference } from '../types';

export const notificationService = {
    getPreferences: () => api.get<NotificationPreference>('/notification/preferences'),
    updatePreferences: (body: Partial<NotificationPreference>) =>
        api.put<NotificationPreference>('/notification/preferences', body),
    getVapidPublicKey: () => api.get<{ public_key: string }>('/notification/vapid-public-key'),
    subscribe: (subscription: PushSubscriptionJSON) =>
        api.post<{ message: string }>('/notification/subscriptions', subscription),
    unsubscribe: (endpoint: string) =>
        api.delete<{ message: string }>('/notification/subscriptions', {
            data: { endpoint, keys: { p256dh: '', auth: '' } },
        }),
};
