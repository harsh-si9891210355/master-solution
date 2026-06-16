import { ReactNode, useEffect, useRef } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/components/ui/ToastProvider';
import { setAccessTokenGetter, setReauthHandler } from '@/lib/auth0Token';
import { authService } from '@/pages/auth/api/authService';

/**
 * App-wide Auth0 gate. Renders a loader while Auth0 initialises, exchanges the
 * Auth0 token for the local session (user + permissions) once authenticated,
 * registers the token getter + re-auth handler for the axios layer, and
 * surfaces Auth0 errors. Wraps the router so this runs on every entry point.
 */
export const AuthGate = ({ children }: { children: ReactNode }) => {
    const { isLoading, isAuthenticated, getAccessTokenSilently, loginWithRedirect, error } = useAuth0();
    const setAuth = useAuthStore((s) => s.setAuth);
    const toast = useToast();

    // Expose a fresh-token getter to the axios interceptor (auto-refreshing).
    useEffect(() => {
    setAccessTokenGetter(
        isAuthenticated
            ? () =>
                  getAccessTokenSilently({
                      authorizationParams: {
                          audience: "https://master-solution-api",
                          scope: "openid profile email",
                      },
                  })
            : null
    );
 
    return () => setAccessTokenGetter(null);
}, [isAuthenticated, getAccessTokenSilently]);

    // Only let a 401 trigger an Auth0 re-login when actually signed in via Auth0.
    useEffect(() => {
        if (isAuthenticated) {
            setReauthHandler(() =>
                loginWithRedirect({
                    appState: { returnTo: window.location.pathname + window.location.search },
                })
            );
        } else {
            setReauthHandler(null);
        }
        return () => setReauthHandler(null);
    }, [isAuthenticated, loginWithRedirect]);

    // Exchange the Auth0 token for the local session, once.
    const synced = useRef(false);
    useEffect(() => {
        if (!isAuthenticated || synced.current) return;
        synced.current = true;
        (async () => {
            try {
                const token = await getAccessTokenSilently();
                const res = await authService.session(token);
                setAuth(token, res.data.user, res.data.permissions);
            } catch (err: any) {
                const msg = err?.response?.data?.detail || err?.message || 'Could not establish your session.';
                toast.error('Sign-in failed', msg);
            }
        })();
    }, [isAuthenticated, getAccessTokenSilently, setAuth, toast]);

    // Surface Auth0 redirect errors (access_denied, login_required, etc.).
    useEffect(() => {
        if (error) toast.error('Sign-in failed', error.message);
    }, [error, toast]);

    if (isLoading) {
        return (
            <div
                className="min-h-screen flex flex-col items-center justify-center"
                style={{ background: '#FFFFFF' }}
            >
                <svg className="animate-spin w-8 h-8 mb-3" style={{ color: '#1447e6' }} fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                <p className="text-sm text-gray-600">Loading…</p>
            </div>
        );
    }

    return <>{children}</>;
};
