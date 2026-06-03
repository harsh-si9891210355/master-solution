import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router";
import { signupSchema, type SignupFormValues } from "./types/index";
import { FormInput } from "@/components/ui/FormInput";
import { FormButton } from "../../components/ui/FormButton.tsx";
import { authService } from "./api/authService";
import { useNsTranslation } from "@/hooks/Usetranslation";
import { useToast } from "../../components/ui/ToastProvider";

export const SignupForm = () => {
  const navigate = useNavigate();
  const { t } = useNsTranslation("auth");
  const toast = useToast();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: "",
      first_name: "",
      last_name: "",
      mobile_number: "",
      role_code: "user",
      password: "",
      confirmPassword: "",
    },
  });

  const { mutate: signupMutation, isPending } = useMutation({
    mutationFn: authService.signup,
    onSuccess: () => {
      toast.success(
        t("signup.toast.success_title"),
        t("signup.toast.success_detail"),
      );

      navigate("/");
    },
    onError: (error: any) => {
      console.error("Signup Error:", error.response?.data?.message);
      toast.error(
        t("signup.toast.error_title"),
        error.response?.data?.message || t("signup.toast.error_detail"),
      );
    },
  });

  const onSubmit = (data: any) => {
    const { confirmPassword, ...payload } = data;
    signupMutation(payload);
  };

  return (
    <div className="auth-page">
      <div className="auth-orb auth-orb--tr" />
      <div className="auth-orb auth-orb--bl" />

      <div className="auth-card auth-card--wide">
        <div className="auth-card__accent" />

        <div className="auth-card__body">
          {/* Header */}
          <div className="auth-header">
            <div className="auth-icon-badge">
              <i className="pi pi-shield" />
            </div>
            <div className="auth-header__text">
              <h2>{t("signup.title")}</h2>
              <p>{t("signup.subtitle")}</p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="auth-form">
            <div className="auth-grid-2">
              <FormInput
                name="first_name"
                label={t("signup.first_name")}
                control={control}
                error={errors.first_name?.message}
              />
              <FormInput
                name="last_name"
                label={t("signup.last_name")}
                control={control}
                error={errors.last_name?.message}
              />
            </div>

            <FormInput
              name="email"
              label={t("signup.email")}
              control={control}
              error={errors.email?.message}
              placeholder="you@example.com"
            />

            <FormInput
              name="mobile_number"
              label={t("signup.mobile")}
              control={control}
              error={errors.mobile_number?.message}
              placeholder={t("signup.mobilePlaceholder")}
            />

            <div className="auth-grid-2">
              <FormInput
                name="password"
                label={t("signup.password")}
                type="password"
                control={control}
                error={errors.password?.message}
              />
              <FormInput
                name="confirmPassword"
                label={t("signup.confirmPassword")}
                type="password"
                control={control}
                error={errors.confirmPassword?.message}
              />
            </div>

            <div className="auth-form__submit-row">
              <FormButton
                type="submit"
                label={t("signup.submit")}
                variant="primary"
                fullWidth
                loading={isPending}
                iconLeft="pi pi-user-plus"
              />

              <p className="auth-form-footer">
                {t("signup.hasAccount")}{" "}
                <Link
                  to="/"
                  className="lcb-forgot-link"
                >
                  {t("login.forgot")}
                </Link>
                {/* <FormButton
                  type="button"
                  variant="ghost"
                  label={t("signup.signIn")}
                  onClick={() => navigate("/")}
                /> */}
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
