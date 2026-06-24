/* VISION X Web Push service worker.
   Receives push payloads from the notification-service and shows an OS
   notification; clicking it deep-links into the Dashboard → Notifications tab. */

self.addEventListener('push', (event) => {
    let data = {};
    try {
        data = event.data ? event.data.json() : {};
    } catch (e) {
        data = { title: 'VISION X Alert', body: event.data ? event.data.text() : '' };
    }
    const title = data.title || 'VISION X Alert';
    const options = {
        body: data.body || '',
        icon: '/favicon.svg',
        badge: '/favicon.svg',
        tag: data.alertId ? `alert-${data.alertId}` : undefined,
        data: { url: data.url || '/dashboard?tab=notifications' },
    };
    event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const targetUrl = (event.notification.data && event.notification.data.url) || '/dashboard?tab=notifications';
    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                if ('focus' in client) {
                    client.navigate(targetUrl);
                    return client.focus();
                }
            }
            if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
        }),
    );
});
