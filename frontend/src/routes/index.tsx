import { createBrowserRouter } from "react-router";
import { LoginForm } from "@/pages/auth/LoginForm";
import { SignupForm } from "@/pages/auth/SignUpForm";
import { ForgotPassword } from "@/pages/auth/ForgotPassword";
import { SetPassword } from "@/pages/auth/SetPassword";
import FirstTimeLogin from "@/pages/auth/FirstTimeLogin";
import FirstTimeLoginStep2 from "@/pages/auth/FirstTimeLoginStep2";
import { ProtectedRoute } from "./ProtectedRoute";
import { UsersList } from "@/pages/UserManagment/UserList";
import { UserForm } from "@/pages/UserManagment/UserForm";
import { CameraList } from "@/pages/camera/CameraList";
import { AddCameraForm } from "@/pages/camera/CameraForm";
import { UsecaseList } from "@/pages/usecase/UsecaseList";
import { UsecaseForm } from "@/pages/usecase/UsecaseForm";
import Dashboard from "@/pages/dashboard/Dashboard";
import { EditProfile } from "@/pages/profile/EditProfile";
import MasterLayout from "@/components/layout/MasterLayout";
import { ROIEditor } from "@/pages/ROI/ROIEditor";
import { EventsList } from "@/pages/events/EventsList";
import { EventDetail } from "@/pages/events/EventDetail";
import { EventTimeline } from "@/pages/events/EventTimeline";

export const router = createBrowserRouter([
  // ── Public routes ────────────────────────────────────────────────────────
  { path: "/", element: <LoginForm /> },
  { path: "/signup", element: <SignupForm /> },
  { path: "/forgotpassword", element: <ForgotPassword /> },
  { path: "/set-password", element: <SetPassword /> },
  { path: "/first-time-login", element: <FirstTimeLogin /> },
  { path: "/first-time-login/step2", element: <FirstTimeLoginStep2 /> },

  // ── Protected routes ─────────────────────────────────────────────────────
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <MasterLayout />,
        children: [
          { path: "/dashboard", element: <Dashboard /> },
          { path: "/profile", element: <EditProfile /> },
          { path: "/events", element: <EventsList /> },
          { path: "/events/timeline", element: <EventTimeline /> },
          { path: "/events/:id", element: <EventDetail /> },
          { path: "/cameras", element: <CameraList /> },
          { path: "/cameras/add", element: <AddCameraForm /> },
          { path: "/cameras/edit/:id", element: <AddCameraForm /> },
          { path: "/usecases", element: <UsecaseList /> },
          { path: "/usecases/add", element: <UsecaseForm /> },
          { path: "/usecases/edit/:id", element: <UsecaseForm /> },
          { path: "/users", element: <UsersList /> },
          { path: "/users/add", element: <UserForm /> },
          { path: "/users/edit/:id", element: <UserForm /> },
          { path: "/roi-editor", element: <ROIEditor /> },
        ],
      },
    ],
  },
]);