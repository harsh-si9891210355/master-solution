import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router";
import { z } from "zod";
import { FormInput } from "@/components/ui/FormInput";
import { FormButton } from "@/components/ui/FormButton";
import { authService } from "./api/authService";
import { useNsTranslation } from "@/hooks/Usetranslation";
import { useToast } from "@/components/ui/ToastProvider";

export const SetPassword = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { t } = useNsTranslation("auth");
    const toast = useToast();

    const token = searchParams.get("token");
    const isResetMode = searchParams.get("mode") === "reset";

    const setPasswordSchema = z
        .object({
            password: z
                .string()
                .min(8, t("setPassword.validation.password_min"))
                .regex(/[A-Z]/, t("setPassword.validation.password_uppercase"))
                .regex(/[0-9]/, t("setPassword.validation.password_number")),
            confirmPassword: z.string(),
        })
        .refine((data) => data.password === data.confirmPassword, {
            message: t("setPassword.validation.confirm_mismatch"),
            path: ["confirmPassword"],
        });

    type SetPasswordValues = z.infer<typeof setPasswordSchema>;

    const {
        control,
        handleSubmit,
        formState: { errors },
    } = useForm<SetPasswordValues>({
        resolver: zodResolver(setPasswordSchema),
        defaultValues: { password: "", confirmPassword: "" },
    });

    const { mutate: submitPassword, isPending, isSuccess, isError, error } = useMutation({
        mutationFn: (data: SetPasswordValues) =>
            isResetMode
                ? authService.resetPassword(token ?? "", data.password)
                : authService.setPassword(token ?? "", data.password),
        onSuccess: () => {
            toast.success(
                isResetMode
                    ? t("setPassword.toast.reset_success_title")
                    : t("setPassword.toast.set_success_title"),
                isResetMode
                    ? t("setPassword.toast.reset_success_detail")
                    : t("setPassword.toast.set_success_detail")
            );
        },
        onError: (err: any) => {
            const detail =
                err?.response?.data?.message ||
                t("setPassword.toast.error_detail");
            toast.error(t("setPassword.toast.error_title"), detail);
        },
    });

    const onSubmit = (data: SetPasswordValues) => submitPassword(data);

    // ── Invalid / missing token ──────────────────────────────────────────────
    if (!token) {
        return (
            <div className="auth-page">
                <div className="auth-orb auth-orb--tr" />
                <div className="auth-orb auth-orb--bl" />
                <div className="auth-card">
                    <div className="auth-card__accent" />
                    <div className="auth-card__body auth-card__body--center">
                        <div className="auth-status-circle auth-status-circle--error">
                            <i className="pi pi-times" />
                        </div>
                        <h2 className="auth-title-center">
                            {t("setPassword.invalid_link_title")}
                        </h2>
                        <p className="auth-subtitle-center">
                            {t("setPassword.invalid_link_subtitle")}
                        </p>
                        <FormButton
                            label={t("setPassword.back_to_sign_in")}
                            variant="primary"
                            fullWidth
                            iconLeft="pi pi-arrow-left"
                            onClick={() => navigate("/")}
                        />
                    </div>
                </div>
            </div>
        );
    }

    // ── Success state ────────────────────────────────────────────────────────
    if (isSuccess) {
        return (
            <div className="auth-page">
                <div className="auth-orb auth-orb--tr" />
                <div className="auth-orb auth-orb--bl" />
                <div className="auth-card">
                    <div className="auth-card__accent auth-card__accent--green" />
                    <div className="auth-card__body auth-card__body--center">
                        <div className="auth-status-circle auth-status-circle--success">
                            <i className="pi pi-check" />
                        </div>
                        <h2 className="auth-title-center">
                            {isResetMode
                                ? t("setPassword.success.reset_title")
                                : t("setPassword.success.set_title")}
                        </h2>
                        <p className="auth-subtitle-center">
                            {isResetMode
                                ? t("setPassword.success.reset_subtitle")
                                : t("setPassword.success.set_subtitle")}
                        </p>
                        <FormButton
                            label={t("setPassword.success.go_to_sign_in")}
                            variant="primary"
                            fullWidth
                            iconLeft="pi pi-arrow-right"
                            onClick={() => navigate("/")}
                        />
                    </div>
                </div>
            </div>
        );
    }

    // ── Form ─────────────────────────────────────────────────────────────────
    return (
        <div className="auth-page">
            <div className="auth-orb auth-orb--tr" />
            <div className="auth-orb auth-orb--bl" />

            <div className="auth-card">
                <div className="auth-card__accent" />
                <div className="auth-card__body">

                    <div className="auth-header">
                        <div className="auth-icon-badge">
                            <i className="pi pi-lock" />
                        </div>
                        <div className="auth-header__text">
                            <h2>
                                {isResetMode
                                    ? t("setPassword.form.reset_title")
                                    : t("setPassword.form.set_title")}
                            </h2>
                            <p>
                                {isResetMode
                                    ? t("setPassword.form.reset_subtitle")
                                    : t("setPassword.form.set_subtitle")}
                            </p>
                        </div>
                    </div>

                    {/* API error banner */}
                    {isError && (
                        <div className="auth-banner auth-banner--error">
                            <i className="pi pi-exclamation-circle" />
                            <p>
                                {(error as any)?.response?.data?.message ??
                                    t("setPassword.form.error_banner")}
                            </p>
                        </div>
                    )}

                    {/* Password rules info */}
                    <div className="auth-banner auth-banner--info">
                        <i className="pi pi-info-circle" />
                        <p>{t("setPassword.form.info_banner")}</p>
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)} className="auth-form">
                        <FormInput<SetPasswordValues>
                            name="password"
                            control={control}
                            label={t("setPassword.form.password")}
                            type="password"
                            placeholder="••••••••"
                            error={errors.password?.message}
                        />
                        <FormInput<SetPasswordValues>
                            name="confirmPassword"
                            control={control}
                            label={t("setPassword.form.confirmPassword")}
                            type="password"
                            placeholder="••••••••"
                            error={errors.confirmPassword?.message}
                        />
                        <div className="auth-form__submit-row">
                            <FormButton
                                label={
                                    isResetMode
                                        ? t("setPassword.form.reset_submit")
                                        : t("setPassword.form.set_submit")
                                }
                                variant="primary"
                                type="submit"
                                fullWidth
                                loading={isPending}
                                iconLeft="pi pi-lock"
                            />
                        </div>
                    </form>

                    {/* Back to sign in */}
                    <div className="auth-back-link-wrapper">
                        <FormButton
                            label={t("setPassword.form.back_to_sign_in")}
                            variant="ghost"
                            iconLeft="pi pi-arrow-left"
                            onClick={() => navigate("/")}
                        />
                    </div>

                    {/* Footer note */}
                    <p className="auth-footer-note">
                        {t("setPassword.form.footer_reset")}{" "}
                        <FormButton
                            label={
                                isResetMode
                                    ? t("setPassword.form.footer_reset_link")
                                    : t("setPassword.form.footer_set_link")
                            }
                            variant="ghost"
                            onClick={() => navigate("/forgotpassword")}
                        />
                    </p>

                </div>
            </div>
        </div>
    );
};