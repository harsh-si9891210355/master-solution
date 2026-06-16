import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface AuthState {
    token: string | null;
    user: any | null;
    permissions: string[];
    setAuth: (token: string, user: any, permissions?: string[]) => void;
    logout: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            token: null,
            user: null,
            permissions: [],

            // Call this when login is successful
            setAuth: (token, user, permissions = []) => set({ token, user, permissions }),

            // Call this to clear data and redirect
            logout: () => set({ token: null, user: null, permissions: [] }),
        }),
        {
            name: 'auth-storage', // Key name in LocalStorage
            storage: createJSONStorage(() => localStorage),
        }
    )
);