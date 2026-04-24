import { Navigate, Outlet } from 'react-router';
import { useAuthStore } from '@/store/authStore';

export const ProtectedRoute = () => {
    const token = useAuthStore((state) => state.token);

    // If no token, redirect to login, but save the location they tried to go to
    if (!token) {
        return <Navigate to="/" replace />;
    }

    return <Outlet />; // This renders the child routes (Dashboard, etc.)
};