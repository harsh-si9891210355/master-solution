import axios from 'axios';
import { useAuthStore } from '@/store/authStore';
import nProgress from 'nprogress';
import i18n from '@/languages/index'; 

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.request.use(
    (config) => {
        nProgress.start();

        const token = useAuthStore.getState().token;
        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
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
        if (error.response?.status === 401) {
            useAuthStore.getState().logout();
            window.location.href = '/';
        }
        return Promise.reject(error);
    }
);

export default api;