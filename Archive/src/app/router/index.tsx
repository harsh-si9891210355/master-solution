import { createBrowserRouter } from 'react-router-dom'
import MasterLayout from '@/components/layouts/MasterLayout'
import Dashboard from '@/features/dashboard/pages/Dashboard'
import Users from '@/features/users/pages/Users'
import Settings from '@/features/settings/pages/Settings'
import Events from '@/features/events/pages/events'
import Login from '@/features/auth/pages/Login'
import FirstTimeLogin from '@/features/auth/pages/FirstTimeLogin'
import FirstTimeLoginStep2 from '@/features/auth/pages/FirstTimeLogin-step2'

export const router = createBrowserRouter([
  // Public — no layout
  { path: '/login', element: <Login /> },
  { path: '/first-time-login', element: <FirstTimeLogin /> },
  { path: '/first-time-login/step2', element: <FirstTimeLoginStep2 /> },

  // Protected — all wrapped in MasterLayout
  {
    path: '/',
    element: <MasterLayout />,
    children: [
      { index: true,        element: <Dashboard /> },
      { path: 'users',      element: <Users /> },
      { path: 'settings',   element: <Settings /> },
      { path: 'events',     element: <Events /> },

    ],
  },
])