import { createBrowserRouter } from "react-router";
import { LoginForm }      from "@/pages/auth/LoginForm";
import { SignupForm }     from "@/pages/auth/SignUpForm";
import { ForgotPassword } from "@/pages/auth/ForgotPassword";
import { SetPassword }    from "@/pages/auth/SetPassword";
import { AppLayout }      from "@/components/layout/appLayout";
import { ProtectedRoute } from "./ProtectedRoute";
import { UsersList }      from "@/pages/UserManagment/UserList";
import { UserForm }       from "@/pages/UserManagment/UserForm";
import { CameraList }     from "@/pages/camera/CameraList";
import { AddCameraForm }  from "@/pages/camera/CameraForm";
import { UsecaseList }    from "@/pages/usecase/UsecaseList";   // ← new
import { UsecaseForm }    from "@/pages/usecase/UsecaseForm";   // ← new
import Dashboard from "@/pages/dashboard/Dashboard";
 
export const router = createBrowserRouter([
  // ── Public routes ────────────────────────────────────────────────────────
  { path: "/",               element: <LoginForm />      },
  { path: "/signup",         element: <SignupForm />     },
  { path: "/forgotpassword", element: <ForgotPassword /> },
  { path: "/set-password",   element: <SetPassword />    },
 
  // ── Protected routes ─────────────────────────────────────────────────────
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: "/dashboard",            element: <Dashboard />       },
          { path: "/events",               element: <div>Events List</div> },
          { path: "/cameras",              element: <CameraList />    },
          { path: "/cameras/add",          element: <AddCameraForm /> },
          { path: "/cameras/edit/:id",     element: <AddCameraForm /> },
          { path: "/usecases",             element: <UsecaseList />   },  // ← new
          { path: "/usecases/add",         element: <UsecaseForm />   },  // ← new
          { path: "/usecases/edit/:id",    element: <UsecaseForm />   },  // ← new
          { path: "/users",                element: <UsersList />     },
          { path: "/users/add",            element: <UserForm />      },
          { path: "/users/edit/:id",       element: <UserForm />      },
        ],
      },
    ],
  },
]);