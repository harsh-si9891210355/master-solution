import { useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router";

import { FormInput } from "@/components/ui/FormInput";
import { FormButton } from "@/components/ui/FormButton";

import { loginSchema, type LoginFormValues } from "./types/index";
import { authService } from "./api/authService";

import { SUPPORTED_LANGUAGES } from "../../languages/index";
import { useNsTranslation } from "../../hooks/Usetranslation";
import { useToast } from "../../components/ui/ToastProvider";

import IncidentChatbot from "./IncidentChatbot";
import { FaRobot } from "react-icons/fa";

export const LoginForm = () => {
  const { t, currentLang, changeLanguage } = useNsTranslation("auth");
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const toast = useToast();

  const [showBot, setShowBot] = useState(false);

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
      setAuth(response.data.access_token, response.data.user);

      toast.success(
        t("login.toast.success_title"),
        t("login.toast.success_detail")
      );

      navigate("/dashboard");
    },
    onError: (error: any) => {
      const msg =
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        t("login.toast.error_title");

      toast.error(
        t("toast.login_error_title") || "Sign in failed",
        msg
      );
    },
  });

  const onSubmit = (data: LoginFormValues) => loginMutation(data);

  return (
    <div className="auth-page">
      <div className="auth-orb auth-orb--tr" />
      <div className="auth-orb auth-orb--bl" />

      <div className="auth-card auth-card--wide">
        <div className="auth-card__accent" />

        <div className="auth-card__body">
          {/* ── Branding ──────────────────────────────────────────────────── */}
          <div className="lcb-brand">
            <div className="lcb-brand__icon">
              <i className="pi pi-shield" />
            </div>

            <div>
              <h1 className="lcb-brand__name">Master Solution</h1>
              <p className="lcb-brand__tagline">
                Secure · Smart · Scalable
              </p>
            </div>
          </div>

          {/* ── Feature icon grid ─────────────────────────────────────────── */}
          <div className="lcb-features">
            {FEATURES.map((f) => (
              <div key={f.label} className="lcb-feature-card">
                <i className={f.icon} />
                <span>{f.label}</span>
              </div>
            ))}
          </div>

          {/* ── Form ──────────────────────────────────────────────────────── */}
          <form onSubmit={handleSubmit(onSubmit)} className="lcb-form">
            <FormInput<LoginFormValues>
              name="email"
              label={t("login.email")}
              control={control}
              error={errors.email?.message}
              placeholder={t("login.emailPlaceholder")}
            />

            <FormInput<LoginFormValues>
              name="password"
              label={t("login.password")}
              type="password"
              control={control}
              error={errors.password?.message}
            />

            <div className="lcb-forgot">
              <FormButton
                type="button"
                variant="ghost"
                label={t("login.forgot")}
                onClick={() => navigate("/forgotpassword")}
              />
            </div>

            <FormButton
              label={t("login.submit")}
              variant="primary"
              type="submit"
              fullWidth
              loading={isPending}
            />
          </form>

          {/* ── Footer ────────────────────────────────────────────────────── */}
          <p className="lcb-footer">
            {t("login.noAccount")}{" "}
            <FormButton
              type="button"
              variant="ghost"
              label={t("login.createOne")}
              onClick={() => navigate("/signup")}
            />
          </p>

          {/* ── Language switcher ─────────────────────────────────────────── */}
          <div
            className="app-header__lang-switcher"
            style={{ marginTop: "20px", justifyContent: "center" }}
          >
            {SUPPORTED_LANGUAGES.map((lang) => (
              <FormButton
                key={lang.code}
                type="button"
                label={`${lang.flag} ${lang.code.toUpperCase()}`}
                variant="ghost"
                className={`app-header__lang-btn ${currentLang === lang.code
                    ? "app-header__lang-btn--active"
                    : ""
                  }`}
                onClick={() => changeLanguage(lang.code)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── Chatbot Floating Button ─────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setShowBot(!showBot)}
        className="fixed bottom-6 right-6 z-50 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg transition-all"
      >
        <FaRobot size={22} />
      </button>

      {/* ── Chatbot Component ───────────────────────────────────────────── */}
      {showBot && (
        <div className="fixed bottom-24 right-6 z-50">
          <IncidentChatbot
            visible={showBot}
            onHide={() => setShowBot(false)}
          />
        </div>
      )}
    </div>
  );
};