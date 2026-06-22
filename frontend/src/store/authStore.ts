import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface AuthState {
    token: string | null;
    user: any | null;
    permissions: string[];
    /** Profile picture as a data URL — kept client-side until a backend upload exists. */
    avatar: string | null;
    setAuth: (token: string, user: any, permissions?: string[]) => void;
    /** Update just the user object (e.g. after editing the profile). */
    setUser: (user: any) => void;
    setAvatar: (avatar: string | null) => void;
    logout: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            token: null,
            user: null,
            permissions: [],
            avatar: null,

            // Call this when login is successful
            setAuth: (token, user, permissions = []) => set({ token, user, permissions }),

            setUser: (user) => set({ user }),

            setAvatar: (avatar) => set({ avatar }),

            // Call this to clear data and redirect
            logout: () => set({ token: null, user: null, permissions: [], avatar: null }),
        }),
        {
            name: 'auth-storage', // Key name in LocalStorage
            storage: createJSONStorage(() => localStorage),
        }
    )
);
