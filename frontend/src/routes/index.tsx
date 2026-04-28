import { createBrowserRouter } from 'react-router';
import { LoginForm } from '@/pages/auth/LoginForm';
import { AppLayout } from '@/components/layout/appLayout';
import { ProtectedRoute } from './ProtectedRoute';

export const router = createBrowserRouter([
    // Public Routes
    { path: '/', element: <LoginForm /> },
    // Protected Routes
    {
        element: <ProtectedRoute />, // 1. Check if logged in
        children: [
            {
                element: <AppLayout />, // 2. Wrap in Sidebar/Navbar
                children: [
                    // { path: '/dashboard', element: <div>Dashboard Content</div> },
                    // { path: '/events', element: <div>Events List</div> },
                    // { path: '/cameras', element: <div>Camera Management</div> },
                ],
            },
        ],
    },
]);