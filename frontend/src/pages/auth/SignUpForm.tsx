import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router";
import { FormInput } from "@/components/ui/FormInput";
import { signupSchema, type SignupFormValues } from "./types/index";
import { authService } from "./api/authService";
import { useNsTranslation } from "../../hooks/Usetranslation";
import { useToast } from "../../components/ui/ToastProvider";
import '../../assets/Style/auth.css';

export const SignupForm = () => {
  const { t } = useNsTranslation("auth");
  const navigate = useNavigate();
  const toast = useToast();
  const [submitted, setSubmitted] = useState(false);

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
        t("signup.toast.success_detail")
      );
      setSubmitted(true);
    },
    onError: (error: any) => {
      const msg =
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        t("signup.toast.error_detail");
      toast.error(t("signup.toast.error_title"), msg);
    },
  });

  const onSubmit = (data: any) => {
    const { confirmPassword, ...payload } = data;
    signupMutation(payload);
  };

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
          style={{ width: 460, background: 'rgba(251,243,210,0.18)' }}
        >
          {submitted ? (
            /* CONFIRMATION */
            <div className="flex flex-col items-center text-center">
              <div
                className="flex items-center justify-center rounded-full mb-5"
                style={{ width: 56, height: 56, background: 'rgba(20,71,230,0.1)' }}
              >
                <span className="material-icons" style={{ fontSize: 30, color: '#1447e6' }}>
                  mark_email_read
                </span>
              </div>
              <h2 className="text-base font-semibold text-gray-800 mb-2">
                {t("signup.pending_title")}
              </h2>
              <p className="text-xs text-gray-600 leading-relaxed mb-6">
                {t("signup.pending_message")}
              </p>
              <button
                type="button"
                onClick={() => navigate("/")}
                className="w-full py-4 text-sm font-medium text-white transition-opacity disabled:opacity-70"
                style={{ background: '#1447e6' }}
              >
                {t("signup.backToSignIn")}
              </button>
            </div>
          ) : (
          <>
          {/* Heading */}
          <div className="mb-8">
            <p className="text-lg font-normal text-gray-800 mb-1">{t("login.welcome")}</p>
            <p className="text-lg font-bold text-gray-800 leading-snug">
              <span className="text-xs font-semibold tracking-wide text-gray-700 uppercase">
                {t("signup.title")}
              </span>
            </p>
            <p className="text-xs text-gray-600 mt-4">
              {t("signup.subtitle")}
            </p>
          </div>

          {/* Divider */}
          <div className="border-t border-blue-100 mb-4" />

          {/* FORM */}
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col">
            {/* Name row */}
            <div className="flex gap-3">
              <div className="flex-1 min-w-0">
                <FormInput
                  name="first_name"
                  control={control}
                  placeholder={t("signup.first_name")}
                  error={errors.first_name?.message}
                  className="px-5 py-4"
                  style={{ background: '#F9F6EE', border: '1.5px solid #1447e6' }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <FormInput
                  name="last_name"
                  control={control}
                  placeholder={t("signup.last_name")}
                  error={errors.last_name?.message}
                  className="px-5 py-4"
                  style={{ background: '#F9F6EE', border: '1.5px solid #1447e6' }}
                />
              </div>
            </div>

            {/* Email */}
            <FormInput
              name="email"
              control={control}
              placeholder={t("signup.email")}
              error={errors.email?.message}
              className="px-5 py-4"
              style={{ background: '#F9F6EE', border: '1.5px solid #1447e6' }}
            />

            {/* Mobile */}
            <FormInput
              name="mobile_number"
              control={control}
              placeholder={t("signup.mobile")}
              error={errors.mobile_number?.message}
              className="px-5 py-4"
              style={{ background: '#F9F6EE', border: '1.5px solid #1447e6' }}
            />

            {/* Password */}
            <FormInput
              name="password"
              type="password"
              control={control}
              placeholder={t("signup.password")}
              error={errors.password?.message}
              className="px-5 py-4"
              style={{ background: '#F9F6EE', border: '1.5px solid #1447e6' }}
            />

            {/* Confirm Password */}
            <FormInput
              name="confirmPassword"
              type="password"
              control={control}
              placeholder={t("signup.confirmPassword")}
              error={errors.confirmPassword?.message}
              className="px-5 py-4"
              style={{ background: '#F9F6EE', border: '1.5px solid #1447e6' }}
            />

            <button
              type="submit"
              disabled={isPending}
              className="w-full py-4 text-sm font-medium text-white transition-opacity disabled:opacity-70 mt-2"
              style={{ background: '#1447e6' }}
            >
              {isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  {t("signup.submit")}…
                </span>
              ) : (
                t("signup.submit")
              )}
            </button>
          </form>

          {/* Switch to login */}
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-600">
              {t("signup.hasAccount")}{' '}
              <Link to="/" className="font-semibold" style={{ color: '#1447e6' }}>
                {t("signup.signIn")}
              </Link>
            </p>
          </div>
          </>
          )}
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
