import { createBrowserRouter } from "react-router";
import { LoginForm } from "@/pages/auth/LoginForm";
import { AppLayout } from "@/components/layout/appLayout";
import { ProtectedRoute } from "./ProtectedRoute";
import { SignupForm } from "@/pages/auth/SignUpForm";
import { UserList } from "@/pages/user_managment/UserList";
import { UserForm } from "@/pages/user_managment/UserForm";

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
          { path: "/dashboard", element: <div>Dashboard</div> },
          { path: "/events", element: <div>Events List</div> },
          { path: "/cameras", element: <div>Camera Management</div> },
          { path: "/users", element: <UserList /> },
          { path: "/users/add", element: <UserForm /> },
          { path: "/users/edit/:id", element: <UserForm /> },
        ],
      },
    ],
  },
]);
