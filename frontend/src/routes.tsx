import { createBrowserRouter, Navigate } from 'react-router';
import { LoginForm } from './pages/auth/LoginForm';
import { SignupForm } from './pages/auth/SignUpForm';

export const router = createBrowserRouter([
    {
        path: '/',
        // Default page is Login
        element: <LoginForm />,
    },
    {
        path: '/signup',
        element: <SignupForm />,
    },
    {
        path: '*',
        // If user goes to a path that doesn't exist, send them back to Login
        element: <Navigate to="/" replace />,
    },
]);