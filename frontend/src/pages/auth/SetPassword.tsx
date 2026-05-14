import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router";
import { z } from "zod";
import { FormInput } from "@/components/ui/FormInput";
import { FormButton } from "@/components/ui/FormButton";
import { authService } from "./api/authService";

const setPasswordSchema = z
    .object({
        password: z
            .string()
            .min(8, "Password must be at least 8 characters")
            .regex(/[A-Z]/, "Must contain at least one uppercase letter")
            .regex(/[0-9]/, "Must contain at least one number"),
        confirmPassword: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: "Passwords do not match",
        path: ["confirmPassword"],
    });

type SetPasswordValues = z.infer<typeof setPasswordSchema>;

export const SetPassword = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token");
    const isResetMode = searchParams.get("mode") === "reset"; // ← came from ForgotPassword

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
                ? authService.resetPassword(token ?? "", data.password)   // POST /auth/reset-password
                : authService.setPassword(token ?? "", data.password),    // POST /auth/set-password
        onError: (error: any) => {
            console.error("Set password error:", error.response?.data?.message);
        },
    });

    const onSubmit = (data: SetPasswordValues) => submitPassword(data);

    // ── Invalid / missing token ───────────────────────────────────────────────
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
                        <h2 className="auth-title-center">Invalid Link</h2>
                        <p className="auth-subtitle-center">
                            This link is invalid or has expired. Please contact your administrator for a new one.
                        </p>
                        <FormButton
                            label="Back to Sign In"
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

    // ── Success state ─────────────────────────────────────────────────────────
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
                            {isResetMode ? "Password reset!" : "You're all set!"}
                        </h2>
                        <p className="auth-subtitle-center">
                            {isResetMode
                                ? "Your password has been reset. Sign in with your new password."
                                : "Your account is ready. Sign in with your email and new password to get started."}
                        </p>
                        <FormButton
                            label="Go to Sign In"
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

    // ── Form ──────────────────────────────────────────────────────────────────
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
                            <h2>{isResetMode ? "Reset your password" : "Create your password"}</h2>
                            <p>
                                {isResetMode
                                    ? "Enter your new password below."
                                    : "Your account was created by an administrator."}
                            </p>
                        </div>
                    </div>

                    {isError && (
                        <div className="auth-banner auth-banner--error">
                            <i className="pi pi-exclamation-circle" />
                            <p>
                                {(error as any)?.response?.data?.message ??
                                    "Something went wrong. Please try again."}
                            </p>
                        </div>
                    )}

                    <div className="auth-banner auth-banner--info">
                        <i className="pi pi-info-circle" />
                        <p>
                            Password must be at least 8 characters and contain an uppercase letter and a number.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)} className="auth-form">
                        <FormInput<SetPasswordValues>
                            name="password"
                            control={control}
                            label="New Password"
                            type="password"
                            placeholder="••••••••"
                            error={errors.password?.message}
                        />
                        <FormInput<SetPasswordValues>
                            name="confirmPassword"
                            control={control}
                            label="Confirm Password"
                            type="password"
                            placeholder="••••••••"
                            error={errors.confirmPassword?.message}
                        />
                        <div className="auth-form__submit-row">
                            <FormButton
                                label={isResetMode ? "Reset Password" : "Create Password"}
                                variant="primary"
                                type="submit"
                                fullWidth
                                loading={isPending}
                                iconLeft="pi pi-lock"
                            />
                        </div>
                    </form>

                    <div className="auth-back-link-wrapper">
                        <button type="button" onClick={() => navigate("/")} className="auth-back-link">
                            <i className="pi pi-arrow-left" />
                            Back to Sign In
                        </button>
                    </div>

                    {isResetMode ? (
                        <p className="auth-footer-note">
                            Link expired?{" "}
                            <button type="button" onClick={() => navigate("/forgotpassword")}>
                                Request a new one.
                            </button>
                        </p>
                    ) : (
                        <p className="auth-footer-note">
                            Link expired?{" "}
                            <button type="button" onClick={() => navigate("/forgotpassword")}>
                                Contact your administrator.
                            </button>
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};