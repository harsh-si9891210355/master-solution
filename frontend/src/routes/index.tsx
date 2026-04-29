import { createBrowserRouter } from 'react-router';
import { LoginForm } from '@/pages/auth/LoginForm';
import { AppLayout } from '@/components/layout/appLayout';
import { ProtectedRoute } from './ProtectedRoute';
import { SignupForm } from '@/pages/auth/SignUpForm'; 
export const router = createBrowserRouter([
    // Public Routes
    { path: '/', element: <LoginForm /> },
    { path: '/signup', element: <SignupForm /> },
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