import axios from 'axios';
import { useAuthStore } from '@/store/authStore';
import nProgress from 'nprogress';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// REQUEST INTERCEPTOR: Attach Token
api.interceptors.request.use(
    (config) => {
        nProgress.start();
        const token = useAuthStore.getState().token;
        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        nProgress.done();
        Promise.reject(error)
    }

);

api.interceptors.response.use(
    (response) => {
        nProgress.done();
        return response
    },
    (error) => {
        nProgress.done();
        if (error.response?.status === 401) {
            // Auto-logout user if token is invalid/expired
            useAuthStore.getState().logout();
            window.location.href = '/';
        }
        return Promise.reject(error);
    }
);

export default api;
