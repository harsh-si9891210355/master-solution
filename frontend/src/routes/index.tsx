import { createBrowserRouter } from "react-router";
import { LoginForm } from "@/pages/auth/LoginForm";
import { AppLayout } from "@/components/layout/appLayout";
import { ProtectedRoute } from "./ProtectedRoute";
import { SignupForm } from "@/pages/auth/SignUpForm";
import { UsersList } from "@/pages/UserManagment/UserList";
import { UserForm } from "@/pages/UserManagment/UserForm";
import{Dashboard} from "@/pages/dashboard/Dashboard";

export const router = createBrowserRouter([
  // Public Routes
  { path: "/", element: <LoginForm /> },
  { path: "/signup", element: <SignupForm /> },
  // Protected Routes
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: "/events", element: <div>Events List</div> },
          { path: "/cameras", element: <div>Camera Management</div> },
          { path: "/users", element: <UsersList /> },
          { path: '/dashboard', element: <Dashboard /> },
          { path: "/users/add", element: <UserForm /> },
          { path: "/users/edit/:id", element: <UserForm /> },
        ],
      },
    ],
  },
]);
