import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router";
import { z } from "zod";
import { FormInput } from "@/components/ui/FormInput";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { authService } from "./api/authService";
import { useNsTranslation } from "@/hooks/Usetranslation";
import { useToast } from "@/components/ui/ToastProvider";
import "../../assets/Style/auth.css";

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
        <AuthLayout>
            {/* Heading */}
            <div className="mb-8">
                <p className="text-lg font-normal text-gray-800 mb-1">{t("login.welcome")}</p>
                <p className="text-lg font-bold text-gray-800 leading-snug">
                    <span className="text-xs font-semibold tracking-wide text-gray-700 uppercase">
                        {t("forgotPassword.title")}
                    </span>
                </p>
                <p className="text-xs text-gray-600 mt-4 leading-relaxed">
                    {t("forgotPassword.subtitle")}
                </p>
            </div>

            {/* Divider */}
            <div className="border-t border-blue-100 mb-4" />

            {/* Error banner */}
            {isError && (
                <div className="mb-4 px-4 py-2 bg-red-50 border border-red-300 text-red-600 text-sm rounded">
                    {(error as any)?.response?.data?.message ??
                        t("forgotPassword.error_banner")}
                </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col">
                <FormInput<ForgotPasswordValues>
                    name="email"
                    control={control}
                    placeholder={t("forgotPassword.emailPlaceholder")}
                    error={errors.email?.message}
                />

                <button
                    type="submit"
                    disabled={isPending}
                    className="w-full py-4 text-sm font-medium text-white transition-opacity disabled:opacity-70 mt-2"
                    style={{ background: "#1447e6" }}
                >
                    {isPending ? (
                        <span className="flex items-center justify-center gap-2">
                            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                            </svg>
                            {t("forgotPassword.submit")}…
                        </span>
                    ) : (
                        t("forgotPassword.submit")
                    )}
                </button>
            </form>

            {/* Back to sign in */}
            <div className="mt-6 text-center">
                <Link to="/" className="text-xs font-semibold" style={{ color: "#1447e6" }}>
                    {t("forgotPassword.backToSignIn")}
                </Link>
            </div>
        </AuthLayout>
    );
};
