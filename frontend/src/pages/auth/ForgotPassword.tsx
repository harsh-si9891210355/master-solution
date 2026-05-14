import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { z } from "zod";
import { FormInput } from "@/components/ui/FormInput";
import { FormButton } from "@/components/ui/FormButton";
import { authService } from "./api/authService";
import { useNsTranslation } from "@/hooks/Usetranslation";
import { useToast } from "@/components/ui/ToastProvider";

export const ForgotPassword = () => {
    const navigate = useNavigate();
    const { t } = useNsTranslation("auth");
    const toast = useToast();

    const forgotPasswordSchema = z.object({
        email: z
            .string()
            .min(1, t("forgotPassword.validation.email_required"))
            .email(t("forgotPassword.validation.email_invalid")),
    });

    type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

    const {
        control,
        handleSubmit,
        formState: { errors },
    } = useForm<ForgotPasswordValues>({
        resolver: zodResolver(forgotPasswordSchema),
        defaultValues: { email: "" },
    });

    const { mutate: sendReset, isPending, isError, error } = useMutation({
        mutationFn: (data: ForgotPasswordValues) =>
            authService.forgotPassword(data.email),
        onSuccess: (response) => {
            toast.success(
                t("forgotPassword.toast.success_title"),
                t("forgotPassword.toast.success_detail")
            );
            const resetToken = response.data.reset_token;
            navigate(`/set-password?token=${resetToken}&mode=reset`);
        },
        onError: (err: any) => {
            const detail =
                err?.response?.data?.message ||
                t("forgotPassword.toast.error_detail");
            toast.error(t("forgotPassword.toast.error_title"), detail);
        },
    });

    const onSubmit = (data: ForgotPasswordValues) => sendReset(data);

    return (
        <div className="auth-page">
            <div className="auth-orb auth-orb--tr" />
            <div className="auth-orb auth-orb--bl" />

            <div className="auth-card">
                <div className="auth-card__accent" />
                <div className="auth-card__body">

                    {/* Header */}
                    <div className="auth-header">
                        <div className="auth-icon-badge">
                            <i className="pi pi-key" />
                        </div>
                        <div className="auth-header__text">
                            <h2>{t("forgotPassword.title")}</h2>
                            <p>{t("forgotPassword.subtitle")}</p>
                        </div>
                    </div>

                    {/* Error banner */}
                    {isError && (
                        <div className="auth-banner auth-banner--error">
                            <i className="pi pi-exclamation-circle" />
                            <p>
                                {(error as any)?.response?.data?.message ??
                                    t("forgotPassword.error_banner")}
                            </p>
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit(onSubmit)} className="auth-form">
                        <FormInput<ForgotPasswordValues>
                            name="email"
                            control={control}
                            label={t("forgotPassword.email")}
                            placeholder={t("forgotPassword.emailPlaceholder")}
                            rules={{
                                required: t("forgotPassword.validation.email_required"),
                            }}
                            error={errors.email?.message}
                        />
                        <div className="auth-form__submit-row">
                            <FormButton
                                label={t("forgotPassword.submit")}
                                variant="primary"
                                type="submit"
                                fullWidth
                                loading={isPending}
                                iconLeft="pi pi-send"
                            />
                        </div>
                    </form>

                    {/* Back link */}
                    <div style={{ textAlign: "center" }}>
                        <button
                            type="button"
                            onClick={() => navigate("/")}
                            className="auth-back-link"
                        >
                            <i className="pi pi-arrow-left" />
                            {t("forgotPassword.backToSignIn")}
                        </button>
                    </div>

                    <p className="auth-footer-note">
                        {t("forgotPassword.footerNote")}{" "}
                        <button type="button" onClick={() => navigate("/")}>
                            {t("forgotPassword.footerLink")}
                        </button>
                        .
                    </p>
                </div>
            </div>
        </div>
    );
};