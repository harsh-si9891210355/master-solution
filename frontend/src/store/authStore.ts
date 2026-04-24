import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface AuthState {
    token: string | null;
    user: any | null;
    setAuth: (token: string, user: any) => void;
    logout: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            token: null,
            user: null,

            // Call this when login is successful
            setAuth: (token, user) => set({ token, user }),

            // Call this to clear data and redirect
            logout: () => set({ token: null, user: null }),
        }),
        {
            name: 'auth-storage', // Key name in LocalStorage
            storage: createJSONStorage(() => localStorage),
        }
    )
);