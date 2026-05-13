import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { signupSchema, type SignupFormValues } from "./types/index";
import { FormInput } from "@/components/ui/FormInput";
import { FormButton } from "../../components/ui/FormButton.tsx";
import { authService } from "./api/authService";

export const SignupForm = () => {
  const navigate = useNavigate();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: "",
      first_name_en: "",
      first_name_es: "string",
      first_name_fr: "string",
      last_name_en: "",
      last_name_es: "string",
      last_name_fr: "string",
      mobile_number: "",
      role_code: "user",
      password: "",
      confirmPassword: "",
    },
  });

  const { mutate: signupMutation, isPending } = useMutation({
    mutationFn: authService.signup,
    onSuccess: () => navigate("/"),
    onError: (error: any) => {
      console.error("Signup Error:", error.response?.data?.message);
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
              <h2>Create Account</h2>
              <p>Fill in the details to register</p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="auth-form">
            <div className="auth-grid-2">
              <FormInput name="first_name_en" label="First Name" control={control} error={errors.first_name_en?.message} />
              <FormInput name="last_name_en"  label="Last Name"  control={control} error={errors.last_name_en?.message}  />
            </div>

            <FormInput
              name="email"
              label="Email"
              control={control}
              error={errors.email?.message}
              placeholder="you@example.com"
            />

            <FormInput
              name="mobile_number"
              label="Mobile Number"
              control={control}
              error={errors.mobile_number?.message}
              placeholder="+1 234 567 8900"
            />

            <div className="auth-grid-2">
              <FormInput name="password"        label="Password"         type="password" control={control} error={errors.password?.message}        />
              <FormInput name="confirmPassword" label="Confirm Password" type="password" control={control} error={errors.confirmPassword?.message} />
            </div>

            <div className="auth-form__submit-row">
              <FormButton
                type="submit"
                label="Create Account"
                variant="primary"
                fullWidth
                loading={isPending}
                iconLeft="pi pi-user-plus"
              />

              <p className="auth-form-footer">
                Already have an account?{" "}
                <button type="button" onClick={() => navigate("/")}>
                  Sign in
                </button>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};