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



export const LoginForm = () => {
  const { t, i18n, currentLang, changeLanguage } = useNsTranslation("auth");
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const FEATURES = [
    { icon: "pi pi-video", label: t("login.features.camera") },
    { icon: "pi pi-eye",   label: t("login.features.events") },
    { icon: "pi pi-lock",  label: t("login.features.security") },
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
      navigate("/dashboard");
    },
    onError: (error: any) => {
      console.error("Login Error", error.response?.data?.message);
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
            <p className="lcb-brand__tagline">Secure · Smart · Scalable</p>
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
            <button type="button" onClick={() => navigate("/forgotpassword")}>
              {t("login.forgot")}
            </button>
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
          <button type="button" onClick={() => navigate("/signup")}>
            {t("login.createOne")}
          </button>
        </p>

        {/* ── Language row ──────────────────────────────────────────────── */}
        {/* {SUPPORTED_LANGUAGES.length > 1 && ( */}
           <div className="app-header__lang-switcher">
                        {SUPPORTED_LANGUAGES.map((lang) => (
                            <button
                                key={lang.code}
                                type="button"
                                onClick={() => changeLanguage(lang.code)}
                                className={`app-header__lang-btn ${currentLang === lang.code ? 'app-header__lang-btn--active' : ''}`}
                            >
                                <span>{lang.flag}</span>
                                <span>{lang.code.toUpperCase()}</span>
                            </button>
                        ))}
                    </div>
        {/* )} */}
      </div>
      </div>
    </div>
  );
};