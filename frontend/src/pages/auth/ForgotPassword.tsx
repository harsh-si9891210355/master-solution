import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { z } from "zod";
import { FormInput } from "@/components/ui/FormInput";
import { FormButton } from "@/components/ui/FormButton";
import { authService } from "./api/authService";

const forgotPasswordSchema = z.object({
    email: z.string().email("Please enter a valid email address"),
});

type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export const ForgotPassword = () => {
    const navigate = useNavigate();

    const {
        control,
        handleSubmit,
        formState: { errors, isSubmitSuccessful },
    } = useForm<ForgotPasswordValues>({
        resolver: zodResolver(forgotPasswordSchema),
        defaultValues: { email: "" },
    });

    const { mutate: sendReset, isPending, isSuccess } = useMutation({
        mutationFn: (data: ForgotPasswordValues) =>
            authService.forgotPassword(data.email),
        onError: (error: any) => {
            console.error("Forgot password error:", error.response?.data?.message);
        },
    });

    const onSubmit = (data: ForgotPasswordValues) => sendReset(data);

    // ── Success state ─────────────────────────────────────────────────────────
    if (isSuccess || isSubmitSuccessful) {
        return (
            <div className="auth-page">
                <div className="auth-orb auth-orb--tr" />
                <div className="auth-orb auth-orb--bl" />

                <div className="auth-card">
                    <div className="auth-card__accent auth-card__accent--green" />
                    <div className="auth-card__body" style={{ textAlign: 'center' }}>
                        <div className="auth-status-circle auth-status-circle--success">
                            <i className="pi pi-check" />
                        </div>
                        <h2 className="auth-title-center">Check your inbox</h2>
                        <p className="auth-subtitle-center">
                            We've sent a password reset link to your email. It may take a few minutes to arrive.
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

    // ── Form state ────────────────────────────────────────────────────────────
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
                            <h2>Forgot password?</h2>
                            <p>We'll send you a reset link</p>
                        </div>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit(onSubmit)} className="auth-form">
                        <FormInput<ForgotPasswordValues>
                            name="email"
                            control={control}
                            label="Email address"
                            placeholder="you@example.com"
                            rules={{ required: "Email is required" }}
                            error={errors.email?.message}
                        />
                        <div className="auth-form__submit-row">
                            <FormButton
                                label="Send reset link"
                                variant="primary"
                                type="submit"
                                fullWidth
                                loading={isPending}
                                iconLeft="pi pi-send"
                            />
                        </div>
                    </form>

                    {/* Back link */}
                    <div style={{ textAlign: 'center' }}>
                        <button
                            type="button"
                            onClick={() => navigate("/")}
                            className="auth-back-link"
                        >
                            <i className="pi pi-arrow-left" />
                            Back to Sign In
                        </button>
                    </div>

                    {/* Footer note */}
                    <p className="auth-footer-note">
                        Didn't get the email? Check spam or{" "}
                        <button type="button" onClick={() => navigate("/")}>
                            try a different email
                        </button>.
                    </p>
                </div>
            </div>
        </div>
    );
};