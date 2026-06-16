import axios from 'axios';
import { useAuthStore } from '@/store/authStore';
import { getFreshAccessToken, triggerReauth } from '@/lib/auth0Token';
import nProgress from 'nprogress';
import i18n from '@/languages/index';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.request.use(
    async (config) => {
        nProgress.start();

        // Respect an explicitly-set Authorization header (e.g. the /auth/session
        // exchange passes the Auth0 token directly).
        if (config.headers && !config.headers.Authorization) {
            // Prefer a fresh Auth0 token (auto-refreshed by the SDK); fall back
            // to the stored token for the legacy custom-login path.
            const auth0Token = await getFreshAccessToken();
            const token = auth0Token ?? useAuthStore.getState().token;
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        }

        config.headers['Accept-Language'] = i18n.language ?? 'en';

        return config;
    },
    (error) => {
        nProgress.done();
        return Promise.reject(error);
    }
);

// RESPONSE INTERCEPTOR
api.interceptors.response.use(
    (response) => {
        nProgress.done();
        return response;
    },
    (error) => {
        nProgress.done();
        const url: string = error.config?.url ?? '';
        // Don't hard-redirect on the Auth0 session exchange — the caller handles
        // its failure. Otherwise a failed /auth/session would bounce to '/' and
        // immediately retry, causing an infinite loop.
        const isSessionExchange = url.includes('/auth/session');
        if (error.response?.status === 401 && !isSessionExchange) {
            // If signed in via Auth0, trigger a fresh login (recovers an expired
            // session and returns to the current page). Otherwise — legacy local
            // login — clear state and go to the login page.
            const reauthing = triggerReauth();
            if (!reauthing) {
                useAuthStore.getState().logout();
                window.location.href = '/';
            }
        }
        return Promise.reject(error);
    }
);

export default api;