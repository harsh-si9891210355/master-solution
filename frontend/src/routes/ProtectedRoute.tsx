import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth0 } from '@auth0/auth0-react';
import { useAuthStore } from '@/store/authStore';

export const ProtectedRoute = () => {
    const token = useAuthStore((state) => state.token);
    const { isAuthenticated } = useAuth0();
    const location = useLocation();

    // Auth0 initialisation is gated globally by <AuthGate>, so by here the auth
    // state is settled. Allow access via either the legacy local token or Auth0.
    if (!token && !isAuthenticated) {
        // Remember where they were headed so we can return after login.
        return (
            <Navigate
                to="/"
                replace
                state={{ from: location.pathname + location.search }}
            />
        );
    }

    return <Outlet />; // Renders the child routes (Dashboard, etc.)
};
