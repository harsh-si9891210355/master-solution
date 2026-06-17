import { useAuthStore } from "@/store/authStore";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useLocation } from "react-router";
import { FormInput } from "@/components/ui/FormInput";
import { FormButton } from "@/components/ui/FormButton";
import { loginSchema, type LoginFormValues } from "./types/index";
import { authService } from "./api/authService";
import { SUPPORTED_LANGUAGES } from "../../languages/index";
import { useNsTranslation } from "../../hooks/Usetranslation";
import { useToast } from "../../components/ui/ToastProvider";
import { useState, useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import '../../assets/Style/auth.css'

export const LoginForm = () => {
  const { t, currentLang, changeLanguage } = useNsTranslation("auth");
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const toast = useToast();
  const [msLoading, setMsLoading] = useState(false)

  const [loading, setLoading] = useState(false)
  const { loginWithRedirect, isAuthenticated } = useAuth0();
  const location = useLocation();
  // Where to land after login (set by ProtectedRoute when redirecting here).
  const from = (location.state as { from?: string } | null)?.from || "/dashboard";

  // The Auth0 token→session exchange is handled globally in <AuthGate>.
  // Here we only need to move an already-authenticated user off the login page
  // (e.g. they navigated to "/" while signed in). Deep-link returns after an
  // Auth0 redirect are handled by onRedirectCallback in main.tsx.
  useEffect(() => {
    if (isAuthenticated) navigate(from, { replace: true });
  }, [isAuthenticated, navigate, from]);

  const FEATURES = [
    { icon: "pi pi-video", label: t("login.features.camera") },
    { icon: "pi pi-eye", label: t("login.features.events") },
    { icon: "pi pi-lock", label: t("login.features.security") },
  ];

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const { mutate: loginMutation, isPending } = useMutation({
    mutationFn: authService.login,
    onSuccess: (response) => {
      setAuth(response.data.access_token, response.data.user, response.data.permissions);
      toast.success(
        t("login.toast.success_title"),
        t("login.toast.success_detail")
      );
      navigate(from, { replace: true });
    },
    onError: (error: any) => {
      const msg =
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        t("login.toast.error_title")
      toast.error(t("login.toast.error_title") || "Sign in failed", msg);
    },
  });

  const onSubmit = (data: LoginFormValues) => loginMutation(data);

  //

  function handleMicrosoftLogin() {
    setMsLoading(true)
    // Replace with real MSAL / Azure AD redirect
    setTimeout(() => {
      setMsLoading(false)
      navigate('/')
    }, 1200)
  }

  // If already authenticated, show a loader instead of flashing the login form
  // while the redirect effect navigates away.
  if (isAuthenticated) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center"
        style={{ background: '#FFFFFF' }}
      >
        <svg className="animate-spin w-8 h-8 mb-3" style={{ color: '#1447e6' }} fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
        <p className="text-sm text-gray-600">Signing you in…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#FFFFFF' }}>
      <div className="flex flex-1">

        {/* LEFT PANEL */}
        <div
          className="flex-1 relative"
          style={{
            background: `
          radial-gradient(ellipse at 20% 50%, rgba(255,255,255,0.08) 0%, transparent 60%),
          radial-gradient(ellipse at 80% 20%, rgba(0,0,0,0.06) 0%, transparent 50%),
          repeating-linear-gradient(
            45deg,
            transparent,
            transparent 2px,
            rgba(0,0,0,0.015) 2px,
            rgba(0,0,0,0.015) 4px
          ),
          #FFFFFF
        `,
          }}
        />

        {/* Divider */}
        <div className="w-px bg-blue-600 opacity-40" />

        {/* RIGHT PANEL */}
        <div
          className="flex flex-col justify-center px-14 py-16"
          style={{ width: 420, background: 'rgba(251,243,210,0.18)' }}
        >
          {/* Heading */}
          <div className="mb-8">
            <p className="text-lg font-normal text-gray-800 mb-1">{t("login.welcome")}</p>
            <p className="text-lg font-bold text-gray-800 leading-snug">
              <span className="text-xs font-semibold tracking-wide text-gray-700 uppercase">
                {t("login.title")}
              </span>
            </p>
            <p className="text-xs text-gray-600 mt-4">
              {t("login.description")}
            </p>
          </div>

          {/* Divider */}
          <div className="border-t border-blue-100 mb-4" />

          {/* Errors */}
          {errors.root && (
            <div className="mb-4 px-4 py-2 bg-red-50 border border-red-300 text-red-600 text-sm rounded">
              {errors.root.message}
            </div>
          )}

          {/* FORM */}
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col">

            {/* Email */}
            <FormInput
              name="email"
              control={control}
              placeholder={t("login.email")}
              error={errors.email?.message}
              className="px-5 py-4"
              style={{ background: '#F9F6EE', border: '1.5px solid #1447e6' }}
            />

            {/* Password */}
            <div className="relative">
              <FormInput
                name="password"
                type="password"
                control={control}
                placeholder={t("login.password")}
                error={errors.password?.message}
                className="px-5 py-4"
                style={{ background: '#F9F6EE', border: '1.5px solid #1447e6' }}
              />
            </div>
            {/* Forgot Password */}
            <div className="flex justify-end -mt-1">
              <Link to="/forgotpassword" className="text-xs text-gray-600 hover:text-gray-900">
                {t("login.forgot")}
              </Link>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 text-sm font-medium text-white transition-opacity disabled:opacity-70 mt-2"
              style={{ background: '#1447e6' }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Signing in…
                </span>
              ) : (
                'Log In'
              )}
            </button>
          </form>

          {/* Sign up link */}
          <div className="mt-4 text-center">
            <p className="text-xs text-gray-600">
              {t("login.noAccount")}{' '}
              <Link to="/signup" className="font-semibold" style={{ color: '#1447e6' }}>
                {t("login.createOne")}
              </Link>
            </p>
          </div>

          {/* OR Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400">or</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Microsoft Login */}
          {/* <button
            type="button"
            onClick={handleMicrosoftLogin}
            disabled={msLoading}
            className="w-full flex items-center justify-center gap-3 py-3.5 border border-gray-300 bg-white hover:bg-gray-50 transition-colors disabled:opacity-60 text-sm font-medium text-gray-700"
          >
            {msLoading ? (
              <svg className="animate-spin w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg">
                <rect x="1" y="1" width="9" height="9" fill="#F25022" />
                <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
                <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
                <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
              </svg>
            )}
            {msLoading ? 'Redirecting to Microsoft…' : 'Sign in with Microsoft'}
          </button> */}

          {/* Auth0 Login (SSO) */}
          <button
            type="button"
            onClick={() => loginWithRedirect({ appState: { returnTo: from } })}
            className="w-full flex items-center justify-center gap-2 py-3.5 mt-3 border border-gray-300 bg-white hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
          >
            <span className="material-icons" style={{ fontSize: 18, color: '#1447e6' }}>lock</span>
            Continue with Auth0
          </button>

          <div className="mt-5 " style={{ background: 'rgba(255,255,255,0.08)' }}>
            <div className="px-4 py-3">
              <p className="text-xs text-black-200 mb-3 leading-relaxed">
                If you are a first time user logging into the application there are certain tasks
                that you need to fulfill before being able to access the application.
              </p>
            </div>
            <button
              onClick={() => navigate('/first-time-login')}
              className="w-full flex items-center justify-center gap-2 py-4 text-sm font-semibold transition-colors"
              style={{ background: '#1447e6', color: '#ffffff' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#0f37c0')}
              onMouseLeave={e => (e.currentTarget.style.background = '#1447e6')}>
              <span className="material-icons" style={{ fontSize: 18, color: '#fff' }}>person</span>
              First Time Login
            </button>
          </div>






          {/* Language Switch */}
          {/* <div className="flex justify-center mt-6 gap-2">
            {SUPPORTED_LANGUAGES.map((lang) => (
              <FormButton
                key={lang.code}
                type="button"
                label={`${lang.flag} ${lang.code.toUpperCase()}`}
                variant="ghost"
                className={currentLang === lang.code ? "border" : ""}
                onClick={() => changeLanguage(lang.code)}
              />
            ))}
          </div> */}
        </div>
      </div>

      {/* Footer */}
      <div
        className="px-8 py-3 border-t border-blue-600 border-opacity-30"
        style={{ background: 'rgba(0,0,0,0.06)' }}
      >
        <p className="text-xs text-gray-700">
          Copyright © {new Date().getFullYear()}{' '}
          <strong>HCLTECH</strong> and its related entities. All Rights Reserved.
        </p>
      </div>
    </div>
  );
};
function setMsLoading(arg0: boolean) {
  throw new Error("Function not implemented.");
}

