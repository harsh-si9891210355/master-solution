import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Link, useNavigate, useSearchParams } from "react-router";
import { z } from "zod";
import { FormInput } from "@/components/ui/FormInput";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { authService } from "./api/authService";
import { useNsTranslation } from "@/hooks/Usetranslation";
import { useToast } from "@/components/ui/ToastProvider";
import "../../assets/Style/auth.css";

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
            <AuthLayout>
                <div className="flex flex-col items-center text-center">
                    <div
                        className="flex items-center justify-center rounded-full mb-5"
                        style={{ width: 56, height: 56, background: "rgba(226,76,76,0.12)" }}
                    >
                        <i className="pi pi-times" style={{ fontSize: 26, color: "#e24c4c" }} />
                    </div>
                    <h2 className="text-base font-semibold text-gray-800 mb-2">
                        {t("setPassword.invalid_link_title")}
                    </h2>
                    <p className="text-xs text-gray-600 leading-relaxed mb-6">
                        {t("setPassword.invalid_link_subtitle")}
                    </p>
                    <button
                        type="button"
                        onClick={() => navigate("/")}
                        className="w-full py-4 text-sm font-medium text-white"
                        style={{ background: "#1447e6" }}
                    >
                        {t("setPassword.back_to_sign_in")}
                    </button>
                </div>
            </AuthLayout>
        );
    }

    // ── Success state ────────────────────────────────────────────────────────
    if (isSuccess) {
        return (
            <AuthLayout>
                <div className="flex flex-col items-center text-center">
                    <div
                        className="flex items-center justify-center rounded-full mb-5"
                        style={{ width: 56, height: 56, background: "rgba(22,163,74,0.12)" }}
                    >
                        <i className="pi pi-check" style={{ fontSize: 26, color: "#16a34a" }} />
                    </div>
                    <h2 className="text-base font-semibold text-gray-800 mb-2">
                        {isResetMode
                            ? t("setPassword.success.reset_title")
                            : t("setPassword.success.set_title")}
                    </h2>
                    <p className="text-xs text-gray-600 leading-relaxed mb-6">
                        {isResetMode
                            ? t("setPassword.success.reset_subtitle")
                            : t("setPassword.success.set_subtitle")}
                    </p>
                    <button
                        type="button"
                        onClick={() => navigate("/")}
                        className="w-full py-4 text-sm font-medium text-white"
                        style={{ background: "#1447e6" }}
                    >
                        {t("setPassword.success.go_to_sign_in")}
                    </button>
                </div>
            </AuthLayout>
        );
    }

    // ── Form ─────────────────────────────────────────────────────────────────
    return (
        <AuthLayout>
            {/* Heading */}
            <div className="mb-8">
                <p className="text-lg font-normal text-gray-800 mb-1">{t("login.welcome")}</p>
                <p className="text-lg font-bold text-gray-800 leading-snug">
                    <span className="text-xs font-semibold tracking-wide text-gray-700 uppercase">
                        {isResetMode
                            ? t("setPassword.form.reset_title")
                            : t("setPassword.form.set_title")}
                    </span>
                </p>
                <p className="text-xs text-gray-600 mt-4 leading-relaxed">
                    {isResetMode
                        ? t("setPassword.form.reset_subtitle")
                        : t("setPassword.form.set_subtitle")}
                </p>
            </div>

            {/* Divider */}
            <div className="border-t border-blue-100 mb-4" />

            {/* API error banner */}
            {isError && (
                <div className="mb-4 px-4 py-2 bg-red-50 border border-red-300 text-red-600 text-sm rounded">
                    {(error as any)?.response?.data?.message ??
                        t("setPassword.form.error_banner")}
                </div>
            )}

            {/* Password rules info */}
            <div className="mb-4 px-4 py-2 text-xs text-gray-600 rounded" style={{ background: "rgba(20,71,230,0.06)", border: "1px solid rgba(20,71,230,0.15)" }}>
                {t("setPassword.form.info_banner")}
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col">
                <FormInput<SetPasswordValues>
                    name="password"
                    control={control}
                    type="password"
                    placeholder={t("setPassword.form.password")}
                    error={errors.password?.message}
                />
                <FormInput<SetPasswordValues>
                    name="confirmPassword"
                    control={control}
                    type="password"
                    placeholder={t("setPassword.form.confirmPassword")}
                    error={errors.confirmPassword?.message}
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
                            {isResetMode
                                ? t("setPassword.form.reset_submit")
                                : t("setPassword.form.set_submit")}
                            …
                        </span>
                    ) : isResetMode ? (
                        t("setPassword.form.reset_submit")
                    ) : (
                        t("setPassword.form.set_submit")
                    )}
                </button>
            </form>

            {/* Back to sign in */}
            <div className="mt-6 text-center">
                <Link to="/" className="text-xs font-semibold" style={{ color: "#1447e6" }}>
                    {t("setPassword.form.back_to_sign_in")}
                </Link>
            </div>
        </AuthLayout>
    );
};
